// Sentry edge-runtime initialization (middleware / edge routes).
// Imported by src/instrumentation.ts when running on the edge runtime.
// DSN-gated: inert until NEXT_PUBLIC_SENTRY_DSN is set in the environment.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
