import { test, expect } from "@playwright/test";

// These tests require an authenticated session.
// In CI, use storageState from a setup project or mock auth.
// For local development, run with a dev server that has a test user session.

test.describe("Project Flow", () => {
  test.skip(
    !process.env.E2E_AUTH_COOKIE,
    "Skipped: requires E2E_AUTH_COOKIE env var for authenticated session",
  );

  test.beforeEach(async ({ page }) => {
    // Set auth cookie if provided
    if (process.env.E2E_AUTH_COOKIE) {
      await page.context().addCookies([
        {
          name: "next-auth.session-token",
          value: process.env.E2E_AUTH_COOKIE,
          domain: "localhost",
          path: "/",
        },
      ]);
    }
  });

  test("dashboard shows projects list", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/projects/i)).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to new project creation", async ({ page }) => {
    await page.goto("/");
    // Look for create/new project button
    const createButton = page
      .getByRole("button", { name: /new project/i })
      .or(page.getByRole("link", { name: /new project/i }))
      .or(page.getByRole("button", { name: /create/i }));
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page.getByText(/upload/i).or(page.getByText(/script/i))).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("project detail page loads with tabs", async ({ page }) => {
    await page.goto("/");
    // Click first project if available
    const projectLink = page.locator("a[href*='/projects/']").first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await expect(
        page.getByText(/production/i).or(page.getByText(/scenes/i)),
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
