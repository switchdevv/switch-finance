import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nothing here renders on a server: Parse is browser-only (see lib/parse/client.ts),
  // so every page is a shell that fetches its own data once it reaches the browser.
  // Exporting to plain files lets Firebase Hosting's CDN serve the whole app, instead
  // of paying for a Cloud Run container that would only ever hand back the same HTML.
  //
  // The cost of this is that dynamic route segments are unavailable (they'd need
  // generateStaticParams, and the ids only exist in Parse) — which is why a restaurant
  // is addressed as /restaurants/detail?id=… rather than /restaurants/<id>.
  output: "export",
  // `npm run dev:local` (local switch-server-v2, see switch-server-v2/docs/04-local-dev.md)
  // compiles into its own folder, so code built against production is never served in
  // local mode, or the reverse.
  ...(process.env.SWITCH_LOCAL === "1" ? { distDir: ".next/local" } : {}),
};

export default nextConfig;
