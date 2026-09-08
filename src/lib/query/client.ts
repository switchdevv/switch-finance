import { QueryClient } from '@tanstack/react-query';
import { isAuthError } from '@/lib/parse/errors';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // React Query retries 3x by default. Without this override, every
        // permission-denied or expired-session response would fire three identical
        // failing requests before surfacing — tripling the latency of the most
        // common error path instead of failing fast.
        retry: (failureCount, error) => !isAuthError(error) && failureCount < 2,
      },
    },
  });
}
