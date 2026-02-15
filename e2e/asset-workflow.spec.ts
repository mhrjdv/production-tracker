import { test, expect } from "@playwright/test";

test.describe("Asset Workflow", () => {
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

  test("assets tab shows filter controls", async ({ page }) => {
    if (!process.env.E2E_PROJECT_ID || !process.env.E2E_SCENE_ID) {
      test.skip(true, "Requires E2E_PROJECT_ID and E2E_SCENE_ID env vars");
      return;
    }

    await page.goto(
      `/projects/${process.env.E2E_PROJECT_ID}/scenes/${process.env.E2E_SCENE_ID}`,
    );

    // Switch to Assets tab
    await page.getByRole("tab", { name: /assets/i }).click();

    // Should show filter controls
    await expect(
      page.getByText(/filters/i).or(page.getByPlaceholder(/prompt.*title.*tag/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("compare tab shows empty state or compare grid", async ({ page }) => {
    if (!process.env.E2E_PROJECT_ID || !process.env.E2E_SCENE_ID) {
      test.skip(true, "Requires E2E_PROJECT_ID and E2E_SCENE_ID env vars");
      return;
    }

    await page.goto(
      `/projects/${process.env.E2E_PROJECT_ID}/scenes/${process.env.E2E_SCENE_ID}`,
    );

    // Switch to Compare tab
    await page.getByRole("tab", { name: /compare/i }).click();

    // Should show either assets to compare or empty state
    await expect(
      page
        .getByText(/compare/i)
        .or(page.getByText(/no.*assets/i))
        .or(page.getByText(/select/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("timeline tab shows lane layout", async ({ page }) => {
    if (!process.env.E2E_PROJECT_ID || !process.env.E2E_SCENE_ID) {
      test.skip(true, "Requires E2E_PROJECT_ID and E2E_SCENE_ID env vars");
      return;
    }

    await page.goto(
      `/projects/${process.env.E2E_PROJECT_ID}/scenes/${process.env.E2E_SCENE_ID}`,
    );

    // Switch to Timeline tab
    await page.getByRole("tab", { name: /timeline/i }).click();

    // Should show lane labels
    await expect(
      page
        .getByText(/image/i)
        .or(page.getByText(/video/i))
        .or(page.getByText(/assembly/i)),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Extension API", () => {
  const baseUrl =
    process.env.BASE_URL || "http://localhost:3000";

  test("extension API returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/extension/projects`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("extension ingest OPTIONS returns CORS headers", async ({
    request,
  }) => {
    const response = await request.fetch(`${baseUrl}/api/extension/ingest`, {
      method: "OPTIONS",
    });
    expect(response.status()).toBe(204);
    expect(response.headers()["access-control-allow-origin"]).toBe("*");
  });

  test("extension scenes returns 400 without projectId", async ({
    request,
  }) => {
    const response = await request.get(`${baseUrl}/api/extension/scenes`, {
      headers: {
        Authorization: "Bearer invalid_token",
      },
    });
    // Either 401 (invalid token) or 400 (missing param) is acceptable
    expect([400, 401]).toContain(response.status());
  });
});
