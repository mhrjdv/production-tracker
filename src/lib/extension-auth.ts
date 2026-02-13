import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashExtensionToken } from "@/lib/extension-tokens";

export interface ExtensionAuthContext {
    userId: string;
    tokenId: string;
}

export async function authenticateExtensionRequest(
    request: NextRequest
): Promise<ExtensionAuthContext | null> {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : "";

    if (!token) {
        return null;
    }

    const tokenHash = hashExtensionToken(token);
    const now = new Date();

    const tokenRecord = await prisma.extensionApiToken.findUnique({
        where: { tokenHash },
        select: {
            id: true,
            userId: true,
            revokedAt: true,
            expiresAt: true,
        },
    });

    if (!tokenRecord) {
        return null;
    }

    if (tokenRecord.revokedAt) {
        return null;
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt <= now) {
        return null;
    }

    await prisma.extensionApiToken.update({
        where: { id: tokenRecord.id },
        data: { lastUsedAt: now },
    });

    return {
        userId: tokenRecord.userId,
        tokenId: tokenRecord.id,
    };
}

export function getExtensionCorsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };
}
