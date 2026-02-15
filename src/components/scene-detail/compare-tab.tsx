"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  Columns2,
  Columns3,
  Grid2x2,
  Loader2,
  Trophy,
  ZoomIn,
} from "lucide-react";
import {
  groupByCompareGroup,
  autoCompareGroup,
  findWinner,
  computeCompareMetrics,
} from "@/lib/compare-utils";
import { updateSceneAssetVersion } from "@/lib/actions";
import type { AssetItem } from "./types";

interface CompareTabProps {
  sceneDbId: string;
  assets: AssetItem[];
}

type ColumnLayout = 2 | 3 | 4;

export function CompareTab({ sceneDbId, assets }: CompareTabProps) {
  const [columns, setColumns] = useState<ColumnLayout>(3);
  const [zoomedAsset, setZoomedAsset] = useState<AssetItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Build compare groups from assets
  const compareGroups = useMemo(() => {
    const withGroups = assets.map((asset) => ({
      ...asset,
      compareGroup:
        asset.compareGroup ??
        autoCompareGroup(
          asset.promptPackageId,
          asset.shotId,
          new Date(asset.createdAt),
        ),
    }));

    const grouped = groupByCompareGroup(withGroups);

    // Only show groups with 2+ versions (single items aren't useful for comparison)
    return Object.entries(grouped)
      .filter(([, items]) => items.length >= 2)
      .sort(([, a], [, b]) => {
        const aTime = new Date(a[0].createdAt).getTime();
        const bTime = new Date(b[0].createdAt).getTime();
        return bTime - aTime;
      });
  }, [assets]);

  const handleSelectWinner = (assetId: string) => {
    startTransition(async () => {
      await updateSceneAssetVersion(assetId, { selected: true });
    });
  };

  const gridCols =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-4";

  if (assets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        No assets to compare yet. Create assets from the Assets tab first.
      </div>
    );
  }

  if (compareGroups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        No compare groups found. Assets need at least 2 versions with the same
        prompt package or shot to form a comparison group.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Layout controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {compareGroups.length} compare group
          {compareGroups.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={columns === 2 ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setColumns(2)}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={columns === 3 ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setColumns(3)}
          >
            <Columns3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={columns === 4 ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setColumns(4)}
          >
            <Grid2x2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Compare groups */}
      {compareGroups.map(([groupKey, items]) => {
        const metrics = computeCompareMetrics(items);
        const winner = findWinner(items);

        return (
          <Card key={groupKey}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">
                  {items[0].shotId ? `Shot group` : "Compare group"}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {metrics.totalVersions} versions
                  </Badge>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {metrics.platformCount} platform
                    {metrics.platformCount !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
                {metrics.avgCostUsd !== null && (
                  <span className="text-xs text-muted-foreground">
                    avg ${metrics.avgCostUsd.toFixed(3)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${gridCols}`}>
                {items.map((asset) => {
                  const isWinner = asset.selected;
                  const thumbSrc =
                    asset.thumbnailUrl || asset.outputUrl || null;

                  return (
                    <div
                      key={asset.id}
                      className={`group relative rounded-lg border overflow-hidden transition-all ${
                        isWinner
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      {/* Image area */}
                      <div className="relative aspect-video bg-muted">
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={asset.title ?? asset.prompt.slice(0, 60)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            No preview
                          </div>
                        )}

                        {/* Winner badge */}
                        {isWinner && (
                          <div className="absolute top-2 left-2">
                            <Badge className="gap-1 bg-primary text-primary-foreground">
                              <Trophy className="h-3 w-3" /> Winner
                            </Badge>
                          </div>
                        )}

                        {/* Zoom button */}
                        {thumbSrc && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setZoomedAsset(asset)}
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Metadata overlay */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {asset.platformKey}
                          </Badge>
                          {asset.modelName && (
                            <Badge variant="secondary" className="text-[10px]">
                              {asset.modelName}
                            </Badge>
                          )}
                        </div>

                        {asset.prompt && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {asset.prompt}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {asset.costEstimateUsd !== null && (
                              <span>${asset.costEstimateUsd.toFixed(3)}</span>
                            )}
                            {asset.generationSeconds !== null && (
                              <span>{asset.generationSeconds}s</span>
                            )}
                          </div>

                          {!isWinner && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              disabled={isPending}
                              onClick={() => handleSelectWinner(asset.id)}
                            >
                              {isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Select
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Zoom overlay */}
      {zoomedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setZoomedAsset(null)}
          role="dialog"
          aria-label="Image zoom"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={
                zoomedAsset.outputUrl ?? zoomedAsset.thumbnailUrl ?? undefined
              }
              alt={
                zoomedAsset.title ?? zoomedAsset.prompt.slice(0, 60)
              }
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-lg bg-black/60 px-4 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-white/80">
                  {zoomedAsset.platformKey}
                </Badge>
                {zoomedAsset.modelName && (
                  <span className="text-xs text-white/60">
                    {zoomedAsset.modelName}
                  </span>
                )}
              </div>
              {zoomedAsset.selected && (
                <Badge className="gap-1 bg-primary text-primary-foreground">
                  <Trophy className="h-3 w-3" /> Winner
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
