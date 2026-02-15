import { vi } from "vitest";

// ─── Mock Next.js Server Functions ───────────────────────────

export const mockRevalidatePath = vi.fn();
export const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

export function resetNextMocks() {
  mockRevalidatePath.mockReset();
  mockRedirect.mockReset().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
}
