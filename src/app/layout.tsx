import type { Metadata } from 'next';
import { proxima } from '@/fonts';
import { en } from '@/lib/i18n/dictionaries/en';
import { Providers } from './providers';
import './globals.css';

// Static metadata, so English: it is baked into the exported HTML before the app knows
// which language it is in. `lang` on <html> below is corrected at runtime by
// I18nProvider, and the invoice page sets its own translated title (it becomes the PDF's
// filename).
export const metadata: Metadata = {
  title: en.app.title,
  description: en.app.description,
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
