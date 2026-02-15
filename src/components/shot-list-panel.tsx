"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    createShotAction,
    updateShotAction,
    deleteShotAction,
    reorderShotsAction,
} from "@/lib/shot-server-actions";
import {
    Plus,
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
    Crosshair,
    Loader2,
    X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface ShotItem {
    id: string;
    shotCode: string;
    description: string;
    angle: string | null;
    framing: string | null;
    movement: string | null;
    lensNotes: string | null;
    sortOrder: number;
    _count?: { assets: number };
}

interface ShotListPanelProps {
    sceneId: string;
    shots: ShotItem[];
    onShotSelect?: (shotId: string | null) => void;
    selectedShotId?: string | null;
}

// ─── Inline Form ────────────────────────────────────────────

interface ShotFormValues {
    description: string;
    angle: string;
    framing: string;
    movement: string;
    lensNotes: string;
}

const EMPTY_FORM: ShotFormValues = {
    description: "",
    angle: "",
    framing: "",
    movement: "",
    lensNotes: "",
};

function ShotForm({
    initial = EMPTY_FORM,
    onSubmit,
    onCancel,
    isPending,
    submitLabel,
}: {
    initial?: ShotFormValues;
    onSubmit: (values: ShotFormValues) => void;
    onCancel: () => void;
    isPending: boolean;
    submitLabel: string;
}) {
    const [values, setValues] = useState<ShotFormValues>(initial);

    const set = (field: keyof ShotFormValues) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

    return (
        <Card className="border-primary/20">
            <CardContent className="pt-4 space-y-3">
                <div className="space-y-1.5">
                    <Label>Description *</Label>
                    <Textarea
                        value={values.description}
                        onChange={set("description")}
                        rows={2}
                        placeholder="What happens in this shot?"
                    />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Angle</Label>
                        <Input
                            value={values.angle}
                            onChange={set("angle")}
                            placeholder="e.g. Low angle, Bird's eye"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Framing</Label>
                        <Input
                            value={values.framing}
                            onChange={set("framing")}
                            placeholder="e.g. Close-up, Wide"
                        />
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Movement</Label>
                        <Input
                            value={values.movement}
                            onChange={set("movement")}
                            placeholder="e.g. Dolly in, Pan left"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Lens Notes</Label>
                        <Input
                            value={values.lensNotes}
                            onChange={set("lensNotes")}
                            placeholder="e.g. 35mm, Shallow DOF"
                        />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => onSubmit(values)}
                        disabled={!values.description.trim() || isPending}
                    >
                        {isPending ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {submitLabel}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Component ─────────────────────────────────────────

export function ShotListPanel({
    sceneId,
    shots,
    onShotSelect,
    selectedShotId,
}: ShotListPanelProps) {
    const [isPending, startTransition] = useTransition();
    const [isAdding, setIsAdding] = useState(false);
    const [editingShotId, setEditingShotId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const sorted = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);

    // ─── Create ─────────────────────────────────────────────

    const onCreate = (values: ShotFormValues) => {
        startTransition(async () => {
            try {
                setFormError(null);
                await createShotAction(sceneId, {
                    description: values.description,
                    angle: values.angle || undefined,
                    framing: values.framing || undefined,
                    movement: values.movement || undefined,
                    lensNotes: values.lensNotes || undefined,
                });
                setIsAdding(false);
            } catch (error) {
                setFormError(
                    error instanceof Error ? error.message : "Failed to create shot",
                );
            }
        });
    };

    // ─── Update ─────────────────────────────────────────────

    const onUpdate = (shotId: string, values: ShotFormValues) => {
        startTransition(async () => {
            try {
                setFormError(null);
                await updateShotAction(shotId, {
                    description: values.description,
                    angle: values.angle || null,
                    framing: values.framing || null,
                    movement: values.movement || null,
                    lensNotes: values.lensNotes || null,
                });
                setEditingShotId(null);
            } catch (error) {
                setFormError(
                    error instanceof Error ? error.message : "Failed to update shot",
                );
            }
        });
    };

    // ─── Delete ─────────────────────────────────────────────

    const onDelete = (shotId: string) => {
        if (!window.confirm("Delete this shot? This cannot be undone.")) return;

        startTransition(async () => {
            try {
                setFormError(null);
                await deleteShotAction(shotId);
                if (selectedShotId === shotId) {
                    onShotSelect?.(null);
                }
            } catch (error) {
                setFormError(
                    error instanceof Error ? error.message : "Failed to delete shot",
                );
            }
        });
    };

    // ─── Reorder ────────────────────────────────────────────

    const onMoveUp = (index: number) => {
        if (index <= 0) return;
        const newOrder = sorted.map((s) => s.id);
        [newOrder[index - 1], newOrder[index]] = [
            newOrder[index]!,
            newOrder[index - 1]!,
        ];
        startTransition(async () => {
            try {
                setFormError(null);
                await reorderShotsAction(sceneId, newOrder);
            } catch (error) {
                setFormError(
                    error instanceof Error ? error.message : "Failed to reorder shots",
                );
            }
        });
    };

    const onMoveDown = (index: number) => {
        if (index >= sorted.length - 1) return;
        const newOrder = sorted.map((s) => s.id);
        [newOrder[index], newOrder[index + 1]] = [
            newOrder[index + 1]!,
            newOrder[index]!,
        ];
        startTransition(async () => {
            try {
                setFormError(null);
                await reorderShotsAction(sceneId, newOrder);
            } catch (error) {
                setFormError(
                    error instanceof Error ? error.message : "Failed to reorder shots",
                );
            }
        });
    };

    // ─── Select / Deselect ──────────────────────────────────

    const handleCardClick = (shotId: string) => {
        if (!onShotSelect) return;
        onShotSelect(selectedShotId === shotId ? null : shotId);
    };

    // ─── Render ─────────────────────────────────────────────

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Crosshair className="h-4 w-4" />
                        Shot List
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {shots.length}
                        </Badge>
                    </CardTitle>
                    <Button
                        size="sm"
                        variant={isAdding ? "outline" : "default"}
                        className="gap-1.5"
                        onClick={() => {
                            setIsAdding((v) => !v);
                            setEditingShotId(null);
                        }}
                    >
                        {isAdding ? (
                            <X className="h-3.5 w-3.5" />
                        ) : (
                            <Plus className="h-3.5 w-3.5" />
                        )}
                        {isAdding ? "Close" : "Add Shot"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {formError && (
                    <p className="text-sm text-destructive">{formError}</p>
                )}

                {isAdding && (
                    <ShotForm
                        onSubmit={onCreate}
                        onCancel={() => setIsAdding(false)}
                        isPending={isPending}
                        submitLabel="Create Shot"
                    />
                )}

                {sorted.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No shots yet. Add the first shot for this scene.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sorted.map((shot, index) =>
                            editingShotId === shot.id ? (
                                <ShotForm
                                    key={shot.id}
                                    initial={{
                                        description: shot.description,
                                        angle: shot.angle ?? "",
                                        framing: shot.framing ?? "",
                                        movement: shot.movement ?? "",
                                        lensNotes: shot.lensNotes ?? "",
                                    }}
                                    onSubmit={(values) => onUpdate(shot.id, values)}
                                    onCancel={() => setEditingShotId(null)}
                                    isPending={isPending}
                                    submitLabel="Save Changes"
                                />
                            ) : (
                                <div
                                    key={shot.id}
                                    role="button"
                                    tabIndex={0}
                                    className={`group flex items-start gap-2 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/30 ${
                                        selectedShotId === shot.id
                                            ? "border-primary bg-primary/5"
                                            : "border-border"
                                    }`}
                                    onClick={() => handleCardClick(shot.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleCardClick(shot.id);
                                        }
                                    }}
                                >
                                    {/* Reorder arrows */}
                                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={index === 0 || isPending}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMoveUp(index);
                                            }}
                                        >
                                            <ChevronUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={
                                                index === sorted.length - 1 || isPending
                                            }
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMoveDown(index);
                                            }}
                                        >
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Card body */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-sm font-bold">
                                                {shot.shotCode}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    disabled={isPending}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingShotId(shot.id);
                                                        setIsAdding(false);
                                                    }}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                                    disabled={isPending}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(shot.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {shot.description}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {shot.angle && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    {shot.angle}
                                                </Badge>
                                            )}
                                            {shot.framing && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    {shot.framing}
                                                </Badge>
                                            )}
                                            {shot.movement && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    {shot.movement}
                                                </Badge>
                                            )}
                                            {shot._count?.assets != null &&
                                                shot._count.assets > 0 && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] ml-auto"
                                                    >
                                                        {shot._count.assets} asset
                                                        {shot._count.assets !== 1
                                                            ? "s"
                                                            : ""}
                                                    </Badge>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
