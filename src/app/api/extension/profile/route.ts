import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateExtensionRequest, getExtensionCorsHeaders } from "@/lib/extension-auth";
import { sanitizeExtensionPreferencesUpdate, type ExtensionPreferences } from "@/lib/extension-profile";
import {
    getUserExtensionPreferences,
    saveUserExtensionPreferences,
} from "@/lib/extension-preferences-compat";

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

    const preferences = await getUserExtensionPreferences(auth.userId);

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

    const result = await saveUserExtensionPreferences(auth.userId, update);

    if (!result.foundUser) {
        return NextResponse.json(
            { error: "User not found" },
            { status: 404, headers: getExtensionCorsHeaders() }
        );
    }

    return profileResponse(result.preferences);
}
