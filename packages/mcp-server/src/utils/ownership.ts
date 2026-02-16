import type { PrismaClient } from "@prisma/client";

/**
 * Verify that a project belongs to the given user.
 * Returns the project if owned, null otherwise.
 */
export async function verifyProjectOwnership(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
): Promise<{ id: string; userId: string } | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, userId: true },
  });
  return project;
}

/**
 * Verify that a scene belongs to a project owned by the given user.
 * Returns { sceneId, projectId } if owned, null otherwise.
 */
export async function verifySceneOwnership(
  prisma: PrismaClient,
  sceneId: string,
  userId: string,
): Promise<{ id: string; projectId: string } | null> {
  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneId,
      project: { userId },
    },
    select: { id: true, projectId: true },
  });
  return scene;
}

/**
 * Verify that a shot belongs to a scene in a project owned by the given user.
 */
export async function verifyShotOwnership(
  prisma: PrismaClient,
  shotId: string,
  userId: string,
): Promise<{ id: string; sceneId: string } | null> {
  const shot = await prisma.shot.findFirst({
    where: {
      id: shotId,
      scene: { project: { userId } },
    },
    select: { id: true, sceneId: true },
  });
  return shot;
}

/**
 * Verify that an asset belongs to a project owned by the given user.
 */
export async function verifyAssetOwnership(
  prisma: PrismaClient,
  assetId: string,
  userId: string,
): Promise<{ id: string; sceneId: string } | null> {
  const asset = await prisma.sceneAssetVersion.findFirst({
    where: {
      id: assetId,
      scene: { project: { userId } },
    },
    select: { id: true, sceneId: true },
  });
  return asset;
}

/**
 * Verify that a character belongs to a project owned by the given user.
 */
export async function verifyCharacterOwnership(
  prisma: PrismaClient,
  characterId: string,
  userId: string,
): Promise<{ id: string; projectId: string } | null> {
  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      project: { userId },
    },
    select: { id: true, projectId: true },
  });
  return character;
}
