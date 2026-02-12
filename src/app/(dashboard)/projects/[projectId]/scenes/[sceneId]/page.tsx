import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SceneDetailClient } from "@/components/scene-detail-client";

function SceneDetailFallback() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-9 w-96" />
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="pt-6 space-y-3">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 space-y-3">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

async function SceneDetailContent({
    projectId,
    sceneId,
}: {
    projectId: string;
    sceneId: string;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        select: { id: true, name: true },
    });
    if (!project) notFound();

    const scene = await prisma.scene.findUnique({
        where: {
            projectId_sceneId: { projectId, sceneId: sceneId.toUpperCase() },
        },
    });
    if (!scene) notFound();

    const [prev, next] = await Promise.all([
        prisma.scene.findFirst({
            where: { projectId, sortOrder: { lt: scene.sortOrder } },
            orderBy: { sortOrder: "desc" },
            select: { sceneId: true, storyBeat: true },
        }),
        prisma.scene.findFirst({
            where: { projectId, sortOrder: { gt: scene.sortOrder } },
            orderBy: { sortOrder: "asc" },
            select: { sceneId: true, storyBeat: true },
        }),
    ]);

    return (
        <SceneDetailClient
            projectId={project.id}
            projectName={project.name}
            scene={{
                ...scene,
                setting: scene.setting as Record<string, string> | null,
                camera: scene.camera as Record<string, string> | null,
            }}
            prev={prev}
            next={next}
        />
    );
}

export default async function SceneDetailPage(props: {
    params: Promise<{ projectId: string; sceneId: string }>;
}) {
    const { projectId, sceneId } = await props.params;

    return (
        <Suspense fallback={<SceneDetailFallback />}>
            <SceneDetailContent projectId={projectId} sceneId={sceneId} />
        </Suspense>
    );
}
