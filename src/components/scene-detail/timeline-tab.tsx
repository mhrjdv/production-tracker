"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Image, Mic, Music, Volume2 } from "lucide-react";
import type { AssetItem } from "./types";

// ─── Lane definitions ──────────────────────────────────────

const LANES = [
  {
    type: "IMAGE" as const,
    label: "Image",
    icon: Image,
    color: "border-blue-500/30 bg-blue-500/5",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  {
    type: "VIDEO" as const,
    label: "Video",
    icon: Film,
    color: "border-purple-500/30 bg-purple-500/5",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  {
    type: "AUDIO" as const,
    label: "Audio / SFX",
    icon: Volume2,
    color: "border-amber-500/30 bg-amber-500/5",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  {
    type: "MUSIC" as const,
    label: "Music",
    icon: Music,
    color: "border-emerald-500/30 bg-emerald-500/5",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  {
    type: "VOICE" as const,
    label: "Voice / Narration",
    icon: Mic,
    color: "border-rose-500/30 bg-rose-500/5",
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
] as const;

type LaneType = (typeof LANES)[number]["type"];

interface TimelineTabProps {
  assets: AssetItem[];
}

export function TimelineTab({ assets }: TimelineTabProps) {
  // Group selected/winner assets by lane type
  const laneData = useMemo(() => {
    const assetsByType: Record<string, AssetItem[]> = {};

    for (const asset of assets) {
      // Include selected winners and narration type too
      const matchType =
        asset.assetType === "NARRATION" ? "VOICE" : asset.assetType;
      if (!assetsByType[matchType]) {
        assetsByType[matchType] = [];
      }
      assetsByType[matchType].push(asset);
    }

    return LANES.map((lane) => ({
      ...lane,
      allAssets: assetsByType[lane.type] ?? [],
      selectedAssets: (assetsByType[lane.type] ?? []).filter((a) => a.selected),
    }));
  }, [assets]);

  const totalSelected = laneData.reduce(
    (sum, lane) => sum + lane.selectedAssets.length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Assembly timeline ({totalSelected} selected asset
          {totalSelected !== 1 ? "s" : ""} across {LANES.length} lanes)
        </p>
      </div>

      {/* Lanes */}
      {laneData.map((lane) => {
        const Icon = lane.icon;
        const hasSelected = lane.selectedAssets.length > 0;

        return (
          <Card
            key={lane.type}
            className={`${lane.color} transition-all`}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {lane.label}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {lane.allAssets.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {lane.allAssets.length} total
                    </Badge>
                  )}
                  {hasSelected && (
                    <Badge className={`text-[10px] ${lane.badgeColor}`}>
                      {lane.selectedAssets.length} selected
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              {hasSelected ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {lane.selectedAssets.map((asset) => {
                    const thumb =
                      asset.thumbnailUrl || asset.outputUrl || null;

                    return (
                      <div
                        key={asset.id}
                        className="flex shrink-0 items-center gap-3 rounded-md border bg-background/80 p-2 min-w-[200px] max-w-[300px]"
                      >
                        {thumb ? (
                          <div className="h-12 w-16 shrink-0 rounded overflow-hidden bg-muted">
                            <img
                              src={thumb}
                              alt={asset.title ?? ""}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-16 shrink-0 rounded bg-muted flex items-center justify-center">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-medium truncate">
                            {asset.title ?? asset.platformKey}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {asset.modelName ?? asset.platformLabel}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4"
                          >
                            v{asset.versionNumber}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-md border border-dashed py-4 text-xs text-muted-foreground">
                  No {lane.label.toLowerCase()} selected — pick a winner from
                  Compare or Assets tab
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
