import { test, expect } from "@playwright/test";
import { studentCredentials, login, collectConsoleErrors } from "./helpers";

// Golden path 1 (student): login -> matches list loads -> timeline loads ->
// open one AI feature (scholarships list) and confirm it renders without error.
// See Software_Timeline.md Section 13. Smoke-level only: page loads, key
// elements render, no console errors -- not a deep assertion suite.

test.describe("student golden path", () => {
  const creds = studentCredentials();

  test.skip(!creds, "E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD not set - skipping login-gated smoke test");

  test("login, matches, timeline, scholarships all render cleanly", async ({ page }) => {
    if (!creds) return;
    const errors = collectConsoleErrors(page);

    await login(page, creds.email, creds.password);
    await expect(page).not.toHaveURL(/\/login$/);

    await page.goto("/matches");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/error|something went wrong/i)).toHaveCount(0);

    await page.goto("/timeline");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/error|something went wrong/i)).toHaveCount(0);

    await page.goto("/scholarships");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/error|something went wrong/i)).toHaveCount(0);

    expect(errors, `unexpected console errors: ${errors.join("\n")}`).toEqual([]);
  });
});
