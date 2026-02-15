"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, GripVertical, Maximize2, Minimize2, ZoomIn } from "lucide-react";
import { updateSceneOrder } from "@/lib/actions";

// ─── Types ──────────────────────────────────────────────────

interface AssetInfo {
  assetType: string;
  status: string;
  selected: boolean;
  platformLabel: string;
  versionNumber: number;
  thumbnailUrl: string | null;
  outputUrl: string | null;
}

interface TimelineScene {
  id: string;
  sceneId: string;
  storyBeat: string;
  act: number;
  actTitle: string;
  macroScene: string;
  emotionalTone: string | null;
  sourceText: string;
  keyframeUrl: string | null;
  sortOrder: number;
  assets: AssetInfo[];
}

type ZoomLevel = "acts" | "macro" | "fit" | "normal" | "large";

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: "acts", label: "Acts" },
  { value: "macro", label: "Macro" },
  { value: "fit", label: "Fit" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
];

const ACT_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
];

// ─── Bar Chart View (Acts / Macro zoom levels) ─────────────

function BarChartView({
  scenes,
  mode,
  projectId,
}: {
  scenes: TimelineScene[];
  mode: "acts" | "macro";
  projectId: string;
}) {
  const segments = useMemo(() => {
    const map = new Map<string, { label: string; count: number; colorIdx: number }>();
    let colorIdx = 0;
    for (const s of scenes) {
      const key = mode === "acts" ? `act-${s.act}` : `${s.act}-${s.macroScene}`;
      const label =
        mode === "acts"
          ? `Act ${s.act}: ${s.actTitle}`
          : s.macroScene || "(unnamed)";
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { label, count: scenes.length, colorIdx });
        colorIdx++;
      }
    }
    // Fix counts
    for (const seg of map.values()) {
      seg.count = 0;
    }
    for (const s of scenes) {
      const key = mode === "acts" ? `act-${s.act}` : `${s.act}-${s.macroScene}`;
      map.get(key)!.count++;
    }
    return Array.from(map.entries());
  }, [scenes, mode]);

  const total = scenes.length;

  return (
    <div className="space-y-4">
      {/* Bar */}
      <div className="flex h-10 rounded-lg overflow-hidden border">
        {segments.map(([key, seg]) => (
          <TooltipProvider key={key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${ACT_COLORS[seg.colorIdx % ACT_COLORS.length]} opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center`}
                  style={{ width: `${(seg.count / total) * 100}%` }}
                >
                  {seg.count >= 3 && (
                    <span className="text-white text-[11px] font-medium truncate px-1">
                      {seg.count}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{seg.label}</p>
                <p className="text-xs text-muted-foreground">
                  {seg.count} scenes
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {segments.map(([key, seg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className={`h-3 w-3 rounded-sm ${ACT_COLORS[seg.colorIdx % ACT_COLORS.length]}`}
            />
            <span className="text-xs text-muted-foreground">
              {seg.label} ({seg.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card View (Fit / Normal / Large zoom levels) ───────────

function CardView({
  scenes,
  zoom,
  projectId,
  holdingIds,
  onDrop,
  onMoveToHolding,
}: {
  scenes: TimelineScene[];
  zoom: "fit" | "normal" | "large";
  projectId: string;
  holdingIds: Set<string>;
  onDrop: (sceneId: string, targetIndex: number) => void;
  onMoveToHolding: (sceneId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const sizeClass = {
    fit: "w-[60px] h-[45px]",
    normal: "w-[120px] h-[90px]",
    large: "w-[200px] h-[150px]",
  }[zoom];

  const mainScenes = scenes.filter((s) => !holdingIds.has(s.id));

  // Group for divider rendering
  const withDividers = useMemo(() => {
    const items: {
      type: "scene" | "act-divider" | "macro-divider";
      scene?: TimelineScene;
      label?: string;
    }[] = [];
    for (let i = 0; i < mainScenes.length; i++) {
      const scene = mainScenes[i];
      const prev = i > 0 ? mainScenes[i - 1] : null;
      if (prev && prev.act !== scene.act) {
        items.push({
          type: "act-divider",
          label: `Act ${scene.act}`,
        });
      } else if (prev && prev.macroScene !== scene.macroScene) {
        items.push({ type: "macro-divider" });
      }
      items.push({ type: "scene", scene });
    }
    return items;
  }, [mainScenes]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(idx);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onDrop(id, idx);
    setDragId(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropIndex(null);
  };

  const thumbUrl = (scene: TimelineScene) => {
    const selected = scene.assets.find(
      (a) => a.selected && (a.assetType === "IMAGE" || a.assetType === "STORYBOARD"),
    );
    return selected?.thumbnailUrl ?? selected?.outputUrl ?? scene.keyframeUrl;
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5 items-start">
        {withDividers.map((item, i) => {
          if (item.type === "act-divider") {
            return (
              <div
                key={`ad-${i}`}
                className="flex flex-col items-center mx-1 self-stretch"
              >
                <div className="w-[3px] flex-1 bg-red-400 rounded-full" />
                <span className="text-[9px] text-red-400 font-medium mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            );
          }
          if (item.type === "macro-divider") {
            return (
              <div
                key={`md-${i}`}
                className="w-[1px] self-stretch bg-border/60 mx-0.5"
              />
            );
          }
          const scene = item.scene!;
          const sceneIdx = mainScenes.indexOf(scene);
          const url = thumbUrl(scene);
          const isDragging = dragId === scene.id;

          return (
            <Tooltip key={scene.id}>
              <TooltipTrigger asChild>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, scene.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, sceneIdx)}
                  onDrop={(e) => handleDrop(e, sceneIdx)}
                  className={`${sizeClass} rounded-md border overflow-hidden cursor-grab active:cursor-grabbing transition-all shrink-0 relative group ${
                    isDragging ? "opacity-40" : ""
                  } ${
                    dropIndex === sceneIdx
                      ? "ring-2 ring-primary"
                      : "hover:ring-1 hover:ring-primary/40"
                  }`}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={scene.sceneId}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="h-full w-full bg-muted/30 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {scene.sceneId}
                      </span>
                    </div>
                  )}
                  {zoom !== "fit" && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <p className="text-[10px] text-white font-mono truncate">
                        {scene.sceneId}
                      </p>
                      {zoom === "large" && (
                        <p className="text-[9px] text-white/70 truncate">
                          {scene.storyBeat}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Drag handle */}
                  <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-80 transition-opacity">
                    <GripVertical className="h-3 w-3 text-white drop-shadow" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[360px]">
                <div className="space-y-1">
                  <p className="font-mono font-semibold text-xs">
                    {scene.sceneId}
                  </p>
                  <p className="text-xs">{scene.storyBeat}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Act {scene.act}: {scene.actTitle}
                    {scene.macroScene && ` / ${scene.macroScene}`}
                  </p>
                  {scene.emotionalTone && (
                    <Badge variant="secondary" className="text-[10px]">
                      {scene.emotionalTone}
                    </Badge>
                  )}
                  {scene.sourceText && (
                    <p className="text-[10px] text-muted-foreground line-clamp-3 mt-1">
                      {scene.sourceText}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ─── Main Timeline Client ───────────────────────────────────

export function TimelineClient({
  projectId,
  projectName,
  scenes: initialScenes,
}: {
  projectId: string;
  projectName: string;
  scenes: TimelineScene[];
}) {
  const [zoom, setZoom] = useState<ZoomLevel>("normal");
  const [holdingIds, setHoldingIds] = useState<Set<string>>(new Set());
  const [scenes, setScenes] = useState(initialScenes);
  const [isPending, startTransition] = useTransition();

  const holdingScenes = scenes.filter((s) => holdingIds.has(s.id));
  const mainScenes = scenes.filter((s) => !holdingIds.has(s.id));

  const handleDrop = (sceneId: string, targetIndex: number) => {
    const sceneIdx = mainScenes.findIndex((s) => s.id === sceneId);
    if (sceneIdx === -1 || sceneIdx === targetIndex) return;

    const reordered = [...mainScenes];
    const [moved] = reordered.splice(sceneIdx, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic update
    setScenes([...reordered, ...holdingScenes]);
    startTransition(async () => {
      await updateSceneOrder(
        projectId,
        reordered.map((s) => s.id),
      );
    });
  };

  const moveToHolding = (sceneId: string) => {
    setHoldingIds((prev) => new Set([...prev, sceneId]));
  };

  const moveFromHolding = (sceneId: string) => {
    setHoldingIds((prev) => {
      const next = new Set(prev);
      next.delete(sceneId);
      return next;
    });
  };

  const handleHoldingDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveToHolding(id);
  };

  const handleMainDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id && holdingIds.has(id)) {
      moveFromHolding(id);
    }
  };

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
          <span className="text-foreground">Timeline</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground mt-1">
          {scenes.length} scenes &middot; drag to reorder
          {isPending && " (saving...)"}
        </p>
      </div>

      {scenes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1">
              No scenes to sequence
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Add scenes in the Production tab first, then come here to sequence
              them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-lg border overflow-hidden">
              {ZOOM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setZoom(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    zoom === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-2">
              {mainScenes.length} in timeline
              {holdingScenes.length > 0 &&
                `, ${holdingScenes.length} in holding`}
            </span>
          </div>

          {/* Main Timeline Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleMainDrop}
            className="min-h-[80px]"
          >
            {zoom === "acts" || zoom === "macro" ? (
              <BarChartView
                scenes={mainScenes}
                mode={zoom}
                projectId={projectId}
              />
            ) : (
              <CardView
                scenes={scenes}
                zoom={zoom}
                projectId={projectId}
                holdingIds={holdingIds}
                onDrop={handleDrop}
                onMoveToHolding={moveToHolding}
              />
            )}
          </div>

          {/* Holding Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleHoldingDrop}
            className={`min-h-[60px] rounded-lg border-2 border-dashed p-4 transition-colors ${
              holdingScenes.length > 0
                ? "border-amber-400/50 bg-amber-400/5"
                : "border-border/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                Holding Area
              </span>
              {holdingScenes.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {holdingScenes.length}
                </Badge>
              )}
            </div>
            {holdingScenes.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">
                Drag scenes here to temporarily remove them from the timeline.
              </p>
            ) : (
              <TooltipProvider>
                <div className="flex flex-wrap gap-1.5">
                  {holdingScenes.map((scene) => (
                    <Tooltip key={scene.id}>
                      <TooltipTrigger asChild>
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", scene.id);
                          }}
                          className="w-[80px] h-[60px] rounded-md border border-amber-400/40 bg-amber-400/10 overflow-hidden cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-amber-400/60 transition-all"
                        >
                          <div className="h-full w-full flex flex-col items-center justify-center">
                            <span className="text-[10px] font-mono font-medium">
                              {scene.sceneId}
                            </span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-full px-1">
                              {scene.storyBeat}
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Drag back to timeline to restore
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            )}
          </div>
        </>
      )}
    </div>
  );
}
