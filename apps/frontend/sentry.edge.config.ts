// Sentry init for the Edge runtime (middleware + route handlers declared with
// `export const runtime = "edge"`). We don't use edge runtime today, but the
// file must exist or Next will warn during build.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}
