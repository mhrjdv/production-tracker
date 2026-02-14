"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AssetType, RightsState } from "@prisma/client";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    ArrowRight,
    Camera,
    Check,
    Eye,
    Film,
    Loader2,
    MapPin,
    Pencil,
    Trash2,
    Users,
    X,
} from "lucide-react";
import { updateScene, deleteScene } from "@/lib/actions";
import { DeleteDialog } from "@/components/delete-dialog";
import { SceneAssetsPanel } from "@/components/scene-assets-panel";

interface SceneDetailData {
    id: string;
    sceneId: string;
    sourceText: string;
    reason: string;
    act: number;
    actTitle: string;
    macroScene: string;
    storyBeat: string;
    narrativePurpose: string | null;
    emotionalTone: string | null;
    setting: Record<string, string> | null;
    camera: Record<string, string> | null;
    actions: string[];
    visualMotifs: string[];
    constraints: string[];
    charactersPresent: string[];
    keyframeUrl: string | null;
    sortOrder: number;
}

interface SceneDetailClientProps {
    projectId: string;
    projectName: string;
    scene: SceneDetailData;
    assets: Array<{
        id: string;
        promptPackageId: string | null;
        parentVersionId: string | null;
        platformId: string | null;
        platformKey: string;
        platformLabel: string;
        assetType: "SCRIPT" | "IMAGE" | "VIDEO" | "AUDIO" | "MUSIC" | "VOICE" | "NARRATION" | "STORYBOARD" | "OTHER";
        status: "DRAFT" | "GENERATED" | "SELECTED" | "REJECTED" | "ARCHIVED";
        rightsState: RightsState;
        versionNumber: number;
        title: string | null;
        prompt: string;
        negativePrompt: string | null;
        modelName: string | null;
        sourceUrl: string | null;
        externalAssetId: string | null;
        outputUrl: string | null;
        thumbnailUrl: string | null;
        costEstimateUsd: number | null;
        generationSeconds: number | null;
        queueWaitSeconds: number | null;
        compareGroup: string | null;
        metadata: Record<string, unknown> | null;
        provenance: Record<string, unknown> | null;
        tags: string[];
        notes: string | null;
        selected: boolean;
        createdAt: string;
        createdByName: string | null;
    }>;
    platforms: Array<{
        id: string;
        slug: string;
        name: string;
        provider: string | null;
        specialties: string[];
        supportedOutput: AssetType[];
    }>;
    promptPackages: Array<{
        id: string;
        versionNumber: number;
        name: string | null;
        prompt: string;
        negativePrompt: string | null;
        targetAspectRatio: string | null;
        targetDurationSec: number | null;
        styleProfile: string | null;
        tags: string[];
        metadata: Record<string, unknown> | null;
        createdAt: string;
    }>;
    prev: { sceneId: string; storyBeat: string } | null;
    next: { sceneId: string; storyBeat: string } | null;
}

