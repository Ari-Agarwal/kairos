// Next.js client instrumentation (runs before React hydration).
// Initializes browser-side Sentry error + performance monitoring.
// DSN-gated: inert until NEXT_PUBLIC_SENTRY_DSN is set in the environment.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Lets Sentry trace client-side router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
