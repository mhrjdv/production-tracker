"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AssetStatus, AssetType, Prisma } from "@prisma/client";
import { generateExtensionToken } from "@/lib/extension-tokens";

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
                        data: data.identity as Prisma.InputJsonValue,
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
        create: { projectId, data: data as Prisma.InputJsonValue },
        update: { data: data as Prisma.InputJsonValue },
    });

    revalidatePath(`/projects/${projectId}/bible`);
}

// ─── Scene Asset Versioning ─────────────────────────────────

export async function createSceneAssetVersion(
    sceneDbId: string,
    data: {
        platformId?: string | null;
        platformKey: string;
        platformLabel: string;
        assetType: AssetType;
        prompt: string;
        negativePrompt?: string | null;
        modelName?: string | null;
        sourceUrl?: string | null;
        externalAssetId?: string | null;
        outputUrl?: string | null;
        thumbnailUrl?: string | null;
        metadata?: Record<string, unknown> | null;
        tags?: string[];
        notes?: string | null;
        status?: AssetStatus;
        selected?: boolean;
        title?: string | null;
    }
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const scene = await prisma.scene.findFirst({
        where: {
            id: sceneDbId,
            project: { userId: session.user.id },
        },
        select: {
            id: true,
            sceneId: true,
            projectId: true,
        },
    });

    if (!scene) {
        throw new Error("Scene not found");
    }

    const platformKey = data.platformKey.trim().toLowerCase();
    const platformLabel = data.platformLabel.trim() || platformKey;

    const versionAgg = await prisma.sceneAssetVersion.aggregate({
        where: {
            sceneId: scene.id,
            platformKey,
            assetType: data.assetType,
        },
        _max: { versionNumber: true },
    });

    const versionNumber = (versionAgg._max.versionNumber ?? 0) + 1;
    const isSelected = data.selected || data.status === AssetStatus.SELECTED;

    const created = await prisma.$transaction(async (tx) => {
        if (isSelected) {
            await tx.sceneAssetVersion.updateMany({
                where: {
                    sceneId: scene.id,
                    assetType: data.assetType,
                    selected: true,
                },
                data: { selected: false, status: AssetStatus.GENERATED },
            });
        }

        return tx.sceneAssetVersion.create({
            data: {
                sceneId: scene.id,
                platformId: data.platformId || null,
                platformKey,
                platformLabel,
                assetType: data.assetType,
                status: data.status || AssetStatus.DRAFT,
                versionNumber,
                title: data.title || null,
                prompt: data.prompt.trim(),
                negativePrompt: data.negativePrompt || null,
                modelName: data.modelName || null,
                sourceUrl: data.sourceUrl || null,
                externalAssetId: data.externalAssetId || null,
                outputUrl: data.outputUrl || null,
                thumbnailUrl: data.thumbnailUrl || null,
                metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
                tags: data.tags ?? [],
                notes: data.notes || null,
                selected: isSelected,
                createdById: session.user.id,
            },
        });
    });

    revalidatePath(`/projects/${scene.projectId}/scenes/${scene.sceneId}`);

    return created;
}

export async function updateSceneAssetVersion(
    assetId: string,
    data: {
        title?: string | null;
        prompt?: string;
        negativePrompt?: string | null;
        modelName?: string | null;
        sourceUrl?: string | null;
        externalAssetId?: string | null;
        outputUrl?: string | null;
        thumbnailUrl?: string | null;
        metadata?: Record<string, unknown> | null;
        tags?: string[];
        notes?: string | null;
        status?: AssetStatus;
        selected?: boolean;
    }
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const existing = await prisma.sceneAssetVersion.findFirst({
        where: {
            id: assetId,
            scene: { project: { userId: session.user.id } },
        },
        select: {
            id: true,
            sceneId: true,
            assetType: true,
            scene: {
                select: {
                    projectId: true,
                    sceneId: true,
                },
            },
        },
    });

    if (!existing) {
        throw new Error("Asset version not found");
    }

    const shouldSelect = data.selected || data.status === AssetStatus.SELECTED;

    await prisma.$transaction(async (tx) => {
        if (shouldSelect) {
            await tx.sceneAssetVersion.updateMany({
                where: {
                    sceneId: existing.sceneId,
                    assetType: existing.assetType,
                    selected: true,
                },
                data: { selected: false, status: AssetStatus.GENERATED },
            });
        }

        await tx.sceneAssetVersion.update({
            where: { id: assetId },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.prompt !== undefined && { prompt: data.prompt.trim() }),
                ...(data.negativePrompt !== undefined && { negativePrompt: data.negativePrompt }),
                ...(data.modelName !== undefined && { modelName: data.modelName }),
                ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl }),
                ...(data.externalAssetId !== undefined && { externalAssetId: data.externalAssetId }),
                ...(data.outputUrl !== undefined && { outputUrl: data.outputUrl }),
                ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
                ...(data.metadata !== undefined && { metadata: data.metadata as Prisma.InputJsonValue }),
                ...(data.tags !== undefined && { tags: data.tags }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.selected !== undefined && { selected: data.selected }),
            },
        });
    });

    revalidatePath(`/projects/${existing.scene.projectId}/scenes/${existing.scene.sceneId}`);
}

export async function deleteSceneAssetVersion(assetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const existing = await prisma.sceneAssetVersion.findFirst({
        where: {
            id: assetId,
            scene: { project: { userId: session.user.id } },
        },
        select: {
            id: true,
            scene: {
                select: {
                    projectId: true,
                    sceneId: true,
                },
            },
        },
    });

    if (!existing) {
        throw new Error("Asset version not found");
    }

    await prisma.sceneAssetVersion.delete({
        where: { id: existing.id },
    });

    revalidatePath(`/projects/${existing.scene.projectId}/scenes/${existing.scene.sceneId}`);
}

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
            : null;

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
