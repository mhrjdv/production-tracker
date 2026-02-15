"use server";

import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Scene Actions ───────────────────────────────────────────

export async function createScene(
  projectId: string,
  data: {
    sceneId: string;
    sourceText: string;
    act: number;
    actTitle: string;
    macroScene: string;
    storyBeat: string;
    reason?: string;
    narrativePurpose?: string;
    emotionalTone?: string;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) throw new Error("Project not found");

  const maxOrder = await prisma.scene.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  await prisma.scene.create({
    data: {
      ...data,
      projectId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}/production`);
}

export async function updateSceneOrder(projectId: string, sceneIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) throw new Error("Project not found");

  await prisma.$transaction(
    sceneIds.map((id, index) =>
      prisma.scene.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidatePath(`/projects/${projectId}/timeline`);
}

export async function updateSceneKeyframe(
  sceneId: string,
  keyframeUrl: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneId,
      project: { userId: session.user.id },
    },
  });
  if (!scene) throw new Error("Scene not found");

  await prisma.scene.update({
    where: { id: sceneId },
    data: { keyframeUrl },
  });

  revalidatePath(`/projects/${scene.projectId}/production`);
}

// ─── Scene Update & Delete ───────────────────────────────────

export async function updateScene(
  sceneDbId: string,
  data: {
    sourceText?: string;
    storyBeat?: string;
    act?: number;
    actTitle?: string;
    macroScene?: string;
    reason?: string;
    narrativePurpose?: string;
    emotionalTone?: string;
    setting?: Record<string, string> | null;
    camera?: Record<string, string> | null;
    actions?: string[];
    visualMotifs?: string[];
    constraints?: string[];
    charactersPresent?: string[];
    keyframeUrl?: string | null;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: { id: sceneDbId, project: { userId: session.user.id } },
  });
  if (!scene) throw new Error("Scene not found");

  // Prisma requires JsonNull for setting nullable Json fields to null
  const prismaData: Record<string, unknown> = { ...data };
  if (data.setting === null) prismaData.setting = Prisma.JsonNull;
  if (data.camera === null) prismaData.camera = Prisma.JsonNull;

  await prisma.scene.update({
    where: { id: sceneDbId },
    data: prismaData,
  });

  revalidatePath(`/projects/${scene.projectId}/production`);
  revalidatePath(`/projects/${scene.projectId}/timeline`);
  revalidatePath(`/projects/${scene.projectId}/scenes/${scene.sceneId}`);
}

export async function deleteScene(sceneDbId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: { id: sceneDbId, project: { userId: session.user.id } },
  });
  if (!scene) throw new Error("Scene not found");

  const projectId = scene.projectId;

  await prisma.scene.delete({ where: { id: sceneDbId } });

  revalidatePath(`/projects/${projectId}/production`);
  revalidatePath(`/projects/${projectId}/timeline`);
}
