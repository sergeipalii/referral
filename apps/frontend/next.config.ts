import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
};

// `withSentryConfig` is what wires the client SDK into the webpack build for
// Next.js. Without it, `sentry.client.config.ts` is never loaded in the
// browser even though the file exists. Server-side instrumentation runs via
// `instrumentation.ts` and does not need this wrapper.
//
// Source-map upload is intentionally left off — it requires a
// SENTRY_AUTH_TOKEN and source-map tooling. Minified stack traces are
// acceptable for MVP error monitoring.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
