import { NextRequest, NextResponse } from "next/server";
import { AssetStatus, AssetType, Prisma, RightsState } from "@prisma/client";
import { z } from "zod";
import { authenticateExtensionRequest, getExtensionCorsHeaders } from "@/lib/extension-auth";
import { prisma } from "@/lib/db";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-compat";

const ingestSchema = z.object({
    projectId: z.string().min(1),
    sceneId: z.string().min(1),
    platformId: z.string().optional(),
    platformKey: z.string().min(1),
    platformLabel: z.string().optional(),
    assetType: z.nativeEnum(AssetType),
    prompt: z.string().min(1),
    negativePrompt: z.string().optional(),
    modelName: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    externalAssetId: z.string().optional(),
    outputUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    provenance: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    title: z.string().optional(),
    rightsState: z.nativeEnum(RightsState).optional(),
    promptPackageId: z.string().optional(),
    createPromptPackage: z.boolean().optional(),
    promptPackage: z
        .object({
            name: z.string().optional(),
            prompt: z.string().optional(),
            negativePrompt: z.string().optional(),
            constraints: z.record(z.string(), z.unknown()).optional(),
            targetAspectRatio: z.string().optional(),
            targetDurationSec: z.number().int().positive().optional(),
            styleProfile: z.string().optional(),
            tags: z.array(z.string()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
        })
        .optional(),
    parentVersionId: z.string().optional(),
    costEstimateUsd: z.number().nonnegative().optional(),
    generationSeconds: z.number().int().nonnegative().optional(),
    queueWaitSeconds: z.number().int().nonnegative().optional(),
    compareGroup: z.string().optional(),
    selected: z.boolean().optional(),
    status: z.nativeEnum(AssetStatus).optional(),
});

function toSelectedStatus(status: AssetStatus | undefined, selected: boolean): AssetStatus {
    if (selected) return AssetStatus.SELECTED;
    return status ?? AssetStatus.DRAFT;
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: getExtensionCorsHeaders(),
    });
}

