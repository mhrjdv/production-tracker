import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockPrisma, resetPrismaMocks } from "@/__tests__/helpers/mock-prisma";
import {
  mockAuthenticateExtensionRequest,
  mockExtensionAuthenticated,
  mockExtensionUnauthenticated,
  resetExtensionAuthMock,
  DEFAULT_AUTH_CONTEXT,
} from "@/__tests__/helpers/mock-extension-auth";
import { createAuthenticatedRequest } from "@/__tests__/helpers/mock-request";

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));
vi.mock("@/lib/extension-auth", () => ({
  authenticateExtensionRequest: mockAuthenticateExtensionRequest,
  getExtensionCorsHeaders: () => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  }),
}));

import { GET, OPTIONS } from "@/app/api/extension/projects/route";

// ─── Setup ───────────────────────────────────────────────────

beforeEach(() => {
  resetPrismaMocks();
  resetExtensionAuthMock();
});

// ─── Tests ───────────────────────────────────────────────────

describe("GET /api/extension/projects", () => {
  describe("OPTIONS", () => {
    it("returns 204 with CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    });
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockExtensionUnauthenticated();

      const request = createAuthenticatedRequest("/api/extension/projects");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("successful response", () => {
    it("returns projects with scene count", async () => {
      const mockDate = new Date("2026-02-15T10:00:00Z");
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: "proj_001",
          name: "Film One",
          status: "IN_PROGRESS",
          genre: "Drama",
          updatedAt: mockDate,
          _count: { scenes: 3 },
        },
        {
          id: "proj_002",
          name: "Film Two",
          status: "COMPLETED",
          genre: "SciFi",
          updatedAt: mockDate,
          _count: { scenes: 7 },
        },
      ]);

      const request = createAuthenticatedRequest("/api/extension/projects");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.projects).toHaveLength(2);

      expect(body.projects[0]).toEqual({
        id: "proj_001",
        name: "Film One",
        status: "IN_PROGRESS",
        genre: "Drama",
        updatedAt: mockDate.toISOString(),
        sceneCount: 3,
      });
      expect(body.projects[1].sceneCount).toBe(7);
    });

    it("returns empty array when user has no projects", async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);

      const request = createAuthenticatedRequest("/api/extension/projects");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.projects).toEqual([]);
    });

    it("queries projects by authenticated userId ordered by updatedAt desc", async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);

      const request = createAuthenticatedRequest("/api/extension/projects");
      await GET(request);

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: DEFAULT_AUTH_CONTEXT.userId },
          orderBy: { updatedAt: "desc" },
        }),
      );
    });

    it("includes CORS headers in response", async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);

      const request = createAuthenticatedRequest("/api/extension/projects");
      const response = await GET(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});
