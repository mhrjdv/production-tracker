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
  mockRedirect,
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
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import {
  createProject,
  deleteProject,
  getUserProjects,
} from "@/lib/actions/project-actions";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetPrismaMocks();
  resetAuthMock();
  resetNextMocks();
});

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

describe("createProject", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(createProject({ name: "My Film" })).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("creates project and redirects to project page", async () => {
    mockPrisma.project.create.mockResolvedValue({ id: "proj_new" });

    await expect(createProject({ name: "My Film" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "My Film",
          user: { connect: { id: DEFAULT_USER.id } },
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRedirect).toHaveBeenCalledWith("/projects/proj_new");
  });

  it("creates project with description and genre", async () => {
    mockPrisma.project.create.mockResolvedValue({ id: "proj_genre" });

    await expect(
      createProject({
        name: "Sci-Fi Epic",
        description: "A futuristic adventure",
        genre: "Science Fiction",
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Sci-Fi Epic",
          description: "A futuristic adventure",
          genre: "Science Fiction",
        }),
      }),
    );
  });

  it("creates project with nested identity data", async () => {
    mockPrisma.project.create.mockResolvedValue({ id: "proj_identity" });

    const identity = { tone: "dark", era: "cyberpunk" };

    await expect(
      createProject({ name: "Blade Runner Redux", identity }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identity: {
            create: {
              data: identity,
            },
          },
        }),
      }),
    );
  });

  it("creates project with nested characters", async () => {
    mockPrisma.project.create.mockResolvedValue({ id: "proj_chars" });

    const characters = [
      { name: "Hero", role: "protagonist", coreIdentity: "Brave warrior" },
      { name: "Villain", role: "antagonist" },
    ];

    await expect(
      createProject({ name: "Epic Battle", characters }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          characters: {
            create: [
              {
                name: "Hero",
                role: "protagonist",
                coreIdentity: "Brave warrior",
              },
              { name: "Villain", role: "antagonist", coreIdentity: undefined },
            ],
          },
        }),
      }),
    );
  });

  it("does not include identity when not provided", async () => {
    mockPrisma.project.create.mockResolvedValue({ id: "proj_no_id" });

    await expect(createProject({ name: "Simple Film" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    const callData = mockPrisma.project.create.mock.calls[0][0].data;
    expect(callData.identity).toBeUndefined();
  });

  it("does not include characters when empty array is provided", async () => {
    mockPrisma.project.create.mockResolvedValue({ id: "proj_no_chars" });

    await expect(
      createProject({ name: "Solo Film", characters: [] }),
    ).rejects.toThrow("NEXT_REDIRECT");

    const callData = mockPrisma.project.create.mock.calls[0][0].data;
    expect(callData.characters).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

describe("deleteProject", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(deleteProject("proj_001")).rejects.toThrow("Unauthorized");
  });

  it("deletes project with ownership check and redirects to home", async () => {
    mockPrisma.project.delete.mockResolvedValue({});

    await expect(deleteProject("proj_001")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockPrisma.project.delete).toHaveBeenCalledWith({
      where: {
        id: "proj_001",
        userId: DEFAULT_USER.id,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("propagates Prisma error if project not found", async () => {
    mockPrisma.project.delete.mockRejectedValue(
      new Error("Record to delete does not exist"),
    );

    await expect(deleteProject("proj_nonexistent")).rejects.toThrow(
      "Record to delete does not exist",
    );
  });
});

// ---------------------------------------------------------------------------
// getUserProjects
// ---------------------------------------------------------------------------

describe("getUserProjects", () => {
  it("returns empty array when not authenticated", async () => {
    mockUnauthenticated();
    const result = await getUserProjects();
    expect(result).toEqual([]);
    expect(mockPrisma.project.findMany).not.toHaveBeenCalled();
  });

  it("queries projects for the authenticated user", async () => {
    const projects = [
      {
        id: "proj_001",
        name: "Film A",
        _count: { scenes: 3, characters: 2 },
      },
      {
        id: "proj_002",
        name: "Film B",
        _count: { scenes: 1, characters: 0 },
      },
    ];
    mockPrisma.project.findMany.mockResolvedValue(projects);

    const result = await getUserProjects();

    expect(result).toEqual(projects);
    expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: DEFAULT_USER.id },
      include: {
        _count: {
          select: {
            scenes: true,
            characters: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("returns empty array from Prisma when user has no projects", async () => {
    mockPrisma.project.findMany.mockResolvedValue([]);

    const result = await getUserProjects();
    expect(result).toEqual([]);
  });
});
