"use client";

import { useState, useMemo, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  Film,
  ImageIcon,
  Minus,
  Music2,
  PlayCircle,
  Plus,
  ZoomIn,
} from "lucide-react";
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

// ─── Constants ──────────────────────────────────────────────

const TRACK_HEADER_W = 160;
const TRACK_HEIGHT = 52;
const RULER_HEIGHT = 32;
const MIN_CLIP_W = 60;
const MAX_CLIP_W = 300;
const CLIP_GAP = 3;

const ACT_COLORS = [
  { bg: "rgba(59,130,246,0.25)", border: "rgba(59,130,246,0.5)", text: "#60a5fa" },
  { bg: "rgba(16,185,129,0.25)", border: "rgba(16,185,129,0.5)", text: "#34d399" },
  { bg: "rgba(245,158,11,0.25)", border: "rgba(245,158,11,0.5)", text: "#fbbf24" },
  { bg: "rgba(244,63,94,0.25)", border: "rgba(244,63,94,0.5)", text: "#fb7185" },
  { bg: "rgba(139,92,246,0.25)", border: "rgba(139,92,246,0.5)", text: "#a78bfa" },
  { bg: "rgba(6,182,212,0.25)", border: "rgba(6,182,212,0.5)", text: "#22d3ee" },
];

const LANE_STYLES = {
  story: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.35)", label: "Story" },
  image: { bg: "rgba(34,211,238,0.10)", border: "rgba(34,211,238,0.35)", label: "V1 — Image" },
  video: { bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.35)", label: "V2 — Video" },
  audio: { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.35)", label: "A1 — Audio" },
} as const;

type LaneKey = keyof typeof LANE_STYLES;

// ─── Helpers ────────────────────────────────────────────────

