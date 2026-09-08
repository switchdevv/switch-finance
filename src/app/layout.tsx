import type { Metadata } from 'next';
import { proxima } from '@/fonts';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Switch Finance',
  description: 'Internal finance dashboard for the Switch platform.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning is required by next-themes: it sets the `class`
    // attribute on this element before hydration to avoid a light/dark flash, which
    // would otherwise trip React's hydration mismatch warning on this one attribute.
    <html lang="en" suppressHydrationWarning className={proxima.variable}>
      <body className="bg-background text-foreground font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
