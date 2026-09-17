'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Skeleton, Switch, Table } from '@heroui/react';
import { STAFF_PAGE_SIZE, useStaff, useStaffCount } from '@/hooks/use-staff';
import { useSetFinanceAccess } from '@/hooks/use-set-finance-access';
import { useSession } from '@/hooks/use-session';
import type { StaffFilters as Filters } from '@/lib/services/staff';
import { parseStaffFilters, staffFiltersToQuery } from '@/lib/url/staff-filters';
import { financeRole } from '@/lib/auth/access';
import { formatOrNone, initials } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey } from '@/lib/parse/errors';
import type { SwitchUser } from '@/types/user';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { RoleChip } from '@/components/ui/role-chip';
import { AccessFilters } from '@/components/access/access-filters';
import { FilterIcon } from '@/components/icons';

const COLUMNS = [
  { key: 'account', className: 'min-w-[15rem] text-start' },
  { key: 'email', className: 'min-w-[13rem] text-start' },
  { key: 'role', className: 'w-[9.5rem] text-start' },
  { key: 'access', className: 'w-[11rem] text-start' },
] as const;

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function AccessTable() {
  const { t, format } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const filters = parseStaffFilters(searchParams);

  const { data: currentUser } = useSession();
  const rowsQuery = useStaff(page, filters);
  const countQuery = useStaffCount(filters);

  const totalPages =
    countQuery.status === 'success'
      ? Math.max(1, Math.ceil(countQuery.data / STAFF_PAGE_SIZE))
      : null;

  // A deep link or a stale bookmark can point past the last page once the count
  // resolves — clamp rather than strand the user on a permanently empty grid.
  useEffect(() => {
    if (totalPages !== null && page > totalPages) {
      router.replace(`${pathname}?page=${totalPages}`);
    }
  }, [totalPages, page, pathname, router]);

  const buildHref = (target: number, next: Filters = filters) => {
    const query = staffFiltersToQuery(next);
    const parts = [target > 1 ? `page=${target}` : '', query].filter(Boolean);
    return parts.length > 0 ? `${pathname}?${parts.join('&')}` : pathname;
  };

  const goToPage = (target: number) => router.push(buildHref(target));
  // Any filter edit returns to page 1 — the page the admin was on describes a different
  // result set once the filter changes, and landing on an empty page 7 reads as a bug.
  const applyFilters = (next: Filters) => router.push(buildHref(1, next));

  const filterBar = <AccessFilters filters={filters} onChange={applyFilters} />;

  if (rowsQuery.status === 'pending') {
    return <TableSkeleton filterBar={filterBar} />;
  }

  if (rowsQuery.status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {filterBar}
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('access.loadError')}</Alert.Title>
            <Alert.Description>{t(parseErrorKey(rowsQuery.error, 'fetch'))}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => rowsQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      </div>
    );
  }

  const rows = rowsQuery.data;
  const total = countQuery.status === 'success' ? countQuery.data : undefined;
  const rangeStart = (page - 1) * STAFF_PAGE_SIZE + 1;
  const rangeEnd =
    total !== undefined ? Math.min(page * STAFF_PAGE_SIZE, total) : rangeStart + rows.length - 1;

  return (
    // One card holds toolbar, grid and pager, so the three read as a single object
    // instead of three strips floating on the page background.
    <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
      <header className="border-separator/70 flex flex-col gap-3 border-b px-5 py-4">
        {filterBar}
        {rows.length > 0 && (
          <span className="text-caption text-muted tabular">
            {total !== undefined
              ? t('common.showingOf', {
                  start: format.number(rangeStart),
                  end: format.number(rangeEnd),
                  total: format.number(total),
                })
              : t('common.showing', {
                  start: format.number(rangeStart),
                  end: format.number(rangeEnd),
                })}
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <EmptyRows />
      ) : (
        // Table.Root is what publishes HeroUI's slot classes through context — rendering
        // ScrollContainer/Content on their own leaves every part of the grid unstyled.
        <Table variant="secondary" className="px-3 pb-1">
          <Table.ScrollContainer>
            <Table.Content
              aria-label={t('access.tableLabel')}
              className={
                'min-w-[48rem] ' +
                (rowsQuery.isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity')
              }
            >
              <Table.Header>
                {COLUMNS.map((column) => (
                  <Table.Column
                    key={column.key}
                    isRowHeader={column.key === 'account'}
                    className={`text-micro tracking-[0.12em] uppercase ${column.className}`}
                  >
                    {t(`access.columns.${column.key}`)}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body items={rows}>
                {(account: SwitchUser) => (
                  <Table.Row id={account.objectId}>
                    <Table.Cell>
                      <AccountCell account={account} />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <span className="text-body truncate">{formatOrNone(account.email)}</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <RoleChip role={financeRole(account)} size="sm" />
                    </Table.Cell>
                    <Table.Cell>
                      <AccessCell
                        account={account}
                        isSelf={account.objectId === currentUser?.id}
                      />
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        hasNext={rows.length === STAFF_PAGE_SIZE}
        isFetching={rowsQuery.isFetching}
        onChange={goToPage}
      />
    </section>
  );
}

function AccountCell({ account }: { account: SwitchUser }) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-accent-soft text-accent-soft-foreground text-caption grid size-10 shrink-0 place-items-center rounded-xl font-bold">
        {initials(account.fullname ?? account.username)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-body truncate font-bold">{formatOrNone(account.username)}</span>
        <span className="text-caption text-muted truncate">
          {account.fullname?.trim() || '—'}
        </span>
      </span>
    </div>
  );
}

/**
 * The one control on this page that writes.
 *
 * Two rows never get a toggle. An **admin** is granted by `staffType`, which
 * `financeAccess` doesn't govern — flipping it there would be a switch that visibly does
 * nothing. And an admin's **own row**, so nobody can revoke themselves out of the page
 * they'd need in order to undo it.
 *
 * The failure is rendered inline under the switch rather than as a toast: there's no toast
 * system in this app, and the error belongs to one row, not to the page. Until the backend
 * ships `setFinanceAccess` this is the path every toggle takes — see
 * docs/finance-access-backend.md.
 */
function AccessCell({ account, isSelf }: { account: SwitchUser; isSelf: boolean }) {
  const { t } = useI18n();
  const setAccess = useSetFinanceAccess();
  const role = financeRole(account);
  // Optimistic only for the lifetime of the request: on failure it snaps back, so the
  // switch never sits in a position the server didn't agree to.
  const [pending, setPending] = useState<boolean | null>(null);

  if (role === 'admin') {
    return (
      <span className="text-caption text-muted">
        {t('access.always')}
        <span className="sr-only">{t('access.alwaysReason')}</span>
      </span>
    );
  }

  const granted = pending ?? account.financeAccess === true;

  const onChange = (next: boolean) => {
    setPending(next);
    setAccess.mutate(
      { userId: account.objectId, granted: next },
      { onError: () => setPending(null), onSuccess: () => setPending(null) },
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <Switch
        isSelected={granted}
        onChange={onChange}
        isDisabled={isSelf || setAccess.isPending}
        aria-label={t('access.toggleLabel', { name: account.username ?? account.objectId })}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
        <span className="text-caption">{granted ? t('access.granted') : t('access.notGranted')}</span>
      </Switch>
      {isSelf && <span className="text-caption text-muted">{t('access.ownAccount')}</span>}
      {setAccess.isError && (
        <span className="text-caption text-[var(--danger)]">
          {t(parseErrorKey(setAccess.error, 'grant'))}
        </span>
      )}
    </div>
  );
}

function EmptyRows() {
  const { t } = useI18n();
  // The field names stay code, untranslated, in either language — so the sentence is split
  // on its placeholders and they are slotted back in as <code>.
  const code = { appType: 'appType', staff: 'staff' } as const;
  const parts = t('access.emptyBody').split(/\{(appType|staff)\}/);

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
      <span className="bg-surface-secondary text-muted mb-2 grid size-12 place-items-center rounded-2xl">
        <FilterIcon className="size-6" />
      </span>
      <p className="text-h6 font-bold">{t('access.emptyTitle')}</p>
      <p className="text-muted text-body max-w-prose">
        {parts.map((part, index) =>
          index % 2 === 1 ? (
            <code key={index}>{code[part as keyof typeof code]}</code>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          ),
        )}
      </p>
    </div>
  );
}

function TableSkeleton({ filterBar }: { filterBar: ReactNode }) {
  const { t } = useI18n();

  return (
    <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
      {/* The filter bar stays live while rows load — it's what the admin is about to touch
          again, and blanking it into a grey pill would make every filter change feel like
          a full page reload. */}
      <div className="border-separator/70 border-b px-5 py-4">{filterBar}</div>
      <div className="border-separator/70 bg-surface-secondary/60 flex gap-4 border-b px-5 py-3">
        {COLUMNS.map((column) => (
          <span
            key={column.key}
            className={`text-micro text-muted tracking-[0.12em] uppercase ${column.className}`}
          >
            {t(`access.columns.${column.key}`)}
          </span>
        ))}
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-separator/50 flex items-center gap-4 border-b px-5 py-3.5">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-pill" />
            <Skeleton className="h-6 w-16 rounded-pill" />
          </div>
        ))}
      </div>
    </section>
  );
}
