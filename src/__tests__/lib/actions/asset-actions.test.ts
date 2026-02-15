import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockPrisma, resetPrismaMocks } from "@/__tests__/helpers/mock-prisma";
import {
  mockAuthenticated,
  mockUnauthenticated,
  resetAuthMock,
  mockAuth,
  DEFAULT_USER,
} from "@/__tests__/helpers/mock-auth";
import {
  mockRevalidatePath,
  resetNextMocks,
} from "@/__tests__/helpers/mock-next";

// Mock modules BEFORE importing the functions under test
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

// NOW import the functions under test
import {
  createSceneAssetVersion,
  updateSceneAssetVersion,
  deleteSceneAssetVersion,
  createSceneAssetFanout,
} from "@/lib/actions/asset-actions";

// Re-export AssetStatus/AssetType/RightsState as plain enums for test usage
// (Prisma enums are string enums, so we replicate them here)
const AssetStatus = {
  DRAFT: "DRAFT",
  GENERATED: "GENERATED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  REVIEWED: "REVIEWED",
  APPROVED: "APPROVED",
  SELECTED: "SELECTED",
  REJECTED: "REJECTED",
  ARCHIVED: "ARCHIVED",
  FINAL: "FINAL",
} as const;

const AssetType = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
} as const;

const RightsState = {
  UNKNOWN: "UNKNOWN",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCENE_FIXTURE = {
  id: "scene_db_001",
  sceneId: "SC001",
  projectId: "project_001",
};

function baseCreateData(overrides: Record<string, unknown> = {}) {
  return {
    platformKey: "sora",
    platformLabel: "Sora",
    assetType: AssetType.IMAGE as any,
    prompt: "A beautiful sunset over the mountains",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetPrismaMocks();
  resetAuthMock();
  resetNextMocks();
});

// ---------------------------------------------------------------------------
// validateStatusTransition (tested indirectly via updateSceneAssetVersion)
// ---------------------------------------------------------------------------

describe("status transition validation", () => {
  function setupExistingAsset(currentStatus: string) {
    mockPrisma.sceneAssetVersion.findFirst.mockResolvedValue({
      id: "asset_001",
      sceneId: SCENE_FIXTURE.id,
      assetType: AssetType.IMAGE,
      status: currentStatus,
      scene: {
        projectId: SCENE_FIXTURE.projectId,
        sceneId: SCENE_FIXTURE.sceneId,
      },
    });
    mockPrisma.sceneAssetVersion.update.mockResolvedValue({});
    mockPrisma.sceneAssetVersion.updateMany.mockResolvedValue({ count: 0 });
  }

  it("allows DRAFT -> GENERATED", async () => {
    setupExistingAsset(AssetStatus.DRAFT);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.GENERATED as any,
      }),
    ).resolves.toBeUndefined();
  });

  it("allows GENERATED -> SELECTED", async () => {
    setupExistingAsset(AssetStatus.GENERATED);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.SELECTED as any,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects DRAFT -> FINAL (not allowed)", async () => {
    setupExistingAsset(AssetStatus.DRAFT);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.FINAL as any,
      }),
    ).rejects.toThrow("Invalid status transition");
  });

  it("rejects ARCHIVED -> SELECTED (not allowed)", async () => {
    setupExistingAsset(AssetStatus.ARCHIVED);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.SELECTED as any,
      }),
    ).rejects.toThrow("Invalid status transition");
  });

  it("rejects NEEDS_REVIEW -> FINAL (not allowed)", async () => {
    setupExistingAsset(AssetStatus.NEEDS_REVIEW);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.FINAL as any,
      }),
    ).rejects.toThrow("Invalid status transition");
  });

  it("allows same-status update without error", async () => {
    setupExistingAsset(AssetStatus.DRAFT);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.DRAFT as any,
      }),
    ).resolves.toBeUndefined();
  });

  it("allows REJECTED -> DRAFT (reopen)", async () => {
    setupExistingAsset(AssetStatus.REJECTED);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.DRAFT as any,
      }),
    ).resolves.toBeUndefined();
  });

  it("allows FINAL -> ARCHIVED", async () => {
    setupExistingAsset(AssetStatus.FINAL);
    await expect(
      updateSceneAssetVersion("asset_001", {
        status: AssetStatus.ARCHIVED as any,
      }),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// createSceneAssetVersion
// ---------------------------------------------------------------------------

describe("createSceneAssetVersion", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      createSceneAssetVersion("scene_db_001", baseCreateData()),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when scene not found for user", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(null);
    await expect(
      createSceneAssetVersion("scene_db_001", baseCreateData()),
    ).rejects.toThrow("Scene not found");
  });

  it("creates asset with correct version number (first version)", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
      _max: { versionNumber: null },
    });
    const createdAsset = { id: "asset_new", versionNumber: 1 };
    mockPrisma.sceneAssetVersion.create.mockResolvedValue(createdAsset);

    const result = await createSceneAssetVersion(
      "scene_db_001",
      baseCreateData(),
    );

    expect(result).toEqual(createdAsset);
    expect(mockPrisma.sceneAssetVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 1,
          platformKey: "sora",
          sceneId: SCENE_FIXTURE.id,
          createdById: DEFAULT_USER.id,
        }),
      }),
    );
  });

  it("increments version number when previous versions exist", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
      _max: { versionNumber: 3 },
    });
    mockPrisma.sceneAssetVersion.create.mockResolvedValue({
      id: "asset_v4",
      versionNumber: 4,
    });

    await createSceneAssetVersion("scene_db_001", baseCreateData());

    expect(mockPrisma.sceneAssetVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 4,
        }),
      }),
    );
  });

  it("deselects other assets when selected=true", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
      _max: { versionNumber: 0 },
    });
    mockPrisma.sceneAssetVersion.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.sceneAssetVersion.create.mockResolvedValue({
      id: "asset_sel",
      selected: true,
    });

    await createSceneAssetVersion(
      "scene_db_001",
      baseCreateData({ selected: true }),
    );

    expect(mockPrisma.sceneAssetVersion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sceneId: SCENE_FIXTURE.id,
          selected: true,
        }),
        data: { selected: false, status: AssetStatus.GENERATED },
      }),
    );
  });

  it("normalizes platformKey to lowercase and trims", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
      _max: { versionNumber: 0 },
    });
    mockPrisma.sceneAssetVersion.create.mockResolvedValue({ id: "asset_lc" });

    await createSceneAssetVersion(
      "scene_db_001",
      baseCreateData({ platformKey: " SORA " }),
    );

    expect(mockPrisma.sceneAssetVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          platformKey: "sora",
        }),
      }),
    );
  });

  it("revalidates three paths after creation", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.sceneAssetVersion.aggregate.mockResolvedValue({
      _max: { versionNumber: 0 },
    });
    mockPrisma.sceneAssetVersion.create.mockResolvedValue({ id: "asset_rp" });

    await createSceneAssetVersion("scene_db_001", baseCreateData());

    expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${SCENE_FIXTURE.projectId}/scenes/${SCENE_FIXTURE.sceneId}`,
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${SCENE_FIXTURE.projectId}/timeline`,
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${SCENE_FIXTURE.projectId}/production`,
    );
  });
});

// ---------------------------------------------------------------------------
// updateSceneAssetVersion
// ---------------------------------------------------------------------------

describe("updateSceneAssetVersion", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      updateSceneAssetVersion("asset_001", { notes: "test" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when asset not found for user", async () => {
    mockPrisma.sceneAssetVersion.findFirst.mockResolvedValue(null);
    await expect(
      updateSceneAssetVersion("asset_001", { notes: "test" }),
    ).rejects.toThrow("Asset version not found");
  });

  it("applies partial updates without changing status", async () => {
    mockPrisma.sceneAssetVersion.findFirst.mockResolvedValue({
      id: "asset_001",
      sceneId: "scene_db_001",
      assetType: AssetType.IMAGE,
      status: AssetStatus.DRAFT,
      scene: { projectId: "project_001", sceneId: "SC001" },
    });
    mockPrisma.sceneAssetVersion.update.mockResolvedValue({});

    await updateSceneAssetVersion("asset_001", {
      notes: "Updated notes",
      tags: ["cinematic"],
    });

    expect(mockPrisma.sceneAssetVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "asset_001" },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// deleteSceneAssetVersion
// ---------------------------------------------------------------------------

describe("deleteSceneAssetVersion", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(deleteSceneAssetVersion("asset_001")).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("throws when asset not found for user", async () => {
    mockPrisma.sceneAssetVersion.findFirst.mockResolvedValue(null);
    await expect(deleteSceneAssetVersion("asset_001")).rejects.toThrow(
      "Asset version not found",
    );
  });

  it("deletes the asset and revalidates paths", async () => {
    mockPrisma.sceneAssetVersion.findFirst.mockResolvedValue({
      id: "asset_001",
      scene: { projectId: "project_001", sceneId: "SC001" },
    });
    mockPrisma.sceneAssetVersion.delete.mockResolvedValue({});

    await deleteSceneAssetVersion("asset_001");

    expect(mockPrisma.sceneAssetVersion.delete).toHaveBeenCalledWith({
      where: { id: "asset_001" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// createSceneAssetFanout
// ---------------------------------------------------------------------------

describe("createSceneAssetFanout", () => {
  const fanoutData = {
    platformIds: ["plat_sora", "plat_veo"],
    assetType: AssetType.IMAGE as any,
    prompt: "A dramatic space scene",
  };

  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      createSceneAssetFanout("scene_db_001", fanoutData),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when scene not found", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(null);
    await expect(
      createSceneAssetFanout("scene_db_001", fanoutData),
    ).rejects.toThrow("Scene not found");
  });

  it("throws when platformIds is empty", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    await expect(
      createSceneAssetFanout("scene_db_001", {
        ...fanoutData,
        platformIds: [],
      }),
    ).rejects.toThrow("Select at least one platform");
  });

  it("throws when no valid platforms found", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.aiPlatform.findMany.mockResolvedValue([]);
    await expect(
      createSceneAssetFanout("scene_db_001", fanoutData),
    ).rejects.toThrow("No valid platforms selected");
  });

  it("throws when prompt is empty", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.aiPlatform.findMany.mockResolvedValue([
      { id: "plat_sora", slug: "sora", name: "Sora" },
    ]);
    await expect(
      createSceneAssetFanout("scene_db_001", {
        ...fanoutData,
        prompt: "   ",
      }),
    ).rejects.toThrow("Prompt is required");
  });

  it("creates one asset per platform with auto compare group", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.aiPlatform.findMany.mockResolvedValue([
      { id: "plat_sora", slug: "sora", name: "Sora" },
      { id: "plat_veo", slug: "veo", name: "Veo" },
    ]);
    mockPrisma.promptPackage.aggregate.mockResolvedValue({
      _max: { versionNumber: 0 },
    });
    mockPrisma.promptPackage.create.mockResolvedValue({ id: "pp_001" });
    mockPrisma.sceneAssetVersion.groupBy.mockResolvedValue([]);

    let createCallCount = 0;
    mockPrisma.sceneAssetVersion.create.mockImplementation(async () => {
      createCallCount += 1;
      return {
        id: `asset_fanout_${createCallCount}`,
        platformKey: createCallCount === 1 ? "sora" : "veo",
        platformLabel: createCallCount === 1 ? "Sora" : "Veo",
        versionNumber: 1,
        status: AssetStatus.DRAFT,
        assetType: AssetType.IMAGE,
      };
    });

    const result = await createSceneAssetFanout("scene_db_001", fanoutData);

    expect(result.items).toHaveLength(2);
    // Auto-generated compare group for multi-platform fanout
    expect(result.compareGroup).toMatch(/^cmp_/);
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
  });

  it("deduplicates platform IDs", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.aiPlatform.findMany.mockResolvedValue([
      { id: "plat_sora", slug: "sora", name: "Sora" },
    ]);
    mockPrisma.promptPackage.aggregate.mockResolvedValue({
      _max: { versionNumber: 0 },
    });
    mockPrisma.promptPackage.create.mockResolvedValue({ id: "pp_001" });
    mockPrisma.sceneAssetVersion.groupBy.mockResolvedValue([]);
    mockPrisma.sceneAssetVersion.create.mockResolvedValue({
      id: "asset_dedup",
      platformKey: "sora",
      platformLabel: "Sora",
      versionNumber: 1,
      status: AssetStatus.DRAFT,
      assetType: AssetType.IMAGE,
    });

    const result = await createSceneAssetFanout("scene_db_001", {
      ...fanoutData,
      platformIds: ["plat_sora", "plat_sora", " plat_sora "],
    });

    // aiPlatform.findMany is called with deduplicated IDs
    expect(mockPrisma.aiPlatform.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["plat_sora"] } },
      }),
    );
    expect(result.items).toHaveLength(1);
  });
});
