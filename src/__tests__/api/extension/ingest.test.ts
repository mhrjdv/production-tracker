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
vi.mock("@/lib/extension-ingest-schema", async () => {
  return vi.importActual("@/lib/extension-ingest-schema");
});

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { POST, OPTIONS } from "@/app/api/extension/ingest/route";

// ─── Minimal valid ingest payload ────────────────────────────

const VALID_PAYLOAD = {
  projectId: "proj_001",
  sceneId: "S001",
  platformKey: "midjourney",
  assetType: "IMAGE" as const,
  prompt: "A hero on a cliff at sunset",
};

// ─── Reusable mock data ──────────────────────────────────────

const MOCK_PROJECT = { id: "proj_001" };
const MOCK_SCENE = {
  id: "scene_db_001",
  sceneId: "S001",
  projectId: "proj_001",
};
const MOCK_PLATFORM = { id: "plat_mj", slug: "midjourney", name: "Midjourney" };

const MOCK_CREATED_ASSET = {
  id: "asset_001",
  versionNumber: 1,
  platformKey: "midjourney",
  platformLabel: "Midjourney",
  assetType: "IMAGE",
  status: "DRAFT",
  rightsState: "UNKNOWN",
  shotId: null,
  createdAt: new Date("2026-02-15T12:00:00Z"),
};

// ─── Setup ───────────────────────────────────────────────────

function setupSuccessfulLookups() {
  mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
  mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
  mockPrisma.aiPlatform.findUnique.mockResolvedValue(MOCK_PLATFORM);
  mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
    _max: { versionNumber: 0 },
  });
  mockPrisma.sceneAssetVersion.create.mockResolvedValue(MOCK_CREATED_ASSET);
}

beforeEach(() => {
  resetPrismaMocks();
  resetExtensionAuthMock();
  mockRevalidatePath.mockReset();
});

// ─── Tests ───────────────────────────────────────────────────

