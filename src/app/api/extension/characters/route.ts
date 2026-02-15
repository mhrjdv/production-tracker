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
            { status: 401, headers: getExtensionCorsHeaders() },
        );
    }

    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
        return NextResponse.json(
            { error: "projectId is required" },
            { status: 400, headers: getExtensionCorsHeaders() },
        );
    }

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: auth.userId },
        select: { id: true },
    });

    if (!project) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404, headers: getExtensionCorsHeaders() },
        );
    }

    const characters = await prisma.character.findMany({
        where: { projectId: project.id },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            role: true,
            portraitUrl: true,
            coreIdentity: true,
            visualCues: true,
            bodyLanguage: true,
        },
    });

    return NextResponse.json(
        { characters },
        { headers: getExtensionCorsHeaders() },
    );
}
