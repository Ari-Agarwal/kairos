// Sentry server-side (Node.js runtime) initialization.
// Imported by src/instrumentation.ts on server startup.
// DSN-gated: inert until NEXT_PUBLIC_SENTRY_DSN is set in the environment.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Capture 100% of transactions for now; dial down post-launch if volume is high.
  tracesSampleRate: 1.0,
});
