"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { updateScene, deleteScene } from "@/lib/actions";
import { DeleteDialog } from "@/components/delete-dialog";
import type { SceneDetailData, SceneNavItem } from "./types";

interface SceneHeaderProps {
  projectId: string;
  projectName: string;
  scene: SceneDetailData;
  prev: SceneNavItem | null;
  next: SceneNavItem | null;
}

export function SceneHeader({
  projectId,
  projectName,
  scene,
  prev,
  next,
}: SceneHeaderProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [storyBeat, setStoryBeat] = useState(scene.storyBeat);
  const [macroScene, setMacroScene] = useState(scene.macroScene);
  const [actTitle, setActTitle] = useState(scene.actTitle);
  const [emotionalTone, setEmotionalTone] = useState(
    scene.emotionalTone ?? "",
  );

  const cancelEditing = () => {
    setStoryBeat(scene.storyBeat);
    setMacroScene(scene.macroScene);
    setActTitle(scene.actTitle);
    setEmotionalTone(scene.emotionalTone ?? "");
    setEditing(false);
  };

  const saveChanges = () => {
    startTransition(async () => {
      await updateScene(scene.id, {
        storyBeat: storyBeat.trim(),
        macroScene: macroScene.trim(),
        actTitle: actTitle.trim(),
        emotionalTone: emotionalTone.trim() || undefined,
      });
      setEditing(false);
    });
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-foreground transition-colors"
        >
          {projectName}
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}/production`}
          className="hover:text-foreground transition-colors"
        >
          Production
        </Link>
        <span>/</span>
        <span className="text-foreground">{scene.sceneId}</span>
      </div>

      {/* Header row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono">
              {scene.sceneId}
            </Badge>
            <Badge variant="secondary">Act {scene.act}</Badge>
            {editing ? (
              <Input
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                className="h-7 w-40 text-xs"
                placeholder="Act title"
              />
            ) : (
              <Badge>{scene.actTitle}</Badge>
            )}
            {editing ? (
              <Input
                value={emotionalTone}
                onChange={(e) => setEmotionalTone(e.target.value)}
                className="h-7 w-36 text-xs"
                placeholder="Emotional tone"
              />
            ) : (
              scene.emotionalTone && (
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary"
                >
                  {scene.emotionalTone}
                </Badge>
              )
            )}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveChanges}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <Input
            value={storyBeat}
            onChange={(e) => setStoryBeat(e.target.value)}
            className="text-2xl font-bold h-auto py-1 px-2 -ml-2"
            placeholder="Story Beat"
          />
        ) : (
          <h1 className="text-2xl font-bold tracking-tight">
            {scene.storyBeat}
          </h1>
        )}
        {editing ? (
          <Input
            value={macroScene}
            onChange={(e) => setMacroScene(e.target.value)}
            className="text-sm text-muted-foreground h-auto py-1 px-2 -ml-2"
            placeholder="Macro Scene"
          />
        ) : (
          <p className="text-muted-foreground">{scene.macroScene}</p>
        )}
      </div>

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between">
        {prev ? (
          <Link href={`/projects/${projectId}/scenes/${prev.sceneId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{prev.sceneId} ·</span>{" "}
              <span className="max-w-[200px] truncate">{prev.storyBeat}</span>
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link href={`/projects/${projectId}/scenes/${next.sceneId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <span className="max-w-[200px] truncate">{next.storyBeat}</span>{" "}
              <span className="hidden sm:inline">· {next.sceneId}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>

      <Separator />

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${scene.sceneId}?`}
        description={`This will permanently delete scene "${scene.storyBeat}". This action cannot be undone.`}
        onDelete={async () => {
          await deleteScene(scene.id);
          router.push(`/projects/${projectId}/production`);
        }}
      />
    </div>
  );
}
