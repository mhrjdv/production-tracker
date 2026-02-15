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
  createCharacter,
  updateCharacter,
  deleteCharacter,
  updateCharacterPortrait,
  updateFilmIdentity,
} from "@/lib/actions/character-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = "project_001";

const CHARACTER_FIXTURE = {
  id: "char_001",
  projectId: PROJECT_ID,
  name: "Deckard",
  role: "protagonist",
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetPrismaMocks();
  resetAuthMock();
  resetNextMocks();
});

// ---------------------------------------------------------------------------
// createCharacter
// ---------------------------------------------------------------------------

describe("createCharacter", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      createCharacter(PROJECT_ID, { name: "Hero", role: "lead" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when project not found for user", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    await expect(
      createCharacter(PROJECT_ID, { name: "Hero", role: "lead" }),
    ).rejects.toThrow("Project not found");
  });

  it("creates a character with required fields", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.character.create.mockResolvedValue({ id: "char_new" });

    await createCharacter(PROJECT_ID, { name: "Priss", role: "replicant" });

    expect(mockPrisma.character.create).toHaveBeenCalledWith({
      data: {
        name: "Priss",
        role: "replicant",
        projectId: PROJECT_ID,
      },
    });
  });

  it("passes optional coreIdentity and designPhilosophy", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.character.create.mockResolvedValue({ id: "char_full" });

    await createCharacter(PROJECT_ID, {
      name: "Roy",
      role: "antagonist",
      coreIdentity: "Superior replicant seeking more life",
      designPhilosophy: "Angelic fallen warrior",
    });

    expect(mockPrisma.character.create).toHaveBeenCalledWith({
      data: {
        name: "Roy",
        role: "antagonist",
        coreIdentity: "Superior replicant seeking more life",
        designPhilosophy: "Angelic fallen warrior",
        projectId: PROJECT_ID,
      },
    });
  });

  it("revalidates the characters path after creation", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.character.create.mockResolvedValue({ id: "char_rp" });

    await createCharacter(PROJECT_ID, { name: "Test", role: "extra" });

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/characters`,
    );
  });
});

// ---------------------------------------------------------------------------
// updateCharacter
// ---------------------------------------------------------------------------

describe("updateCharacter", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      updateCharacter("char_001", { name: "New Name" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when character not found for user", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(null);
    await expect(
      updateCharacter("char_001", { name: "New Name" }),
    ).rejects.toThrow("Character not found");
  });

  it("applies partial updates to the character", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(CHARACTER_FIXTURE);
    mockPrisma.character.update.mockResolvedValue({});

    await updateCharacter("char_001", {
      role: "deuteragonist",
      coreIdentity: "A conflicted soul",
    });

    expect(mockPrisma.character.update).toHaveBeenCalledWith({
      where: { id: "char_001" },
      data: {
        role: "deuteragonist",
        coreIdentity: "A conflicted soul",
      },
    });
  });

  it("supports updating visualCues and bodyLanguage arrays", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(CHARACTER_FIXTURE);
    mockPrisma.character.update.mockResolvedValue({});

    await updateCharacter("char_001", {
      visualCues: ["trenchcoat", "rain"],
      bodyLanguage: ["stoic", "deliberate"],
    });

    expect(mockPrisma.character.update).toHaveBeenCalledWith({
      where: { id: "char_001" },
      data: {
        visualCues: ["trenchcoat", "rain"],
        bodyLanguage: ["stoic", "deliberate"],
      },
    });
  });

  it("revalidates characters path after update", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(CHARACTER_FIXTURE);
    mockPrisma.character.update.mockResolvedValue({});

    await updateCharacter("char_001", { name: "Updated" });

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/characters`,
    );
  });
});

// ---------------------------------------------------------------------------
// deleteCharacter
// ---------------------------------------------------------------------------

describe("deleteCharacter", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(deleteCharacter("char_001")).rejects.toThrow("Unauthorized");
  });

  it("throws when character not found for user", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(null);
    await expect(deleteCharacter("char_001")).rejects.toThrow(
      "Character not found",
    );
  });

  it("deletes the character by id", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(CHARACTER_FIXTURE);
    mockPrisma.character.delete.mockResolvedValue({});

    await deleteCharacter("char_001");

    expect(mockPrisma.character.delete).toHaveBeenCalledWith({
      where: { id: "char_001" },
    });
  });

  it("revalidates characters path after deletion", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(CHARACTER_FIXTURE);
    mockPrisma.character.delete.mockResolvedValue({});

    await deleteCharacter("char_001");

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/characters`,
    );
  });
});

// ---------------------------------------------------------------------------
// updateCharacterPortrait
// ---------------------------------------------------------------------------

describe("updateCharacterPortrait", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      updateCharacterPortrait("char_001", "https://cdn.example.com/portrait.jpg"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when character not found for user", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(null);
    await expect(
      updateCharacterPortrait("char_001", "https://cdn.example.com/portrait.jpg"),
    ).rejects.toThrow("Character not found");
  });

  it("updates portraitUrl on the character", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(CHARACTER_FIXTURE);
    mockPrisma.character.update.mockResolvedValue({});

    const url = "https://cdn.example.com/portrait.jpg";
    await updateCharacterPortrait("char_001", url);

    expect(mockPrisma.character.update).toHaveBeenCalledWith({
      where: { id: "char_001" },
      data: { portraitUrl: url },
    });
  });

  it("revalidates characters path after portrait update", async () => {
    mockPrisma.character.findFirst.mockResolvedValue(CHARACTER_FIXTURE);
    mockPrisma.character.update.mockResolvedValue({});

    await updateCharacterPortrait(
      "char_001",
      "https://cdn.example.com/portrait.jpg",
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/characters`,
    );
  });
});

// ---------------------------------------------------------------------------
// updateFilmIdentity
// ---------------------------------------------------------------------------

describe("updateFilmIdentity", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(
      updateFilmIdentity(PROJECT_ID, { tone: "noir" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when project not found for user", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    await expect(
      updateFilmIdentity(PROJECT_ID, { tone: "noir" }),
    ).rejects.toThrow("Project not found");
  });

  it("upserts film identity data for the project", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.filmIdentity.upsert.mockResolvedValue({});

    const identityData = {
      tone: "cyberpunk noir",
      era: "2049",
      colorPalette: ["orange", "teal", "grey"],
    };

    await updateFilmIdentity(PROJECT_ID, identityData);

    expect(mockPrisma.filmIdentity.upsert).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      create: { projectId: PROJECT_ID, data: identityData },
      update: { data: identityData },
    });
  });

  it("revalidates bible path after identity update", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.filmIdentity.upsert.mockResolvedValue({});

    await updateFilmIdentity(PROJECT_ID, { tone: "light" });

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/bible`,
    );
  });

  it("handles empty identity data object", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.filmIdentity.upsert.mockResolvedValue({});

    await updateFilmIdentity(PROJECT_ID, {});

    expect(mockPrisma.filmIdentity.upsert).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      create: { projectId: PROJECT_ID, data: {} },
      update: { data: {} },
    });
  });
});
