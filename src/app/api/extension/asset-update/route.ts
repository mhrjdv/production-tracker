import { NextRequest, NextResponse } from "next/server";
import { AssetStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  authenticateExtensionRequest,
  getExtensionCorsHeaders,
} from "@/lib/extension-auth";
import { prisma } from "@/lib/db";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getExtensionCorsHeaders(),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateExtensionRequest(request);

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: getExtensionCorsHeaders() },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.assetId !== "string" || !body.assetId.trim()) {
    return NextResponse.json(
      { error: "assetId is required" },
      { status: 400, headers: getExtensionCorsHeaders() },
    );
  }

  const { assetId, selected, compareGroup } = body as {
    assetId: string;
    selected?: boolean;
    compareGroup?: string | null;
  };

  const existing = await prisma.sceneAssetVersion.findFirst({
    where: {
      id: assetId,
      scene: { project: { userId: auth.userId } },
    },
    select: {
      id: true,
      sceneId: true,
      assetType: true,
      status: true,
      shotId: true,
      scene: { select: { projectId: true, sceneId: true } },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Asset version not found" },
      { status: 404, headers: getExtensionCorsHeaders() },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (selected) {
        await tx.sceneAssetVersion.updateMany({
          where: {
            sceneId: existing.sceneId,
            assetType: existing.assetType,
            selected: true,
            ...(existing.shotId ? { shotId: existing.shotId } : {}),
          },
          data: { selected: false, status: AssetStatus.GENERATED },
        });
      }

      return tx.sceneAssetVersion.update({
        where: { id: assetId },
        data: {
          ...(selected !== undefined && { selected }),
          ...(selected !== undefined && {
            status: selected ? AssetStatus.SELECTED : AssetStatus.GENERATED,
          }),
          ...(compareGroup !== undefined && { compareGroup }),
        },
        select: {
          id: true,
          selected: true,
          status: true,
          compareGroup: true,
          assetType: true,
          versionNumber: true,
          platformKey: true,
          platformLabel: true,
          rightsState: true,
          title: true,
          prompt: true,
          thumbnailUrl: true,
          outputUrl: true,
        },
      });
    });

    // Bust Next.js cache so dashboard pages reflect the update
    const { projectId, sceneId } = existing.scene;
    revalidatePath(`/projects/${projectId}/scenes/${sceneId}`);
    revalidatePath(`/projects/${projectId}/gallery`);
    revalidatePath(`/projects/${projectId}/production`);
    revalidatePath(`/projects/${projectId}/timeline`);

    return NextResponse.json(
      { asset: updated, ok: true },
      { headers: getExtensionCorsHeaders() },
    );
  } catch (error) {
    console.error("[asset-update]", error);
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: getExtensionCorsHeaders() },
    );
  }
}
