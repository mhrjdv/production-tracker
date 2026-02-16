import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mockAuthenticateExtensionRequest,
  mockExtensionAuthenticated,
  mockExtensionUnauthenticated,
  resetExtensionAuthMock,
  DEFAULT_AUTH_CONTEXT,
} from "@/__tests__/helpers/mock-extension-auth";
import {
  createMockRequest,
  createAuthenticatedRequest,
} from "@/__tests__/helpers/mock-request";

vi.mock("@/lib/extension-auth", () => ({
  authenticateExtensionRequest: mockAuthenticateExtensionRequest,
  getExtensionCorsHeaders: () => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  }),
}));

const {
  mockSanitizeExtensionPreferencesUpdate,
  mockGetUserExtensionPreferences,
  mockSaveUserExtensionPreferences,
} = vi.hoisted(() => ({
  mockSanitizeExtensionPreferencesUpdate: vi.fn((input: unknown) => input),
  mockGetUserExtensionPreferences: vi.fn(),
  mockSaveUserExtensionPreferences: vi.fn(),
}));
vi.mock("@/lib/extension-profile", () => ({
  sanitizeExtensionPreferencesUpdate: mockSanitizeExtensionPreferencesUpdate,
}));
vi.mock("@/lib/extension-preferences-compat", () => ({
  getUserExtensionPreferences: mockGetUserExtensionPreferences,
  saveUserExtensionPreferences: mockSaveUserExtensionPreferences,
}));

import { GET, PUT, OPTIONS } from "@/app/api/extension/profile/route";

// ─── Mock data ───────────────────────────────────────────────

const MOCK_PREFERENCES = {
  lastProjectId: "proj_001",
  lastSceneId: "S001",
  lastPlatform: "midjourney",
};

// ─── Setup ───────────────────────────────────────────────────

beforeEach(() => {
  resetExtensionAuthMock();
  mockGetUserExtensionPreferences.mockReset();
  mockSaveUserExtensionPreferences.mockReset();
  mockSanitizeExtensionPreferencesUpdate.mockReset();
  mockSanitizeExtensionPreferencesUpdate.mockImplementation(
    (input: unknown) => input,
  );
});

// ─── Tests ───────────────────────────────────────────────────

describe("/api/extension/profile", () => {
  describe("OPTIONS", () => {
    it("returns 204 with CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "PUT",
      );
    });
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      mockExtensionUnauthenticated();

      const request = createAuthenticatedRequest("/api/extension/profile");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns preferences for authenticated user", async () => {
      mockGetUserExtensionPreferences.mockResolvedValue(MOCK_PREFERENCES);

      const request = createAuthenticatedRequest("/api/extension/profile");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.preferences).toEqual(MOCK_PREFERENCES);
    });

    it("calls getUserExtensionPreferences with userId", async () => {
      mockGetUserExtensionPreferences.mockResolvedValue({});

      const request = createAuthenticatedRequest("/api/extension/profile");
      await GET(request);

      expect(mockGetUserExtensionPreferences).toHaveBeenCalledWith(
        DEFAULT_AUTH_CONTEXT.userId,
      );
    });

    it("returns empty preferences when none set", async () => {
      mockGetUserExtensionPreferences.mockResolvedValue({});

      const request = createAuthenticatedRequest("/api/extension/profile");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.preferences).toEqual({});
    });

    it("includes CORS headers in response", async () => {
      mockGetUserExtensionPreferences.mockResolvedValue({});

      const request = createAuthenticatedRequest("/api/extension/profile");
      const response = await GET(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("PUT", () => {
    it("returns 401 when unauthenticated", async () => {
      mockExtensionUnauthenticated();

      const request = createMockRequest("/api/extension/profile", {
        method: "PUT",
        headers: { Authorization: "Bearer lzr_test_token" },
        body: { preferences: MOCK_PREFERENCES },
      });
      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid body (non-JSON)", async () => {
      const { NextRequest } = await import("next/server");
      const url = new URL("/api/extension/profile", "http://localhost:3000");
      const request = new NextRequest(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer lzr_test_token",
        },
        body: "not json {{{",
      });

      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid payload");
    });

    it("returns 404 when user not found", async () => {
      mockSaveUserExtensionPreferences.mockResolvedValue({
        foundUser: false,
        preferences: {},
        persisted: false,
      });

      const request = createAuthenticatedRequest("/api/extension/profile", {
        method: "PUT",
        body: { preferences: { lastProjectId: "proj_001" } },
      });
      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("User not found");
    });

    it("saves and returns updated preferences", async () => {
      const updatedPrefs = {
        lastProjectId: "proj_002",
        lastSceneId: "S005",
        lastPlatform: "runway",
      };
      mockSaveUserExtensionPreferences.mockResolvedValue({
        foundUser: true,
        preferences: updatedPrefs,
        persisted: true,
      });

      const request = createAuthenticatedRequest("/api/extension/profile", {
        method: "PUT",
        body: { preferences: { lastProjectId: "proj_002" } },
      });
      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.preferences).toEqual(updatedPrefs);
    });

    it("calls sanitizeExtensionPreferencesUpdate with the input", async () => {
      const inputPrefs = { lastProjectId: "proj_002" };
      mockSaveUserExtensionPreferences.mockResolvedValue({
        foundUser: true,
        preferences: inputPrefs,
        persisted: true,
      });

      const request = createAuthenticatedRequest("/api/extension/profile", {
        method: "PUT",
        body: { preferences: inputPrefs },
      });
      await PUT(request);

      expect(mockSanitizeExtensionPreferencesUpdate).toHaveBeenCalledWith(
        inputPrefs,
      );
    });

    it("calls saveUserExtensionPreferences with userId and sanitized data", async () => {
      const inputPrefs = { lastProjectId: "proj_002" };
      const sanitizedPrefs = { lastProjectId: "proj_002_sanitized" };
      mockSanitizeExtensionPreferencesUpdate.mockReturnValue(sanitizedPrefs);
      mockSaveUserExtensionPreferences.mockResolvedValue({
        foundUser: true,
        preferences: sanitizedPrefs,
        persisted: true,
      });

      const request = createAuthenticatedRequest("/api/extension/profile", {
        method: "PUT",
        body: { preferences: inputPrefs },
      });
      await PUT(request);

      expect(mockSaveUserExtensionPreferences).toHaveBeenCalledWith(
        DEFAULT_AUTH_CONTEXT.userId,
        sanitizedPrefs,
      );
    });

    it("handles empty preferences in body", async () => {
      mockSaveUserExtensionPreferences.mockResolvedValue({
        foundUser: true,
        preferences: {},
        persisted: true,
      });

      const request = createAuthenticatedRequest("/api/extension/profile", {
        method: "PUT",
        body: {}, // no preferences key
      });
      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.preferences).toEqual({});
    });

    it("includes CORS headers in response", async () => {
      mockSaveUserExtensionPreferences.mockResolvedValue({
        foundUser: true,
        preferences: {},
        persisted: true,
      });

      const request = createAuthenticatedRequest("/api/extension/profile", {
        method: "PUT",
        body: { preferences: {} },
      });
      const response = await PUT(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});
