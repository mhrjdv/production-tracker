import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateExtensionRequest, getExtensionCorsHeaders } from "@/lib/extension-auth";
import { prisma } from "@/lib/db";
import {
    mergeExtensionPreferences,
    sanitizeExtensionPreferencesUpdate,
    type ExtensionPreferences,
} from "@/lib/extension-profile";

const profileUpdateSchema = z.object({
    preferences: z.unknown().optional(),
});

function profileResponse(preferences: ExtensionPreferences) {
    return NextResponse.json(
        { preferences },
        { headers: getExtensionCorsHeaders() }
    );
}

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

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { extensionPreferences: true },
    });

    const preferences = sanitizeExtensionPreferencesUpdate(
        user?.extensionPreferences ?? {}
    );

    return profileResponse(preferences);
}

export async function PUT(request: NextRequest) {
    const auth = await authenticateExtensionRequest(request);

    if (!auth) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: getExtensionCorsHeaders() }
        );
    }

    const body = await request.json().catch(() => null);
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid payload" },
            { status: 400, headers: getExtensionCorsHeaders() }
        );
    }

    const update = sanitizeExtensionPreferencesUpdate(
        parsed.data.preferences ?? {}
    );

    const existingUser = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { extensionPreferences: true },
    });

    if (!existingUser) {
        return NextResponse.json(
            { error: "User not found" },
            { status: 404, headers: getExtensionCorsHeaders() }
        );
    }

    const merged = mergeExtensionPreferences(
        existingUser.extensionPreferences,
        update
    );

    await prisma.user.update({
        where: { id: auth.userId },
        data: {
            extensionPreferences: merged as Prisma.InputJsonValue,
        },
    });

    return profileResponse(merged);
}
