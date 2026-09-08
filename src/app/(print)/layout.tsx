'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/require-auth';

/**
 * Documents meant for paper get the auth gate but none of the app chrome — no sidebar,
 * no sticky header, nothing that would either print or have to be hidden from print.
 * The route group keeps this separate from (dashboard) without changing any URL.
 */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
