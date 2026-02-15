"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, Eye, Film, MapPin, Users } from "lucide-react";
import { updateScene } from "@/lib/actions";
import { updateSceneCharacters } from "@/lib/actions/scene-character-actions";
import { EditableCard } from "./editable-card";
import { KeyValueEditor } from "./key-value-editor";
import { StringListEditor } from "./string-list-editor";
import type { SceneDetailData, CharacterItem } from "./types";

interface ScriptTabProps {
  scene: SceneDetailData;
  projectCharacters: CharacterItem[];
  sceneCharacterIds: string[];
}

export function ScriptTab({
  scene,
  projectCharacters,
  sceneCharacterIds,
}: ScriptTabProps) {
  return (
    <div className="space-y-6">
      {/* Script Text: always expanded by default */}
      <ScriptTextCard scene={scene} />

      {/* Remaining cards in collapsible sections */}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none py-1">
          Narrative Purpose
        </summary>
        <div className="mt-2">
          <NarrativePurposeCard scene={scene} />
        </div>
      </details>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none py-1">
          Setting & Camera
        </summary>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <SettingCard scene={scene} />
          <CameraCard scene={scene} />
        </div>
      </details>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none py-1">
          Actions
        </summary>
        <div className="mt-2">
          <ActionsCard scene={scene} />
        </div>
      </details>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none py-1">
          Visual Motifs & Constraints
        </summary>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <VisualMotifsCard scene={scene} />
          <ConstraintsCard scene={scene} />
        </div>
      </details>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none py-1">
          Characters & Keyframe
        </summary>
        <div className="mt-2 space-y-4">
          <CharactersPresentCard
            scene={scene}
            projectCharacters={projectCharacters}
            sceneCharacterIds={sceneCharacterIds}
          />
          <KeyframeCard scene={scene} />
        </div>
      </details>
    </div>
  );
}

// ─── Script Text ──────────────────────────────────────────────

function ScriptTextCard({ scene }: { scene: SceneDetailData }) {
  const [sourceText, setSourceText] = useState(scene.sourceText);
  const [reason, setReason] = useState(scene.reason);

  return (
    <EditableCard
      title="Script Text"
      icon={<Film className="h-4 w-4" />}
      onSave={async () => {
        await updateScene(scene.id, {
          sourceText: sourceText.trim(),
          reason: reason.trim(),
        });
      }}
      editContent={(reset) => (
        <div className="space-y-3">
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="text-sm min-h-[120px]"
            placeholder="Script text..."
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs"
            placeholder="Reason for this scene..."
          />
        </div>
      )}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {scene.sourceText}
      </p>
      {scene.reason && (
        <p className="text-xs text-muted-foreground mt-3 italic">
          Reason: {scene.reason}
        </p>
      )}
    </EditableCard>
  );
}

// ─── Narrative Purpose ────────────────────────────────────────

function NarrativePurposeCard({ scene }: { scene: SceneDetailData }) {
  const [narrativePurpose, setNarrativePurpose] = useState(
    scene.narrativePurpose ?? "",
  );

  return (
    <EditableCard
      title="Narrative Purpose"
      icon={<Eye className="h-4 w-4" />}
      isEmpty={!scene.narrativePurpose}
      onSave={async () => {
        await updateScene(scene.id, {
          narrativePurpose: narrativePurpose.trim() || undefined,
        });
      }}
      editContent={() => (
        <Textarea
          value={narrativePurpose}
          onChange={(e) => setNarrativePurpose(e.target.value)}
          className="text-sm"
          placeholder="What narrative purpose does this scene serve?"
        />
      )}
    >
      <p className="text-sm leading-relaxed">{scene.narrativePurpose}</p>
    </EditableCard>
  );
}

// ─── Setting ──────────────────────────────────────────────────

function SettingCard({ scene }: { scene: SceneDetailData }) {
  const [setting, setSetting] = useState<Record<string, string>>(
    scene.setting ?? {},
  );

  return (
    <EditableCard
      title="Setting"
      icon={<MapPin className="h-4 w-4" />}
      isEmpty={!scene.setting}
      onSave={async () => {
        const hasEntries = Object.keys(setting).length > 0;
        await updateScene(scene.id, {
          setting: hasEntries ? setting : null,
        });
      }}
      editContent={() => (
        <KeyValueEditor value={setting} onChange={setSetting} />
      )}
    >
      <div className="space-y-2">
        {scene.setting &&
          Object.entries(scene.setting).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="text-xs text-muted-foreground capitalize min-w-[80px]">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="text-sm">{val}</span>
            </div>
          ))}
      </div>
    </EditableCard>
  );
}

// ─── Camera Intent ────────────────────────────────────────────

function CameraCard({ scene }: { scene: SceneDetailData }) {
  const [camera, setCamera] = useState<Record<string, string>>(
    scene.camera ?? {},
  );

  return (
    <EditableCard
      title="Camera Intent"
      icon={<Camera className="h-4 w-4" />}
      isEmpty={!scene.camera}
      onSave={async () => {
        const hasEntries = Object.keys(camera).length > 0;
        await updateScene(scene.id, {
          camera: hasEntries ? camera : null,
        });
      }}
      editContent={() => <KeyValueEditor value={camera} onChange={setCamera} />}
    >
      <div className="space-y-2">
        {scene.camera &&
          Object.entries(scene.camera).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="text-xs text-muted-foreground capitalize min-w-[80px]">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="text-sm">{val}</span>
            </div>
          ))}
      </div>
    </EditableCard>
  );
}

