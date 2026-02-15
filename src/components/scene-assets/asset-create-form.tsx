"use client";

import { useEffect, useState, useTransition } from "react";
import type { AssetType, AssetStatus, RightsState } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { normalizeTagList, parseMetadataInput } from "@/lib/scene-assets-utils";
import {
    createSceneAssetFanout,
    createSceneAssetVersion,
} from "@/lib/actions";
import {
    ASSET_TYPES,
    ASSET_STATUSES,
    RIGHTS_STATES,
    parseOptionalNumber,
    validateOptionalUrl,
} from "./types";
import type {
    AssetTypeValue,
    AssetStatusValue,
    RightsStateValue,
    PlatformItem,
    PromptPackageItem,
    SceneAssetItem,
} from "./types";

// ─── Props ──────────────────────────────────────────────────

interface AssetCreateFormProps {
    sceneDbId: string;
    platforms: PlatformItem[];
    promptPackages: PromptPackageItem[];
    reuseAsset: SceneAssetItem | null;
    onClose: () => void;
    onCreated: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

function parseJsonObjectOrNull(raw: string, label: string): Record<string, unknown> | null {
    const value = raw.trim();
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
            throw new Error();
        }
        return parsed as Record<string, unknown>;
    } catch {
        throw new Error(`${label} must be valid JSON object`);
    }
}

// ─── Component ──────────────────────────────────────────────

