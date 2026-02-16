"use server";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assignCharacterToShot(
  shotId: string,
  characterId: string,
  role?: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const shot = await prisma.shot.findFirst({
    where: { id: shotId, scene: { project: { userId: session.user.id } } },
    select: { id: true, scene: { select: { projectId: true } } },
  });
  if (!shot) throw new Error("Shot not found");

  await prisma.shotCharacter.upsert({
    where: { shotId_characterId: { shotId, characterId } },
    create: { shotId, characterId, role: role ?? null },
    update: { role: role ?? null },
  });

  revalidatePath(`/projects/${shot.scene.projectId}`);
}

export async function removeCharacterFromShot(
  shotId: string,
  characterId: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const shot = await prisma.shot.findFirst({
    where: { id: shotId, scene: { project: { userId: session.user.id } } },
    select: { scene: { select: { projectId: true } } },
  });
  if (!shot) throw new Error("Shot not found");

  await prisma.shotCharacter.deleteMany({
    where: { shotId, characterId },
  });

  revalidatePath(`/projects/${shot.scene.projectId}`);
}

export async function updateShotCharacters(
  shotId: string,
  characterIds: string[],
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const shot = await prisma.shot.findFirst({
    where: { id: shotId, scene: { project: { userId: session.user.id } } },
    select: { id: true, scene: { select: { projectId: true } } },
  });
  if (!shot) throw new Error("Shot not found");

  const existing = await prisma.shotCharacter.findMany({
    where: { shotId },
    select: { characterId: true },
  });
  const existingIds = new Set(existing.map((e) => e.characterId));
  const targetIds = new Set(characterIds);

  const toAdd = characterIds.filter((id) => !existingIds.has(id));
  const toRemove = existing
    .map((e) => e.characterId)
    .filter((id) => !targetIds.has(id));

  await Promise.all([
    ...toAdd.map((characterId) =>
      prisma.shotCharacter.create({ data: { shotId, characterId } }),
    ),
    toRemove.length > 0
      ? prisma.shotCharacter.deleteMany({
          where: { shotId, characterId: { in: toRemove } },
        })
      : Promise.resolve(),
  ]);

  revalidatePath(`/projects/${shot.scene.projectId}`);
}
