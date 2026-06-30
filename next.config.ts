import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Content-Security-Policy — ENFORCING (flipped from report-only Jun 30, 2026
// after a clean console pass across the 3D hero, Stripe checkout, Sentry, and
// the normal app flows). Allowlist rationale:
//   connect-src  — Supabase (REST + realtime ws) and Sentry ingest
//   frame/form   — Stripe Checkout is redirect-based (session.url), not embedded
//   worker/blob  — three.js / @react-three/fiber WebGL may use blob workers
//   'unsafe-inline' on script/style — Next injects inline bootstrap; removing it
//     requires nonce-based middleware (a possible future hardening step).
// If a new third-party (script, image host, API) is added later, extend the
// matching directive here or it will be blocked. To debug a block without
// breaking prod, temporarily switch the header key back to
// "Content-Security-Policy-Report-Only". See
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
  "worker-src 'self' blob:",
  "frame-src https://checkout.stripe.com https://js.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  "manifest-src 'self'",
].join("; ");

// Baseline security headers applied to every response: clickjacking,
// MIME-sniffing, referrer leakage, HTTPS pinning, feature lockdown, and an
// enforcing Content-Security-Policy.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// withSentryConfig adds error/source-map support. Source-map upload only runs
// when SENTRY_AUTH_TOKEN/ORG/PROJECT are present (set in Vercel later); without
// them the build still succeeds, it just skips the upload step.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
