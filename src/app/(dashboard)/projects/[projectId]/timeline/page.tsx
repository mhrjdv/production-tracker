import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clock, Film, ImageIcon, Music2, PlayCircle, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const clipClassMap = {
    story: "border-slate-400/35 bg-slate-400/15 hover:bg-slate-400/20",
    image: "border-cyan-400/35 bg-cyan-400/10 hover:bg-cyan-400/20",
    video: "border-emerald-400/35 bg-emerald-400/10 hover:bg-emerald-400/20",
    audio: "border-amber-300/40 bg-amber-300/10 hover:bg-amber-300/20",
} as const;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function pickLanePreview<T extends { selected: boolean }>(assets: T[]) {
    return assets.find((asset) => asset.selected) || assets[0] || null;
}

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
            sourceText: true,
            keyframeUrl: true,
            sortOrder: true,
            assets: {
                orderBy: [{ selected: "desc" }, { createdAt: "desc" }],
                select: {
                    assetType: true,
                    status: true,
                    selected: true,
                    platformLabel: true,
                    versionNumber: true,
                    thumbnailUrl: true,
                    outputUrl: true,
                },
            },
        },
    });

    const scenesWithMetrics = scenes.map((scene) => {
        const counts = {
            image: 0,
            video: 0,
            audio: 0,
            selected: 0,
        };

        for (const asset of scene.assets) {
            if (asset.selected) {
                counts.selected += 1;
            }

            if (asset.assetType === "IMAGE" || asset.assetType === "STORYBOARD") {
                counts.image += 1;
            }

            if (asset.assetType === "VIDEO") {
                counts.video += 1;
            }

            if (
                asset.assetType === "AUDIO" ||
                asset.assetType === "MUSIC" ||
                asset.assetType === "VOICE" ||
                asset.assetType === "NARRATION"
            ) {
                counts.audio += 1;
            }
        }

        const imageAssets = scene.assets.filter(
            (asset) => asset.assetType === "IMAGE" || asset.assetType === "STORYBOARD"
        );
        const videoAssets = scene.assets.filter((asset) => asset.assetType === "VIDEO");
        const audioAssets = scene.assets.filter(
            (asset) =>
                asset.assetType === "AUDIO" ||
                asset.assetType === "MUSIC" ||
                asset.assetType === "VOICE" ||
                asset.assetType === "NARRATION"
        );

        return {
            ...scene,
            clipWidth: clamp(120 + Math.round(scene.sourceText.length / 18), 140, 300),
            counts,
            preview: {
                image: pickLanePreview(imageAssets),
                video: pickLanePreview(videoAssets),
                audio: pickLanePreview(audioAssets),
            },
        };
    });

    return (
        <div className="space-y-6">
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
                    Multi-track scene timeline inspired by edit-suite lanes.
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
                <Card className="overflow-hidden border-border/60">
                    <CardHeader className="border-b border-border/60 pb-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="gap-1">
                                <Film className="h-3 w-3" />
                                Story Lane
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Image Lane
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <PlayCircle className="h-3 w-3" />
                                Video Lane
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <Music2 className="h-3 w-3" />
                                Audio Lane
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                {scenesWithMetrics.reduce((sum, scene) => sum + scene.counts.selected, 0)} selected versions
                            </Badge>
                        </div>
                        <CardTitle className="text-base font-medium">
                            Horizontal timeline: drag concept with fixed scene order from production.
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <div className="min-w-[980px]">
                                <div className="grid grid-cols-[180px_1fr] border-b border-border/60 bg-muted/15">
                                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Timecode
                                    </div>
                                    <div className="flex gap-2 px-3 py-2">
                                        {scenesWithMetrics.map((scene, index) => (
                                            <div
                                                key={`ruler-${scene.id}`}
                                                className="shrink-0 rounded-md border border-border/50 bg-background/40 px-2 py-1 text-[11px] text-muted-foreground"
                                                style={{ width: scene.clipWidth }}
                                            >
                                                {String(index + 1).padStart(3, "0")} · {scene.sceneId}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[180px_1fr] border-b border-border/60">
                                    <div className="flex items-center border-r border-border/60 px-4 py-3 text-sm font-medium">
                                        Story
                                    </div>
                                    <div className="flex gap-2 px-3 py-3">
                                        {scenesWithMetrics.map((scene) => (
                                            <Link
                                                key={`story-${scene.id}`}
                                                href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                                                className={`group relative shrink-0 rounded-md border px-3 py-2 transition-colors ${clipClassMap.story}`}
                                                style={{ width: scene.clipWidth }}
                                            >
                                                <p className="truncate text-xs font-semibold">{scene.sceneId}</p>
                                                <p className="truncate text-[11px] text-muted-foreground">{scene.storyBeat}</p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[180px_1fr] border-b border-border/60">
                                    <div className="flex items-center border-r border-border/60 px-4 py-3 text-sm font-medium">
                                        Image / Storyboard
                                    </div>
                                    <div className="flex gap-2 px-3 py-3">
                                        {scenesWithMetrics.map((scene) => (
                                            <Link
                                                key={`image-${scene.id}`}
                                                href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                                                className={`shrink-0 rounded-md border px-3 py-2 transition-colors ${clipClassMap.image}`}
                                                style={{ width: scene.clipWidth }}
                                            >
                                                <p className="text-[11px] font-medium">
                                                    {scene.counts.image > 0 ? `${scene.counts.image} versions` : "No image pass"}
                                                </p>
                                                {scene.preview.image && (
                                                    <div className="mt-1 rounded border border-border/50 bg-background/60 p-1">
                                                        {scene.preview.image.thumbnailUrl ? (
                                                            <img
                                                                src={scene.preview.image.thumbnailUrl}
                                                                alt={`${scene.sceneId} image preview`}
                                                                className="h-10 w-full rounded object-cover"
                                                            />
                                                        ) : (
                                                            <p className="truncate text-[10px] text-muted-foreground">
                                                                {scene.preview.image.platformLabel} v{scene.preview.image.versionNumber}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[180px_1fr] border-b border-border/60">
                                    <div className="flex items-center border-r border-border/60 px-4 py-3 text-sm font-medium">
                                        Video
                                    </div>
                                    <div className="flex gap-2 px-3 py-3">
                                        {scenesWithMetrics.map((scene) => (
                                            <Link
                                                key={`video-${scene.id}`}
                                                href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                                                className={`shrink-0 rounded-md border px-3 py-2 transition-colors ${clipClassMap.video}`}
                                                style={{ width: scene.clipWidth }}
                                            >
                                                <p className="text-[11px] font-medium">
                                                    {scene.counts.video > 0 ? `${scene.counts.video} video versions` : "No video pass"}
                                                </p>
                                                {scene.preview.video && (
                                                    <div className="mt-1 rounded border border-border/50 bg-background/60 p-1">
                                                        {scene.preview.video.thumbnailUrl ? (
                                                            <img
                                                                src={scene.preview.video.thumbnailUrl}
                                                                alt={`${scene.sceneId} video preview`}
                                                                className="h-10 w-full rounded object-cover"
                                                            />
                                                        ) : (
                                                            <p className="truncate text-[10px] text-muted-foreground">
                                                                {scene.preview.video.platformLabel} v{scene.preview.video.versionNumber}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[180px_1fr]">
                                    <div className="flex items-center border-r border-border/60 px-4 py-3 text-sm font-medium">
                                        Audio / Voice / Music
                                    </div>
                                    <div className="flex gap-2 px-3 py-3">
                                        {scenesWithMetrics.map((scene) => (
                                            <Link
                                                key={`audio-${scene.id}`}
                                                href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                                                className={`shrink-0 rounded-md border px-3 py-2 transition-colors ${clipClassMap.audio}`}
                                                style={{ width: scene.clipWidth }}
                                            >
                                                <p className="text-[11px] font-medium">
                                                    {scene.counts.audio > 0 ? `${scene.counts.audio} audio versions` : "No audio pass"}
                                                </p>
                                                {scene.preview.audio && (
                                                    <div className="mt-1 rounded border border-border/50 bg-background/60 p-1">
                                                        <p className="truncate text-[10px] text-muted-foreground">
                                                            {scene.preview.audio.platformLabel} v{scene.preview.audio.versionNumber}
                                                        </p>
                                                    </div>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>
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