export async function POST(request: NextRequest) {
    const auth = await authenticateExtensionRequest(request);

    if (!auth) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: getExtensionCorsHeaders() }
        );
    }

    const body = await request.json().catch(() => null);
    const parsed = ingestSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid payload", details: parsed.error.flatten() },
            { status: 400, headers: getExtensionCorsHeaders() }
        );
    }

    const payload = parsed.data;

    const project = await prisma.project.findFirst({
        where: {
            id: payload.projectId,
            userId: auth.userId,
        },
        select: { id: true },
    });

    if (!project) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404, headers: getExtensionCorsHeaders() }
        );
    }

    const scene = await prisma.scene.findUnique({
        where: {
            projectId_sceneId: {
                projectId: project.id,
                sceneId: payload.sceneId.toUpperCase(),
            },
        },
        select: {
            id: true,
            sceneId: true,
            projectId: true,
        },
    });

    if (!scene) {
        return NextResponse.json(
            { error: "Scene not found" },
            { status: 404, headers: getExtensionCorsHeaders() }
        );
    }

    const platformKey = payload.platformKey.trim().toLowerCase();
    const platform = payload.platformId
        ? await prisma.aiPlatform.findUnique({
            where: { id: payload.platformId },
            select: { id: true, slug: true, name: true },
        })
        : await prisma.aiPlatform.findUnique({
            where: { slug: platformKey },
            select: { id: true, slug: true, name: true },
        });

    const versionAgg = await prisma.sceneAssetVersion.aggregate({
        where: {
            sceneId: scene.id,
            platformKey,
            assetType: payload.assetType,
        },
        _max: { versionNumber: true },
    });

    const versionNumber = (versionAgg._max.versionNumber ?? 0) + 1;
    const isSelected = payload.selected || payload.status === AssetStatus.SELECTED;
    const normalizedStatus = toSelectedStatus(payload.status, isSelected);

    try {
        const created = await prisma.$transaction(async (tx) => {
        let promptPackageId: string | null = null;
        if (payload.promptPackageId) {
            const existingPromptPackage = await tx.promptPackage.findFirst({
                where: {
                    id: payload.promptPackageId,
                    sceneId: scene.id,
                },
                select: { id: true },
            });
            if (!existingPromptPackage) {
                throw new Error("Prompt package not found for scene");
            }
            promptPackageId = existingPromptPackage.id;
        } else if (payload.createPromptPackage || payload.promptPackage) {
            const packageVersionAgg = await tx.promptPackage.aggregate({
                where: { sceneId: scene.id },
                _max: { versionNumber: true },
            });
            const packageVersion = (packageVersionAgg._max.versionNumber ?? 0) + 1;
            const createdPromptPackage = await tx.promptPackage.create({
                data: {
                    sceneId: scene.id,
                    versionNumber: packageVersion,
                    name: payload.promptPackage?.name?.trim() || null,
                    prompt: (payload.promptPackage?.prompt || payload.prompt).trim(),
                    negativePrompt:
                        payload.promptPackage?.negativePrompt || payload.negativePrompt || null,
                    constraints: (payload.promptPackage?.constraints ?? undefined) as
                        | Prisma.InputJsonValue
                        | undefined,
                    targetAspectRatio: payload.promptPackage?.targetAspectRatio || null,
                    targetDurationSec: payload.promptPackage?.targetDurationSec ?? null,
                    styleProfile: payload.promptPackage?.styleProfile || null,
                    tags: payload.promptPackage?.tags || payload.tags || [],
                    metadata: (payload.promptPackage?.metadata ?? payload.metadata ?? undefined) as
                        | Prisma.InputJsonValue
                        | undefined,
                    createdById: auth.userId,
                },
                select: { id: true },
            });
            promptPackageId = createdPromptPackage.id;
        }

        if (isSelected) {
            await tx.sceneAssetVersion.updateMany({
                where: {
                    sceneId: scene.id,
                    assetType: payload.assetType,
                    selected: true,
                },
                data: {
                    selected: false,
                    status: AssetStatus.GENERATED,
                },
            });
        }

        return tx.sceneAssetVersion.create({
            data: {
                sceneId: scene.id,
                promptPackageId,
                platformId: platform?.id || null,
                parentVersionId: payload.parentVersionId || null,
                platformKey,
                platformLabel:
                    payload.platformLabel?.trim() ||
                    platform?.name ||
                    platformKey,
                assetType: payload.assetType,
                status: normalizedStatus,
                rightsState: payload.rightsState || RightsState.UNKNOWN,
                versionNumber,
                title: payload.title || null,
                prompt: payload.prompt.trim(),
                negativePrompt: payload.negativePrompt || null,
                modelName: payload.modelName || null,
                sourceUrl: payload.sourceUrl || null,
                externalAssetId: payload.externalAssetId || null,
                outputUrl: payload.outputUrl || null,
                thumbnailUrl: payload.thumbnailUrl || null,
                costEstimateUsd: payload.costEstimateUsd ?? null,
                generationSeconds: payload.generationSeconds ?? null,
                queueWaitSeconds: payload.queueWaitSeconds ?? null,
                compareGroup: payload.compareGroup || null,
                metadata: (payload.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
                provenance: (payload.provenance ?? undefined) as Prisma.InputJsonValue | undefined,
                tags: payload.tags ?? [],
                notes: payload.notes || null,
                selected: isSelected,
                createdById: auth.userId,
            },
            select: {
                id: true,
                versionNumber: true,
                platformKey: true,
                platformLabel: true,
                assetType: true,
                status: true,
                rightsState: true,
                createdAt: true,
            },
        });
        });

        return NextResponse.json(
            {
                asset: created,
                ok: true,
            },
            { headers: getExtensionCorsHeaders() }
        );
    } catch (error) {
        if (!isPrismaSchemaMismatchError(error)) {
            const message = error instanceof Error ? error.message : "Ingestion failed";
            return NextResponse.json(
                { error: message },
                { status: 400, headers: getExtensionCorsHeaders() }
            );
        }

        try {
            const legacyCreated = await prisma.$transaction(async (tx) => {
                if (isSelected) {
                    await tx.sceneAssetVersion.updateMany({
                        where: {
                            sceneId: scene.id,
                            assetType: payload.assetType,
                            selected: true,
                        },
                        data: {
                            selected: false,
                            status: AssetStatus.GENERATED,
                        },
                    });
                }

                return tx.sceneAssetVersion.create({
                    data: {
                        sceneId: scene.id,
                        platformId: platform?.id || null,
                        platformKey,
                        platformLabel:
                            payload.platformLabel?.trim() ||
                            platform?.name ||
                            platformKey,
                        assetType: payload.assetType,
                        status: normalizedStatus,
                        versionNumber,
                        title: payload.title || null,
                        prompt: payload.prompt.trim(),
                        negativePrompt: payload.negativePrompt || null,
                        modelName: payload.modelName || null,
                        sourceUrl: payload.sourceUrl || null,
                        externalAssetId: payload.externalAssetId || null,
                        outputUrl: payload.outputUrl || null,
                        thumbnailUrl: payload.thumbnailUrl || null,
                        metadata: (payload.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
                        tags: payload.tags ?? [],
                        notes: payload.notes || null,
                        selected: isSelected,
                        createdById: auth.userId,
                    },
                    select: {
                        id: true,
                        versionNumber: true,
                        platformKey: true,
                        platformLabel: true,
                        assetType: true,
                        status: true,
                        createdAt: true,
                    },
                });
            });

            return NextResponse.json(
                {
                    asset: {
                        ...legacyCreated,
                        rightsState: "UNKNOWN",
                    },
                    ok: true,
                    compatibilityMode: true,
                },
                { headers: getExtensionCorsHeaders() }
            );
        } catch (legacyError) {
            const message = legacyError instanceof Error ? legacyError.message : "Ingestion failed";
            return NextResponse.json(
                { error: message },
                { status: 400, headers: getExtensionCorsHeaders() }
            );
        }
    }
}
