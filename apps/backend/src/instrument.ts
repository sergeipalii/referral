// Sentry SDK init — this file MUST be imported before the NestJS bootstrap so
// the SDK has a chance to patch Node's HTTP client, fetch, pg, etc. before
// the app opens connections.
//
// No-op when SENTRY_DSN_BACKEND is unset (e.g. in tests or on a dev box).

import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN_BACKEND;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // MVP: errors only, no perf monitoring — keeps us inside the free tier.
    tracesSampleRate: 0,
    // Drop default PII scrubbing off for our own logs; user emails + partner
    // codes already leak in stack traces, and Sentry's UI is access-controlled.
    sendDefaultPii: true,
  });
}
