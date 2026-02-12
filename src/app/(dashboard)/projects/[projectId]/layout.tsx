import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function ProjectLayoutFallback() {
    return (
        <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-4 w-32" />
        </div>
    );
}

async function ProjectShell({
    children,
    projectId,
}: {
    children: React.ReactNode;
    projectId: string;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            userId: session.user.id,
        },
        select: { id: true },
    });

    if (!project) notFound();

    return <>{children}</>;
}

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;

    return (
        <Suspense fallback={<ProjectLayoutFallback />}>
            <ProjectShell projectId={projectId}>{children}</ProjectShell>
        </Suspense>
    );
}
