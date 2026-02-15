import { vi } from "vitest";

// ─── Mock Auth Session ───────────────────────────────────────
// Default: authenticated user. Call mockUnauthenticated() to simulate no session.

export const DEFAULT_USER = {
  id: "user_test_001",
  name: "Test User",
  email: "test@example.com",
};

const mockAuthFn = vi.fn(async () => ({
  user: DEFAULT_USER,
  expires: new Date(Date.now() + 86400000).toISOString(),
}));

export const mockAuth = mockAuthFn;

export function mockAuthenticated(userId = DEFAULT_USER.id) {
  mockAuthFn.mockResolvedValue({
    user: { ...DEFAULT_USER, id: userId },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

export function mockUnauthenticated() {
  mockAuthFn.mockResolvedValue(
    null as unknown as {
      user: { id: string; name: string; email: string };
      expires: string;
    },
  );
}

export function resetAuthMock() {
  mockAuthFn.mockReset();
  mockAuthenticated();
}
