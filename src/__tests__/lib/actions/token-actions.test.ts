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

// ─── Mock extension-tokens module ──────────────────────────
// vi.hoisted ensures this runs before vi.mock factory (both are hoisted)
const mockGenerateExtensionToken = vi.hoisted(() =>
  vi.fn(() => ({
    token: "lmt_test_token_abc123",
    tokenPrefix: "lmt_test_tok",
    tokenHash: "hash_abc123",
  })),
);

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));
vi.mock("@/lib/extension-tokens", () => ({
  generateExtensionToken: mockGenerateExtensionToken,
}));

// NOW import functions under test
import {
  createExtensionApiToken,
  revokeExtensionApiToken,
} from "@/lib/actions/token-actions";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetPrismaMocks();
  resetAuthMock();
  resetNextMocks();
  mockGenerateExtensionToken.mockReturnValue({
    token: "lmt_test_token_abc123",
    tokenPrefix: "lmt_test_tok",
    tokenHash: "hash_abc123",
  });
});

// ---------------------------------------------------------------------------
// createExtensionApiToken
// ---------------------------------------------------------------------------

describe("createExtensionApiToken", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(createExtensionApiToken({ name: "My Token" })).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("throws when name is empty or whitespace", async () => {
    await expect(createExtensionApiToken({ name: "   " })).rejects.toThrow(
      "Token name is required",
    );
  });

  it("creates token with default 90-day expiry when expiresInDays is omitted", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const expectedExpiry = new Date(now + 90 * 24 * 60 * 60 * 1000);

    mockPrisma.extensionApiToken.create.mockResolvedValue({
      id: "token_001",
      tokenPrefix: "lmt_test_tok",
      expiresAt: expectedExpiry,
      createdAt: new Date(now),
    });

    const result = await createExtensionApiToken({ name: "My Token" });

    expect(mockPrisma.extensionApiToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: DEFAULT_USER.id,
          name: "My Token",
          tokenHash: "hash_abc123",
          tokenPrefix: "lmt_test_tok",
          expiresAt: expectedExpiry,
        }),
      }),
    );
    expect(result.token).toBe("lmt_test_token_abc123");
    expect(result.id).toBe("token_001");

    vi.spyOn(Date, "now").mockRestore();
  });

  it("creates token with custom expiry when expiresInDays is provided", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const expectedExpiry = new Date(now + 30 * 24 * 60 * 60 * 1000);

    mockPrisma.extensionApiToken.create.mockResolvedValue({
      id: "token_002",
      tokenPrefix: "lmt_test_tok",
      expiresAt: expectedExpiry,
      createdAt: new Date(now),
    });

    await createExtensionApiToken({ name: "Short-lived", expiresInDays: 30 });

    expect(mockPrisma.extensionApiToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: expectedExpiry,
        }),
      }),
    );

    vi.spyOn(Date, "now").mockRestore();
  });

  it("defaults to 90 days when expiresInDays is 0 or negative", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const expectedExpiry = new Date(now + 90 * 24 * 60 * 60 * 1000);

    mockPrisma.extensionApiToken.create.mockResolvedValue({
      id: "token_003",
      tokenPrefix: "lmt_test_tok",
      expiresAt: expectedExpiry,
      createdAt: new Date(now),
    });

    await createExtensionApiToken({
      name: "Zero-day token",
      expiresInDays: 0,
    });

    expect(mockPrisma.extensionApiToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: expectedExpiry,
        }),
      }),
    );

    vi.spyOn(Date, "now").mockRestore();
  });

  it("trims the token name", async () => {
    mockPrisma.extensionApiToken.create.mockResolvedValue({
      id: "token_004",
      tokenPrefix: "lmt_test_tok",
      expiresAt: new Date(),
      createdAt: new Date(),
    });

    await createExtensionApiToken({ name: "  My Token  " });

    expect(mockPrisma.extensionApiToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "My Token",
        }),
      }),
    );
  });

  it("revalidates /integrations path after creation", async () => {
    mockPrisma.extensionApiToken.create.mockResolvedValue({
      id: "token_005",
      tokenPrefix: "lmt_test_tok",
      expiresAt: new Date(),
      createdAt: new Date(),
    });

    await createExtensionApiToken({ name: "Revalidation token" });

    expect(mockRevalidatePath).toHaveBeenCalledWith("/integrations");
  });

  it("returns the raw token along with db fields", async () => {
    const dbRecord = {
      id: "token_006",
      tokenPrefix: "lmt_test_tok",
      expiresAt: new Date("2026-05-15"),
      createdAt: new Date("2026-02-14"),
    };
    mockPrisma.extensionApiToken.create.mockResolvedValue(dbRecord);

    const result = await createExtensionApiToken({ name: "Return test" });

    expect(result).toEqual({
      ...dbRecord,
      token: "lmt_test_token_abc123",
    });
  });
});

// ---------------------------------------------------------------------------
// revokeExtensionApiToken
// ---------------------------------------------------------------------------

describe("revokeExtensionApiToken", () => {
  it("throws Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    await expect(revokeExtensionApiToken("token_001")).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("throws when token not found for user", async () => {
    mockPrisma.extensionApiToken.findFirst.mockResolvedValue(null);
    await expect(revokeExtensionApiToken("token_missing")).rejects.toThrow(
      "Token not found",
    );
  });

  it("looks up token by ID, userId, and revokedAt=null", async () => {
    mockPrisma.extensionApiToken.findFirst.mockResolvedValue({
      id: "token_001",
    });
    mockPrisma.extensionApiToken.update.mockResolvedValue({});

    await revokeExtensionApiToken("token_001");

    expect(mockPrisma.extensionApiToken.findFirst).toHaveBeenCalledWith({
      where: {
        id: "token_001",
        userId: DEFAULT_USER.id,
        revokedAt: null,
      },
      select: { id: true },
    });
  });

  it("sets revokedAt to a Date on the matching token", async () => {
    mockPrisma.extensionApiToken.findFirst.mockResolvedValue({
      id: "token_001",
    });
    mockPrisma.extensionApiToken.update.mockResolvedValue({});

    await revokeExtensionApiToken("token_001");

    expect(mockPrisma.extensionApiToken.update).toHaveBeenCalledWith({
      where: { id: "token_001" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("revalidates /integrations path after revocation", async () => {
    mockPrisma.extensionApiToken.findFirst.mockResolvedValue({
      id: "token_001",
    });
    mockPrisma.extensionApiToken.update.mockResolvedValue({});

    await revokeExtensionApiToken("token_001");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/integrations");
  });
});
