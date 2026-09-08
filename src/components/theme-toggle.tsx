'use client';

import type { ComponentType, SVGProps } from 'react';
import { useTheme } from 'next-themes';
import { MonitorIcon, MoonIcon, SunIcon } from './icons';

const MODES = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
] satisfies { value: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[];

type Mode = (typeof MODES)[number]['value'];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // `theme` is undefined both on the server render and on the first client render
  // (next-themes only resolves the persisted value inside its own effect, after
  // hydration) — so defaulting to 'system' here is identical on both renders and
  // needs no mount-guard effect to avoid a mismatch.
  const current: Mode = isMode(theme) ? theme : 'system';

  return (
    // A three-way segmented control instead of the old cycling button: the current
    // mode and the available modes are both visible, so nobody has to click twice
    // to discover what the third option was.
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="border-border/70 bg-surface-secondary/70 flex items-center gap-0.5 rounded-pill border p-1"
    >
      {MODES.map((mode) => {
        const active = current === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={mode.label}
            title={mode.label}
            onClick={() => setTheme(mode.value)}
            className={
              'focus-visible:ring-focus grid size-7 place-items-center rounded-pill transition-colors outline-none focus-visible:ring-2 ' +
              (active
                ? 'bg-surface text-accent-soft-foreground shadow-card'
                : 'text-muted hover:text-foreground')
            }
          >
            <mode.icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

function isMode(value: string | undefined): value is Mode {
  return !!value && MODES.some((mode) => mode.value === value);
}
