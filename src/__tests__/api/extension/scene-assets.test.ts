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

const { mockFindExtensionSceneAssets } = vi.hoisted(() => ({
  mockFindExtensionSceneAssets: vi.fn(),
}));
vi.mock("@/lib/scene-assets-compat", () => ({
  findExtensionSceneAssets: mockFindExtensionSceneAssets,
}));

import { GET, OPTIONS } from "@/app/api/extension/scene-assets/route";

// ─── Mock data ───────────────────────────────────────────────

const MOCK_PROJECT = { id: "proj_001" };
const MOCK_SCENE = {
  id: "scene_db_001",
  sceneId: "S001",
  storyBeat: "Hero arrives",
};

const MOCK_ASSET = {
  id: "asset_001",
  shotId: null,
  promptPackageId: null,
  parentVersionId: null,
  platformId: "plat_mj",
  platformKey: "midjourney",
  platformLabel: "Midjourney",
  assetType: "IMAGE",
  status: "DRAFT",
  rightsState: "UNKNOWN",
  versionNumber: 1,
  title: "Hero Shot",
  prompt: "A hero at sunset",
  negativePrompt: null,
  modelName: null,
  sourceUrl: null,
  externalAssetId: null,
  outputUrl: "https://cdn.example.com/output.png",
  thumbnailUrl: null,
  costEstimateUsd: null,
  generationSeconds: null,
  queueWaitSeconds: null,
  compareGroup: "cmp_001",
  metadata: null,
  provenance: null,
  tags: [],
  notes: null,
  selected: false,
  createdAt: new Date("2026-02-15T12:00:00Z"),
  createdByName: "Test User",
};

// ─── Setup ───────────────────────────────────────────────────

beforeEach(() => {
  resetPrismaMocks();
  resetExtensionAuthMock();
  mockFindExtensionSceneAssets.mockReset();
});

// ─── Tests ───────────────────────────────────────────────────

describe("GET /api/extension/scene-assets", () => {
  describe("OPTIONS", () => {
    it("returns 204 with CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "GET",
      );
    });
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockExtensionUnauthenticated();

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001", sceneId: "S001" },
        },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("validation", () => {
    it("returns 400 when projectId is missing", async () => {
      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { sceneId: "S001" },
        },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("projectId and sceneId are required");
    });

    it("returns 400 when sceneId is missing", async () => {
      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001" },
        },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("projectId and sceneId are required");
    });

    it("returns 400 when both params are missing", async () => {
      const request = createAuthenticatedRequest("/api/extension/scene-assets");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("projectId and sceneId are required");
    });
  });

  describe("lookup failures", () => {
    it("returns 404 when project not found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001", sceneId: "S001" },
        },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Project not found");
    });

    it("returns 404 when scene not found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(null);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001", sceneId: "S999" },
        },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Scene not found");
    });
  });

  describe("successful response", () => {
    it("returns assets with serialized dates", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([MOCK_ASSET]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001", sceneId: "S001" },
        },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.scene).toEqual(MOCK_SCENE);
      expect(body.assets).toHaveLength(1);
      // createdAt should be ISO string, not a Date object
      expect(body.assets[0].createdAt).toBe("2026-02-15T12:00:00.000Z");
      expect(body.assets[0].id).toBe("asset_001");
      expect(body.assets[0].platformKey).toBe("midjourney");
    });

    it("passes assetType filter to findExtensionSceneAssets", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: {
            projectId: "proj_001",
            sceneId: "S001",
            assetType: "IMAGE",
          },
        },
      );
      await GET(request);

      expect(mockFindExtensionSceneAssets).toHaveBeenCalledWith({
        sceneId: MOCK_SCENE.id,
        assetType: "IMAGE",
        limit: 30,
      });
    });

    it("ignores invalid assetType values", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: {
            projectId: "proj_001",
            sceneId: "S001",
            assetType: "HOLOGRAM",
          },
        },
      );
      await GET(request);

      expect(mockFindExtensionSceneAssets).toHaveBeenCalledWith({
        sceneId: MOCK_SCENE.id,
        assetType: undefined,
        limit: 30,
      });
    });

    it("respects limit parameter with clamping", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: {
            projectId: "proj_001",
            sceneId: "S001",
            limit: "10",
          },
        },
      );
      await GET(request);

      expect(mockFindExtensionSceneAssets).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });

    it("clamps limit to maximum of 100", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: {
            projectId: "proj_001",
            sceneId: "S001",
            limit: "500",
          },
        },
      );
      await GET(request);

      expect(mockFindExtensionSceneAssets).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    it("defaults limit to 30 when not provided", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001", sceneId: "S001" },
        },
      );
      await GET(request);

      expect(mockFindExtensionSceneAssets).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 30 }),
      );
    });

    it("returns empty assets array when none found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001", sceneId: "S001" },
        },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.assets).toEqual([]);
    });

    it("includes CORS headers in response", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockFindExtensionSceneAssets.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        "/api/extension/scene-assets",
        {
          searchParams: { projectId: "proj_001", sceneId: "S001" },
        },
      );
      const response = await GET(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});
