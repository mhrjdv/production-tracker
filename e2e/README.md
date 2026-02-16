# E2E Testing Guide

Playwright end-to-end tests for Lazer V2.

## Overview

These E2E tests verify critical user journeys across the entire application stack:

- **auth.spec.ts** - Authentication flow (NextAuth v5)
- **project-flow.spec.ts** - Project CRUD operations
- **scene-management.spec.ts** - Scene detail tabs and navigation
- **asset-workflow.spec.ts** - Asset lifecycle and Chrome extension API

## Prerequisites

### 1. Install Playwright Browsers

```bash
npx playwright install chromium
```

This downloads the Chromium browser binary required for tests.

### 2. Environment Setup

Create or update `.env.local` with:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Auth Providers (Google, GitHub, etc.)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Optional: E2E Test Configuration
E2E_AUTH_COOKIE="session-token-from-dev-tools"
E2E_PROJECT_ID="clxxxxx"
E2E_SCENE_ID="clyyyyy"
```

### 3. Database with Test Data

```bash
npm run db:migrate
npm run db:seed
```

Ensure the seed script creates at least one project with scenes.

## Running Tests

### All Tests (Headless)

```bash
npm run test:e2e
```

### Headed Mode (Watch Tests Run)

```bash
npm run test:e2e:headed
```

### Debug Mode with Inspector

```bash
npx playwright test --debug
```

### Run Specific Test File

```bash
npx playwright test e2e/auth.spec.ts
```

### Run Tests with Trace

```bash
npx playwright test --trace on
```

View traces:

```bash
npx playwright show-trace test-results/.../trace.zip
```

## Authentication Setup

Most tests require authentication. Three approaches:

### Option 1: Skip Auth-Required Tests (Default)

Tests automatically skip if `E2E_AUTH_COOKIE` is not set:

```bash
npm run test:e2e  # Only runs auth.spec.ts tests
```

### Option 2: Manual Cookie Setup

1. Start dev server: `npm run dev`
2. Sign in via browser at `http://localhost:3000`
3. Open DevTools > Application > Cookies
4. Copy `next-auth.session-token` value
5. Set environment variable:

```bash
export E2E_AUTH_COOKIE="your-session-token"
npm run test:e2e
```

### Option 3: StorageState (Recommended for CI)

Create `e2e/auth.setup.ts`:

```typescript
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Perform authentication steps
  await page.goto('/api/auth/signin');
  await page.getByRole('button', { name: /sign in with google/i }).click();
  // Complete OAuth flow...

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
```

Update `playwright.config.ts`:

```typescript
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
    },
  ],
});
```

## Test Data Setup

Some tests require specific data (projects, scenes):

```bash
# Set test data IDs
export E2E_PROJECT_ID="clxxxxx"
export E2E_SCENE_ID="clyyyyy"
```

Or use database queries to fetch test data dynamically in `beforeAll` hooks.

## Artifacts

Test artifacts are automatically captured:

- **Screenshots**: `test-results/*/screenshot.png` (on failure)
- **Videos**: `test-results/*/video.webm` (on retry)
- **Traces**: `test-results/*/trace.zip` (on retry)
- **HTML Report**: `playwright-report/index.html`

View HTML report:

```bash
npx playwright show-report
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build app
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_URL: http://localhost:3000
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
          E2E_AUTH_COOKIE: ${{ secrets.E2E_AUTH_COOKIE }}

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Debugging Tips

### 1. Use Playwright Inspector

```bash
npx playwright test --debug
```

Step through tests, inspect selectors, view console logs.

### 2. Headed Mode + Slow Motion

```bash
npx playwright test --headed --slow-mo=1000
```

### 3. View Test Trace

Best for understanding failures:

```bash
npx playwright test --trace on
npx playwright show-trace test-results/.../trace.zip
```

### 4. Screenshot on Failure

Screenshots are automatic, but you can add manual ones:

```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### 5. Check Network Requests

```typescript
page.on('response', response => {
  console.log(`${response.status()} ${response.url()}`);
});
```

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  // Skip if auth required
  test.skip(
    !process.env.E2E_AUTH_COOKIE,
    "Requires E2E_AUTH_COOKIE"
  );

  test.beforeEach(async ({ page }) => {
    // Setup auth, navigate to starting page
    if (process.env.E2E_AUTH_COOKIE) {
      await page.context().addCookies([{
        name: "next-auth.session-token",
        value: process.env.E2E_AUTH_COOKIE,
        domain: "localhost",
        path: "/",
      }]);
    }
  });

  test("should do something", async ({ page }) => {
    await page.goto("/path");

    // Use semantic selectors
    await page.getByRole("button", { name: /submit/i }).click();

    // Assert expected state
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

### Selector Best Practices

Prefer in order:

1. **data-testid**: `page.getByTestId("submit-button")`
2. **Role**: `page.getByRole("button", { name: /submit/i })`
3. **Label**: `page.getByLabel("Email")`
4. **Placeholder**: `page.getByPlaceholder("Enter email")`
5. **Text**: `page.getByText(/welcome/i)`
6. **CSS** (last resort): `page.locator(".submit-btn")`

### Auto-Waiting

Playwright auto-waits for elements. No need for explicit waits:

```typescript
// GOOD: Auto-waits for visibility and enables state
await page.getByRole("button").click();

// BAD: Unnecessary timeout
await page.waitForTimeout(1000);
```

### Assertions

Use `expect` with auto-retrying assertions:

```typescript
// Retries until visible or times out
await expect(page.getByText("Loaded")).toBeVisible();

// Check URL
await expect(page).toHaveURL(/dashboard/);

// Check element state
await expect(button).toBeEnabled();
await expect(input).toHaveValue("test");
```

## Test Coverage Goals

### Critical Paths (HIGH Priority)

- Authentication flow (signin, signout, session persistence)
- Project CRUD (create, read, update, delete)
- Scene navigation and tab switching
- Asset capture and version management
- Extension API authentication

### Important Flows (MEDIUM Priority)

- Script upload and parsing
- Shot list generation
- Asset filtering and search
- Compare mode and winner selection
- Rights management

### Nice to Have (LOW Priority)

- Command palette shortcuts
- Timeline visualization
- Export functionality
- Settings and preferences

## Troubleshooting

### Test Fails Locally but Passes in CI

- Check for timing issues (use auto-wait, not `waitForTimeout`)
- Verify environment variables are consistent
- Run with `--trace on` to compare behavior

### Flaky Tests

1. **Identify**: Run with `--repeat-each=10`

```bash
npx playwright test e2e/auth.spec.ts --repeat-each=10
```

2. **Quarantine**: Use `test.fixme()` or `test.skip()`

```typescript
test.fixme("flaky: search autocomplete", async ({ page }) => {
  // Test implementation
});
```

3. **Fix**: Common causes:
   - Race conditions (use auto-wait locators)
   - Network timing (wait for specific responses)
   - Animation timing (wait for `networkidle`)

### Port Already in Use

Kill existing dev server:

```bash
lsof -ti:3000 | xargs kill -9
```

Or configure different port in `playwright.config.ts`.

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locator Strategies](https://playwright.dev/docs/locators)
- [Authentication Guide](https://playwright.dev/docs/auth)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Support

For issues or questions:

1. Check [Playwright Docs](https://playwright.dev)
2. Review existing test examples in this directory
3. Use `--debug` mode to inspect test behavior
4. Check CI logs and artifacts for failures
