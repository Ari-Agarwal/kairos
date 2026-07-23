import { test, expect } from "@playwright/test";
import { counselorCredentials, login, collectConsoleErrors } from "./helpers";

// Golden path 2 (counselor): login -> roster loads -> at-risk page loads ->
// send-reminder button is present and clickable. See Software_Timeline.md
// Section 13. Smoke-level only: not verifying actual email delivery.

test.describe("counselor golden path", () => {
  const creds = counselorCredentials();

  test.skip(!creds, "E2E_COUNSELOR_EMAIL / E2E_COUNSELOR_PASSWORD not set - skipping login-gated smoke test");

  test("login, roster, at-risk page render and reminder flow opens", async ({ page }) => {
    if (!creds) return;
    const errors = collectConsoleErrors(page);

    await login(page, creds.email, creds.password);
    await expect(page).toHaveURL(/\/counselor/);

    await page.goto("/counselor");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/error|something went wrong/i)).toHaveCount(0);

    await page.goto("/counselor/at-risk");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/error|something went wrong/i)).toHaveCount(0);

    // Open the reminder composer on the first flagged student, if any are present.
    const sendReminderButton = page.getByRole("button", { name: /send reminder/i }).first();
    if (await sendReminderButton.count()) {
      await sendReminderButton.click();
      await expect(page.getByRole("textbox").first()).toBeVisible();
    }

    expect(errors, `unexpected console errors: ${errors.join("\n")}`).toEqual([]);
  });
});
