"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import type { AssetStatus, AssetType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  deleteSceneAssetVersion,
  updateSceneAssetVersion,
} from "@/lib/actions";
import { filterSceneAssets } from "@/lib/scene-assets-utils";
import {
  groupByCompareGroup,
  computeCompareMetrics,
} from "@/lib/compare-utils";
import { RightsDrawer } from "@/components/rights-drawer";
import { RunCardsPanel } from "@/components/run-cards-panel";

import type { SceneAssetItem, PlatformItem, PromptPackageItem } from "./types";
import { AssetCreateForm } from "./asset-create-form";
import { AssetFilters } from "./asset-filters";
import { AssetCompareView } from "./asset-compare-view";
import { AssetVersionCard } from "./asset-version-card";

// ─── Props ──────────────────────────────────────────────────

interface SceneAssetsPanelProps {
  sceneDbId: string;
  assets: SceneAssetItem[];
  platforms: PlatformItem[];
  promptPackages: PromptPackageItem[];
  selectedShotId?: string | null;
}

// ─── Component ──────────────────────────────────────────────

export function SceneAssetsPanel({
  sceneDbId,
  assets,
  platforms,
  promptPackages,
  selectedShotId,
}: SceneAssetsPanelProps) {
  const [isPending, startTransition] = useTransition();

  // ── UI toggles ───────────────────────────────────────────
  const [isAdding, setIsAdding] = useState(false);
  const [reuseAsset, setReuseAsset] = useState<SceneAssetItem | null>(null);

  // ── Filter state ─────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
  const [tagFilter, setTagFilter] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);

  // ── Compare state ────────────────────────────────────────
  const [compareAssetIds, setCompareAssetIds] = useState<string[]>([]);

  // ── Rights drawer state ──────────────────────────────────
  const [rightsDrawerOpen, setRightsDrawerOpen] = useState(false);
  const [rightsDrawerAsset, setRightsDrawerAsset] =
    useState<SceneAssetItem | null>(null);

  // ── Run cards state ──────────────────────────────────────
  const [runCardsPackageId, setRunCardsPackageId] = useState<string | null>(
    null,
  );

  const activeRunCardsPackage = useMemo(
    () => promptPackages.find((p) => p.id === runCardsPackageId) ?? null,
    [promptPackages, runCardsPackageId],
  );

  // ── Derived data ─────────────────────────────────────────
  const shotFilteredAssets = useMemo(
    () =>
      selectedShotId
        ? assets.filter((a) => a.shotId === selectedShotId)
        : assets,
    [assets, selectedShotId],
  );

  const filteredAssets = useMemo(
    () =>
      filterSceneAssets(shotFilteredAssets, {
        query,
        platformKey: platformFilter,
        assetType: typeFilter === "ALL" ? "ALL" : typeFilter,
        status: statusFilter === "ALL" ? "ALL" : statusFilter,
        selectedOnly,
        tag: tagFilter,
      }),
    [
      shotFilteredAssets,
      platformFilter,
      query,
      selectedOnly,
      statusFilter,
      tagFilter,
      typeFilter,
    ],
  );

  const hasActiveFilters =
    !!query.trim() ||
    platformFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    !!tagFilter.trim() ||
    selectedOnly;

  const compareGroups = useMemo(() => {
    const groups = groupByCompareGroup(shotFilteredAssets);
    return Object.entries(groups)
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({
        key,
        items,
        metrics: computeCompareMetrics(
          items.map((a) => ({
            platformKey: a.platformKey,
            costEstimateUsd: a.costEstimateUsd,
            generationSeconds: a.generationSeconds,
          })),
        ),
      }));
  }, [shotFilteredAssets]);

  const comparedAssets = useMemo(
    () => assets.filter((asset) => compareAssetIds.includes(asset.id)),
    [assets, compareAssetIds],
  );

  // ── Smart suggestions ────────────────────────────────────
  const selectedImageReference = useMemo(
    () =>
      shotFilteredAssets.find(
        (asset) =>
          asset.selected &&
          (asset.assetType === "IMAGE" || asset.assetType === "STORYBOARD"),
      ) ?? null,
    [shotFilteredAssets],
  );

  const selectedVideoReference = useMemo(
    () =>
      shotFilteredAssets.find(
        (asset) => asset.selected && asset.assetType === "VIDEO",
      ) ?? null,
    [shotFilteredAssets],
  );

  const hasVideoVersions = useMemo(
    () => shotFilteredAssets.some((asset) => asset.assetType === "VIDEO"),
    [shotFilteredAssets],
  );

  const hasAudioVersions = useMemo(
    () =>
      shotFilteredAssets.some(
        (asset) =>
          asset.assetType === "AUDIO" ||
          asset.assetType === "MUSIC" ||
          asset.assetType === "VOICE" ||
          asset.assetType === "NARRATION",
      ),
    [shotFilteredAssets],
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
          setReuseAsset(selectedImageReference);
          setIsAdding(true);
        },
      });
    }

    if (selectedVideoReference && !hasAudioVersions) {
      suggestions.push({
        id: "suggest-audio-pass",
        text: "Detected selected video but no audio/music/voice pass yet.",
        actionLabel: "Prep Audio Draft",
        action: () => {
          setReuseAsset(selectedVideoReference);
          setIsAdding(true);
        },
      });
    }

    if (!shotFilteredAssets.some((asset) => asset.selected)) {
      suggestions.push({
        id: "suggest-select-winner",
        text: "No selected winner in this scene yet. Mark one version as selected to stabilize downstream passes.",
      });
    }

    return suggestions.slice(0, 3);
  }, [
    shotFilteredAssets,
    hasAudioVersions,
    hasVideoVersions,
    selectedImageReference,
    selectedVideoReference,
  ]);

  // ── Callbacks ────────────────────────────────────────────
  const toggleCompare = useCallback((assetId: string) => {
    setCompareAssetIds((prev) => {
      if (prev.includes(assetId)) return prev.filter((id) => id !== assetId);
      if (prev.length >= 4) return [...prev.slice(1), assetId];
      return [...prev, assetId];
    });
  }, []);

  const onSelectWinner = useCallback((assetId: string) => {
    startTransition(async () => {
      await updateSceneAssetVersion(assetId, {
        selected: true,
        status: "SELECTED",
      });
    });
  }, []);

  const onArchive = useCallback((assetId: string) => {
    startTransition(async () => {
      await updateSceneAssetVersion(assetId, {
        status: "ARCHIVED",
        selected: false,
      });
    });
  }, []);

  const onDelete = useCallback((assetId: string) => {
    if (!window.confirm("Delete this version? This cannot be undone.")) return;

    startTransition(async () => {
      await deleteSceneAssetVersion(assetId);
      setCompareAssetIds((prev) => prev.filter((id) => id !== assetId));
    });
  }, []);

  const onReusePrompt = useCallback((asset: SceneAssetItem) => {
    setReuseAsset(asset);
    setIsAdding(true);
  }, []);

  const onOpenRights = useCallback((asset: SceneAssetItem) => {
    setRightsDrawerAsset(asset);
    setRightsDrawerOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setPlatformFilter("ALL");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setTagFilter("");
    setSelectedOnly(false);
  }, []);

  const handleFormCreated = useCallback(() => {
    setIsAdding(false);
    setReuseAsset(null);
  }, []);

  const handleFormClose = useCallback(() => {
    setIsAdding(false);
    setReuseAsset(null);
  }, []);

  // ── Render ───────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">AI Assets & Versions</CardTitle>
          <Button
            size="sm"
            variant={isAdding ? "outline" : "default"}
            className="gap-1.5"
            onClick={() => {
              setIsAdding((v) => !v);
              if (isAdding) setReuseAsset(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {isAdding ? "Close" : "Add / Fan-Out"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Form */}
        {isAdding && (
          <AssetCreateForm
            key={reuseAsset?.id ?? "new"}
            sceneDbId={sceneDbId}
            platforms={platforms}
            promptPackages={promptPackages}
            reuseAsset={reuseAsset}
            onClose={handleFormClose}
            onCreated={handleFormCreated}
          />
        )}

        {/* Run Cards */}
        {promptPackages.length > 0 && (
          <Card className="border-orange-500/25 bg-orange-500/5">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm">Run Cards</CardTitle>
                <Select
                  value={runCardsPackageId ?? "NONE"}
                  onValueChange={(v) =>
                    setRunCardsPackageId(v === "NONE" ? null : v)
                  }
                >
                  <SelectTrigger className="h-8 w-48 text-xs">
                    <SelectValue placeholder="Select prompt package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {promptPackages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        P{p.versionNumber} {p.name ? `\u00b7 ${p.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            {activeRunCardsPackage && (
              <CardContent>
                <RunCardsPanel
                  promptPackage={activeRunCardsPackage}
                  platforms={platforms.map((p) => ({
                    slug: p.slug,
                    name: p.name,
                  }))}
                  assets={shotFilteredAssets}
                />
              </CardContent>
            )}
          </Card>
        )}

        {/* Filters */}
        <AssetFilters
          platforms={platforms}
          totalCount={shotFilteredAssets.length}
          filteredCount={filteredAssets.length}
          isFiltered={hasActiveFilters}
          isShotFiltered={!!selectedShotId}
          query={query}
          onQueryChange={setQuery}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          selectedOnly={selectedOnly}
          onSelectedOnlyChange={setSelectedOnly}
          onClearFilters={clearFilters}
        />

        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm font-medium">Smart Next-Step Suggestions</p>
              {smartSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-md border border-primary/20 bg-background/50 p-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {suggestion.text}
                  </p>
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

        {/* Compare View */}
        <AssetCompareView
          comparedAssets={comparedAssets}
          compareGroups={compareGroups}
          compareAssetIds={compareAssetIds}
          onToggleCompare={toggleCompare}
          onClearCompare={() => setCompareAssetIds([])}
        />

        {/* Asset Version Cards */}
        {shotFilteredAssets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No generated versions yet. Add the first prompt/output version for
            this scene.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => (
              <AssetVersionCard
                key={asset.id}
                asset={asset}
                isPending={isPending}
                isComparing={compareAssetIds.includes(asset.id)}
                onSelectWinner={onSelectWinner}
                onToggleCompare={toggleCompare}
                onOpenRights={onOpenRights}
                onReusePrompt={onReusePrompt}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Rights Drawer */}
      <RightsDrawer
        open={rightsDrawerOpen}
        onOpenChange={setRightsDrawerOpen}
        asset={
          rightsDrawerAsset
            ? {
                id: rightsDrawerAsset.id,
                platformKey: rightsDrawerAsset.platformKey,
                platformLabel: rightsDrawerAsset.platformLabel,
                rightsState: rightsDrawerAsset.rightsState,
                provenance: rightsDrawerAsset.provenance,
                modelName: rightsDrawerAsset.modelName,
                tags: rightsDrawerAsset.tags,
              }
            : null
        }
      />
    </Card>
  );
}
