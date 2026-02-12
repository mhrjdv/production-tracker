import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductionClient } from "@/components/production-client";

function ProductionFallback() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-64" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

async function ProductionContent({ projectId }: { projectId: string }) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        select: { id: true, name: true },
    });
    if (!project) notFound();

    const scenes = await prisma.scene.findMany({
        where: { projectId },
        orderBy: { sortOrder: "asc" },
    });

    return (
        <ProductionClient
            projectId={project.id}
            projectName={project.name}
            scenes={scenes}
        />
    );
}

export default async function ProductionPage(props: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await props.params;

    return (
        <Suspense fallback={<ProductionFallback />}>
            <ProductionContent projectId={projectId} />
        </Suspense>
    );
}
