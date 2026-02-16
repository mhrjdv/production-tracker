"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Star, CheckSquare, Square } from "lucide-react";
import { shouldSkipOptimization } from "@/lib/image-utils";
import type { AssetItem } from "./types";

// ─── Platform abbreviation map ─────────────────────────────

const PLATFORM_ABBREV: Record<string, string> = {
  midjourney: "MJ",
  sora: "Sora",
  "stable-diffusion": "SD",
  "dall-e": "DE",
  flux: "FLUX",
  freepik: "FP",
  runway: "RW",
  pika: "Pika",
  kling: "Kling",
  "eleven-labs": "11L",
  suno: "Suno",
  udio: "Udio",
  "gemini-veo": "Veo",
};

function platformAbbrev(key: string): string {
  return PLATFORM_ABBREV[key] ?? key.slice(0, 4).toUpperCase();
}

// ─── Status color ──────────────────────────────────────────

function statusDotColor(
  status: AssetItem["status"],
  selected: boolean,
): string {
  if (selected) return "bg-emerald-500";
  switch (status) {
    case "GENERATED":
    case "APPROVED":
      return "bg-blue-500";
    case "DRAFT":
      return "bg-zinc-400";
    case "REJECTED":
    case "ARCHIVED":
      return "bg-red-400";
    default:
      return "bg-zinc-400";
  }
}

// ─── Props ─────────────────────────────────────────────────

interface AssetThumbnailProps {
  asset: AssetItem;
  isCompareChecked: boolean;
  onCompareToggle: (assetId: string) => void;
  onClick: (assetId: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function AssetThumbnail({
  asset,
  isCompareChecked,
  onCompareToggle,
  onClick,
}: AssetThumbnailProps) {
  // Prefer thumbnail (small WebP) over full-res output for compact display
  const imgSrc = asset.thumbnailUrl ?? asset.outputUrl;

  return (
    <button
      type="button"
      className={`group relative h-[72px] w-24 shrink-0 rounded-md border overflow-hidden transition-all hover:ring-2 hover:ring-primary/40 ${
        asset.selected ? "ring-2 ring-emerald-500/60" : "ring-0"
      }`}
      onClick={() => onClick(asset.id)}
    >
      {/* Image or placeholder */}
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={`${asset.platformLabel} v${asset.versionNumber}`}
          width={96}
          height={72}
          className="h-full w-full object-cover"
          sizes="96px"
          quality={60}
          unoptimized={shouldSkipOptimization(imgSrc, !!asset.thumbnailUrl)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
          {asset.assetType === "VIDEO"
            ? "VID"
            : asset.assetType === "AUDIO" || asset.assetType === "MUSIC"
              ? "AUD"
              : "IMG"}
        </div>
      )}

      {/* Platform badge (top-left) */}
      <span className="absolute top-0.5 left-0.5 rounded bg-black/60 px-1 py-px text-[9px] font-medium text-white leading-tight">
        {platformAbbrev(asset.platformKey)}
      </span>

      {/* Version badge (bottom-left) */}
      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 py-px text-[9px] text-white leading-tight">
        v{asset.versionNumber}
      </span>

      {/* Status dot (bottom-right) */}
      <span
        className={`absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white/50 ${statusDotColor(asset.status, asset.selected)}`}
      />

      {/* Star overlay for selected */}
      {asset.selected && (
        <Star className="absolute top-0.5 right-0.5 h-3.5 w-3.5 fill-amber-400 text-amber-400 drop-shadow" />
      )}

      {/* Compare checkbox (visible on hover or when checked) */}
      <button
        type="button"
        className={`absolute top-0.5 right-0.5 transition-opacity ${
          isCompareChecked || asset.selected
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        } ${asset.selected ? "top-4" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onCompareToggle(asset.id);
        }}
      >
        {isCompareChecked ? (
          <CheckSquare className="h-3.5 w-3.5 text-primary drop-shadow" />
        ) : (
          <Square className="h-3.5 w-3.5 text-white/80 drop-shadow" />
        )}
      </button>
    </button>
  );
}
