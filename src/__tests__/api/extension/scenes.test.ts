import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockPrisma, resetPrismaMocks } from "@/__tests__/helpers/mock-prisma";
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

import { GET, OPTIONS } from "@/app/api/extension/scenes/route";

// ─── Setup ───────────────────────────────────────────────────

beforeEach(() => {
  resetPrismaMocks();
  resetExtensionAuthMock();
});

// ─── Tests ───────────────────────────────────────────────────

describe("GET /api/extension/scenes", () => {
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

      const request = createAuthenticatedRequest("/api/extension/scenes", {
        searchParams: { projectId: "proj_001" },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("validation", () => {
    it("returns 400 when no projectId provided", async () => {
      const request = createAuthenticatedRequest("/api/extension/scenes");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("projectId is required");
    });
  });

  describe("lookup failures", () => {
    it("returns 404 when project not found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const request = createAuthenticatedRequest("/api/extension/scenes", {
        searchParams: { projectId: "proj_nonexistent" },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Project not found");
    });

    it("validates project ownership by userId", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const request = createAuthenticatedRequest("/api/extension/scenes", {
        searchParams: { projectId: "proj_001" },
      });
      await GET(request);

      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: "proj_001",
          userId: DEFAULT_AUTH_CONTEXT.userId,
        },
        select: { id: true },
      });
    });
  });

  describe("successful response", () => {
    it("returns scenes ordered by sortOrder", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: "proj_001" });
      mockPrisma.scene.findMany.mockResolvedValue([
        {
          id: "scene_db_001",
          sceneId: "S001",
          storyBeat: "Hero arrives",
          act: "ACT_1",
          macroScene: "Opening",
        },
        {
          id: "scene_db_002",
          sceneId: "S002",
          storyBeat: "Confrontation",
          act: "ACT_2",
          macroScene: "Midpoint",
        },
      ]);

      const request = createAuthenticatedRequest("/api/extension/scenes", {
        searchParams: { projectId: "proj_001" },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.scenes).toHaveLength(2);
      expect(body.scenes[0].sceneId).toBe("S001");
      expect(body.scenes[0].storyBeat).toBe("Hero arrives");
      expect(body.scenes[1].sceneId).toBe("S002");
    });

    it("queries scenes with orderBy sortOrder ascending", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: "proj_001" });
      mockPrisma.scene.findMany.mockResolvedValue([]);

      const request = createAuthenticatedRequest("/api/extension/scenes", {
        searchParams: { projectId: "proj_001" },
      });
      await GET(request);

      expect(mockPrisma.scene.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: "proj_001" },
          orderBy: { sortOrder: "asc" },
        }),
      );
    });

    it("returns empty array when project has no scenes", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: "proj_001" });
      mockPrisma.scene.findMany.mockResolvedValue([]);

      const request = createAuthenticatedRequest("/api/extension/scenes", {
        searchParams: { projectId: "proj_001" },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.scenes).toEqual([]);
    });

    it("includes CORS headers in response", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: "proj_001" });
      mockPrisma.scene.findMany.mockResolvedValue([]);

      const request = createAuthenticatedRequest("/api/extension/scenes", {
        searchParams: { projectId: "proj_001" },
      });
      const response = await GET(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});
