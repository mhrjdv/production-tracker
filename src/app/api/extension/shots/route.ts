import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const auth = await authenticateExtensionRequest(request);

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: getExtensionCorsHeaders() },
    );
  }

  const sceneDbId = request.nextUrl.searchParams.get("sceneDbId");

  if (!sceneDbId) {
    return NextResponse.json(
      { error: "sceneDbId is required" },
      { status: 400, headers: getExtensionCorsHeaders() },
    );
  }

  // Verify scene belongs to user's project
  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneDbId,
      project: { userId: auth.userId },
    },
    select: { id: true },
  });

  if (!scene) {
    return NextResponse.json(
      { error: "Scene not found" },
      { status: 404, headers: getExtensionCorsHeaders() },
    );
  }

  const shots = await prisma.shot.findMany({
    where: { sceneId: scene.id },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      shotCode: true,
      description: true,
      sortOrder: true,
    },
  });

  return NextResponse.json(
    { shots },
    { headers: getExtensionCorsHeaders() },
  );
}
