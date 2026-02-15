"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Film,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { DeleteDialog } from "@/components/delete-dialog";
import { createScene, deleteScene } from "@/lib/actions";

interface SceneItem {
  id: string;
  sceneId: string;
  sourceText: string;
  reason: string;
  act: number;
  actTitle: string;
  macroScene: string;
  storyBeat: string;
  narrativePurpose: string | null;
  emotionalTone: string | null;
  setting: Record<string, string> | null;
  camera: Record<string, string> | null;
  actions: string[];
  keyframeUrl: string | null;
  sortOrder: number;
  characterNames: string[];
  thumbnailUrl: string | null;
}

interface CharacterOption {
  id: string;
  name: string;
}

// ─── Inline Add Scene Form ──────────────────────────────────

function AddSceneInline({
  projectId,
  onCancel,
}: {
  projectId: string;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [sceneId, setSceneId] = useState("");
  const [storyBeat, setStoryBeat] = useState("");
  const [act, setAct] = useState("1");
  const [actTitle, setActTitle] = useState("");
  const [macroScene, setMacroScene] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [narrativePurpose, setNarrativePurpose] = useState("");
  const [emotionalTone, setEmotionalTone] = useState("");

  const save = () => {
    if (!sceneId.trim() || !storyBeat.trim()) return;
    startTransition(async () => {
      await createScene(projectId, {
        sceneId: sceneId.trim().toUpperCase(),
        act: parseInt(act) || 1,
        actTitle: actTitle.trim() || `Act ${act}`,
        storyBeat: storyBeat.trim(),
        macroScene: macroScene.trim() || "",
        sourceText: sourceText.trim() || "",
        reason: "",
        narrativePurpose: narrativePurpose.trim() || undefined,
        emotionalTone: emotionalTone.trim() || undefined,
      });
      onCancel();
    });
  };

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>New Scene</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={isPending || !sceneId.trim() || !storyBeat.trim()}
              className="gap-1"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Add
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Scene ID *
            </label>
            <Input
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              placeholder="S001"
              className="font-mono"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Story Beat *
            </label>
            <Input
              value={storyBeat}
              onChange={(e) => setStoryBeat(e.target.value)}
              placeholder="The opening chase sequence"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Act
            </label>
            <Input
              value={act}
              onChange={(e) => setAct(e.target.value)}
              type="number"
              min={1}
              className="w-20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Act Title
            </label>
            <Input
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              placeholder="The Setup"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Macro Scene
            </label>
            <Input
              value={macroScene}
              onChange={(e) => setMacroScene(e.target.value)}
              placeholder="e.g. City Chase"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Source Text
            </label>
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={3}
              placeholder="Script text..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Narrative Purpose
            </label>
            <Input
              value={narrativePurpose}
              onChange={(e) => setNarrativePurpose(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Emotional Tone
            </label>
            <Input
              value={emotionalTone}
              onChange={(e) => setEmotionalTone(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Scene Inline Detail ────────────────────────────────────

function SceneDetail({ scene }: { scene: SceneItem }) {
  const setting = scene.setting;
  const camera = scene.camera;

  return (
    <div className="px-4 py-3 bg-muted/30 border-t border-border/50 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
      {scene.narrativePurpose && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Narrative Purpose
          </p>
          <p className="text-sm">{scene.narrativePurpose}</p>
        </div>
      )}
      {scene.characterNames.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Characters
          </p>
          <div className="flex flex-wrap gap-1">
            {scene.characterNames.map((name) => (
              <Badge key={name} variant="secondary" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {scene.emotionalTone && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Emotional Tone
          </p>
          <Badge variant="outline" className="text-xs">
            {scene.emotionalTone}
          </Badge>
        </div>
      )}
      {setting && Object.keys(setting).length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Location / Setting
          </p>
          <p className="text-sm">
            {Object.values(setting).filter(Boolean).join(", ")}
          </p>
        </div>
      )}
      {scene.actions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Actions
          </p>
          <ul className="text-xs space-y-0.5">
            {scene.actions.slice(0, 3).map((a, i) => (
              <li key={i} className="text-muted-foreground">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      {camera && Object.keys(camera).length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Camera
          </p>
          <p className="text-sm">
            {Object.entries(camera)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" | ")}
          </p>
        </div>
      )}
      {scene.sourceText && (
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Source Text
          </p>
          <p className="text-xs text-muted-foreground line-clamp-3">
            {scene.sourceText}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Production Client ─────────────────────────────────

export function ProductionClient({
  projectId,
  projectName,
  scenes,
  characters = [],
}: {
  projectId: string;
  projectName: string;
  scenes: SceneItem[];
  characters?: CharacterOption[];
}) {
  const [adding, setAdding] = useState(false);
  const [delScene, setDelScene] = useState<SceneItem | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [characterFilter, setCharacterFilter] = useState("all");
  const [actFilter, setActFilter] = useState("all");
  const [storyBeatFilter, setStoryBeatFilter] = useState("all");

  // Expand state
  const [collapsedActs, setCollapsedActs] = useState<Set<number>>(new Set());
  const [collapsedMacros, setCollapsedMacros] = useState<Set<string>>(
    new Set(),
  );
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  // Derived filter options
  const actOptions = useMemo(() => {
    const acts = new Map<number, string>();
    for (const s of scenes) acts.set(s.act, s.actTitle);
    return Array.from(acts.entries()).sort(([a], [b]) => a - b);
  }, [scenes]);

  const storyBeatOptions = useMemo(() => {
    const beats = new Set<string>();
    for (const s of scenes) if (s.storyBeat) beats.add(s.storyBeat);
    return Array.from(beats).sort();
  }, [scenes]);

  // Filtered scenes
  const filtered = useMemo(() => {
    let result = scenes;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.sceneId.toLowerCase().includes(q) ||
          s.sourceText.toLowerCase().includes(q) ||
          s.macroScene.toLowerCase().includes(q) ||
          s.storyBeat.toLowerCase().includes(q) ||
          (s.narrativePurpose?.toLowerCase().includes(q) ?? false),
      );
    }
    if (characterFilter !== "all") {
      result = result.filter((s) => s.characterNames.includes(characterFilter));
    }
    if (actFilter !== "all") {
      const actNum = parseInt(actFilter);
      result = result.filter((s) => s.act === actNum);
    }
    if (storyBeatFilter !== "all") {
      result = result.filter((s) => s.storyBeat === storyBeatFilter);
    }
    return result;
  }, [scenes, search, characterFilter, actFilter, storyBeatFilter]);

  // Group filtered scenes: Act -> MacroScene -> Scenes
  const hierarchy = useMemo(() => {
    const actMap = new Map<
      number,
      {
        title: string;
        macros: Map<string, SceneItem[]>;
        allScenes: SceneItem[];
      }
    >();
    for (const scene of filtered) {
      let actGroup = actMap.get(scene.act);
      if (!actGroup) {
        actGroup = {
          title: scene.actTitle,
          macros: new Map(),
          allScenes: [],
        };
        actMap.set(scene.act, actGroup);
      }
      actGroup.allScenes.push(scene);
      const macroKey = scene.macroScene || "(No macro scene)";
      const macroScenes = actGroup.macros.get(macroKey);
      if (macroScenes) {
        macroScenes.push(scene);
      } else {
        actGroup.macros.set(macroKey, [scene]);
      }
    }
    return Array.from(actMap.entries()).sort(([a], [b]) => a - b);
  }, [filtered]);

  const toggleAct = (act: number) => {
    const next = new Set(collapsedActs);
    if (next.has(act)) next.delete(act);
    else next.add(act);
    setCollapsedActs(next);
  };

  const toggleMacro = (key: string) => {
    const next = new Set(collapsedMacros);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsedMacros(next);
  };

  const toggleScene = (id: string) => {
    const next = new Set(expandedScenes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedScenes(next);
  };

  const hasFilters =
    search || characterFilter !== "all" || actFilter !== "all" || storyBeatFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-foreground transition-colors"
            >
              {projectName}
            </Link>
            <span>/</span>
            <span className="text-foreground">Production</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Production</h1>
          <p className="text-muted-foreground mt-1">
            {scenes.length} scenes across{" "}
            {new Set(scenes.map((s) => s.act)).size} acts
            {hasFilters && ` (${filtered.length} shown)`}
          </p>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Scene
          </Button>
        )}
      </div>

      {/* Inline add form */}
      {adding && (
        <AddSceneInline
          projectId={projectId}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Filters */}
      {scenes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenes..."
              className="pl-9"
            />
          </div>
          {characters.length > 0 && (
            <Select value={characterFilter} onValueChange={setCharacterFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Character" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Characters</SelectItem>
                {characters.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {actOptions.length > 1 && (
            <Select value={actFilter} onValueChange={setActFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Act" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Acts</SelectItem>
                {actOptions.map(([num, title]) => (
                  <SelectItem key={num} value={num.toString()}>
                    Act {num}: {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {storyBeatOptions.length > 1 && (
            <Select value={storyBeatFilter} onValueChange={setStoryBeatFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Story Beat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Story Beats</SelectItem>
                {storyBeatOptions.slice(0, 30).map((beat) => (
                  <SelectItem key={beat} value={beat}>
                    {beat.length > 35 ? beat.slice(0, 35) + "..." : beat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCharacterFilter("all");
                setActFilter("all");
                setStoryBeatFilter("all");
              }}
              className="gap-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {scenes.length === 0 && !adding ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Film className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1">No scenes yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Start building your production by adding scenes.
            </p>
            <Button
              onClick={() => setAdding(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add First Scene
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 && hasFilters ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No scenes match your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Hierarchical Tree */
        <div className="space-y-3">
          {hierarchy.map(([actNum, actGroup]) => {
            const isActCollapsed = collapsedActs.has(actNum);
            const actKeyframeCount = actGroup.allScenes.filter(
              (s) => s.keyframeUrl || s.thumbnailUrl,
            ).length;
            const actPct =
              actGroup.allScenes.length > 0
                ? Math.round(
                    (actKeyframeCount / actGroup.allScenes.length) * 100,
                  )
                : 0;

            return (
              <div
                key={actNum}
                className="border rounded-lg bg-card overflow-hidden"
              >
                {/* Act Header */}
                <button
                  onClick={() => toggleAct(actNum)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  {isActCollapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <Badge variant="default" className="tabular-nums shrink-0">
                    Act {actNum}
                  </Badge>
                  <span className="font-semibold text-sm truncate">
                    {actGroup.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {actGroup.allScenes.length} scenes
                  </span>
                  <div className="flex-1 max-w-[120px] ml-auto">
                    <Progress value={actPct} className="h-1.5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {actPct}%
                  </span>
                </button>

                {!isActCollapsed && (
                  <div className="border-t">
                    {Array.from(actGroup.macros.entries()).map(
                      ([macroName, macroScenes]) => {
                        const macroKey = `${actNum}-${macroName}`;
                        const isMacroCollapsed = collapsedMacros.has(macroKey);

                        return (
                          <div key={macroKey}>
                            {/* Macro Header */}
                            <button
                              onClick={() => toggleMacro(macroKey)}
                              className="w-full flex items-center gap-3 px-4 pl-8 py-2 hover:bg-muted/30 transition-colors text-left border-b border-border/40"
                            >
                              {isMacroCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium text-muted-foreground">
                                {macroName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {macroScenes.length} scenes
                              </span>
                            </button>

                            {/* Scene Rows */}
                            {!isMacroCollapsed &&
                              macroScenes.map((scene) => {
                                const isExpanded = expandedScenes.has(scene.id);
                                return (
                                  <div
                                    key={scene.id}
                                    className="border-b border-border/30 last:border-b-0"
                                  >
                                    <div className="flex items-center gap-3 px-4 pl-14 py-2 hover:bg-muted/20 transition-colors group">
                                      <Link
                                        href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                                        className="shrink-0"
                                      >
                                        <Badge
                                          variant="outline"
                                          className="font-mono text-xs cursor-pointer hover:bg-primary/10"
                                        >
                                          {scene.sceneId}
                                        </Badge>
                                      </Link>
                                      <Link
                                        href={`/projects/${projectId}/scenes/${scene.sceneId}`}
                                        className="flex-1 min-w-0"
                                      >
                                        <p className="text-sm line-clamp-1 hover:text-primary transition-colors">
                                          {scene.storyBeat}
                                        </p>
                                      </Link>
                                      {scene.emotionalTone && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[11px] hidden md:inline-flex shrink-0"
                                        >
                                          {scene.emotionalTone}
                                        </Badge>
                                      )}
                                      {/* Keyframe thumbnail */}
                                      <div className="h-8 w-12 shrink-0 rounded border border-border/50 overflow-hidden bg-muted/30 hidden sm:flex items-center justify-center">
                                        {scene.thumbnailUrl ? (
                                          <img
                                            src={scene.thumbnailUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <ImageIcon className="h-3 w-3 text-muted-foreground/40" />
                                        )}
                                      </div>
                                      {/* Expand toggle */}
                                      <button
                                        onClick={() => toggleScene(scene.id)}
                                        className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                      </button>
                                      {/* Delete */}
                                      <button
                                        onClick={() => setDelScene(scene)}
                                        className="shrink-0 p-1 rounded hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                      </button>
                                    </div>
                                    {isExpanded && (
                                      <SceneDetail scene={scene} />
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {delScene && (
        <DeleteDialog
          open={!!delScene}
          onOpenChange={(v) => !v && setDelScene(null)}
          title={`Delete ${delScene.sceneId}?`}
          description={`This will permanently delete scene "${delScene.storyBeat}". This action cannot be undone.`}
          onDelete={async () => {
            await deleteScene(delScene.id);
            setDelScene(null);
          }}
        />
      )}
    </div>
  );
}
