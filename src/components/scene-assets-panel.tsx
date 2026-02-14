"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import type { AssetStatus, AssetType, RightsState } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    createSceneAssetFanout,
    createSceneAssetVersion,
    deleteSceneAssetVersion,
    updateSceneAssetVersion,
} from "@/lib/actions";
import {
    Check,
    Columns3,
    ExternalLink,
    Filter,
    Loader2,
    Plus,
    Star,
    Trash2,
} from "lucide-react";
import { filterSceneAssets, normalizeTagList, parseMetadataInput } from "@/lib/scene-assets-utils";

const ASSET_TYPES = [
    "SCRIPT",
    "IMAGE",
    "VIDEO",
    "AUDIO",
    "MUSIC",
    "VOICE",
    "NARRATION",
    "STORYBOARD",
    "OTHER",
] as const;

const ASSET_STATUSES = ["DRAFT", "GENERATED", "SELECTED", "REJECTED", "ARCHIVED"] as const;
const RIGHTS_STATES = ["UNKNOWN", "NON_COMMERCIAL", "COMMERCIAL_ALLOWED", "RESTRICTED"] as const;

type AssetTypeValue = (typeof ASSET_TYPES)[number];
type AssetStatusValue = (typeof ASSET_STATUSES)[number];
type RightsStateValue = (typeof RIGHTS_STATES)[number];

interface SceneAssetItem {
    id: string;
    promptPackageId: string | null;
    parentVersionId: string | null;
    platformId: string | null;
    platformKey: string;
    platformLabel: string;
    assetType: AssetTypeValue;
    status: AssetStatusValue;
    rightsState: RightsStateValue;
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
}

interface PlatformItem {
    id: string;
    slug: string;
    name: string;
    provider: string | null;
    specialties: string[];
    supportedOutput: AssetType[];
}

interface PromptPackageItem {
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
}

