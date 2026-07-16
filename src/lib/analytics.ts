"use client";

import posthog from "posthog-js";

// Every "instrumentation" checkbox in Phase 3 depends on a real product-
// analytics tool actually being wired up (flagged during the Jul 14 pass --
// @vercel/analytics is pageview-only and can't answer funnel questions like
// "what % of signups reach a first match"). This wrapper no-ops until
// NEXT_PUBLIC_POSTHOG_KEY is set, so it's safe to call from anywhere in the
// app before the account/key actually exists.
let initialized = false;

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
  });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  ensureInit();
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  ensureInit();
  if (!initialized) return;
  posthog.identify(userId, properties);
}
