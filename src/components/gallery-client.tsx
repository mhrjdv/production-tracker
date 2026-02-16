"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  X,
  Star,
  ImageIcon,
  PlayCircle,
  Music2,
  Grid3x3,
  LayoutList,
} from "lucide-react";
import {
  create,
  insert,
  search as oramaSearch,
  type AnyOrama,
} from "@orama/orama";

// ─── Types ──────────────────────────────────────────────────

interface GalleryAsset {
  id: string;
  sceneDbId: string;
  sceneId: string;
  storyBeat: string;
  act: number;
  macroScene: string;
  assetType: string;
  status: string;
  platformKey: string;
  platformLabel: string;
  versionNumber: number;
  title: string | null;
  prompt: string;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  selected: boolean;
  tags: string[];
  notes: string | null;
  createdAt: string;
}

type TypeFilter = "all" | "IMAGE" | "VIDEO" | "AUDIO";
type ViewMode = "grid" | "list";

// ─── Orama Search Hook ─────────────────────────────────────

function useOramaSearch(assets: GalleryAsset[]) {
  const [db, setDb] = useState<AnyOrama | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const instance = await create({
        schema: {
          id: "string",
          sceneId: "string",
          storyBeat: "string",
          prompt: "string",
          platformLabel: "string",
          title: "string",
          tags: "string",
          notes: "string",
        },
      });

      for (const asset of assets) {
        await insert(instance, {
          id: asset.id,
          sceneId: asset.sceneId,
          storyBeat: asset.storyBeat,
          prompt: asset.prompt.slice(0, 500),
          platformLabel: asset.platformLabel,
          title: asset.title ?? "",
          tags: asset.tags.join(" "),
          notes: asset.notes ?? "",
        });
      }

      if (!cancelled) setDb(instance);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [assets]);

  const searchFn = useCallback(
    async (query: string): Promise<Set<string>> => {
      if (!db || !query.trim()) return new Set(assets.map((a) => a.id));
      const results = await oramaSearch(db, {
        term: query,
        limit: 500,
        threshold: 0,
      });
      return new Set(results.hits.map((h) => h.document.id as string));
    },
    [db, assets],
  );

  return searchFn;
}

// ─── Platform Abbreviation ─────────────────────────────────

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
  "gemini-veo": "Veo",
};

