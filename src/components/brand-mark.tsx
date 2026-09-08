import { SwitchMark } from './icons';

/** The Switch logotype mark — a gradient tile with the "S" knocked out. Shared by
 * the sidebar, the login card and the session loader so the three never drift. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={`brand-gradient shadow-accent grid shrink-0 place-items-center rounded-xl text-white ${className ?? ''}`}
    >
      <SwitchMark className="size-[70%]" />
    </span>
  );
}
