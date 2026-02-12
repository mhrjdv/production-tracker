import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function TimelineFallback() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i}>
                        <CardContent className="py-3 px-4">
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

async function TimelineContent({ projectId }: { projectId: string }) {
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
        select: {
            id: true,
            sceneId: true,
            storyBeat: true,
            act: true,
            actTitle: true,
            macroScene: true,
            emotionalTone: true,
            keyframeUrl: true,
            sortOrder: true,
        },
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Link
                        href={`/projects/${project.id}`}
                        className="hover:text-foreground transition-colors"
                    >
                        {project.name}
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">Timeline</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
                <p className="text-muted-foreground mt-1">
                    Visualize and reorder your scene sequence
                </p>
            </div>

            {scenes.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-semibold mb-1">
                            No scenes to sequence
                        </h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                            Add scenes in the Production tab first, then come here to sequence
                            them.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {scenes.map((scene, index) => (
                        <Link
                            key={scene.id}
                            href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                            className="block"
                        >
                            <Card
                                className="group hover:border-primary/30 hover:shadow-sm transition-all"
                            >
                                <CardContent className="py-3 px-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-muted-foreground/50">
                                            <GripVertical className="h-5 w-5" />
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-xs shrink-0 tabular-nums"
                                        >
                                            {String(index + 1).padStart(3, "0")}
                                        </Badge>
                                        <Badge variant="secondary" className="shrink-0">
                                            {scene.sceneId}
                                        </Badge>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm truncate">
                                                {scene.storyBeat}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Act {scene.act} · {scene.macroScene}
                                            </p>
                                        </div>
                                        {scene.emotionalTone && (
                                            <Badge
                                                variant="outline"
                                                className="hidden md:inline-flex text-xs"
                                            >
                                                {scene.emotionalTone}
                                            </Badge>
                                        )}
                                        {scene.keyframeUrl && (
                                            <div className="h-8 w-12 rounded bg-muted overflow-hidden shrink-0">
                                                <img
                                                    src={scene.keyframeUrl}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default async function TimelinePage(props: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await props.params;

    return (
        <Suspense fallback={<TimelineFallback />}>
            <TimelineContent projectId={projectId} />
        </Suspense>
    );
}