function parseOptionalNumber(raw: string, label: string): number | null {
    const value = raw.trim();
    if (!value) return null;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${label} must be a positive number`);
    }

    return parsed;
}

export function SceneAssetsPanel({
    sceneDbId,
    assets,
    platforms,
    promptPackages,
}: {
    sceneDbId: string;
    assets: SceneAssetItem[];
    platforms: PlatformItem[];
    promptPackages: PromptPackageItem[];
}) {
    const [isPending, startTransition] = useTransition();
    const [isAdding, setIsAdding] = useState(false);
    const [platformId, setPlatformId] = useState<string>(platforms[0]?.id || "");
    const [fanoutPlatformIds, setFanoutPlatformIds] = useState<string[]>(
        platforms.slice(0, Math.min(3, platforms.length)).map((platform) => platform.id)
    );
    const [assetType, setAssetType] = useState<AssetType>("IMAGE");
    const [status, setStatus] = useState<AssetStatus>("DRAFT");
    const [rightsState, setRightsState] = useState<RightsState>("UNKNOWN");
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
    const [formError, setFormError] = useState<string | null>(null);
    const [createPromptPackageOnSave, setCreatePromptPackageOnSave] = useState(true);
    const [promptPackageId, setPromptPackageId] = useState<string>("NONE");

    const [query, setQuery] = useState("");
    const [platformFilter, setPlatformFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
    const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
    const [tagFilter, setTagFilter] = useState("");
    const [selectedOnly, setSelectedOnly] = useState(false);
    const [compareAssetIds, setCompareAssetIds] = useState<string[]>([]);

    const selectedPlatform = useMemo(
        () => platforms.find((platform) => platform.id === platformId) || null,
        [platformId, platforms]
    );

    const resetForm = () => {
        setPrompt("");
        setNegativePrompt("");
        setTitle("");
        setModelName("");
        setSourceUrl("");
        setExternalAssetId("");
        setOutputUrl("");
        setThumbnailUrl("");
        setCostEstimateUsd("");
        setGenerationSeconds("");
        setQueueWaitSeconds("");
        setMetadataInput("");
        setProvenanceInput("");
        setTagsInput("");
        setNotes("");
        setStatus("DRAFT");
        setRightsState("UNKNOWN");
        setPromptPackageId("NONE");
        setCreatePromptPackageOnSave(true);
        setFormError(null);
    };

    const parseJsonObjectOrNull = (raw: string, label: string) => {
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
    };

    const buildCreatePayload = () => {
        const metadata = parseMetadataInput(metadataInput);
        const provenance = parseJsonObjectOrNull(provenanceInput, "Provenance");
        const tags = normalizeTagList(tagsInput);

        return {
            title: title.trim() || null,
            prompt: prompt.trim(),
            negativePrompt: negativePrompt.trim() || null,
            modelName: modelName.trim() || null,
            sourceUrl: sourceUrl.trim() || null,
            externalAssetId: externalAssetId.trim() || null,
            outputUrl: outputUrl.trim() || null,
            thumbnailUrl: thumbnailUrl.trim() || null,
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

                resetForm();
                setIsAdding(false);
            } catch (error) {
                setFormError(error instanceof Error ? error.message : "Failed to create version");
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

                setIsAdding(false);
            } catch (error) {
                setFormError(error instanceof Error ? error.message : "Failed to create fan-out versions");
            }
        });
    };

    const onSelectWinner = (assetId: string) => {
        startTransition(async () => {
            await updateSceneAssetVersion(assetId, {
                selected: true,
                status: "SELECTED",
            });
        });
    };

    const onArchive = (assetId: string) => {
        startTransition(async () => {
            await updateSceneAssetVersion(assetId, {
                status: "ARCHIVED",
                selected: false,
            });
        });
    };

    const onDelete = (assetId: string) => {
        if (!window.confirm("Delete this version? This cannot be undone.")) return;

        startTransition(async () => {
            await deleteSceneAssetVersion(assetId);
            setCompareAssetIds((prev) => prev.filter((id) => id !== assetId));
        });
    };

    const onReusePrompt = useCallback((asset: SceneAssetItem) => {
        const bestPlatformId =
            asset.platformId ||
            platforms.find((platform) => platform.slug === asset.platformKey)?.id ||
            platformId;

        setIsAdding(true);
        setPlatformId(bestPlatformId || platformId);
        setAssetType(asset.assetType);
        setTitle(asset.title ?? "");
        setPrompt(asset.prompt);
        setNegativePrompt(asset.negativePrompt ?? "");
        setModelName(asset.modelName ?? "");
        setSourceUrl(asset.sourceUrl ?? "");
        setExternalAssetId(asset.externalAssetId ?? "");
        setOutputUrl(asset.outputUrl ?? "");
        setThumbnailUrl(asset.thumbnailUrl ?? "");
        setCostEstimateUsd(asset.costEstimateUsd !== null ? String(asset.costEstimateUsd) : "");
        setGenerationSeconds(asset.generationSeconds !== null ? String(asset.generationSeconds) : "");
        setQueueWaitSeconds(asset.queueWaitSeconds !== null ? String(asset.queueWaitSeconds) : "");
        setMetadataInput(asset.metadata ? JSON.stringify(asset.metadata, null, 2) : "");
        setProvenanceInput(asset.provenance ? JSON.stringify(asset.provenance, null, 2) : "");
        setTagsInput(asset.tags.join(", "));
        setNotes(asset.notes ?? "");
        setStatus(asset.status);
        setRightsState(asset.rightsState);
        setPromptPackageId(asset.promptPackageId ?? "NONE");
        setCreatePromptPackageOnSave(false);
        setFormError(null);
    }, [platformId, platforms]);

    const toggleFanoutPlatform = (id: string) => {
        setFanoutPlatformIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const filteredAssets = useMemo(
        () =>
            filterSceneAssets(assets, {
                query,
                platformKey: platformFilter,
                assetType: typeFilter,
                status: statusFilter,
                selectedOnly,
                tag: tagFilter,
            }),
        [assets, platformFilter, query, selectedOnly, statusFilter, tagFilter, typeFilter]
    );

    const hasActiveFilters =
        !!query.trim() ||
        platformFilter !== "ALL" ||
        typeFilter !== "ALL" ||
        statusFilter !== "ALL" ||
        !!tagFilter.trim() ||
        selectedOnly;

    const selectedImageReference = useMemo(
        () =>
            assets.find(
                (asset) =>
                    asset.selected &&
                    (asset.assetType === "IMAGE" || asset.assetType === "STORYBOARD")
            ) || null,
        [assets]
    );

    const selectedVideoReference = useMemo(
        () => assets.find((asset) => asset.selected && asset.assetType === "VIDEO") || null,
        [assets]
    );

    const hasVideoVersions = useMemo(
        () => assets.some((asset) => asset.assetType === "VIDEO"),
        [assets]
    );

    const hasAudioVersions = useMemo(
        () =>
            assets.some(
                (asset) =>
                    asset.assetType === "AUDIO" ||
                    asset.assetType === "MUSIC" ||
                    asset.assetType === "VOICE" ||
                    asset.assetType === "NARRATION"
            ),
        [assets]
    );

    const smartSuggestions = useMemo(() => {
        const suggestions: Array<{
            id: string;
            text: string;
            actionLabel?: string;
            action?: () => void;
        }> = [];

        if (selectedImageReference && !hasVideoVersions) {
            suggestions.push({
                id: "suggest-video-pass",
                text: "Detected selected image/storyboard but no video pass yet.",
                actionLabel: "Prep Video Draft",
                action: () => {
                    onReusePrompt(selectedImageReference);
                    setAssetType("VIDEO");
                    setStatus("GENERATED");
                    const videoPlatform =
                        platforms.find((platform) => platform.supportedOutput.includes("VIDEO")) || null;
                    if (videoPlatform) {
                        setPlatformId(videoPlatform.id);
                    }
                },
            });
        }

        if (selectedVideoReference && !hasAudioVersions) {
            suggestions.push({
                id: "suggest-audio-pass",
                text: "Detected selected video but no audio/music/voice pass yet.",
                actionLabel: "Prep Audio Draft",
                action: () => {
                    onReusePrompt(selectedVideoReference);
                    setAssetType("AUDIO");
                    setStatus("GENERATED");
                    const audioPlatform =
                        platforms.find((platform) => platform.supportedOutput.includes("AUDIO")) ||
                        platforms.find((platform) => platform.supportedOutput.includes("MUSIC")) ||
                        null;
                    if (audioPlatform) {
                        setPlatformId(audioPlatform.id);
                    }
                },
            });
        }

        if (!assets.some((asset) => asset.selected)) {
            suggestions.push({
                id: "suggest-select-winner",
                text: "No selected winner in this scene yet. Mark one version as selected to stabilize downstream passes.",
            });
        }

        return suggestions.slice(0, 3);
    }, [assets, hasAudioVersions, hasVideoVersions, onReusePrompt, platforms, selectedImageReference, selectedVideoReference]);

    const comparedAssets = useMemo(
        () => assets.filter((asset) => compareAssetIds.includes(asset.id)),
        [assets, compareAssetIds]
    );

    const toggleCompare = (assetId: string) => {
        setCompareAssetIds((prev) => {
            if (prev.includes(assetId)) return prev.filter((id) => id !== assetId);
            if (prev.length >= 4) return [...prev.slice(1), assetId];
            return [...prev, assetId];
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">AI Assets & Versions</CardTitle>
                    <Button
                        size="sm"
                        variant={isAdding ? "outline" : "default"}
                        className="gap-1.5"
                        onClick={() => setIsAdding((value) => !value)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {isAdding ? "Close" : "Add / Fan-Out"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAdding && (
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
                                                    P{item.versionNumber} {item.name ? `· ${item.name}` : ""}
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
                                    placeholder="Shot 02 · Rain close-up"
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
                                <Button variant="ghost" onClick={() => setIsAdding(false)} disabled={isPending}>
                                    Cancel
                                </Button>
                                <Button variant="outline" onClick={onFanoutCreate} disabled={!prompt.trim() || fanoutPlatformIds.length === 0 || isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Fan-Out Create
                                </Button>
                                <Button onClick={onCreate} disabled={!prompt.trim() || !selectedPlatform || isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Single Version
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-dashed">
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Filter className="h-4 w-4" />
                            Filters
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                        setQuery("");
                                        setPlatformFilter("ALL");
                                        setTypeFilter("ALL");
                                        setStatusFilter("ALL");
                                        setTagFilter("");
                                        setSelectedOnly(false);
                                    }}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label>Search</Label>
                                <Input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Prompt, title, tag..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Platform</Label>
                                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Platforms</SelectItem>
                                        {platforms.map((platform) => (
                                            <SelectItem key={platform.id} value={platform.slug}>
                                                {platform.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Type</Label>
                                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AssetType | "ALL") }>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Types</SelectItem>
                                        {ASSET_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AssetStatus | "ALL")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Statuses</SelectItem>
                                        {ASSET_STATUSES.map((assetStatus) => (
                                            <SelectItem key={assetStatus} value={assetStatus}>
                                                {assetStatus}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tag</Label>
                                <Input
                                    value={tagFilter}
                                    onChange={(event) => setTagFilter(event.target.value)}
                                    placeholder="e.g. approved"
                                />
                            </div>
                            <div className="flex items-end">
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedOnly}
                                        onChange={(event) => setSelectedOnly(event.target.checked)}
                                        className="h-4 w-4 rounded border border-input bg-background"
                                    />
                                    Selected Only
                                </label>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Showing {filteredAssets.length} of {assets.length} version(s).
                        </p>
                    </CardContent>
                </Card>

                {smartSuggestions.length > 0 && (
                    <Card className="border-primary/25 bg-primary/5">
                        <CardContent className="pt-4 space-y-3">
                            <p className="text-sm font-medium">Smart Next-Step Suggestions</p>
                            {smartSuggestions.map((suggestion) => (
                                <div key={suggestion.id} className="rounded-md border border-primary/20 bg-background/50 p-3">
                                    <p className="text-xs text-muted-foreground">{suggestion.text}</p>
                                    {suggestion.action && suggestion.actionLabel && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={suggestion.action}
                                        >
                                            {suggestion.actionLabel}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {comparedAssets.length > 1 && (
                    <Card className="border-emerald-500/40 bg-emerald-500/5">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Columns3 className="h-4 w-4" />
                                    Compare Variants ({comparedAssets.length})
                                </CardTitle>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setCompareAssetIds([])}>
                                    Clear Compare
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {comparedAssets.map((asset) => (
                                    <div key={asset.id} className="rounded-md border bg-background/70 p-3 space-y-2">
                                        <div className="flex flex-wrap items-center gap-1">
                                            <Badge variant="outline">{asset.platformLabel}</Badge>
                                            <Badge variant="secondary">v{asset.versionNumber}</Badge>
                                            <Badge variant="outline">{asset.rightsState}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-5">{asset.prompt}</p>
                                        {asset.thumbnailUrl && (
                                            <img
                                                src={asset.thumbnailUrl}
                                                alt={`${asset.platformLabel} preview`}
                                                className="h-24 w-full rounded object-cover border"
                                            />
                                        )}
                                        <p className="text-[11px] text-muted-foreground">
                                            {asset.costEstimateUsd !== null ? `$${asset.costEstimateUsd.toFixed(3)}` : "-"} · {asset.generationSeconds ?? "-"}s gen · {asset.queueWaitSeconds ?? "-"}s wait
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {assets.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No generated versions yet. Add the first prompt/output version for this scene.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredAssets.map((asset) => (
                            <Card key={asset.id} className={asset.selected ? "border-primary/50" : ""}>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline">{asset.platformLabel}</Badge>
                                            <Badge>{asset.assetType}</Badge>
                                            <Badge variant={asset.selected ? "default" : "secondary"}>v{asset.versionNumber}</Badge>
                                            <Badge variant="outline">{asset.status}</Badge>
                                            <Badge variant="outline">{asset.rightsState}</Badge>
                                            {asset.promptPackageId && (
                                                <Badge variant="secondary">Prompt Package</Badge>
                                            )}
                                            {asset.selected && (
                                                <Badge className="gap-1">
                                                    <Star className="h-3 w-3" />
                                                    Selected
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(asset.createdAt).toLocaleString()}
                                        </div>
                                    </div>

                                    {asset.title && <p className="text-sm font-medium">{asset.title}</p>}

                                    <p className="text-sm whitespace-pre-wrap">{asset.prompt}</p>
                                    {asset.negativePrompt && (
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                            Negative: {asset.negativePrompt}
                                        </p>
                                    )}

                                    {(asset.sourceUrl || asset.outputUrl || asset.modelName) && (
                                        <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                                            {asset.modelName && <div>Model: {asset.modelName}</div>}
                                            {asset.sourceUrl && (
                                                <a
                                                    href={asset.sourceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 hover:text-foreground"
                                                >
                                                    Source <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                            {asset.outputUrl && (
                                                <a
                                                    href={asset.outputUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 hover:text-foreground"
                                                >
                                                    Output <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {(asset.costEstimateUsd !== null || asset.generationSeconds !== null || asset.queueWaitSeconds !== null) && (
                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                                            <span>Cost: {asset.costEstimateUsd !== null ? `$${asset.costEstimateUsd.toFixed(3)}` : "-"}</span>
                                            <span>Gen: {asset.generationSeconds ?? "-"}s</span>
                                            <span>Queue: {asset.queueWaitSeconds ?? "-"}s</span>
                                        </div>
                                    )}

                                    {(asset.tags.length > 0 || asset.metadata || asset.provenance) && (
                                        <div className="space-y-2">
                                            {asset.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {asset.tags.map((tag) => (
                                                        <Badge key={`${asset.id}-${tag}`} variant="secondary" className="text-[10px]">
                                                            #{tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            {asset.metadata && (
                                                <div className="rounded-md border bg-muted/30 px-2 py-1.5">
                                                    <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                                        {JSON.stringify(asset.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {asset.provenance && (
                                                <div className="rounded-md border bg-muted/30 px-2 py-1.5">
                                                    <p className="text-[11px] font-medium mb-1">Provenance</p>
                                                    <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                                        {JSON.stringify(asset.provenance, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {asset.thumbnailUrl && (
                                        <div className="overflow-hidden rounded-md border bg-muted/20">
                                            <img
                                                src={asset.thumbnailUrl}
                                                alt={`Thumbnail for ${asset.platformLabel} v${asset.versionNumber}`}
                                                className="h-28 w-full object-cover"
                                            />
                                        </div>
                                    )}

                                    {asset.notes && (
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{asset.notes}</p>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {!asset.selected && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={() => onSelectWinner(asset.id)}
                                                disabled={isPending}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                Mark Selected
                                            </Button>
                                        )}
                                        <Button
                                            variant={compareAssetIds.includes(asset.id) ? "default" : "outline"}
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={() => toggleCompare(asset.id)}
                                        >
                                            <Columns3 className="h-3.5 w-3.5" />
                                            {compareAssetIds.includes(asset.id) ? "Comparing" : "Compare"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onReusePrompt(asset)}
                                            disabled={isPending}
                                        >
                                            Reuse Prompt
                                        </Button>
                                        {asset.status !== "ARCHIVED" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onArchive(asset.id)}
                                                disabled={isPending}
                                            >
                                                Archive
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => onDelete(asset.id)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
