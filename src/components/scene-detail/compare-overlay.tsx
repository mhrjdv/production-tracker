"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Columns2, Columns3, Columns4, Star, X } from "lucide-react";
import { updateSceneAssetVersion } from "@/lib/actions";
import { computeCompareMetrics } from "@/lib/compare-utils";
import type { AssetItem } from "./types";

// ─── Props ─────────────────────────────────────────────────

interface CompareOverlayProps {
  assets: AssetItem[];
  open: boolean;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────

export function CompareOverlay({ assets, open, onClose }: CompareOverlayProps) {
  const [columns, setColumns] = useState(Math.min(assets.length, 3));
  const [isPending, startTransition] = useTransition();

  const metrics = useMemo(() => computeCompareMetrics(assets), [assets]);

  const handlePickWinner = (assetId: string) => {
    startTransition(async () => {
      await updateSceneAssetVersion(assetId, { selected: true });
    });
  };

  if (!open || assets.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">
            Comparing {assets.length} versions
          </h2>
          <Badge variant="secondary" className="text-xs">
            {metrics.platformCount} platform{metrics.platformCount !== 1 ? "s" : ""}
          </Badge>
          {metrics.avgCostUsd !== null && (
            <Badge variant="outline" className="text-xs">
              Avg ${metrics.avgCostUsd.toFixed(3)}
            </Badge>
          )}
          {metrics.avgGenerationSeconds !== null && (
            <Badge variant="outline" className="text-xs">
              Avg {metrics.avgGenerationSeconds.toFixed(0)}s
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={columns === 2 ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setColumns(2)}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={columns === 3 ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setColumns(3)}
          >
            <Columns3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={columns === 4 ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setColumns(4)}
          >
            <Columns4 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Compare grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(columns, assets.length)}, minmax(0, 1fr))`,
          }}
        >
          {assets.map((asset) => (
            <CompareCard
              key={asset.id}
              asset={asset}
              isPending={isPending}
              onPickWinner={handlePickWinner}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Compare Card ──────────────────────────────────────────

function CompareCard({
  asset,
  isPending,
  onPickWinner,
}: {
  asset: AssetItem;
  isPending: boolean;
  onPickWinner: (id: string) => void;
}) {
  const imgSrc = asset.outputUrl ?? asset.thumbnailUrl;

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all ${
        asset.selected
          ? "ring-2 ring-amber-400 border-amber-400/50"
          : "border-border"
      }`}
    >
      {/* Preview */}
      <div className="aspect-video bg-muted/20 relative">
        {imgSrc ? (
          asset.assetType === "VIDEO" ? (
            <video src={imgSrc} controls className="h-full w-full object-contain" />
          ) : (
            <img
              src={imgSrc}
              alt={`${asset.platformLabel} v${asset.versionNumber}`}
              className="h-full w-full object-contain"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No preview
          </div>
        )}

        {/* Winner star */}
        {asset.selected && (
          <div className="absolute top-2 right-2 rounded-full bg-amber-400 p-1">
            <Star className="h-4 w-4 fill-white text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {asset.platformLabel}
          </Badge>
          {asset.modelName && (
            <Badge variant="secondary" className="text-[10px]">
              {asset.modelName}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            v{asset.versionNumber}
          </Badge>
        </div>

        {/* Prompt preview */}
        <p className="text-xs text-muted-foreground line-clamp-3">
          {asset.prompt}
        </p>

        {/* Cost & time */}
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          {asset.costEstimateUsd !== null && (
            <span>${asset.costEstimateUsd.toFixed(3)}</span>
          )}
          {asset.generationSeconds !== null && (
            <span>{asset.generationSeconds}s</span>
          )}
        </div>

        {/* Pick winner */}
        <Button
          variant={asset.selected ? "default" : "outline"}
          size="sm"
          className="w-full gap-1.5"
          onClick={() => onPickWinner(asset.id)}
          disabled={isPending || asset.selected}
        >
          <Star
            className={`h-3.5 w-3.5 ${asset.selected ? "fill-amber-400 text-amber-400" : ""}`}
          />
          {asset.selected ? "Winner" : "Pick Winner"}
        </Button>
      </div>
    </div>
  );
}
