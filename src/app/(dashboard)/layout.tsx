import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Navigation } from "@/components/navigation";
import { CommandPaletteWrapper } from "@/components/command-palette-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardLayoutFallback() {
    return (
        <div className="min-h-screen">
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <Skeleton className="h-full w-full" />
            </div>
            <main className="md:pl-64">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </main>
        </div>
    );
}

async function DashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Fetch lightweight data for the command palette
    const [projects, scenes] = await Promise.all([
        prisma.project.findMany({
            where: { userId: session.user.id },
            select: { id: true, name: true },
            orderBy: { updatedAt: "desc" },
            take: 20,
        }),
        prisma.scene.findMany({
            where: { project: { userId: session.user.id } },
            select: { id: true, sceneId: true, storyBeat: true, projectId: true },
            orderBy: { sortOrder: "asc" },
            take: 50,
        }),
    ]);

    return (
        <div className="min-h-screen">
            <Navigation />
            <CommandPaletteWrapper projects={projects} scenes={scenes} />
            <main className="md:pl-64">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<DashboardLayoutFallback />}>
            <DashboardShell>{children}</DashboardShell>
        </Suspense>
    );
}
