import type { MessageKey } from '@/lib/i18n/dictionary';

/**
 * Where the failing call came from — the same code means different things in each:
 * 101 is an invalid login or (on every other read) a missing/forbidden object; 119 is a
 * denied account at login and a denied *action* everywhere else; 141 is a rejected
 * request generally, but on 'grant' it is specifically a cloud function that isn't
 * deployed. Never return one global message for a code.
 */
export type ErrorContext = 'login' | 'fetch' | 'grant';

/**
 * Maps a Parse.Error (or anything else a query might throw) to the dictionary key of its
 * user-facing copy — a key rather than a sentence, so the caller renders it in the
 * reader's language with its own `t()`.
 */
export function parseErrorKey(error: unknown, context: ErrorContext): MessageKey {
  const code = getErrorCode(error);

  switch (code) {
    case 100:
      return 'errors.network';
    case 101:
      return context === 'login' ? 'errors.invalidLogin' : 'errors.notFound';
    case 119:
      if (context === 'login') return 'errors.loginDenied';
      if (context === 'grant') return 'errors.grantAdminsOnly';
      return 'errors.forbidden';
    case 141:
      // 141 is what Parse returns for a cloud function that isn't defined, which is the
      // expected state of `setFinanceAccess` until the backend ships it (see
      // docs/finance-access-backend.md). Naming the real cause beats "the server
      // rejected that request", which reads as a bug in this app.
      return context === 'grant' ? 'errors.grantNotDeployed' : 'errors.rejected';
    case 209:
      return 'errors.sessionExpired';
    default:
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[parse:${context}]`, error);
      }
      return 'errors.generic';
  }
}

/**
 * Codes that mean "this session or account cannot do this" rather than "the
 * network hiccupped, try again" — used by the QueryClient's retry policy so a
 * permission or session failure surfaces immediately instead of after 3 identical
 * retries (see lib/query/client.ts).
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 101 || code === 119 || code === 209;
}

function getErrorCode(error: unknown): number | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
  ) {
    return (error as { code: number }).code;
  }
  return undefined;
}
