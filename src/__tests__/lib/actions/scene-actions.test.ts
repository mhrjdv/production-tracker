import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockPrisma, resetPrismaMocks } from "@/__tests__/helpers/mock-prisma";
import {
  mockAuth,
  mockAuthenticated,
  mockUnauthenticated,
  resetAuthMock,
  DEFAULT_USER,
} from "@/__tests__/helpers/mock-auth";
import {
  mockRevalidatePath,
  resetNextMocks,
} from "@/__tests__/helpers/mock-next";

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import {
  createScene,
  updateScene,
  deleteScene,
  updateSceneOrder,
  updateSceneKeyframe,
} from "@/lib/actions/scene-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = "project_001";

const SCENE_FIXTURE = {
  id: "scene_db_001",
  sceneId: "SC001",
  projectId: PROJECT_ID,
};

function baseSceneData(overrides: Record<string, unknown> = {}) {
  return {
    sceneId: "SC005",
    sourceText: "The hero walks into the dark alley.",
    act: 1,
    actTitle: "The Beginning",
    macroScene: "City Streets",
    storyBeat: "Discovery",
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
// createScene
// ---------------------------------------------------------------------------

describe("createScene", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(createScene(PROJECT_ID, baseSceneData())).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("throws when project not found for user", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    await expect(createScene(PROJECT_ID, baseSceneData())).rejects.toThrow(
      "Project not found",
    );
  });

  it("creates first scene with sortOrder 0", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.scene.aggregate.mockResolvedValue({
      _max: { sortOrder: null },
    });
    mockPrisma.scene.create.mockResolvedValue({
      id: "scene_new",
      sortOrder: 0,
    });

    await createScene(PROJECT_ID, baseSceneData());

    expect(mockPrisma.scene.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: PROJECT_ID,
          sortOrder: 0,
          sceneId: "SC005",
        }),
      }),
    );
  });

  it("auto-increments sortOrder from existing max", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.scene.aggregate.mockResolvedValue({
      _max: { sortOrder: 4 },
    });
    mockPrisma.scene.create.mockResolvedValue({
      id: "scene_new",
      sortOrder: 5,
    });

    await createScene(PROJECT_ID, baseSceneData());

    expect(mockPrisma.scene.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sortOrder: 5,
        }),
      }),
    );
  });

  it("revalidates the production path after creation", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.scene.aggregate.mockResolvedValue({
      _max: { sortOrder: 0 },
    });
    mockPrisma.scene.create.mockResolvedValue({ id: "scene_new" });

    await createScene(PROJECT_ID, baseSceneData());

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/production`,
    );
  });

  it("passes optional fields through to create", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.scene.aggregate.mockResolvedValue({
      _max: { sortOrder: 0 },
    });
    mockPrisma.scene.create.mockResolvedValue({ id: "scene_new" });

    const data = baseSceneData({
      reason: "Plot advancement",
      narrativePurpose: "Reveal the secret",
      emotionalTone: "Suspenseful",
    });

    await createScene(PROJECT_ID, data);

    expect(mockPrisma.scene.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "Plot advancement",
          narrativePurpose: "Reveal the secret",
          emotionalTone: "Suspenseful",
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// updateScene
// ---------------------------------------------------------------------------

describe("updateScene", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      updateScene("scene_db_001", { storyBeat: "New beat" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when scene not found for user", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(null);
    await expect(
      updateScene("scene_db_001", { storyBeat: "New beat" }),
    ).rejects.toThrow("Scene not found");
  });

  it("applies partial updates to the scene", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.scene.update.mockResolvedValue({});

    await updateScene("scene_db_001", { storyBeat: "Climax" });

    expect(mockPrisma.scene.update).toHaveBeenCalledWith({
      where: { id: "scene_db_001" },
      data: { storyBeat: "Climax" },
    });
  });

  it("revalidates production, timeline, and scene paths", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.scene.update.mockResolvedValue({});

    await updateScene("scene_db_001", { act: 2 });

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/production`,
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/timeline`,
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/scenes/${SCENE_FIXTURE.sceneId}`,
    );
  });
});

// ---------------------------------------------------------------------------
// deleteScene
// ---------------------------------------------------------------------------

describe("deleteScene", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(deleteScene("scene_db_001")).rejects.toThrow("Unauthorized");
  });

  it("throws when scene not found for user", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(null);
    await expect(deleteScene("scene_db_001")).rejects.toThrow(
      "Scene not found",
    );
  });

  it("deletes the scene by id", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.scene.delete.mockResolvedValue({});

    await deleteScene("scene_db_001");

    expect(mockPrisma.scene.delete).toHaveBeenCalledWith({
      where: { id: "scene_db_001" },
    });
  });

  it("revalidates production and timeline paths", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.scene.delete.mockResolvedValue({});

    await deleteScene("scene_db_001");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/production`,
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/timeline`,
    );
  });
});

// ---------------------------------------------------------------------------
// updateSceneOrder
// ---------------------------------------------------------------------------

describe("updateSceneOrder", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      updateSceneOrder(PROJECT_ID, ["s1", "s2"]),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when project not found for user", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    await expect(
      updateSceneOrder(PROJECT_ID, ["s1", "s2"]),
    ).rejects.toThrow("Project not found");
  });

  it("updates each scene with its new sortOrder via batch transaction", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    // $transaction with batch resolves each update promise
    mockPrisma.scene.update.mockResolvedValue({});

    const sceneIds = ["scene_c", "scene_a", "scene_b"];
    await updateSceneOrder(PROJECT_ID, sceneIds);

    // $transaction receives an array of promises (batch mode)
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.anything(),
        expect.anything(),
        expect.anything(),
      ]),
    );
    // Verify each scene.update was called with the correct index
    expect(mockPrisma.scene.update).toHaveBeenCalledWith({
      where: { id: "scene_c" },
      data: { sortOrder: 0 },
    });
    expect(mockPrisma.scene.update).toHaveBeenCalledWith({
      where: { id: "scene_a" },
      data: { sortOrder: 1 },
    });
    expect(mockPrisma.scene.update).toHaveBeenCalledWith({
      where: { id: "scene_b" },
      data: { sortOrder: 2 },
    });
  });

  it("revalidates timeline path after reorder", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.scene.update.mockResolvedValue({});

    await updateSceneOrder(PROJECT_ID, ["s1"]);

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/timeline`,
    );
  });
});

// ---------------------------------------------------------------------------
// updateSceneKeyframe
// ---------------------------------------------------------------------------

describe("updateSceneKeyframe", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      updateSceneKeyframe("scene_db_001", "https://cdn.example.com/kf.jpg"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when scene not found for user", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(null);
    await expect(
      updateSceneKeyframe("scene_db_001", "https://cdn.example.com/kf.jpg"),
    ).rejects.toThrow("Scene not found");
  });

  it("updates keyframeUrl on the scene", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.scene.update.mockResolvedValue({});

    await updateSceneKeyframe(
      "scene_db_001",
      "https://cdn.example.com/kf.jpg",
    );

    expect(mockPrisma.scene.update).toHaveBeenCalledWith({
      where: { id: "scene_db_001" },
      data: { keyframeUrl: "https://cdn.example.com/kf.jpg" },
    });
  });

  it("revalidates production path after keyframe update", async () => {
    mockPrisma.scene.findFirst.mockResolvedValue(SCENE_FIXTURE);
    mockPrisma.scene.update.mockResolvedValue({});

    await updateSceneKeyframe(
      "scene_db_001",
      "https://cdn.example.com/kf.jpg",
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/production`,
    );
  });
});