export function AssetCreateForm({
    sceneDbId,
    platforms,
    promptPackages,
    reuseAsset,
    onClose,
    onCreated,
}: AssetCreateFormProps) {
    const [isPending, startTransition] = useTransition();

    // Platform & type state
    const [platformId, setPlatformId] = useState<string>(platforms[0]?.id ?? "");
    const [fanoutPlatformIds, setFanoutPlatformIds] = useState<string[]>(
        platforms.slice(0, Math.min(3, platforms.length)).map((p) => p.id),
    );
    const [assetType, setAssetType] = useState<AssetType>("IMAGE");
    const [status, setStatus] = useState<AssetStatus>("DRAFT");
    const [rightsState, setRightsState] = useState<RightsState>("UNKNOWN");

    // Text fields
    const [title, setTitle] = useState("");
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [modelName, setModelName] = useState("");
    const [sourceUrl, setSourceUrl] = useState("");
    const [externalAssetId, setExternalAssetId] = useState("");
    const [outputUrl, setOutputUrl] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [costEstimateUsd, setCostEstimateUsd] = useState("");
    const [generationSeconds, setGenerationSeconds] = useState("");
    const [queueWaitSeconds, setQueueWaitSeconds] = useState("");
    const [metadataInput, setMetadataInput] = useState("");
    const [provenanceInput, setProvenanceInput] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [notes, setNotes] = useState("");

    // Prompt package state
    const [promptPackageId, setPromptPackageId] = useState<string>("NONE");
    const [createPromptPackageOnSave, setCreatePromptPackageOnSave] = useState(true);

    // Error state
    const [formError, setFormError] = useState<string | null>(null);

    // ── Reuse asset hydration ────────────────────────────────
    useEffect(() => {
        if (!reuseAsset) return;

        const bestPlatformId =
            reuseAsset.platformId ??
            platforms.find((p) => p.slug === reuseAsset.platformKey)?.id ??
            platformId;

        setPlatformId(bestPlatformId || platformId);
        setAssetType(reuseAsset.assetType);
        setTitle(reuseAsset.title ?? "");
        setPrompt(reuseAsset.prompt);
        setNegativePrompt(reuseAsset.negativePrompt ?? "");
        setModelName(reuseAsset.modelName ?? "");
        setSourceUrl(reuseAsset.sourceUrl ?? "");
        setExternalAssetId(reuseAsset.externalAssetId ?? "");
        setOutputUrl(reuseAsset.outputUrl ?? "");
        setThumbnailUrl(reuseAsset.thumbnailUrl ?? "");
        setCostEstimateUsd(reuseAsset.costEstimateUsd !== null ? String(reuseAsset.costEstimateUsd) : "");
        setGenerationSeconds(reuseAsset.generationSeconds !== null ? String(reuseAsset.generationSeconds) : "");
        setQueueWaitSeconds(reuseAsset.queueWaitSeconds !== null ? String(reuseAsset.queueWaitSeconds) : "");
        setMetadataInput(reuseAsset.metadata ? JSON.stringify(reuseAsset.metadata, null, 2) : "");
        setProvenanceInput(reuseAsset.provenance ? JSON.stringify(reuseAsset.provenance, null, 2) : "");
        setTagsInput(reuseAsset.tags.join(", "));
        setNotes(reuseAsset.notes ?? "");
        setStatus(reuseAsset.status);
        setRightsState(reuseAsset.rightsState);
        setPromptPackageId(reuseAsset.promptPackageId ?? "NONE");
        setCreatePromptPackageOnSave(false);
        setFormError(null);
    }, [reuseAsset, platforms, platformId]);

    // ── Derived ──────────────────────────────────────────────
    const selectedPlatform = platforms.find((p) => p.id === platformId) ?? null;

    // ── Build payload ────────────────────────────────────────
    const buildCreatePayload = () => {
        const metadata = parseMetadataInput(metadataInput);
        const provenance = parseJsonObjectOrNull(provenanceInput, "Provenance");
        const tags = normalizeTagList(tagsInput);

        return {
            title: title.trim() || null,
            prompt: prompt.trim(),
            negativePrompt: negativePrompt.trim() || null,
            modelName: modelName.trim() || null,
            sourceUrl: validateOptionalUrl(sourceUrl, "Source URL"),
            externalAssetId: externalAssetId.trim() || null,
            outputUrl: validateOptionalUrl(outputUrl, "Output URL"),
            thumbnailUrl: validateOptionalUrl(thumbnailUrl, "Thumbnail URL"),
            costEstimateUsd: parseOptionalNumber(costEstimateUsd, "Cost estimate"),
            generationSeconds: parseOptionalNumber(generationSeconds, "Generation seconds"),
            queueWaitSeconds: parseOptionalNumber(queueWaitSeconds, "Queue wait seconds"),
            metadata,
            provenance,
            tags,
            notes: notes.trim() || null,
            status,
            rightsState,
            selected: status === "SELECTED",
            promptPackageId: promptPackageId === "NONE" ? null : promptPackageId,
            createPromptPackage: createPromptPackageOnSave,
        };
    };

    // ── Actions ──────────────────────────────────────────────
    const onCreate = () => {
        if (!selectedPlatform || !prompt.trim()) return;

        startTransition(async () => {
            try {
                setFormError(null);
                const payload = buildCreatePayload();

                await createSceneAssetVersion(sceneDbId, {
                    platformId: selectedPlatform.id,
                    platformKey: selectedPlatform.slug,
                    platformLabel: selectedPlatform.name,
                    assetType,
                    ...payload,
                });

                onCreated();
            } catch (error) {
                if (error instanceof Error) {
                    // Distinguish validation errors (thrown by buildCreatePayload) from server errors
                    const isValidation =
                        error.message.includes("must be") ||
                        error.message.includes("must be valid") ||
                        error.message.includes("JSON");
                    setFormError(isValidation
                        ? error.message
                        : `Server error: ${error.message}`);
                } else {
                    setFormError("An unexpected error occurred while creating the version");
                }
            }
        });
    };

    const onFanoutCreate = () => {
        if (!prompt.trim()) {
            setFormError("Prompt is required for fan-out");
            return;
        }

        if (fanoutPlatformIds.length === 0) {
            setFormError("Select at least one platform for fan-out");
            return;
        }

        startTransition(async () => {
            try {
                setFormError(null);
                const payload = buildCreatePayload();

                await createSceneAssetFanout(sceneDbId, {
                    platformIds: fanoutPlatformIds,
                    assetType,
                    ...payload,
                });

                onCreated();
            } catch (error) {
                if (error instanceof Error) {
                    const isValidation =
                        error.message.includes("must be") ||
                        error.message.includes("must be valid") ||
                        error.message.includes("JSON");
                    setFormError(isValidation
                        ? error.message
                        : `Server error: ${error.message}`);
                } else {
                    setFormError("An unexpected error occurred while creating fan-out versions");
                }
            }
        });
    };

    const toggleFanoutPlatform = (id: string) => {
        setFanoutPlatformIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    // ── Render ───────────────────────────────────────────────
    return (
        <Card className="border-primary/20">
            <CardContent className="pt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1.5">
                        <Label>Platform</Label>
                        <Select value={platformId} onValueChange={setPlatformId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                {platforms.map((platform) => (
                                    <SelectItem key={platform.id} value={platform.id}>
                                        {platform.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Asset Type</Label>
                        <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetTypeValue)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ASSET_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as AssetStatusValue)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ASSET_STATUSES.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Rights</Label>
                        <Select value={rightsState} onValueChange={(v) => setRightsState(v as RightsStateValue)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {RIGHTS_STATES.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Prompt Package</Label>
                        <Select
                            value={promptPackageId}
                            onValueChange={(value) => {
                                setPromptPackageId(value);
                                if (value !== "NONE") {
                                    setCreatePromptPackageOnSave(false);
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Attach existing package (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">No package</SelectItem>
                                {promptPackages.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        P{item.versionNumber} {item.name ? `\u00b7 ${item.name}` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={createPromptPackageOnSave}
                                onChange={(event) => {
                                    setCreatePromptPackageOnSave(event.target.checked);
                                    if (event.target.checked) {
                                        setPromptPackageId("NONE");
                                    }
                                }}
                                className="h-4 w-4 rounded border border-input bg-background"
                            />
                            Save as new prompt package
                        </label>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>Title (optional)</Label>
                    <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Shot 02 \u00b7 Rain close-up"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Prompt</Label>
                    <Textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        rows={4}
                        placeholder="Describe the exact output you generated on this platform..."
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Negative Prompt (optional)</Label>
                    <Textarea
                        value={negativePrompt}
                        onChange={(event) => setNegativePrompt(event.target.value)}
                        rows={2}
                        placeholder="What should be avoided in this generation?"
                    />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Model (optional)</Label>
                        <Input
                            value={modelName}
                            onChange={(event) => setModelName(event.target.value)}
                            placeholder="e.g. Veo-3, MJ-v7"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Source URL (optional)</Label>
                        <Input
                            value={sourceUrl}
                            onChange={(event) => setSourceUrl(event.target.value)}
                            placeholder="https://platform.com/project/shot"
                        />
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>External Asset ID (optional)</Label>
                        <Input
                            value={externalAssetId}
                            onChange={(event) => setExternalAssetId(event.target.value)}
                            placeholder="job_abc123"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Output URL (optional)</Label>
                        <Input
                            value={outputUrl}
                            onChange={(event) => setOutputUrl(event.target.value)}
                            placeholder="https://cdn.../final-output"
                        />
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Thumbnail URL (optional)</Label>
                        <Input
                            value={thumbnailUrl}
                            onChange={(event) => setThumbnailUrl(event.target.value)}
                            placeholder="https://cdn.../preview.jpg"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Tags (comma separated)</Label>
                        <Input
                            value={tagsInput}
                            onChange={(event) => setTagsInput(event.target.value)}
                            placeholder="scene-01, hero, approved"
                        />
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                        <Label>Cost USD (optional)</Label>
                        <Input
                            value={costEstimateUsd}
                            onChange={(event) => setCostEstimateUsd(event.target.value)}
                            placeholder="0.35"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Generation sec (optional)</Label>
                        <Input
                            value={generationSeconds}
                            onChange={(event) => setGenerationSeconds(event.target.value)}
                            placeholder="45"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Queue wait sec (optional)</Label>
                        <Input
                            value={queueWaitSeconds}
                            onChange={(event) => setQueueWaitSeconds(event.target.value)}
                            placeholder="120"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label>Metadata JSON (optional)</Label>
                    <Textarea
                        value={metadataInput}
                        onChange={(event) => setMetadataInput(event.target.value)}
                        rows={3}
                        placeholder='{"durationSec": 6, "fps": 24, "aspectRatio": "16:9"}'
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Provenance JSON (optional)</Label>
                    <Textarea
                        value={provenanceInput}
                        onChange={(event) => setProvenanceInput(event.target.value)}
                        rows={3}
                        placeholder='{"providerPolicyVersion":"2026-02","model":"veo-3"}'
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={2}
                        placeholder="What worked/failed in this version?"
                    />
                </div>

                <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Single Prompt Fan-Out</p>
                        <p className="text-xs text-muted-foreground">Create one version per selected platform</p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                        {platforms.map((platform) => (
                            <label key={platform.id} className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={fanoutPlatformIds.includes(platform.id)}
                                    onChange={() => toggleFanoutPlatform(platform.id)}
                                    className="h-4 w-4 rounded border border-input bg-background"
                                />
                                <span>{platform.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onFanoutCreate}
                        disabled={!prompt.trim() || fanoutPlatformIds.length === 0 || isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Fan-Out Create
                    </Button>
                    <Button
                        onClick={onCreate}
                        disabled={!prompt.trim() || !selectedPlatform || isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Single Version
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