export function SceneDetailClient({
    projectId,
    projectName,
    scene,
    assets,
    platforms,
    promptPackages,
    prev,
    next,
}: SceneDetailClientProps) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [deleteOpen, setDeleteOpen] = useState(false);

    // Edit state
    const [storyBeat, setStoryBeat] = useState(scene.storyBeat);
    const [macroScene, setMacroScene] = useState(scene.macroScene);
    const [sourceText, setSourceText] = useState(scene.sourceText);
    const [reason, setReason] = useState(scene.reason);
    const [narrativePurpose, setNarrativePurpose] = useState(scene.narrativePurpose ?? "");
    const [emotionalTone, setEmotionalTone] = useState(scene.emotionalTone ?? "");
    const [actTitle, setActTitle] = useState(scene.actTitle);

    const startEditing = () => setEditing(true);
    const cancelEditing = () => {
        setStoryBeat(scene.storyBeat);
        setMacroScene(scene.macroScene);
        setSourceText(scene.sourceText);
        setReason(scene.reason);
        setNarrativePurpose(scene.narrativePurpose ?? "");
        setEmotionalTone(scene.emotionalTone ?? "");
        setActTitle(scene.actTitle);
        setEditing(false);
    };

    const saveChanges = () => {
        startTransition(async () => {
            await updateScene(scene.id, {
                storyBeat: storyBeat.trim(),
                macroScene: macroScene.trim(),
                sourceText: sourceText.trim(),
                reason: reason.trim(),
                narrativePurpose: narrativePurpose.trim() || undefined,
                emotionalTone: emotionalTone.trim() || undefined,
                actTitle: actTitle.trim(),
            });
            setEditing(false);
        });
    };

    const setting = scene.setting;
    const camera = scene.camera;

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
                    {projectName}
                </Link>
                <span>/</span>
                <Link href={`/projects/${projectId}/production`} className="hover:text-foreground transition-colors">
                    Production
                </Link>
                <span>/</span>
                <span className="text-foreground">{scene.sceneId}</span>
            </div>

            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="font-mono">{scene.sceneId}</Badge>
                        <Badge variant="secondary">Act {scene.act}</Badge>
                        {editing ? (
                            <Input
                                value={actTitle}
                                onChange={(e) => setActTitle(e.target.value)}
                                className="h-7 w-40 text-xs"
                                placeholder="Act title"
                            />
                        ) : (
                            <Badge>{scene.actTitle}</Badge>
                        )}
                        {editing ? (
                            <Input
                                value={emotionalTone}
                                onChange={(e) => setEmotionalTone(e.target.value)}
                                className="h-7 w-36 text-xs"
                                placeholder="Emotional tone"
                            />
                        ) : (
                            scene.emotionalTone && (
                                <Badge variant="outline" className="border-primary/30 text-primary">
                                    {scene.emotionalTone}
                                </Badge>
                            )
                        )}
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-2">
                        {editing ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={isPending} className="gap-1.5">
                                    <X className="h-3.5 w-3.5" /> Cancel
                                </Button>
                                <Button size="sm" onClick={saveChanges} disabled={isPending} className="gap-1.5">
                                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    Save
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {editing ? (
                    <Input
                        value={storyBeat}
                        onChange={(e) => setStoryBeat(e.target.value)}
                        className="text-2xl font-bold h-auto py-1 px-2 -ml-2"
                        placeholder="Story Beat"
                    />
                ) : (
                    <h1 className="text-2xl font-bold tracking-tight">{scene.storyBeat}</h1>
                )}
                {editing ? (
                    <Input
                        value={macroScene}
                        onChange={(e) => setMacroScene(e.target.value)}
                        className="text-sm text-muted-foreground h-auto py-1 px-2 -ml-2"
                        placeholder="Macro Scene"
                    />
                ) : (
                    <p className="text-muted-foreground">{scene.macroScene}</p>
                )}
            </div>

            <Separator />

            {/* Source Text */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Film className="h-4 w-4" /> Script Text
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {editing ? (
                        <Textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            rows={6}
                            className="text-sm leading-relaxed"
                        />
                    ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{scene.sourceText}</p>
                    )}
                    {editing ? (
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-3 text-xs"
                            placeholder="Reason (e.g. location change)"
                        />
                    ) : (
                        scene.reason && (
                            <p className="text-xs text-muted-foreground mt-3 italic">Reason: {scene.reason}</p>
                        )
                    )}
                </CardContent>
            </Card>

            {/* Narrative Purpose */}
            {(editing || scene.narrativePurpose) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Eye className="h-4 w-4" /> Narrative Purpose
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {editing ? (
                            <Textarea
                                value={narrativePurpose}
                                onChange={(e) => setNarrativePurpose(e.target.value)}
                                rows={3}
                                className="text-sm"
                                placeholder="What this scene accomplishes narratively..."
                            />
                        ) : (
                            <p className="text-sm leading-relaxed">{scene.narrativePurpose}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Two-column grid for Setting + Camera (read-only) */}
            <div className="grid gap-4 md:grid-cols-2">
                {setting && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="h-4 w-4" /> Setting
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(setting).map(([key, val]) => (
                                <div key={key} className="flex gap-2">
                                    <span className="text-xs text-muted-foreground capitalize min-w-[80px]">{key.replace(/_/g, " ")}:</span>
                                    <span className="text-sm">{val}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                {camera && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Camera className="h-4 w-4" /> Camera Intent
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(camera).map(([key, val]) => (
                                <div key={key} className="flex gap-2">
                                    <span className="text-xs text-muted-foreground capitalize min-w-[80px]">{key.replace(/_/g, " ")}:</span>
                                    <span className="text-sm">{val}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Actions */}
            {scene.actions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {scene.actions.map((action, i) => (
                                <li key={i} className="text-sm flex gap-2">
                                    <span className="text-muted-foreground shrink-0">•</span>
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Visual Motifs + Constraints */}
            {(scene.visualMotifs.length > 0 || scene.constraints.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {scene.visualMotifs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Visual Motifs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {scene.visualMotifs.map((motif, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{motif}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {scene.constraints.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Constraints</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-1">
                                    {scene.constraints.map((constraint, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                            <span className="shrink-0">⚠</span>
                                            {constraint}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Characters Present */}
            {scene.charactersPresent.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4" /> Characters Present
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {scene.charactersPresent.map((char, i) => (
                                <Badge key={i} variant="outline" className="text-sm">{char}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Keyframe */}
            {scene.keyframeUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Keyframe</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg overflow-hidden border">
                            <img src={scene.keyframeUrl} alt={`Keyframe for ${scene.sceneId}`} className="w-full h-auto" />
                        </div>
                    </CardContent>
                </Card>
            )}

            <SceneAssetsPanel
                sceneDbId={scene.id}
                assets={assets}
                platforms={platforms}
                promptPackages={promptPackages}
            />

            {/* Prev / Next Navigation */}
            <Separator />
            <div className="flex items-center justify-between">
                {prev ? (
                    <Link href={`/projects/${projectId}/scenes/${prev.sceneId}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">{prev.sceneId} ·</span>{" "}
                            <span className="max-w-[200px] truncate">{prev.storyBeat}</span>
                        </Button>
                    </Link>
                ) : <div />}
                {next ? (
                    <Link href={`/projects/${projectId}/scenes/${next.sceneId}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                            <span className="max-w-[200px] truncate">{next.storyBeat}</span>{" "}
                            <span className="hidden sm:inline">· {next.sceneId}</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                ) : <div />}
            </div>

            {/* Delete dialog */}
            <DeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={`Delete ${scene.sceneId}?`}
                description={`This will permanently delete scene "${scene.storyBeat}". This action cannot be undone.`}
                onDelete={async () => {
                    await deleteScene(scene.id);
                    router.push(`/projects/${projectId}/production`);
                }}
            />
        </div>
    );
}
