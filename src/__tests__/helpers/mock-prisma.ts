import { vi } from "vitest";

// ─── Mock Prisma Client ──────────────────────────────────────
// Provides a deeply-mocked PrismaClient usable in vi.mock("@/lib/db")
// Each model exposes the standard Prisma methods as vi.fn()

function createModelMock() {
  return {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockPrisma() {
  return {
    project: createModelMock(),
    scene: createModelMock(),
    character: createModelMock(),
    sceneAssetVersion: createModelMock(),
    promptPackage: createModelMock(),
    extensionApiToken: createModelMock(),
    filmIdentity: createModelMock(),
    shot: createModelMock(),
    aiPlatform: createModelMock(),
    user: createModelMock(),
    $transaction: vi.fn(async (fnOrArray: unknown) => {
      if (typeof fnOrArray === "function") {
        // Interactive transaction: call fn with the same mock as tx
        return fnOrArray(mockPrisma);
      }
      // Batch transaction: resolve all promises
      return Promise.all(fnOrArray as Promise<unknown>[]);
    }),
  };
}

export const mockPrisma = createMockPrisma();

// Reset all mocks between tests
export function resetPrismaMocks() {
  const walk = (obj: Record<string, unknown>) => {
    for (const value of Object.values(obj)) {
      if (typeof value === "function" && "mockReset" in value) {
        (value as ReturnType<typeof vi.fn>).mockReset();
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        walk(value as Record<string, unknown>);
      }
    }
  };
  walk(mockPrisma as unknown as Record<string, unknown>);

  // Restore $transaction default behavior
  mockPrisma.$transaction.mockImplementation(async (fnOrArray: unknown) => {
    if (typeof fnOrArray === "function") {
      return fnOrArray(mockPrisma);
    }
    return Promise.all(fnOrArray as Promise<unknown>[]);
  });
}
