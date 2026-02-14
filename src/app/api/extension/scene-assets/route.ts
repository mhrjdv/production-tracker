import { NextRequest, NextResponse } from "next/server";
import { AssetType } from "@prisma/client";
import { authenticateExtensionRequest, getExtensionCorsHeaders } from "@/lib/extension-auth";
import { prisma } from "@/lib/db";
import { findExtensionSceneAssets } from "@/lib/scene-assets-compat";

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: getExtensionCorsHeaders(),
    });
}

export async function GET(request: NextRequest) {
    const auth = await authenticateExtensionRequest(request);

    if (!auth) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: getExtensionCorsHeaders() }
        );
    }

    const projectId = request.nextUrl.searchParams.get("projectId");
    const sceneId = request.nextUrl.searchParams.get("sceneId");
    const assetTypeParam = request.nextUrl.searchParams.get("assetType");
    const limitParam = Number(request.nextUrl.searchParams.get("limit") || "30");
    const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(limitParam, 1), 100)
        : 30;

    if (!projectId || !sceneId) {
        return NextResponse.json(
            { error: "projectId and sceneId are required" },
            { status: 400, headers: getExtensionCorsHeaders() }
        );
    }

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: auth.userId },
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
                sceneId: sceneId.toUpperCase(),
            },
        },
        select: {
            id: true,
            sceneId: true,
            storyBeat: true,
        },
    });

    if (!scene) {
        return NextResponse.json(
            { error: "Scene not found" },
            { status: 404, headers: getExtensionCorsHeaders() }
        );
    }

    const assetType = assetTypeParam && Object.values(AssetType).includes(assetTypeParam as AssetType)
        ? (assetTypeParam as AssetType)
        : undefined;

    const assets = await findExtensionSceneAssets({
        sceneId: scene.id,
        assetType,
        limit,
    });

    return NextResponse.json(
        {
            scene,
            assets: assets.map((asset) => ({
                ...asset,
                createdAt: asset.createdAt.toISOString(),
            })),
        },
        { headers: getExtensionCorsHeaders() }
    );
}
