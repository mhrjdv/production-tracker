import { test, expect } from "@playwright/test";

/**
 * E2E Test: Authentication Flow
 *
 * This test suite covers the authentication journey using NextAuth v5.
 *
 * SETUP REQUIRED FOR FULL TESTING:
 * - Auth state management via storageState (see e2e/README.md)
 * - Test user account or OAuth provider mocking
 * - Session cookie management
 *
 * Current tests verify:
 * - Unauthenticated access redirects
 * - Auth provider availability
 * - Protected route behavior
 *
 * TODO:
 * - Implement authenticated user tests with storageState
 * - Add session persistence tests
 * - Add signout flow test
 */

test.describe("Authentication", () => {
  test("unauthenticated user sees sign-in page", async ({ page }) => {
    await page.goto("/");
    // Should redirect to sign-in or show auth UI
    await expect(
      page
        .getByRole("button", { name: /sign in/i })
        .or(page.getByText(/sign in/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("sign-in page has Google provider button", async ({ page }) => {
    await page.goto("/api/auth/signin");
    await expect(
      page
        .getByRole("button", { name: /google/i })
        .or(page.getByText(/google/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("protected routes redirect when not authenticated", async ({ page }) => {
    await page.goto("/projects/test-id");
    // Should redirect to auth or show 404/unauthorized
    const url = page.url();
    expect(
      url.includes("signin") ||
        url.includes("auth") ||
        url === "http://localhost:3000/",
    ).toBeTruthy();
  });

  // Future authenticated tests (requires storageState setup)
  test.describe("Authenticated User Flow", () => {
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

    test("authenticated user can access dashboard", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");
      // Should show user-specific content
      await expect(
        page.getByText(/projects/i).or(page.getByText(/welcome/i)),
      ).toBeVisible({ timeout: 10000 });
    });

    test("authenticated user can navigate to protected routes", async ({
      page,
    }) => {
      await page.goto("/projects");
      // Should not redirect to signin
      expect(page.url()).not.toContain("signin");
      expect(page.url()).not.toContain("auth");
    });
  });
});
