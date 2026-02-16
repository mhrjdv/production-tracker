"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  GitCompareArrows,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AssetThumbnail } from "./asset-thumbnail";
import type { AssetItem, ShotItem, CharacterItem } from "./types";

// ─── Asset type lane config ────────────────────────────────

type LaneType = "IMAGE" | "VIDEO" | "AUDIO";

const LANE_CONFIG: {
  lane: LaneType;
  label: string;
  types: AssetItem["assetType"][];
}[] = [
  { lane: "IMAGE", label: "Images", types: ["IMAGE", "STORYBOARD"] },
  { lane: "VIDEO", label: "Videos", types: ["VIDEO"] },
  {
    lane: "AUDIO",
    label: "Audio",
    types: ["AUDIO", "MUSIC", "VOICE", "NARRATION"],
  },
];

// ─── Props ─────────────────────────────────────────────────

interface ShotProductionCardProps {
  shot: ShotItem;
  assets: AssetItem[];
  characters: CharacterItem[];
  characterIds: string[];
  defaultExpanded?: boolean;
  /** Which asset type filter is active ("ALL" shows everything) */
  typeFilter: string;
  compareAssetIds: Set<string>;
  onCompareToggle: (assetId: string) => void;
  onAssetClick: (assetId: string) => void;
  onCreateAsset: (
    shotId: string,
    assetType: AssetItem["assetType"],
    defaultPrompt: string,
  ) => void;
  onCompareOpen: (assetIds: string[]) => void;
  onEditShot: (shotId: string) => void;
  onDeleteShot: (shotId: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function ShotProductionCard({
  shot,
  assets,
  characters,
  characterIds,
  defaultExpanded = false,
  typeFilter,
  compareAssetIds,
  onCompareToggle,
  onAssetClick,
  onCreateAsset,
  onCompareOpen,
  onEditShot,
  onDeleteShot,
}: ShotProductionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Group assets by lane
  const laneAssets = useMemo(() => {
    const grouped: Record<LaneType, AssetItem[]> = {
      IMAGE: [],
      VIDEO: [],
      AUDIO: [],
    };
    for (const asset of assets) {
      for (const config of LANE_CONFIG) {
        if (config.types.includes(asset.assetType)) {
          grouped[config.lane].push(asset);
          break;
        }
      }
    }
    return grouped;
  }, [assets]);

  // Filtered lanes based on type filter
  const visibleLanes = useMemo(() => {
    if (typeFilter === "ALL") return LANE_CONFIG;
    return LANE_CONFIG.filter((c) => c.types.some((t) => t === typeFilter));
  }, [typeFilter]);

  // Count assets per lane for collapsed badge
  const totalAssets = assets.length;

  // Assigned characters
  const assignedChars = useMemo(
    () => characters.filter((c) => characterIds.includes(c.id)),
    [characters, characterIds],
  );

  return (
    <div className="group rounded-lg border bg-card transition-colors">
      {/* ── Header ── */}
      <div
        role="button"
        tabIndex={0}
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <div className="pt-0.5">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{shot.shotCode}</span>
            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
              {shot.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {shot.framing && (
              <Badge variant="outline" className="text-[10px]">
                {shot.framing}
              </Badge>
            )}
            {shot.movement && (
              <Badge variant="secondary" className="text-[10px]">
                {shot.movement}
              </Badge>
            )}
            {shot.angle && (
              <Badge variant="outline" className="text-[10px]">
                {shot.angle}
              </Badge>
            )}

            {/* Character pills */}
            {assignedChars.length > 0 && (
              <div className="flex -space-x-1 ml-1">
                {assignedChars.map((char) => (
                  <Tooltip key={char.id}>
                    <TooltipTrigger asChild>
                      <div className="h-5 w-5 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center overflow-hidden">
                        {char.portraitUrl ? (
                          <Image
                            src={char.portraitUrl}
                            alt={char.name}
                            width={20}
                            height={20}
                            className="h-full w-full object-cover"
                            sizes="20px"
                            quality={50}
                            unoptimized
                          />
                        ) : (
                          <span className="text-[7px] font-medium text-primary">
                            {char.name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{char.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Collapsed asset count badge */}
            {!expanded && totalAssets > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {totalAssets} asset{totalAssets !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        {/* Edit/delete buttons */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onEditShot(shot.id);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteShot(shot.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Asset Lanes ── */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2">
          {visibleLanes.map((config) => {
            const items = laneAssets[config.lane];
            const laneCompareIds = items
              .filter((a) => compareAssetIds.has(a.id))
              .map((a) => a.id);

            return (
              <LaneRow
                key={config.lane}
                label={config.label}
                assets={items}
                primaryType={config.types[0]}
                shotDescription={shot.description}
                shotId={shot.id}
                compareAssetIds={compareAssetIds}
                laneCompareCount={laneCompareIds.length}
                onCompareToggle={onCompareToggle}
                onAssetClick={onAssetClick}
                onCreateAsset={onCreateAsset}
                onCompareOpen={() => onCompareOpen(laneCompareIds)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Lane Row (horizontal scroll of thumbnails) ────────────

function LaneRow({
  label,
  assets,
  primaryType,
  shotDescription,
  shotId,
  compareAssetIds,
  laneCompareCount,
  onCompareToggle,
  onAssetClick,
  onCreateAsset,
  onCompareOpen,
}: {
  label: string;
  assets: AssetItem[];
  primaryType: AssetItem["assetType"];
  shotDescription: string;
  shotId: string;
  compareAssetIds: Set<string>;
  laneCompareCount: number;
  onCompareToggle: (id: string) => void;
  onAssetClick: (id: string) => void;
  onCreateAsset: (
    shotId: string,
    type: AssetItem["assetType"],
    prompt: string,
  ) => void;
  onCompareOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-14 shrink-0">
        {label}:
      </span>

      {assets.length === 0 ? (
        <span className="text-xs text-muted-foreground/50">&mdash;</span>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {assets.map((asset) => (
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

      {/* Compare button (when 2+ checked in this lane) */}
      {laneCompareCount >= 2 && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 text-xs h-7"
          onClick={onCompareOpen}
        >
          <GitCompareArrows className="h-3 w-3" />
          Compare {laneCompareCount}
        </Button>
      )}

      {/* Add button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => onCreateAsset(shotId, primaryType, shotDescription)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
