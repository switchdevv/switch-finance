# Switch Finance access control — backend requirements

**Audience:** whoever owns the Parse Server behind `api.switchfood.net`.
**Status:** the web client (this repo) is fully wired and shipped. Everything below is
still missing on the server, and until it lands the client-side gate is a **UX gate, not a
security boundary**.

## Why the client can't do this alone

`_User` rows on this backend carry an owner-only-write ACL:

```json
{ "*": { "read": true }, "<ownId>": { "read": true, "write": true } }
```

Two consequences, and they pull in opposite directions:

1. An admin's browser **cannot** write another account's row. Granting access therefore
   has to go through master-key server code — hence the cloud function in §2.
2. Every account **can** write its own row, and the RN apps already do
   (`putUser` in `switch-manager/src/api/modules/auth.js` sets arbitrary keys on the
   current user). So any account can today set `financeAccess: true` on itself and walk
   straight through the gate. The trigger in §3 is what closes that, and it is the single
   most important item in this document.

---

## 1. Schema

Add one field to `_User`:

| Field | Type | Meaning |
|---|---|---|
| `financeAccess` | Boolean | Access to Switch Finance, granted by an admin. |

Nothing else changes. The gate reads three existing fields alongside it:

| Field | Existing? | Role in the rule |
|---|---|---|
| `staffType` | yes | Must be `'Staff'` or `'Admin'` (case-insensitive). `'Admin'` → admin, full access, always. |
| `appType` | yes | Must contain `'staff'` or `'admin'`. |
| `enabled` | yes | `false` → denied outright, admin or not. |

`staffType` and `appType` are both required, and together they define the staff pool: the
gate refuses a non-staff account outright, and `/access` lists exactly the accounts that
pass. One predicate, `isStaffAccount`, not two — when the gate and the list asked
different questions, an account could be admitted by one and invisible to the other, so an
admin could not revoke a grant the app itself was honouring.

Neither field can carry the rule alone. `appType` is self-writable by design — switch-food
appends to it on every login (`switch-food/src/navigation/root.js`) — so it is trivially
forged; `staffType` is trigger-protected (§3) but survives a role ending, so an account can
still hold one without being provisioned for staff.

`financeAccess` is a new field rather than a new `staffType` value so that granting finance
access can never overwrite an existing staff role, and rather than an `appType` member for
the self-writability reason above.

The client's copy of this rule is `src/lib/auth/access.ts`; it is a pure module, so it can
be read in about thirty seconds if you want to confirm the two sides agree.

---

## 2. Cloud function: `setFinanceAccess`

Called by the client from `/access` (`src/hooks/use-set-finance-access.ts`) as
`Parse.Cloud.run('setFinanceAccess', { userId, granted })`.

```js
Parse.Cloud.define('setFinanceAccess', async (request) => {
  const { user, params } = request;
  const { userId, granted } = params;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Sign in first.');
  }
  if (typeof userId !== 'string' || !userId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'userId is required.');
  }
  if (typeof granted !== 'boolean') {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'granted must be a boolean.');
  }

  // Re-read the caller with the master key rather than trusting request.user's cached
  // fields: the session object is not the authority on the caller's current role.
  const caller = await new Parse.Query(Parse.User)
    .equalTo('objectId', user.id)
    .first({ useMasterKey: true });

  if (!caller || caller.get('enabled') === false) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Account is disabled.');
  }
  if (String(caller.get('staffType') || '').trim().toLowerCase() !== 'admin') {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only admins can change access.');
  }

  const target = await new Parse.Query(Parse.User)
    .equalTo('objectId', userId)
    .first({ useMasterKey: true });

  if (!target) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'No such account.');
  }

  // Only the staff pool is grantable — this is the same predicate the client's
  // isStaffAccount applies (src/lib/auth/access.ts), enforced here so a hand-crafted
  // request can't reach a customer account. Both halves are required.
  const staffType = String(target.get('staffType') || '').trim().toLowerCase();
  const appType = target.get('appType') || [];
  const isStaff =
    ['staff', 'admin'].includes(staffType) &&
    Array.isArray(appType) &&
    appType.some((type) => ['staff', 'admin'].includes(type));

  if (!isStaff) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'Only staff accounts can be granted finance access.',
    );
  }

  // Admins hold access by role; writing financeAccess on them would be a no-op that
  // looks like a setting. The client disables the toggle for these rows too.
  if (staffType === 'admin') {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'Admins always have access; financeAccess does not apply.',
    );
  }

  // Nobody revokes themselves out of the page they'd need to undo it.
  if (target.id === caller.id && granted === false) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'You cannot revoke your own access.',
    );
  }

  target.set('financeAccess', granted);
  await target.save(null, { useMasterKey: true });

  return { objectId: target.id, financeAccess: granted };
});
```

**Error codes the client already renders** (`src/lib/parse/errors.ts`):

| Code | Rendered as |
|---|---|
| 119 `OPERATION_FORBIDDEN` | "Only admins can change access." |
| 141 (function not defined) | "Access changes aren't enabled on the server yet — ask the platform team to deploy `setFinanceAccess`." |
| 209 `INVALID_SESSION_TOKEN` | "Your session has expired. Please sign in again." |

Until this function exists, every toggle on `/access` fails with 141 and shows that third
message. That is the expected pre-deploy behaviour, not a bug report.

---

## 3. `beforeSave(Parse.User)` trigger — the actual boundary

Without this, §2 is theatre: any account can `putUser({ financeAccess: true })` on itself.

```js
Parse.Cloud.beforeSave(Parse.User, async (request) => {
  // Master-key writes are §2's own save, plus dashboard edits — both trusted.
  if (request.master) return;

  const object = request.object;

  if (object.dirty('financeAccess')) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'financeAccess can only be changed by an admin, via setFinanceAccess.',
    );
  }
  if (object.dirty('staffType')) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'staffType can only be changed by the platform team.',
    );
  }
});
```

**Do not add `appType` to that list.** switch-food appends the current app to its own
`appType` on every login; blocking it would break sign-in across the RN apps.

Note the signup path also writes `staffType` (`user.set("staffType", undefined)` in each RN
app's `auth.js`). That runs inside `signUp()`, so if you find the trigger rejecting new
registrations, exempt object creation — `if (!object.existed())` — rather than dropping the
`staffType` check.

---

## 4. `_User` class-level permissions

`_User` rows are world-readable today. The `/access` page needs authenticated `find` on
`_User` (it lists staff accounts and reads the signed-in account's own row), but it does
**not** need public find:

- **Requires:** `find` and `get` for authenticated sessions.
- **Can be turned off:** public (unauthenticated) `find` / `get`.

Parse Server already withholds `authData` and `sessionToken` from non-master reads, and the
client narrows every `_User` query with `select` to
`username, fullname, email, appType, staffType, financeAccess, enabled`
(`src/lib/services/staff.ts`), so nothing beyond those fields is requested.

---

## 5. Bootstrap

There is no way to create the first admin from the app — §2 requires an admin to call it.
Set one by hand in the Parse dashboard:

1. Find the account in `_User`.
2. Set `staffType` to `Admin`.
3. Confirm `enabled` is `true` and `appType` contains `staff` (or `admin`).

Step 3 is not optional — an `Admin` without the `appType` member is denied like anyone
else, and there is no way to fix that from inside the app.

That account can then grant everyone else from `/access`.
