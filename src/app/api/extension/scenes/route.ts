import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionRequest, getExtensionCorsHeaders } from "@/lib/extension-auth";
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
            { status: 401, headers: getExtensionCorsHeaders() }
        );
    }

    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
        return NextResponse.json(
            { error: "projectId is required" },
            { status: 400, headers: getExtensionCorsHeaders() }
        );
    }

    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
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

    const scenes = await prisma.scene.findMany({
        where: { projectId: project.id },
        orderBy: { sortOrder: "asc" },
        select: {
            id: true,
            sceneId: true,
            storyBeat: true,
            act: true,
            macroScene: true,
        },
    });

    return NextResponse.json(
        { scenes },
        { headers: getExtensionCorsHeaders() }
    );
}
