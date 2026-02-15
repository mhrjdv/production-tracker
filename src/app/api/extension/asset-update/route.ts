import { NextRequest, NextResponse } from "next/server";
import { AssetStatus } from "@prisma/client";
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
          platformLabel: true,
        },
      });
    });

    return NextResponse.json(
      { asset: updated, ok: true },
      { headers: getExtensionCorsHeaders() },
    );
  } catch (error) {
    console.error("[asset-update]", error);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500, headers: getExtensionCorsHeaders() },
    );
  }
}
