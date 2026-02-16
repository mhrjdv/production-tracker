"use server";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assignCharacterToScene(
  sceneId: string,
  characterId: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, project: { userId: session.user.id } },
    select: { id: true, projectId: true },
  });
  if (!scene) throw new Error("Scene not found");

  const character = await prisma.character.findFirst({
    where: { id: characterId, projectId: scene.projectId },
    select: { id: true },
  });
  if (!character) throw new Error("Character not found in this project");

  await prisma.sceneCharacter.upsert({
    where: { sceneId_characterId: { sceneId, characterId } },
    create: { sceneId, characterId },
    update: {},
  });

  revalidatePath(`/projects/${scene.projectId}`);
}

export async function removeCharacterFromScene(
  sceneId: string,
  characterId: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, project: { userId: session.user.id } },
    select: { projectId: true },
  });
  if (!scene) throw new Error("Scene not found");

  await prisma.sceneCharacter.deleteMany({
    where: { sceneId, characterId },
  });

  revalidatePath(`/projects/${scene.projectId}`);
}

export async function updateSceneCharacters(
  sceneId: string,
  characterIds: string[],
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, project: { userId: session.user.id } },
    select: { id: true, projectId: true },
  });
  if (!scene) throw new Error("Scene not found");

  const existing = await prisma.sceneCharacter.findMany({
    where: { sceneId },
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
      prisma.sceneCharacter.create({ data: { sceneId, characterId } }),
    ),
    toRemove.length > 0
      ? prisma.sceneCharacter.deleteMany({
          where: { sceneId, characterId: { in: toRemove } },
        })
      : Promise.resolve(),
  ]);

  revalidatePath(`/projects/${scene.projectId}`);
}
