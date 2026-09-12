/**
 * What the tests look like once the setup project has done its work: nothing
 * about auth, because the browser is already signed in.
 */
import { expect, test } from "@playwright/test";

test("an authenticated user can open the dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});

test("the session survives a reload", async ({ page }) => {
  await page.goto("/dashboard");
  await page.reload();

  // The assertion worth making explicitly: a storageState that restores cookies
  // but not localStorage often passes the first navigation and fails this one.
  await expect(page).not.toHaveURL(/\/login/);
});
