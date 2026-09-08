import { redirect } from 'next/navigation';

// The dashboard route group owns the auth guard (see (dashboard)/layout.tsx), so an
// unauthenticated visitor lands here, bounces to /dashboard, and is redirected again
// to /login from there. No auth branching belongs at the root.
export default function RootPage() {
  redirect('/dashboard');
}
