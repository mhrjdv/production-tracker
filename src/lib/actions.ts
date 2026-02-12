"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Project Actions ─────────────────────────────────────────

export async function createProject(data: {
    name: string;
    description?: string;
    genre?: string;
    identity?: Record<string, unknown>;
    characters?: Array<{
        name: string;
        role: string;
        coreIdentity?: string;
    }>;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const project = await prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            genre: data.genre,
            user: { connect: { id: session.user.id } },
            ...(data.identity && {
                identity: {
                    create: {
                        data: data.identity as any,
                    },
                },
            }),
            ...(data.characters &&
                data.characters.length > 0 && {
                characters: {
                    create: data.characters.map((c) => ({
                        name: c.name,
                        role: c.role,
                        coreIdentity: c.coreIdentity,
                    })),
                },
            }),
        },
    });

    revalidatePath("/");
    redirect(`/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.project.delete({
        where: {
            id: projectId,
            userId: session.user.id,
        },
    });

    revalidatePath("/");
    redirect("/");
}

export async function getUserProjects() {
    const session = await auth();
    if (!session?.user?.id) return [];

    return prisma.project.findMany({
        where: { userId: session.user.id },
        include: {
            _count: {
                select: {
                    scenes: true,
                    characters: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });
}

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
    }
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

export async function updateSceneOrder(
    projectId: string,
    sceneIds: string[]
) {
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
            })
        )
    );

    revalidatePath(`/projects/${projectId}/timeline`);
}

export async function updateSceneKeyframe(
    sceneId: string,
    keyframeUrl: string
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

// ─── Character Actions ───────────────────────────────────────

export async function createCharacter(
    projectId: string,
    data: {
        name: string;
        role: string;
        coreIdentity?: string;
        designPhilosophy?: string;
    }
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
    portraitUrl: string
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
    }
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const scene = await prisma.scene.findFirst({
        where: { id: sceneDbId, project: { userId: session.user.id } },
    });
    if (!scene) throw new Error("Scene not found");

    await prisma.scene.update({
        where: { id: sceneDbId },
        data,
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
    }
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
    data: Record<string, unknown>
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
    });
    if (!project) throw new Error("Project not found");

    await prisma.filmIdentity.upsert({
        where: { projectId },
        create: { projectId, data: data as any },
        update: { data: data as any },
    });

    revalidatePath(`/projects/${projectId}/bible`);
}
