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

    const projects = await prisma.project.findMany({
        where: { userId: auth.userId },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            name: true,
            status: true,
            genre: true,
            updatedAt: true,
            _count: {
                select: {
                    scenes: true,
                },
            },
        },
    });

    return NextResponse.json(
        {
            projects: projects.map((project) => ({
                id: project.id,
                name: project.name,
                status: project.status,
                genre: project.genre,
                updatedAt: project.updatedAt,
                sceneCount: project._count.scenes,
            })),
        },
        { headers: getExtensionCorsHeaders() }
    );
}
