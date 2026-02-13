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

    const platforms = await prisma.aiPlatform.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            slug: true,
            name: true,
            provider: true,
            specialties: true,
            supportedOutput: true,
            homepageUrl: true,
            docsUrl: true,
        },
    });

    return NextResponse.json(
        { platforms },
        { headers: getExtensionCorsHeaders() }
    );
}
