import { vi } from "vitest";
import type { ExtensionAuthContext } from "@/lib/extension-auth";

// ─── Mock Extension Auth ─────────────────────────────────────
// For testing extension API routes

export const DEFAULT_AUTH_CONTEXT: ExtensionAuthContext = {
  userId: "user_test_001",
  tokenId: "token_test_001",
};

export const mockAuthenticateExtensionRequest = vi.fn(
  async (): Promise<ExtensionAuthContext | null> => DEFAULT_AUTH_CONTEXT,
);

export function mockExtensionAuthenticated(
  userId = DEFAULT_AUTH_CONTEXT.userId,
) {
  mockAuthenticateExtensionRequest.mockResolvedValue({
    userId,
    tokenId: "token_test_001",
  });
}

export function mockExtensionUnauthenticated() {
  mockAuthenticateExtensionRequest.mockResolvedValue(null);
}

export function resetExtensionAuthMock() {
  mockAuthenticateExtensionRequest.mockReset();
  mockExtensionAuthenticated();
}
