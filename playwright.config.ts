import { defineConfig, devices } from "@playwright/test";

// Smoke-level E2E config for the golden paths (see Software_Timeline.md, Section 13).
// Requires a running dev server (npm run dev) and a real Supabase project reachable
// from .env.local, plus test-account credentials — see tests/e2e/README env vars
// documented at the top of each spec file.
const PORT = process.env.E2E_PORT || "3000";
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Reuses an already-running `npm run dev` server if present; otherwise starts one.
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
