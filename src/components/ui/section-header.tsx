'use client';

/**
 * The little caps heading with an optional link-ish action on the right, used to divide
 * the print and export dialogs into sections. Shared so the two dialogs, which offer
 * overlapping choices, can't drift into looking like different products.
 */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <p className="text-caption text-muted font-bold tracking-wide uppercase">{title}</p>
      {action && (
        <button
          type="button"
          className="text-caption text-accent focus-visible:ring-focus rounded-pill px-2 py-1 font-bold outline-none focus-visible:ring-2"
          onClick={action.onPress}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
