"use server";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// ─── Character Actions ───────────────────────────────────────

export async function createCharacter(
  projectId: string,
  data: {
    name: string;
    role: string;
    coreIdentity?: string;
    designPhilosophy?: string;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) throw new Error("Project not found");

  await prisma.character.create({
    data: {
      ...data,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}/characters`);
}

export async function updateCharacterPortrait(
  characterId: string,
  portraitUrl: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      project: { userId: session.user.id },
    },
  });
  if (!character) throw new Error("Character not found");

  await prisma.character.update({
    where: { id: characterId },
    data: { portraitUrl },
  });

  revalidatePath(`/projects/${character.projectId}/characters`);
}

// ─── Character Update & Delete ───────────────────────────────

export async function updateCharacter(
  characterId: string,
  data: {
    name?: string;
    role?: string;
    coreIdentity?: string | null;
    designPhilosophy?: string | null;
    visualCues?: string[];
    bodyLanguage?: string[];
    portraitUrl?: string | null;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const character = await prisma.character.findFirst({
    where: { id: characterId, project: { userId: session.user.id } },
  });
  if (!character) throw new Error("Character not found");

  await prisma.character.update({
    where: { id: characterId },
    data,
  });

  revalidatePath(`/projects/${character.projectId}/characters`);
}

export async function deleteCharacter(characterId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const character = await prisma.character.findFirst({
    where: { id: characterId, project: { userId: session.user.id } },
  });
  if (!character) throw new Error("Character not found");

  const projectId = character.projectId;

  await prisma.character.delete({ where: { id: characterId } });

  revalidatePath(`/projects/${projectId}/characters`);
}

// ─── Film Identity ───────────────────────────────────────────

export async function updateFilmIdentity(
  projectId: string,
  data: Record<string, unknown>,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) throw new Error("Project not found");

  await prisma.filmIdentity.upsert({
    where: { projectId },
    create: { projectId, data: data as Prisma.InputJsonValue },
    update: { data: data as Prisma.InputJsonValue },
  });

  revalidatePath(`/projects/${projectId}/bible`);
}