function platformAbbrev(key: string): string {
  return PLATFORM_ABBREV[key] ?? key.slice(0, 4).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────

export function GalleryClient({
  projectId,
  projectName,
  assets,
}: {
  projectId: string;
  projectName: string;
  assets: GalleryAsset[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [matchIds, setMatchIds] = useState<Set<string> | null>(null);
  const searchOrama = useOramaSearch(assets);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setMatchIds(null);
        return;
      }
      const ids = await searchOrama(query);
      setMatchIds(ids);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchOrama]);

  // Platform options
  const platformOptions = useMemo(() => {
    const platforms = new Map<string, string>();
    for (const a of assets) platforms.set(a.platformKey, a.platformLabel);
    return Array.from(platforms.entries()).sort(([, a], [, b]) =>
      a.localeCompare(b),
    );
  }, [assets]);

  // Filtered assets
  const filtered = useMemo(() => {
    let result = assets;

    if (matchIds) {
      result = result.filter((a) => matchIds.has(a.id));
    }

    if (typeFilter !== "all") {
      const typeSet =
        typeFilter === "AUDIO"
          ? new Set(["AUDIO", "MUSIC", "VOICE", "NARRATION"])
          : new Set([typeFilter, typeFilter === "IMAGE" ? "STORYBOARD" : ""]);
      result = result.filter((a) => typeSet.has(a.assetType));
    }

    if (platformFilter !== "all") {
      result = result.filter((a) => a.platformKey === platformFilter);
    }

    return result;
  }, [assets, matchIds, typeFilter, platformFilter]);

  const hasFilters = query || typeFilter !== "all" || platformFilter !== "all";

  // Counts
  const imageCount = assets.filter((a) =>
    ["IMAGE", "STORYBOARD"].includes(a.assetType),
  ).length;
  const videoCount = assets.filter((a) => a.assetType === "VIDEO").length;
  const audioCount = assets.filter((a) =>
    ["AUDIO", "MUSIC", "VOICE", "NARRATION"].includes(a.assetType),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-foreground transition-colors"
          >
            {projectName}
          </Link>
          <span>/</span>
          <span className="text-foreground">Gallery</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
        <p className="text-muted-foreground mt-1">
          {assets.length} assets &middot; {imageCount} images, {videoCount}{" "}
          videos, {audioCount} audio
          {hasFilters && ` (${filtered.length} shown)`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts, scenes, tags..."
            className="pl-9"
          />
        </div>

        {/* Type filter buttons */}
        <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
          {(
            [
              { key: "all", label: "All", icon: null },
              { key: "IMAGE", label: "Image", icon: ImageIcon },
              { key: "VIDEO", label: "Video", icon: PlayCircle },
              { key: "AUDIO", label: "Audio", icon: Music2 },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTypeFilter(opt.key)}
              className={`px-3 py-1.5 text-[11px] font-medium transition-colors border-r border-border/40 last:border-r-0 flex items-center gap-1 ${
                typeFilter === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              {opt.icon && <opt.icon className="h-3 w-3" />}
              {opt.label}
            </button>
          ))}
        </div>

        {platformOptions.length > 1 && (
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platformOptions.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 transition-colors border-l border-border/40 ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setTypeFilter("all");
              setPlatformFilter("all");
            }}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "No assets match your search."
              : "No assets in this project yet."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((asset) => (
            <GalleryCard key={asset.id} asset={asset} projectId={projectId} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((asset) => (
            <GalleryListRow
              key={asset.id}
              asset={asset}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Grid Card ──────────────────────────────────────────────

function GalleryCard({
  asset,
  projectId,
}: {
  asset: GalleryAsset;
  projectId: string;
}) {
  const imgSrc = asset.thumbnailUrl ?? asset.outputUrl;
  const isVisual = ["IMAGE", "STORYBOARD", "VIDEO"].includes(asset.assetType);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <Link
            href={`/projects/${projectId}/scenes/${asset.sceneId}`}
            className={`group relative rounded-lg border border-border/40 overflow-hidden hover:border-border/80 hover:shadow-md transition-all ${
              asset.selected ? "ring-2 ring-emerald-500/40" : ""
            }`}
          >
            {/* Image / Placeholder */}
            <div className="aspect-video bg-muted/30 flex items-center justify-center">
              {imgSrc && isVisual ? (
                <img
                  src={imgSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="text-muted-foreground/30">
                  {asset.assetType === "VIDEO" ? (
                    <PlayCircle className="h-8 w-8" />
                  ) : ["AUDIO", "MUSIC", "VOICE", "NARRATION"].includes(
                      asset.assetType,
                    ) ? (
                    <Music2 className="h-8 w-8" />
                  ) : (
                    <ImageIcon className="h-8 w-8" />
                  )}
                </div>
              )}
            </div>

            {/* Overlays */}
            <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {platformAbbrev(asset.platformKey)}
            </span>
            <span className="absolute top-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-mono">
              {asset.sceneId}
            </span>
            {asset.selected && (
              <Star className="absolute bottom-1 right-1 h-4 w-4 fill-amber-400 text-amber-400 drop-shadow" />
            )}

            {/* Info bar */}
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-medium truncate">
                {asset.title ?? asset.storyBeat}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                v{asset.versionNumber} &middot; {asset.platformLabel}
              </p>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-medium">
            {asset.sceneId}: {asset.storyBeat}
          </p>
          <p className="text-muted-foreground line-clamp-2 mt-1">
            {asset.prompt}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── List Row ───────────────────────────────────────────────

function GalleryListRow({
  asset,
  projectId,
}: {
  asset: GalleryAsset;
  projectId: string;
}) {
  const imgSrc = asset.thumbnailUrl ?? asset.outputUrl;

  return (
    <Link
      href={`/projects/${projectId}/scenes/${asset.sceneId}`}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors group ${
        asset.selected ? "bg-emerald-500/5" : ""
      }`}
    >
      {/* Thumbnail */}
      <div className="h-10 w-16 rounded border border-border/40 overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {asset.title ?? asset.storyBeat}
        </p>
        <p className="text-xs text-muted-foreground truncate">{asset.prompt}</p>
      </div>

      {/* Badges */}
      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
        {asset.sceneId}
      </Badge>
      <Badge variant="secondary" className="text-[10px] shrink-0">
        {platformAbbrev(asset.platformKey)} v{asset.versionNumber}
      </Badge>
      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
        {asset.assetType.toLowerCase()}
      </Badge>
      {asset.selected && (
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
      )}
    </Link>
  );
}
