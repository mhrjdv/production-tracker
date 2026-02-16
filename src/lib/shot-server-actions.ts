"use server";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  createShot as createShotCore,
  updateShot as updateShotCore,
  deleteShot as deleteShotCore,
  reorderShots as reorderShotsCore,
  getShotsForScene as getShotsForSceneCore,
  type ShotStore,
  type CreateShotInput,
  type UpdateShotInput,
} from "@/lib/shot-actions";

function prismaStore(): ShotStore {
  return {
    async findMany(sceneId) {
      return prisma.shot.findMany({
        where: { sceneId },
        orderBy: { sortOrder: "asc" },
      });
    },
    async findUnique(id) {
      return prisma.shot.findUnique({ where: { id } });
    },
    async create(data) {
      return prisma.shot.create({
        data: data as Prisma.ShotUncheckedCreateInput,
      });
    },
    async update(id, data) {
      return prisma.shot.update({
        where: { id },
        data: data as Prisma.ShotUncheckedUpdateInput,
      });
    },
    async delete(id) {
      await prisma.shot.delete({ where: { id } });
    },
    async updateMany(_sceneId, updates) {
      await Promise.all(
        updates.map(({ id, sortOrder }) =>
          prisma.shot.update({ where: { id }, data: { sortOrder } }),
        ),
      );
    },
    async nullifyShotOnAssets(shotId) {
      await prisma.sceneAssetVersion.updateMany({
        where: { shotId },
        data: { shotId: null },
      });
    },
  };
}

export async function createShotAction(
  sceneId: string,
  input: CreateShotInput,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const shot = await createShotCore(sceneId, input, prismaStore());

  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { projectId: true },
  });
  if (scene) revalidatePath(`/projects/${scene.projectId}`);

  return shot;
}

export async function updateShotAction(shotId: string, input: UpdateShotInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const shot = await updateShotCore(shotId, input, prismaStore());

  const scene = await prisma.scene.findUnique({
    where: { id: shot.sceneId },
    select: { projectId: true },
  });
  if (scene) revalidatePath(`/projects/${scene.projectId}`);

  return shot;
}

export async function deleteShotAction(shotId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const shot = await prisma.shot.findUnique({
    where: { id: shotId },
    select: { sceneId: true },
  });

  await deleteShotCore(shotId, prismaStore());

  if (shot) {
    const scene = await prisma.scene.findUnique({
      where: { id: shot.sceneId },
      select: { projectId: true },
    });
    if (scene) revalidatePath(`/projects/${scene.projectId}`);
  }
}

export async function reorderShotsAction(
  sceneId: string,
  orderedIds: string[],
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await reorderShotsCore(sceneId, orderedIds, prismaStore());

  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { projectId: true },
  });
  if (scene) revalidatePath(`/projects/${scene.projectId}`);
}

export { type CreateShotInput, type UpdateShotInput };
