"use client";

import { useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createScene, updateScene } from "@/lib/actions";

interface SceneData {
    id?: string;
    sceneId: string;
    sourceText: string;
    act: number;
    actTitle: string;
    macroScene: string;
    storyBeat: string;
    reason?: string;
    narrativePurpose?: string | null;
    emotionalTone?: string | null;
}

interface SceneFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    scene?: SceneData;
}

export function SceneFormDialog({
    open,
    onOpenChange,
    projectId,
    scene,
}: SceneFormDialogProps) {
    const isEdit = !!scene?.id;
    const [isPending, startTransition] = useTransition();

    const [sceneId, setSceneId] = useState(scene?.sceneId ?? "");
    const [sourceText, setSourceText] = useState(scene?.sourceText ?? "");
    const [act, setAct] = useState(scene?.act?.toString() ?? "1");
    const [actTitle, setActTitle] = useState(scene?.actTitle ?? "");
    const [macroScene, setMacroScene] = useState(scene?.macroScene ?? "");
    const [storyBeat, setStoryBeat] = useState(scene?.storyBeat ?? "");
    const [reason, setReason] = useState(scene?.reason ?? "");
    const [narrativePurpose, setNarrativePurpose] = useState(scene?.narrativePurpose ?? "");
    const [emotionalTone, setEmotionalTone] = useState(scene?.emotionalTone ?? "");

    const resetForm = () => {
        setSceneId("");
        setSourceText("");
        setAct("1");
        setActTitle("");
        setMacroScene("");
        setStoryBeat("");
        setReason("");
        setNarrativePurpose("");
        setEmotionalTone("");
    };

    const handleSubmit = () => {
        if (!sceneId.trim() || !sourceText.trim() || !storyBeat.trim()) return;

        startTransition(async () => {
            if (isEdit && scene?.id) {
                await updateScene(scene.id, {
                    sourceText: sourceText.trim(),
                    storyBeat: storyBeat.trim(),
                    act: parseInt(act) || 1,
                    actTitle: actTitle.trim(),
                    macroScene: macroScene.trim(),
                    reason: reason.trim(),
                    narrativePurpose: narrativePurpose.trim() || undefined,
                    emotionalTone: emotionalTone.trim() || undefined,
                });
            } else {
                await createScene(projectId, {
                    sceneId: sceneId.trim().toUpperCase(),
                    sourceText: sourceText.trim(),
                    act: parseInt(act) || 1,
                    actTitle: actTitle.trim(),
                    macroScene: macroScene.trim(),
                    storyBeat: storyBeat.trim(),
                    reason: reason.trim() || undefined,
                    narrativePurpose: narrativePurpose.trim() || undefined,
                    emotionalTone: emotionalTone.trim() || undefined,
                });
            }
            onOpenChange(false);
            if (!isEdit) resetForm();
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v && !isEdit) resetForm(); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Scene" : "Add Scene"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update scene details." : "Add a new scene to this project."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Scene ID + Act */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="scene-id">Scene ID *</Label>
                            <Input
                                id="scene-id"
                                value={sceneId}
                                onChange={(e) => setSceneId(e.target.value)}
                                placeholder="S247"
                                disabled={isEdit}
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="scene-act">Act *</Label>
                            <Input
                                id="scene-act"
                                type="number"
                                min={1}
                                max={10}
                                value={act}
                                onChange={(e) => setAct(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="scene-act-title">Act Title</Label>
                            <Input
                                id="scene-act-title"
                                value={actTitle}
                                onChange={(e) => setActTitle(e.target.value)}
                                placeholder="THE ORIGIN"
                            />
                        </div>
                    </div>

                    {/* Story Beat */}
                    <div className="space-y-1.5">
                        <Label htmlFor="scene-beat">Story Beat *</Label>
                        <Input
                            id="scene-beat"
                            value={storyBeat}
                            onChange={(e) => setStoryBeat(e.target.value)}
                            placeholder="Hero discovers power"
                        />
                    </div>

                    {/* Macro Scene */}
                    <div className="space-y-1.5">
                        <Label htmlFor="scene-macro">Macro Scene</Label>
                        <Input
                            id="scene-macro"
                            value={macroScene}
                            onChange={(e) => setMacroScene(e.target.value)}
                            placeholder="The Lighthouse Sequence"
                        />
                    </div>

                    {/* Source Text */}
                    <div className="space-y-1.5">
                        <Label htmlFor="scene-text">Script Text *</Label>
                        <Textarea
                            id="scene-text"
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="The script excerpt for this scene..."
                            rows={4}
                        />
                    </div>

                    {/* Narrative Purpose */}
                    <div className="space-y-1.5">
                        <Label htmlFor="scene-narrative">Narrative Purpose</Label>
                        <Textarea
                            id="scene-narrative"
                            value={narrativePurpose}
                            onChange={(e) => setNarrativePurpose(e.target.value)}
                            placeholder="What this scene accomplishes narratively..."
                            rows={2}
                        />
                    </div>

                    {/* Emotional Tone + Reason */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="scene-tone">Emotional Tone</Label>
                            <Input
                                id="scene-tone"
                                value={emotionalTone}
                                onChange={(e) => setEmotionalTone(e.target.value)}
                                placeholder="Tense, hopeful..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="scene-reason">Reason</Label>
                            <Input
                                id="scene-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="location change"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending || !sceneId.trim() || !sourceText.trim() || !storyBeat.trim()}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Scene"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
