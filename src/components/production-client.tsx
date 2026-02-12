"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Film, Image, Loader2, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { DeleteDialog } from "@/components/delete-dialog";
import { createScene, deleteScene } from "@/lib/actions";

interface SceneItem {
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
    keyframeUrl: string | null;
    sortOrder: number;
}

// ─── Inline Add Scene Form ──────────────────────────────────

function AddSceneInline({ projectId, onCancel }: { projectId: string; onCancel: () => void }) {
    const [isPending, startTransition] = useTransition();
    const [sceneId, setSceneId] = useState("");
    const [storyBeat, setStoryBeat] = useState("");
    const [act, setAct] = useState("1");
    const [actTitle, setActTitle] = useState("");
    const [macroScene, setMacroScene] = useState("");
    const [sourceText, setSourceText] = useState("");
    const [narrativePurpose, setNarrativePurpose] = useState("");
    const [emotionalTone, setEmotionalTone] = useState("");

    const save = () => {
        if (!sceneId.trim() || !storyBeat.trim()) return;
        startTransition(async () => {
            await createScene(projectId, {
                sceneId: sceneId.trim().toUpperCase(),
                act: parseInt(act) || 1,
                actTitle: actTitle.trim() || `Act ${act}`,
                storyBeat: storyBeat.trim(),
                macroScene: macroScene.trim() || "",
                sourceText: sourceText.trim() || "",
                reason: "",
                narrativePurpose: narrativePurpose.trim() || undefined,
                emotionalTone: emotionalTone.trim() || undefined,
            });
            onCancel();
        });
    };

    return (
        <Card className="border-primary/30 shadow-md">
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    <span>New Scene</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending} className="gap-1">
                            <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                        <Button size="sm" onClick={save} disabled={isPending || !sceneId.trim() || !storyBeat.trim()} className="gap-1">
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Add
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Scene ID *</label>
                        <Input value={sceneId} onChange={(e) => setSceneId(e.target.value)} placeholder="S001" className="font-mono" autoFocus />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Story Beat *</label>
                        <Input value={storyBeat} onChange={(e) => setStoryBeat(e.target.value)} placeholder="The opening chase sequence" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Act</label>
                        <Input value={act} onChange={(e) => setAct(e.target.value)} type="number" min={1} className="w-20" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Act Title</label>
                        <Input value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="The Setup" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Macro Scene</label>
                        <Input value={macroScene} onChange={(e) => setMacroScene(e.target.value)} placeholder="e.g. City Chase" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Source Text</label>
                        <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={3} placeholder="Script text..." />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Narrative Purpose</label>
                        <Input value={narrativePurpose} onChange={(e) => setNarrativePurpose(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Emotional Tone</label>
                        <Input value={emotionalTone} onChange={(e) => setEmotionalTone(e.target.value)} placeholder="Optional" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Production Client ─────────────────────────────────

export function ProductionClient({
    projectId,
    projectName,
    scenes,
}: {
    projectId: string;
    projectName: string;
    scenes: SceneItem[];
}) {
    const router = useRouter();
    const [adding, setAdding] = useState(false);
    const [delScene, setDelScene] = useState<SceneItem | null>(null);

    // Group by act
    const actGroups = new Map<number, { title: string; scenes: SceneItem[] }>();
    for (const scene of scenes) {
        const existing = actGroups.get(scene.act);
        if (existing) {
            existing.scenes.push(scene);
        } else {
            actGroups.set(scene.act, { title: scene.actTitle, scenes: [scene] });
        }
    }
    const acts = Array.from(actGroups.entries()).sort(([a], [b]) => a - b);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
                            {projectName}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">Production</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Production</h1>
                    <p className="text-muted-foreground mt-1">
                        {scenes.length} scenes across {acts.length} acts
                    </p>
                </div>
                {!adding && (
                    <Button onClick={() => setAdding(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Scene
                    </Button>
                )}
            </div>

            {/* Inline add form */}
            {adding && <AddSceneInline projectId={projectId} onCancel={() => setAdding(false)} />}

            {scenes.length === 0 && !adding ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Film className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-semibold mb-1">No scenes yet</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                            Start building your production by adding scenes.
                        </p>
                        <Button onClick={() => setAdding(true)} variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" /> Add First Scene
                        </Button>
                    </CardContent>
                </Card>
            ) : scenes.length > 0 && (
                <Tabs defaultValue={acts[0]?.[0]?.toString() ?? "1"}>
                    <TabsList className="mb-4">
                        {acts.map(([actNum, data]) => (
                            <TabsTrigger key={actNum} value={actNum.toString()}>
                                Act {actNum}
                                <Badge variant="secondary" className="ml-2 text-xs">
                                    {data.scenes.length}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {acts.map(([actNum, data]) => (
                        <TabsContent key={actNum} value={actNum.toString()}>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Badge variant="outline" className="tabular-nums">
                                            Act {actNum}
                                        </Badge>
                                        {data.title}
                                    </CardTitle>
                                    <CardDescription>{data.scenes.length} scenes</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-20">ID</TableHead>
                                                <TableHead>Story Beat</TableHead>
                                                <TableHead className="hidden md:table-cell">Macro Scene</TableHead>
                                                <TableHead className="hidden lg:table-cell">Tone</TableHead>
                                                <TableHead className="w-20 text-center">Keyframe</TableHead>
                                                <TableHead className="w-12" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.scenes.map((scene) => (
                                                <TableRow key={scene.id} className="group">
                                                    <TableCell>
                                                        <Link href={`/projects/${projectId}/scenes/${scene.sceneId}`}>
                                                            <Badge variant="outline" className="font-mono text-xs cursor-pointer hover:bg-primary/10">
                                                                {scene.sceneId}
                                                            </Badge>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Link href={`/projects/${projectId}/scenes/${scene.sceneId}`} className="block">
                                                            <div>
                                                                <p className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors">
                                                                    {scene.storyBeat}
                                                                </p>
                                                                {scene.narrativePurpose && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                                        {scene.narrativePurpose}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        <span className="text-sm text-muted-foreground">{scene.macroScene}</span>
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell">
                                                        {scene.emotionalTone && (
                                                            <Badge variant="secondary" className="text-xs">{scene.emotionalTone}</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {scene.keyframeUrl ? (
                                                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                                                <Image className="h-3 w-3" />
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-muted-foreground">—</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => router.push(`/projects/${projectId}/scenes/${scene.sceneId}`)}>
                                                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => setDelScene(scene)}
                                                                >
                                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            {delScene && (
                <DeleteDialog
                    open={!!delScene}
                    onOpenChange={(v) => !v && setDelScene(null)}
                    title={`Delete ${delScene.sceneId}?`}
                    description={`This will permanently delete scene "${delScene.storyBeat}". This action cannot be undone.`}
                    onDelete={async () => {
                        await deleteScene(delScene.id);
                        setDelScene(null);
                    }}
                />
            )}
        </div>
    );
}