function pickPreview(assets: AssetInfo[], types: string[]) {
  const selected = assets.find((a) => a.selected && types.includes(a.assetType));
  return selected ?? assets.find((a) => types.includes(a.assetType)) ?? null;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

// ─── Clip Component ─────────────────────────────────────────

function Clip({
  scene,
  width,
  lane,
  projectId,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  scene: TimelineScene;
  width: number;
  lane: LaneKey;
  projectId: string;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const style = LANE_STYLES[lane];

  const preview = useMemo(() => {
    if (lane === "image") return pickPreview(scene.assets, ["IMAGE", "STORYBOARD"]);
    if (lane === "video") return pickPreview(scene.assets, ["VIDEO"]);
    if (lane === "audio") return pickPreview(scene.assets, ["AUDIO", "MUSIC", "VOICE", "NARRATION"]);
    return null;
  }, [scene.assets, lane]);

  const thumbUrl = preview?.thumbnailUrl ?? preview?.outputUrl ?? (lane === "image" ? scene.keyframeUrl : null);
  const hasContent = lane === "story" || preview !== null || (lane === "image" && scene.keyframeUrl);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            draggable={lane === "story"}
            onDragStart={lane === "story" ? onDragStart : undefined}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={`shrink-0 rounded-[3px] overflow-hidden transition-all select-none ${
              lane === "story" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            } ${isDragging ? "opacity-30 scale-95" : ""} ${
              isDropTarget ? "ring-2 ring-sky-400" : ""
            }`}
            style={{
              width,
              height: TRACK_HEIGHT - 8,
              background: hasContent ? style.bg : "transparent",
              border: hasContent ? `1px solid ${style.border}` : "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            {lane === "story" ? (
              <Link
                href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                className="flex flex-col justify-center h-full px-2 hover:brightness-125 transition-all"
                draggable={false}
              >
                <span className="text-[11px] font-mono font-semibold text-foreground/90 truncate leading-tight">
                  {scene.sceneId}
                </span>
                <span className="text-[10px] text-muted-foreground truncate leading-tight">
                  {scene.storyBeat}
                </span>
              </Link>
            ) : hasContent ? (
              <Link
                href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                className="flex items-center gap-1.5 h-full px-1.5 hover:brightness-125 transition-all"
                draggable={false}
              >
                {thumbUrl && (lane === "image" || lane === "video") ? (
                  <img
                    src={thumbUrl}
                    alt=""
                    className="h-[34px] w-[50px] rounded-[2px] object-cover shrink-0"
                    draggable={false}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-foreground/80 truncate">
                    {preview
                      ? `${preview.platformLabel} v${preview.versionNumber}`
                      : scene.sceneId}
                  </p>
                  {preview?.selected && (
                    <span className="text-[9px] text-emerald-400 font-medium">
                      selected
                    </span>
                  )}
                </div>
              </Link>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[360px] text-xs">
          <p className="font-mono font-bold">{scene.sceneId}</p>
          <p>{scene.storyBeat}</p>
          <p className="text-muted-foreground mt-1">
            Act {scene.act}: {scene.actTitle}
            {scene.macroScene ? ` / ${scene.macroScene}` : ""}
          </p>
          {scene.emotionalTone && (
            <Badge variant="secondary" className="text-[10px] mt-1">
              {scene.emotionalTone}
            </Badge>
          )}
          {scene.sourceText && (
            <p className="text-[10px] text-muted-foreground line-clamp-3 mt-1">
              {scene.sourceText}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Track Header ───────────────────────────────────────────

function TrackHeader({
  icon: Icon,
  label,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  muted?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 border-r border-b border-border/40 px-3 bg-muted/20"
      style={{ width: TRACK_HEADER_W, height: TRACK_HEIGHT }}
    >
      <Icon className={`h-3.5 w-3.5 ${muted ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
      <span className={`text-[11px] font-medium ${muted ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Ruler ──────────────────────────────────────────────────

function Ruler({
  scenes,
  clipWidth,
}: {
  scenes: TimelineScene[];
  clipWidth: number;
}) {
  // Build ruler with act markers
  let prevAct = -1;
  const markers: { idx: number; label: string; isAct: boolean }[] = [];
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].act !== prevAct) {
      markers.push({ idx: i, label: `Act ${scenes[i].act}`, isAct: true });
      prevAct = scenes[i].act;
    }
  }

  return (
    <div className="flex" style={{ height: RULER_HEIGHT }}>
      {/* Header spacer */}
      <div
        className="shrink-0 border-r border-b border-border/40 bg-muted/30 flex items-end px-3"
        style={{ width: TRACK_HEADER_W, height: RULER_HEIGHT }}
      >
        <span className="text-[10px] text-muted-foreground/60 pb-1 font-mono">
          SCENE
        </span>
      </div>
      {/* Ruler ticks */}
      <div className="flex items-end border-b border-border/40 bg-muted/10 relative">
        {scenes.map((scene, i) => {
          const isActStart = markers.some((m) => m.idx === i);
          const actColor = ACT_COLORS[(scene.act - 1) % ACT_COLORS.length];
          return (
            <div
              key={scene.id}
              className="shrink-0 flex flex-col items-center justify-end relative"
              style={{ width: clipWidth + CLIP_GAP }}
            >
              {/* Act divider line */}
              {isActStart && i > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2px] z-10"
                  style={{ background: actColor.text }}
                />
              )}
              {/* Act label */}
              {isActStart && (
                <span
                  className="text-[9px] font-bold absolute top-0.5 left-1 whitespace-nowrap"
                  style={{ color: actColor.text }}
                >
                  Act {scene.act}
                </span>
              )}
              {/* Scene tick */}
              <span className="text-[9px] text-muted-foreground/50 font-mono pb-0.5">
                {scene.sceneId}
              </span>
              <div className="h-[6px] w-[1px] bg-border/40" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Track Lane ─────────────────────────────────────────────

function TrackLane({
  scenes,
  lane,
  clipWidth,
  projectId,
  dragId,
  dropIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  scenes: TimelineScene[];
  lane: LaneKey;
  clipWidth: number;
  projectId: string;
  dragId: string | null;
  dropIndex: number | null;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="flex" style={{ height: TRACK_HEIGHT }}>
      <div className="flex items-center gap-1 px-2 border-b border-border/30">
        {scenes.map((scene, i) => {
          const actColor = ACT_COLORS[(scene.act - 1) % ACT_COLORS.length];
          const isActStart = i > 0 && scenes[i - 1].act !== scene.act;

          return (
            <div key={scene.id} className="flex items-center shrink-0" style={{ marginLeft: isActStart ? 2 : 0 }}>
              {/* Act divider in track */}
              {isActStart && (
                <div
                  className="shrink-0 mr-1 self-stretch"
                  style={{ width: 2, background: actColor.text, opacity: 0.4 }}
                />
              )}
              <Clip
                scene={scene}
                width={clipWidth}
                lane={lane}
                projectId={projectId}
                isDragging={dragId === scene.id}
                isDropTarget={dropIndex === i}
                onDragStart={(e) => onDragStart(scene.id, e)}
                onDragOver={(e) => onDragOver(i, e)}
                onDrop={(e) => onDrop(i, e)}
                onDragEnd={onDragEnd}
              />
            </div>
          );
        })}
      </div>
    </div>
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
  const [scenes, setScenes] = useState(initialScenes);
  const [holdingIds, setHoldingIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [clipWidth, setClipWidth] = useState(140);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const mainScenes = useMemo(
    () => scenes.filter((s) => !holdingIds.has(s.id)),
    [scenes, holdingIds],
  );
  const holdingScenes = useMemo(
    () => scenes.filter((s) => holdingIds.has(s.id)),
    [scenes, holdingIds],
  );

  // Asset counts for header badges
  const counts = useMemo(() => {
    let images = 0, videos = 0, audio = 0, selected = 0;
    for (const s of mainScenes) {
      for (const a of s.assets) {
        if (a.selected) selected++;
        if (a.assetType === "IMAGE" || a.assetType === "STORYBOARD") images++;
        if (a.assetType === "VIDEO") videos++;
        if (["AUDIO", "MUSIC", "VOICE", "NARRATION"].includes(a.assetType)) audio++;
      }
    }
    return { images, videos, audio, selected };
  }, [mainScenes]);

  const totalTrackWidth = mainScenes.length * (clipWidth + CLIP_GAP) + 40;

  // ─── Drag handlers ─────────────────────────────────────

  const handleDragStart = useCallback((id: string, e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(idx);
  }, []);

  const handleDrop = useCallback(
    (idx: number, e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;

      // If coming from holding area
      if (holdingIds.has(id)) {
        setHoldingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setDragId(null);
        setDropIndex(null);
        return;
      }

      const fromIdx = mainScenes.findIndex((s) => s.id === id);
      if (fromIdx === -1 || fromIdx === idx) {
        setDragId(null);
        setDropIndex(null);
        return;
      }

      const reordered = [...mainScenes];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(idx, 0, moved);

      setScenes([...reordered, ...holdingScenes]);
      startTransition(async () => {
        await updateSceneOrder(
          projectId,
          reordered.map((s) => s.id),
        );
      });
      setDragId(null);
      setDropIndex(null);
    },
    [mainScenes, holdingScenes, holdingIds, projectId, startTransition],
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropIndex(null);
  }, []);

  const handleHoldingDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (id && !holdingIds.has(id)) {
        setHoldingIds((prev) => new Set([...prev, id]));
      }
      setDragId(null);
      setDropIndex(null);
    },
    [holdingIds],
  );

  // ─── Zoom ──────────────────────────────────────────────

  const zoomIn = () => setClipWidth((w) => clamp(w + 20, MIN_CLIP_W, MAX_CLIP_W));
  const zoomOut = () => setClipWidth((w) => clamp(w - 20, MIN_CLIP_W, MAX_CLIP_W));

  const lanes: { key: LaneKey; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "story", icon: Film },
    { key: "image", icon: ImageIcon },
    { key: "video", icon: PlayCircle },
    { key: "audio", icon: Music2 },
  ];

  return (
    <div className="space-y-4">
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
          {mainScenes.length} scenes &middot; drag clips on Story lane to reorder
          {isPending && " &middot; saving..."}
        </p>
      </div>

      {scenes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1">No scenes to sequence</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Add scenes in the Production tab first, then come here to sequence them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-4 px-1">
            {/* Zoom slider */}
            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="p-1 rounded hover:bg-muted transition-colors">
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <Slider
                value={[clipWidth]}
                onValueChange={([v]) => setClipWidth(v)}
                min={MIN_CLIP_W}
                max={MAX_CLIP_W}
                step={10}
                className="w-[120px]"
              />
              <button onClick={zoomIn} className="p-1 rounded hover:bg-muted transition-colors">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <span className="text-[10px] text-muted-foreground/60 font-mono ml-1">
                {clipWidth}px
              </span>
            </div>

            <div className="h-4 w-px bg-border/40" />

            {/* Stats badges */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <ImageIcon className="h-3 w-3" /> {counts.images}
              </Badge>
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <PlayCircle className="h-3 w-3" /> {counts.videos}
              </Badge>
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <Music2 className="h-3 w-3" /> {counts.audio}
              </Badge>
              {counts.selected > 0 && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  {counts.selected} selected
                </Badge>
              )}
            </div>
          </div>

          {/* NLE Timeline Panel */}
          <div className="rounded-lg border border-border/60 overflow-hidden bg-[hsl(var(--card))]">
            <ScrollArea className="w-full">
              <div style={{ minWidth: totalTrackWidth + TRACK_HEADER_W }}>
                {/* Ruler */}
                <Ruler scenes={mainScenes} clipWidth={clipWidth} />

                {/* Track Lanes */}
                {lanes.map(({ key, icon }) => (
                  <div key={key} className="flex">
                    <TrackHeader icon={icon} label={LANE_STYLES[key].label} />
                    <TrackLane
                      scenes={mainScenes}
                      lane={key}
                      clipWidth={clipWidth}
                      projectId={projectId}
                      dragId={dragId}
                      dropIndex={dropIndex}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Holding Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleHoldingDrop}
            className={`min-h-[56px] rounded-lg border-2 border-dashed p-3 transition-colors ${
              holdingScenes.length > 0
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-border/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Holding Area
              </span>
              {holdingScenes.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {holdingScenes.length}
                </Badge>
              )}
            </div>
            {holdingScenes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/50">
                Drag clips here to park them off the timeline.
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
                            setDragId(scene.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", scene.id);
                          }}
                          onDragEnd={handleDragEnd}
                          className="h-10 rounded-[3px] border border-amber-500/30 bg-amber-500/10 px-2 flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:border-amber-500/60 transition-colors"
                          style={{ width: Math.max(80, clipWidth * 0.6) }}
                        >
                          <span className="text-[10px] font-mono font-medium truncate">
                            {scene.sceneId}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate">
                            {scene.storyBeat}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Drag back to timeline to restore</p>
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
