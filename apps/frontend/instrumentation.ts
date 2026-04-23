// Next.js `instrumentation` hook — runs once per runtime before any request.
// Picks the right Sentry init file based on NEXT_RUNTIME.
// See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs';
