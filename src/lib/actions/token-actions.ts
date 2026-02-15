"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateExtensionToken } from "@/lib/extension-tokens";

// ─── Extension API Tokens ───────────────────────────────────

export async function createExtensionApiToken(data: {
  name: string;
  expiresInDays?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = data.name.trim();
  if (!name) {
    throw new Error("Token name is required");
  }

  const { token, tokenHash, tokenPrefix } = generateExtensionToken();
  const expiresAt =
    data.expiresInDays && data.expiresInDays > 0
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const created = await prisma.extensionApiToken.create({
    data: {
      userId: session.user.id,
      name,
      tokenHash,
      tokenPrefix,
      expiresAt,
    },
    select: {
      id: true,
      tokenPrefix: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  revalidatePath("/integrations");

  return {
    ...created,
    token,
  };
}

export async function revokeExtensionApiToken(tokenId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.extensionApiToken.findFirst({
    where: {
      id: tokenId,
      userId: session.user.id,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Token not found");
  }

  await prisma.extensionApiToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/integrations");
}
