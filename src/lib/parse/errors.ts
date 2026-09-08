/**
 * Where the failing call came from — code 101 means something different in each:
 * an invalid login, or (on every other read) a missing/forbidden object. Never
 * return one global message for that code.
 */
export type ErrorContext = 'login' | 'fetch';

/** Maps a Parse.Error (or anything else a query might throw) to user-facing copy. */
export function parseErrorMessage(error: unknown, context: ErrorContext): string {
  const code = getErrorCode(error);

  switch (code) {
    case 100:
      return "Can't reach the server. Check your connection and try again.";
    case 101:
      return context === 'login'
        ? 'Invalid username or password.'
        : "You don't have permission to view this, or it no longer exists.";
    case 119:
      return "You don't have permission to do that.";
    case 141:
      return 'The server rejected that request.';
    case 209:
      return 'Your session has expired. Please sign in again.';
    default:
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[parse:${context}]`, error);
      }
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Codes that mean "this session or account cannot do this" rather than "the
 * network hiccupped, try again" — used by the QueryClient's retry policy so a
 * permission or session failure surfaces immediately instead of after 3 identical
 * retries (see lib/query/client.ts).
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 101 || code === 119 || code === 209;
}

function getErrorCode(error: unknown): number | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
  ) {
    return (error as { code: number }).code;
  }
  return undefined;
}
