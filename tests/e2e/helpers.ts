import type { Page } from "@playwright/test";

/**
 * Golden-path smoke tests need a real, logged-in Supabase session — there is no
 * way to fake auth cookies against a real project. `supabase/seed_test_students.sql`
 * intentionally seeds students as DB-only fixtures with a placeholder password hash
 * ("no real login needed"), and `supabase/seed_counselor.sql` expects the counselor's
 * auth user to already exist from a normal signup. So a runnable login needs a real
 * account created once (e.g. via the signup page or Supabase dashboard) with a known
 * password, whose credentials are then exported as env vars:
 *
 *   E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD
 *   E2E_COUNSELOR_EMAIL / E2E_COUNSELOR_PASSWORD
 *
 * Tests that need credentials skip (rather than fail) when the relevant env vars
 * are not set, so `npm run test:e2e` is still safe to run without them configured.
 */
export function studentCredentials() {
  const email = process.env.E2E_STUDENT_EMAIL;
  const password = process.env.E2E_STUDENT_PASSWORD;
  return email && password ? { email, password } : null;
}

export function counselorCredentials() {
  const email = process.env.E2E_COUNSELOR_EMAIL;
  const password = process.env.E2E_COUNSELOR_PASSWORD;
  return email && password ? { email, password } : null;
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /log ?in|sign ?in/i }).click();
}

/** Collects console errors thrown while `fn` runs; returns them for assertion. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}