// ─── Actions ──────────────────────────────────────────────────

function ActionsCard({ scene }: { scene: SceneDetailData }) {
  const [actions, setActions] = useState<string[]>(scene.actions);

  return (
    <EditableCard
      title="Actions"
      isEmpty={scene.actions.length === 0}
      onSave={async () => {
        await updateScene(scene.id, {
          actions: actions.filter((a) => a.trim()),
        });
      }}
      editContent={() => (
        <StringListEditor
          value={actions}
          onChange={setActions}
          placeholder="Add action..."
        />
      )}
    >
      <ul className="space-y-2">
        {scene.actions.map((action, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className="text-muted-foreground shrink-0">&bull;</span>
            {action}
          </li>
        ))}
      </ul>
    </EditableCard>
  );
}

// ─── Visual Motifs ────────────────────────────────────────────

function VisualMotifsCard({ scene }: { scene: SceneDetailData }) {
  const [motifs, setMotifs] = useState<string[]>(scene.visualMotifs);

  return (
    <EditableCard
      title="Visual Motifs"
      isEmpty={scene.visualMotifs.length === 0}
      onSave={async () => {
        await updateScene(scene.id, {
          visualMotifs: motifs.filter((m) => m.trim()),
        });
      }}
      editContent={() => (
        <StringListEditor
          value={motifs}
          onChange={setMotifs}
          placeholder="Add motif..."
        />
      )}
    >
      <div className="flex flex-wrap gap-2">
        {scene.visualMotifs.map((motif, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {motif}
          </Badge>
        ))}
      </div>
    </EditableCard>
  );
}

// ─── Constraints ──────────────────────────────────────────────

function ConstraintsCard({ scene }: { scene: SceneDetailData }) {
  const [constraints, setConstraints] = useState<string[]>(scene.constraints);

  return (
    <EditableCard
      title="Constraints"
      isEmpty={scene.constraints.length === 0}
      onSave={async () => {
        await updateScene(scene.id, {
          constraints: constraints.filter((c) => c.trim()),
        });
      }}
      editContent={() => (
        <StringListEditor
          value={constraints}
          onChange={setConstraints}
          placeholder="Add constraint..."
        />
      )}
    >
      <ul className="space-y-1">
        {scene.constraints.map((constraint, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="shrink-0">{"\u26A0"}</span>
            {constraint}
          </li>
        ))}
      </ul>
    </EditableCard>
  );
}

// ─── Characters Present ───────────────────────────────────────

function CharactersPresentCard({
  scene,
  projectCharacters,
  sceneCharacterIds,
}: {
  scene: SceneDetailData;
  projectCharacters: CharacterItem[];
  sceneCharacterIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(sceneCharacterIds);
  const [isPending, startTransition] = useTransition();

  const toggleCharacter = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const assignedCharacters = projectCharacters.filter((c) =>
    sceneCharacterIds.includes(c.id),
  );

  return (
    <EditableCard
      title="Characters Present"
      icon={<Users className="h-4 w-4" />}
      isEmpty={sceneCharacterIds.length === 0 && projectCharacters.length === 0}
      onSave={async () => {
        startTransition(async () => {
          await updateSceneCharacters(scene.id, selectedIds);
        });
      }}
      editContent={() => (
        <div className="space-y-2">
          {projectCharacters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No characters in this project yet. Add characters in the
              Characters tab.
            </p>
          ) : (
            projectCharacters.map((char) => {
              const isSelected = selectedIds.includes(char.id);
              return (
                <button
                  key={char.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleCharacter(char.id)}
                  className={`flex items-center gap-3 w-full rounded-lg border p-2.5 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {char.portraitUrl ? (
                      <Image
                        src={char.portraitUrl}
                        alt={char.name}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                        sizes="32px"
                        quality={60}
                      />
                    ) : (
                      <span className="text-xs font-medium text-primary">
                        {char.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{char.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {char.role}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    >
      {assignedCharacters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {assignedCharacters.map((char) => (
            <Badge
              key={char.id}
              variant="outline"
              className="text-sm gap-1.5 py-1"
            >
              <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {char.portraitUrl ? (
                  <Image
                    src={char.portraitUrl}
                    alt={char.name}
                    width={16}
                    height={16}
                    className="h-full w-full object-cover"
                    sizes="16px"
                    quality={50}
                  />
                ) : (
                  <span className="text-[8px] font-medium text-primary">
                    {char.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              {char.name}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {scene.charactersPresent.map((name, i) => (
            <Badge key={i} variant="secondary" className="text-sm">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </EditableCard>
  );
}

// ─── Keyframe ─────────────────────────────────────────────────

function KeyframeCard({ scene }: { scene: SceneDetailData }) {
  const [keyframeUrl, setKeyframeUrl] = useState(scene.keyframeUrl ?? "");

  return (
    <EditableCard
      title="Keyframe"
      isEmpty={!scene.keyframeUrl}
      onSave={async () => {
        await updateScene(scene.id, {
          keyframeUrl: keyframeUrl.trim() || null,
        });
      }}
      editContent={() => (
        <Input
          type="url"
          value={keyframeUrl}
          onChange={(e) => setKeyframeUrl(e.target.value)}
          className="text-sm"
          placeholder="https://example.com/keyframe.png"
        />
      )}
    >
      <div className="rounded-lg overflow-hidden border relative aspect-video">
        <Image
          src={scene.keyframeUrl!}
          alt={`Keyframe for ${scene.sceneId}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          quality={80}
        />
      </div>
    </EditableCard>
  );
}
