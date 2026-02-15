import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CommandPaletteWrapper } from "@/components/command-palette-wrapper";

async function AuthGate() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

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

    return <CommandPaletteWrapper projects={projects} scenes={scenes} />;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            <Suspense>
                <AuthGate />
            </Suspense>
            <main className="md:pl-64">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
