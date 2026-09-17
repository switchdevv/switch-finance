'use client';

import type { ReactNode } from 'react';
import { Button } from '@heroui/react';
import { useI18n } from '@/lib/i18n/provider';
import { ELLIPSIS, paginationRange } from '@/components/ui/pagination-range';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';

/**
 * The pager under every paginated grid (restaurants, a restaurant's orders). Shared
 * rather than copied so the two tables can't drift apart on keyboard behaviour or on the
 * blind-mode fallback below.
 */
export function PaginationBar({
  page,
  totalPages,
  hasNext,
  isFetching,
  onChange,
}: {
  page: number;
  /** null when the total isn't known — see the blind-mode note below. */
  totalPages: number | null;
  hasNext: boolean;
  isFetching: boolean;
  onChange: (page: number) => void;
}) {
  const { t, format } = useI18n();
  // The count query failed or hasn't resolved (Parse counts can be capped/disabled
  // on large classes) — fall back to Prev/Next only, inferring "more pages exist"
  // from a full page of results rather than an exact total.
  const isBlind = totalPages === null;
  if (!isBlind && totalPages <= 1) return null;

  const items = isBlind ? [] : paginationRange(page, totalPages);

  return (
    <nav
      aria-label={t('pagination.label')}
      className="border-separator/70 bg-surface-secondary/40 flex items-center justify-between gap-2 border-t px-5 py-3"
    >
      <PagerButton
        isDisabled={page <= 1 || isFetching}
        onPress={() => onChange(page - 1)}
        aria-label={t('pagination.previousPage')}
      >
        <ChevronLeftIcon className="size-4" />
        <span className="hidden sm:inline">{t('pagination.previous')}</span>
      </PagerButton>

      {isBlind ? (
        <span className="text-caption text-muted tabular">{t('pagination.page', { page: format.number(page) })}</span>
      ) : (
        <div className="flex items-center gap-1">
          {items.map((item, index) =>
            item === ELLIPSIS ? (
              <span key={`ellipsis-${index}`} className="text-muted grid size-9 place-items-center">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={t('pagination.page', { page: item })}
                aria-current={item === page ? 'page' : undefined}
                disabled={isFetching}
                onClick={() => onChange(item)}
                className={
                  'text-body tabular focus-visible:ring-focus grid size-9 place-items-center rounded-xl transition-colors outline-none focus-visible:ring-2 disabled:opacity-50 ' +
                  (item === page
                    ? 'bg-accent text-accent-foreground font-bold'
                    : 'text-muted hover:bg-surface-tertiary hover:text-foreground')
                }
              >
                {item}
              </button>
            ),
          )}
        </div>
      )}

      <PagerButton
        isDisabled={(isBlind ? !hasNext : page >= totalPages) || isFetching}
        onPress={() => onChange(page + 1)}
        aria-label={t('pagination.nextPage')}
      >
        <span className="hidden sm:inline">{t('pagination.next')}</span>
        <ChevronRightIcon className="size-4" />
      </PagerButton>
    </nav>
  );
}

function PagerButton({
  children,
  isDisabled,
  onPress,
  ...props
}: {
  children: ReactNode;
  isDisabled: boolean;
  onPress: () => void;
  'aria-label': string;
}) {
  return (
    <Button variant="outline" size="sm" isDisabled={isDisabled} onPress={onPress} {...props}>
      {children}
    </Button>
  );
}