describe("POST /api/extension/ingest", () => {
  describe("OPTIONS", () => {
    it("returns 204 with CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST",
      );
    });
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockExtensionUnauthenticated();

      const request = createMockRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      // Simulate a request that fails JSON parsing by providing a request
      // with broken body content. We use a raw Request to bypass json helpers.
      const url = new URL("/api/extension/ingest", "http://localhost:3000");
      const request = new Request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer lzr_test_token",
        },
        body: "not-valid-json{{{",
      });
      // Use the NextRequest constructor imported from next/server in the route
      // but the route handler accepts a generic Request-compatible object,
      // so passing a raw Request should also exercise the .json().catch path.
      const { NextRequest } = await import("next/server");
      const nextReq = new NextRequest(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer lzr_test_token",
        },
        body: "not-valid-json{{{",
      });

      const response = await POST(nextReq);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid payload");
    });

    it("returns 400 for missing required fields", async () => {
      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: { projectId: "proj_001" }, // missing sceneId, platformKey, assetType, prompt
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid payload");
      expect(body.details).toBeDefined();
    });
  });

  describe("lookup failures", () => {
    it("returns 404 when project not found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Project not found");
    });

    it("returns 404 when scene not found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(null);

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Scene not found");
    });

    it("returns 404 when shot not found for scene", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockPrisma.aiPlatform.findUnique.mockResolvedValue(MOCK_PLATFORM);
      mockPrisma.shot.findFirst.mockResolvedValue(null);

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: { ...VALID_PAYLOAD, shotId: "shot_nonexistent" },
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Shot not found for scene");
    });
  });

  describe("successful ingestion", () => {
    it("creates asset version on valid payload", async () => {
      setupSuccessfulLookups();

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.asset).toBeDefined();
      expect(body.asset.id).toBe("asset_001");

      // Verify sceneAssetVersion.create was called via the transaction
      expect(mockPrisma.sceneAssetVersion.create).toHaveBeenCalledOnce();
      const createCall = mockPrisma.sceneAssetVersion.create.mock.calls[0][0];
      expect(createCall.data.sceneId).toBe(MOCK_SCENE.id);
      expect(createCall.data.platformKey).toBe("midjourney");
      expect(createCall.data.assetType).toBe("IMAGE");
      expect(createCall.data.prompt).toBe("A hero on a cliff at sunset");
      expect(createCall.data.createdById).toBe(DEFAULT_AUTH_CONTEXT.userId);
    });

    it("calls revalidatePath for all relevant dashboard pages", async () => {
      setupSuccessfulLookups();

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      expect(response.status).toBe(200);

      // Should revalidate scene detail, gallery, production, and timeline
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/projects/${MOCK_PROJECT.id}/scenes/${MOCK_SCENE.sceneId}`,
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/projects/${MOCK_PROJECT.id}/gallery`,
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/projects/${MOCK_PROJECT.id}/production`,
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/projects/${MOCK_PROJECT.id}/timeline`,
      );
    });

    it("does not call revalidatePath on failure", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockPrisma.aiPlatform.findUnique.mockResolvedValue(MOCK_PLATFORM);
      mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
        _max: { versionNumber: 0 },
      });
      mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
      expect(mockRevalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("auto-increments version number", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockPrisma.aiPlatform.findUnique.mockResolvedValue(MOCK_PLATFORM);
      mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
        _max: { versionNumber: 5 },
      });
      mockPrisma.sceneAssetVersion.create.mockResolvedValue({
        ...MOCK_CREATED_ASSET,
        versionNumber: 6,
      });

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);

      const createCall = mockPrisma.sceneAssetVersion.create.mock.calls[0][0];
      expect(createCall.data.versionNumber).toBe(6);
    });

    it("handles selected=true by deselecting others first", async () => {
      setupSuccessfulLookups();
      mockPrisma.sceneAssetVersion.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.sceneAssetVersion.create.mockResolvedValue({
        ...MOCK_CREATED_ASSET,
        status: "SELECTED",
        selected: true,
      });

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: { ...VALID_PAYLOAD, selected: true },
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);

      // Verify updateMany was called to deselect previous selections
      expect(mockPrisma.sceneAssetVersion.updateMany).toHaveBeenCalledOnce();
      const updateCall =
        mockPrisma.sceneAssetVersion.updateMany.mock.calls[0][0];
      expect(updateCall.where.sceneId).toBe(MOCK_SCENE.id);
      expect(updateCall.where.selected).toBe(true);
      expect(updateCall.data.selected).toBe(false);
      expect(updateCall.data.status).toBe("GENERATED");

      // Verify the created asset has selected status
      const createCall = mockPrisma.sceneAssetVersion.create.mock.calls[0][0];
      expect(createCall.data.status).toBe("SELECTED");
      expect(createCall.data.selected).toBe(true);
    });

    it("generates compare group when none provided", async () => {
      setupSuccessfulLookups();

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD, // no compareGroup field
      });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const createCall = mockPrisma.sceneAssetVersion.create.mock.calls[0][0];
      // compareGroup should be auto-generated (non-empty string)
      expect(createCall.data.compareGroup).toBeDefined();
      expect(typeof createCall.data.compareGroup).toBe("string");
      expect(createCall.data.compareGroup.length).toBeGreaterThan(0);
    });

    it("uses provided compareGroup when specified", async () => {
      setupSuccessfulLookups();

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: { ...VALID_PAYLOAD, compareGroup: "custom_cmp_001" },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const createCall = mockPrisma.sceneAssetVersion.create.mock.calls[0][0];
      expect(createCall.data.compareGroup).toBe("custom_cmp_001");
    });

    it("validates project ownership by userId", async () => {
      setupSuccessfulLookups();

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      await POST(request);

      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: VALID_PAYLOAD.projectId,
          userId: DEFAULT_AUTH_CONTEXT.userId,
        },
        select: { id: true },
      });
    });

    it("uppercases sceneId for lookup", async () => {
      setupSuccessfulLookups();

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: { ...VALID_PAYLOAD, sceneId: "s001" },
      });
      await POST(request);

      expect(mockPrisma.scene.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_sceneId: {
              projectId: MOCK_PROJECT.id,
              sceneId: "S001",
            },
          },
        }),
      );
    });
  });

  describe("error sanitization", () => {
    it("sanitizes unexpected error messages", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockPrisma.aiPlatform.findUnique.mockResolvedValue(MOCK_PLATFORM);
      mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
        _max: { versionNumber: 0 },
      });

      // Simulate a transaction failure with an unsafe error message
      mockPrisma.$transaction.mockRejectedValue(
        new Error("UNIQUE constraint failed: internal DB detail"),
      );

      // Suppress expected console.error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe(
        "Ingestion failed. Please check your payload and try again.",
      );
      expect(body.error).not.toContain("UNIQUE constraint");

      consoleSpy.mockRestore();
    });

    it("passes through safe error messages", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT);
      mockPrisma.scene.findUnique.mockResolvedValue(MOCK_SCENE);
      mockPrisma.aiPlatform.findUnique.mockResolvedValue(MOCK_PLATFORM);
      mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
        _max: { versionNumber: 0 },
      });

      // Simulate a transaction failure with a safe error message
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Prompt package not found for scene"),
      );

      const request = createAuthenticatedRequest("/api/extension/ingest", {
        method: "POST",
        body: VALID_PAYLOAD,
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Prompt package not found for scene");
    });
  });
});
