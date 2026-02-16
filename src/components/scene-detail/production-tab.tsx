"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createShotAction, deleteShotAction } from "@/lib/shot-server-actions";
import { ShotProductionCard } from "./shot-production-card";
import { ShotEditDialog } from "./shot-edit-dialog";
import { SceneLevelAssets } from "./scene-level-assets";
import { AssetDetailSheet } from "./asset-detail-sheet";
import { AssetCreateDialog } from "./asset-create-dialog";
import { CompareOverlay } from "./compare-overlay";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ShotItem, AssetItem, PlatformItem, CharacterItem } from "./types";

// ─── Type filter options ───────────────────────────────────

const TYPE_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Image", value: "IMAGE" },
  { label: "Video", value: "VIDEO" },
  { label: "Audio", value: "AUDIO" },
  { label: "Music", value: "MUSIC" },
] as const;

// ─── Props ─────────────────────────────────────────────────

interface ProductionTabProps {
  sceneId: string;
  shots: ShotItem[];
  assets: AssetItem[];
  platforms: PlatformItem[];
  projectCharacters: CharacterItem[];
  shotCharactersMap: Record<string, string[]>;
}

// ─── Component ─────────────────────────────────────────────

export function ProductionTab({
  sceneId,
  shots,
  assets,
  platforms,
  projectCharacters,
  shotCharactersMap,
}: ProductionTabProps) {
  // State
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [compareAssetIds, setCompareAssetIds] = useState<Set<string>>(
    new Set(),
  );
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTargetIds, setCompareTargetIds] = useState<string[]>([]);

  // Create dialog context
  const [createOpen, setCreateOpen] = useState(false);
  const [createContext, setCreateContext] = useState<{
    shotId: string | null;
    assetType: AssetItem["assetType"];
    defaultPrompt: string;
  }>({ shotId: null, assetType: "IMAGE", defaultPrompt: "" });

  // Edit shot dialog
  const [editShotId, setEditShotId] = useState<string | null>(null);
  // Delete shot confirmation
  const [deleteShotId, setDeleteShotId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Sorted shots
  const sortedShots = useMemo(
    () => [...shots].sort((a, b) => a.sortOrder - b.sortOrder),
    [shots],
  );

  // Assets grouped by shot
  const assetsByShotId = useMemo(() => {
    const map: Record<string, AssetItem[]> = {};
    for (const shot of shots) {
      map[shot.id] = [];
    }
    for (const asset of assets) {
      if (asset.shotId && map[asset.shotId]) {
        map[asset.shotId].push(asset);
      }
    }
    return map;
  }, [shots, assets]);

  // Scene-level assets (no shot)
  const sceneLevelAssets = useMemo(
    () => assets.filter((a) => a.shotId === null),
    [assets],
  );

  // Progress: shots that have at least one selected asset
  const shotsWithSelected = useMemo(() => {
    const selectedShotIds = new Set<string>();
    for (const asset of assets) {
      if (asset.selected && asset.shotId) {
        selectedShotIds.add(asset.shotId);
      }
    }
    return selectedShotIds.size;
  }, [assets]);

  // Asset lookup for detail sheet
  const detailAsset = useMemo(
    () =>
      detailAssetId
        ? (assets.find((a) => a.id === detailAssetId) ?? null)
        : null,
    [detailAssetId, assets],
  );

  // Compare assets for overlay
  const compareAssets = useMemo(
    () => assets.filter((a) => compareTargetIds.includes(a.id)),
    [assets, compareTargetIds],
  );

  // Handlers
  const handleCompareToggle = useCallback((assetId: string) => {
    setCompareAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const handleOpenCreate = useCallback(
    (
      shotId: string | null,
      assetType: AssetItem["assetType"],
      defaultPrompt: string,
    ) => {
      setCreateContext({ shotId, assetType, defaultPrompt });
      setCreateOpen(true);
    },
    [],
  );

  const handleCompareOpen = useCallback((assetIds: string[]) => {
    setCompareTargetIds(assetIds);
    setCompareOpen(true);
  }, []);

  // Shot to edit (lookup)
  const editShot = useMemo(
    () =>
      editShotId ? (shots.find((s) => s.id === editShotId) ?? null) : null,
    [editShotId, shots],
  );

  const handleEditShot = useCallback((shotId: string) => {
    setEditShotId(shotId);
  }, []);

  const handleDeleteShot = useCallback((shotId: string) => {
    setDeleteShotId(shotId);
  }, []);

  const confirmDeleteShot = () => {
    if (!deleteShotId) return;
    startTransition(async () => {
      await deleteShotAction(deleteShotId);
      setDeleteShotId(null);
    });
  };

  const handleAddShot = () => {
    startTransition(async () => {
      await createShotAction(sceneId, {
        description: "New shot",
      });
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top bar: type filter + progress ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={typeFilter === filter.value ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {shots.length > 0 && (
          <Badge variant="outline" className="text-xs shrink-0">
            {shotsWithSelected}/{shots.length} done
          </Badge>
        )}
      </div>

      {/* ── Shot list ── */}
      {sortedShots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No shots yet. Add the first shot to start building your production
          board.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedShots.map((shot, index) => (
            <ShotProductionCard
              key={shot.id}
              shot={shot}
              assets={assetsByShotId[shot.id] ?? []}
              characters={projectCharacters}
              characterIds={shotCharactersMap[shot.id] ?? []}
              defaultExpanded={index === 0}
              typeFilter={typeFilter}
              compareAssetIds={compareAssetIds}
              onCompareToggle={handleCompareToggle}
              onAssetClick={setDetailAssetId}
              onCreateAsset={handleOpenCreate}
              onCompareOpen={handleCompareOpen}
              onEditShot={handleEditShot}
              onDeleteShot={handleDeleteShot}
            />
          ))}
        </div>
      )}

      {/* Add Shot button */}
      <Button
        variant="outline"
        className="w-full gap-1.5"
        onClick={handleAddShot}
        disabled={isPending}
      >
        <Plus className="h-4 w-4" />
        Add Shot
      </Button>

      {/* ── Scene-Level Assets ── */}
      <SceneLevelAssets
        assets={sceneLevelAssets}
        compareAssetIds={compareAssetIds}
        onCompareToggle={handleCompareToggle}
        onAssetClick={setDetailAssetId}
        onCreateAsset={handleOpenCreate}
      />

      {/* ── Asset Detail Sheet ── */}
      <AssetDetailSheet
        asset={detailAsset}
        open={detailAssetId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailAssetId(null);
        }}
        onDeleted={() => setDetailAssetId(null)}
      />

      {/* ── Asset Create Dialog ── */}
      <AssetCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        sceneDbId={sceneId}
        platforms={platforms}
        defaultAssetType={createContext.assetType}
        defaultShotId={createContext.shotId}
        defaultPrompt={createContext.defaultPrompt}
      />

      {/* ── Shot Edit Dialog ── */}
      <ShotEditDialog
        shot={editShot}
        open={editShotId !== null}
        onOpenChange={(open) => {
          if (!open) setEditShotId(null);
        }}
      />

      {/* ── Delete Shot Confirm ── */}
      <ConfirmDialog
        open={deleteShotId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteShotId(null);
        }}
        title="Delete shot?"
        description="This will permanently delete this shot and all its assets. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteShot}
        disabled={isPending}
      />

      {/* ── Compare Overlay ── */}
      <CompareOverlay
        assets={compareAssets}
        open={compareOpen}
        onClose={() => {
          setCompareOpen(false);
          setCompareTargetIds([]);
        }}
      />
    </div>
  );
}
