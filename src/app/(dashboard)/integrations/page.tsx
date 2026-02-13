import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationsClient } from "@/components/integrations-client";
import { sanitizeExtensionPreferencesUpdate } from "@/lib/extension-profile";

function IntegrationsFallback() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

async function IntegrationsContent() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const [tokens, user] = await Promise.all([
        prisma.extensionApiToken.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                tokenPrefix: true,
                createdAt: true,
                lastUsedAt: true,
                expiresAt: true,
                revokedAt: true,
            },
        }),
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                extensionPreferences: true,
            },
        }),
    ]);

    const extensionPreferences = sanitizeExtensionPreferencesUpdate(
        user?.extensionPreferences ?? {}
    );

    return (
        <div className="space-y-8">
            <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href="/" className="hover:text-foreground transition-colors">
                        Dashboard
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">Integrations</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                <p className="mt-1 text-muted-foreground">
                    Manage secure token-based access for the Chrome extension sync workflow.
                </p>
            </div>

            <IntegrationsClient
                tokens={tokens.map((token) => ({
                    ...token,
                    createdAt: token.createdAt.toISOString(),
                    lastUsedAt: token.lastUsedAt?.toISOString() || null,
                    expiresAt: token.expiresAt?.toISOString() || null,
                    revokedAt: token.revokedAt?.toISOString() || null,
                }))}
                extensionPreferences={extensionPreferences}
            />
        </div>
    );
}

export default function IntegrationsPage() {
    return (
        <Suspense fallback={<IntegrationsFallback />}>
            <IntegrationsContent />
        </Suspense>
    );
}
