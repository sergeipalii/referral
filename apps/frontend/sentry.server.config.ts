// Sentry server-side init (Node runtime of Next.js — SSR/RSC/route handlers).
// Reuses the same DSN as the client bundle — a single Sentry project receives
// both client and SSR errors for the frontend.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}
