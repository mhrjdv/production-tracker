"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AssetThumbnail } from "./asset-thumbnail";
import type { AssetItem } from "./types";

// ─── Scene-level lane config ───────────────────────────────

const SCENE_LANES: {
  label: string;
  types: AssetItem["assetType"][];
  primaryType: AssetItem["assetType"];
}[] = [
  { label: "Music", types: ["MUSIC"], primaryType: "MUSIC" },
  { label: "Narration", types: ["NARRATION", "VOICE"], primaryType: "NARRATION" },
  { label: "Other", types: ["AUDIO", "OTHER", "SCRIPT", "STORYBOARD"], primaryType: "OTHER" },
];

// ─── Props ─────────────────────────────────────────────────

interface SceneLevelAssetsProps {
  /** Assets not tied to a shot (shotId === null) */
  assets: AssetItem[];
  compareAssetIds: Set<string>;
  onCompareToggle: (assetId: string) => void;
  onAssetClick: (assetId: string) => void;
  onCreateAsset: (shotId: string | null, assetType: AssetItem["assetType"], defaultPrompt: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function SceneLevelAssets({
  assets,
  compareAssetIds,
  onCompareToggle,
  onAssetClick,
  onCreateAsset,
}: SceneLevelAssetsProps) {
  const laneAssets = useMemo(() => {
    const grouped: Record<string, AssetItem[]> = {};
    for (const lane of SCENE_LANES) {
      grouped[lane.label] = [];
    }
    for (const asset of assets) {
      for (const lane of SCENE_LANES) {
        if (lane.types.includes(asset.assetType)) {
          grouped[lane.label].push(asset);
          break;
        }
      }
    }
    return grouped;
  }, [assets]);

  // Only show if there are scene-level assets or always show music/narration lanes
  const hasAny = assets.length > 0;
  const visibleLanes = SCENE_LANES.filter(
    (lane) => (laneAssets[lane.label]?.length ?? 0) > 0 || lane.label !== "Other",
  );

  if (visibleLanes.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Scene-Level
      </p>

      {visibleLanes.map((lane) => {
        const items = laneAssets[lane.label] ?? [];
        return (
          <div key={lane.label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">
              {lane.label}:
            </span>

            {items.length === 0 ? (
              <span className="text-xs text-muted-foreground/50">&mdash;</span>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {items.map((asset) => (
                  <AssetThumbnail
                    key={asset.id}
                    asset={asset}
                    isCompareChecked={compareAssetIds.has(asset.id)}
                    onCompareToggle={onCompareToggle}
                    onClick={onAssetClick}
                  />
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onCreateAsset(null, lane.primaryType, "")}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
