import { test, expect } from "@playwright/test";

test.describe("Scene Management", () => {
  test.skip(
    !process.env.E2E_AUTH_COOKIE,
    "Skipped: requires E2E_AUTH_COOKIE env var for authenticated session",
  );

  test.beforeEach(async ({ page }) => {
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

  test("scene detail page has tabbed layout", async ({ page }) => {
    // Navigate to a known scene (requires seeded data)
    if (!process.env.E2E_PROJECT_ID || !process.env.E2E_SCENE_ID) {
      test.skip(true, "Requires E2E_PROJECT_ID and E2E_SCENE_ID env vars");
      return;
    }

    await page.goto(
      `/projects/${process.env.E2E_PROJECT_ID}/scenes/${process.env.E2E_SCENE_ID}`,
    );

    // Verify tab structure
    await expect(page.getByRole("tab", { name: /script/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("tab", { name: /shots/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /assets/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /compare/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /timeline/i })).toBeVisible();
  });

  test("can switch between scene tabs", async ({ page }) => {
    if (!process.env.E2E_PROJECT_ID || !process.env.E2E_SCENE_ID) {
      test.skip(true, "Requires E2E_PROJECT_ID and E2E_SCENE_ID env vars");
      return;
    }

    await page.goto(
      `/projects/${process.env.E2E_PROJECT_ID}/scenes/${process.env.E2E_SCENE_ID}`,
    );

    // Click Shots tab
    await page.getByRole("tab", { name: /shots/i }).click();
    await expect(page.getByText(/shot/i)).toBeVisible({ timeout: 5000 });

    // Click Assets tab
    await page.getByRole("tab", { name: /assets/i }).click();
    await expect(
      page.getByText(/asset/i).or(page.getByText(/version/i)),
    ).toBeVisible({ timeout: 5000 });

    // Click Compare tab
    await page.getByRole("tab", { name: /compare/i }).click();
    await expect(
      page.getByText(/compare/i).or(page.getByText(/select.*assets/i)),
    ).toBeVisible({ timeout: 5000 });

    // Click Timeline tab
    await page.getByRole("tab", { name: /timeline/i }).click();
    await expect(
      page.getByText(/timeline/i).or(page.getByText(/lane/i)),
    ).toBeVisible({ timeout: 5000 });
  });

  test("command palette opens with Ctrl+K", async ({ page }) => {
    if (!process.env.E2E_PROJECT_ID || !process.env.E2E_SCENE_ID) {
      test.skip(true, "Requires E2E_PROJECT_ID and E2E_SCENE_ID env vars");
      return;
    }

    await page.goto(
      `/projects/${process.env.E2E_PROJECT_ID}/scenes/${process.env.E2E_SCENE_ID}`,
    );

    await page.waitForLoadState("networkidle");

    // Open command palette
    await page.keyboard.press("Control+k");

    // Should show search/command dialog
    await expect(
      page
        .getByPlaceholder(/search/i)
        .or(page.getByRole("dialog")),
    ).toBeVisible({ timeout: 5000 });
  });
});
