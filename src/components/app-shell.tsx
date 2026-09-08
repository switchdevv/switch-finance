'use client';

import type { ComponentType, ReactNode, SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Tooltip } from '@heroui/react';
import { useSession, useLogout } from '@/hooks/use-session';
import { BrandMark } from './brand-mark';
import { DashboardIcon, LogOutIcon, StoreIcon } from './icons';
import { ThemeToggle } from './theme-toggle';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/restaurants', label: 'Restaurants', icon: StoreIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useSession();
  const logout = useLogout();

  const username = user?.getUsername() ?? '';
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        pathname={pathname}
        username={username}
        onLogout={() => logout.mutate()}
        isLoggingOut={logout.isPending}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky + translucent so content scrolls under the bar rather than being
            cut off by it; the blur is what keeps the text legible while it does. */}
        <header className="border-border/70 bg-background/75 sticky top-0 z-20 border-b backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-5 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
                <BrandMark className="size-8" />
              </Link>
              <span className="text-h6 text-foreground hidden truncate font-bold lg:block">
                {current?.label ?? 'Switch Finance'}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <div className="lg:hidden">
                <Tooltip>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label="Log out"
                    onPress={() => logout.mutate()}
                    isDisabled={logout.isPending}
                  >
                    <LogOutIcon className="size-4" />
                  </Button>
                  <Tooltip.Content>Log out</Tooltip.Content>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Mobile nav: the sidebar is desktop-only, so the same two destinations
              ride along under the header as a scrollable pill row. */}
          <nav className="flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'text-body flex shrink-0 items-center gap-2 rounded-pill px-3.5 py-2 transition-colors ' +
                    (active
                      ? 'bg-accent text-accent-foreground font-bold'
                      : 'bg-surface text-muted border-border/70 border')
                  }
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  pathname,
  username,
  onLogout,
  isLoggingOut,
}: {
  pathname: string;
  username: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  return (
    <aside className="border-border/70 bg-surface/60 sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r px-4 py-5 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
        <BrandMark className="size-9" />
        <span className="flex flex-col leading-tight">
          <span className="text-h6 font-bold">Switch</span>
          <span className="text-micro text-muted tracking-[0.16em] uppercase">Finance</span>
        </span>
      </Link>

      <span className="text-micro text-muted mb-2 px-3 font-bold tracking-[0.16em] uppercase">
        Menu
      </span>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={
                'group text-body relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ' +
                (active
                  ? 'bg-accent-soft text-accent-soft-foreground font-bold'
                  : 'text-muted hover:bg-surface-secondary hover:text-foreground')
              }
            >
              {/* Active rail: absolutely positioned so it can bleed past the item's
                  padding without nudging the icon/label alignment. */}
              <span
                aria-hidden
                className={
                  'bg-accent absolute inset-y-2 -left-4 w-1 rounded-r-full transition-opacity ' +
                  (active ? 'opacity-100' : 'opacity-0')
                }
              />
              <item.icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="border-border/70 bg-surface-secondary/60 flex items-center gap-3 rounded-2xl border p-2.5">
          <span className="brand-gradient text-micro grid size-9 shrink-0 place-items-center rounded-xl font-bold text-white uppercase">
            {username.slice(0, 2) || '—'}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-body truncate font-bold">{username || 'Signed in'}</span>
            <span className="text-micro text-muted">Finance</span>
          </span>
          <Tooltip>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="ms-auto shrink-0"
              aria-label="Log out"
              onPress={onLogout}
              isDisabled={isLoggingOut}
            >
              <LogOutIcon className="size-4" />
            </Button>
            <Tooltip.Content>Log out</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

