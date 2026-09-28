'use client';

import type { ComponentType, SVGProps } from 'react';
import Link from 'next/link';

/**
 * A page's top-level sections as links — each tab is a URL, so a tab can be linked to,
 * survives a reload and is walked back by the browser. Links rather than a tablist: there is
 * one panel on screen at a time and it is the page, not a widget inside it.
 */
export function PageTabs<T extends string>({
  label,
  tabs,
  value,
}: {
  label: string;
  tabs: readonly {
    key: T;
    label: string;
    href: string;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
  }[];
  value: T;
}) {
  return (
    <nav aria-label={label} className="border-border/70 -mb-2 flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const isActive = tab.key === value;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            scroll={false}
            replace
            aria-current={isActive ? 'page' : undefined}
            className={
              'text-body focus-visible:ring-focus -mb-px flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 font-bold transition-colors outline-none focus-visible:ring-2 ' +
              (isActive
                ? 'border-accent text-foreground'
                : 'text-muted hover:text-foreground border-transparent')
            }
          >
            {tab.icon && <tab.icon className="size-4" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
