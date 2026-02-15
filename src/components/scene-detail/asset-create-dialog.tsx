"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { normalizeTagList, parseMetadataInput } from "@/lib/scene-assets-utils";
import { createSceneAssetVersion } from "@/lib/actions";
import { ASSET_STATUSES, validateOptionalUrl } from "@/components/scene-assets/types";
import type { AssetItem, PlatformItem } from "./types";

// ─── Props ─────────────────────────────────────────────────

interface AssetCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sceneDbId: string;
  platforms: PlatformItem[];
  /** Pre-fill context from the lane/shot */
  defaultAssetType?: AssetItem["assetType"];
  defaultShotId?: string | null;
  defaultPrompt?: string;
}

// ─── Component ─────────────────────────────────────────────

export function AssetCreateDialog({
  open,
  onOpenChange,
  sceneDbId,
  platforms,
  defaultAssetType = "IMAGE",
  defaultShotId = null,
  defaultPrompt = "",
}: AssetCreateDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Primary fields
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [outputUrl, setOutputUrl] = useState("");
  const [status, setStatus] = useState<string>("GENERATED");

  // Advanced fields
  const [negativePrompt, setNegativePrompt] = useState("");
  const [modelName, setModelName] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [metadataInput, setMetadataInput] = useState("");

  // Reset form when dialog opens with new context
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setPrompt(defaultPrompt);
      setPlatformId(platforms[0]?.id ?? "");
      setOutputUrl("");
      setStatus("GENERATED");
      setNegativePrompt("");
      setModelName("");
      setTitle("");
      setTagsInput("");
      setThumbnailUrl("");
      setMetadataInput("");
      setFormError(null);
      setAdvancedOpen(false);
    }
    onOpenChange(next);
  };

  const selectedPlatform = platforms.find((p) => p.id === platformId);

  const handleSave = () => {
    if (!selectedPlatform || !prompt.trim()) return;

    startTransition(async () => {
      try {
        setFormError(null);
        const metadata = parseMetadataInput(metadataInput);
        const tags = normalizeTagList(tagsInput);
        const validatedOutput = validateOptionalUrl(outputUrl, "Output URL");
        const validatedThumb = validateOptionalUrl(thumbnailUrl, "Thumbnail URL");

        await createSceneAssetVersion(sceneDbId, {
          platformId: selectedPlatform.id,
          platformKey: selectedPlatform.slug,
          platformLabel: selectedPlatform.name,
          assetType: defaultAssetType,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || null,
          modelName: modelName.trim() || null,
          title: title.trim() || null,
          outputUrl: validatedOutput,
          thumbnailUrl: validatedThumb,
          status: status as "DRAFT" | "GENERATED",
          tags,
          metadata,
          selected: status === "SELECTED",
          // shotId is set server-side via the scene relationship;
          // the server action currently doesn't accept shotId directly
        });

        handleOpenChange(false);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to create asset",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New {defaultAssetType.toLowerCase()} version</DialogTitle>
          <DialogDescription>
            Add a new {defaultAssetType.toLowerCase()} asset to this shot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform */}
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={platformId} onValueChange={setPlatformId}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe what you generated..."
            />
          </div>

          {/* Output URL */}
          <div className="space-y-1.5">
            <Label>Output URL</Label>
            <Input
              value={outputUrl}
              onChange={(e) => setOutputUrl(e.target.value)}
              placeholder="https://cdn.../output.png"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Advanced
          </button>

          {advancedOpen && (
            <div className="space-y-3 rounded-md border border-border/50 p-3">
              <div className="space-y-1.5">
                <Label>Title (optional)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Descriptive title"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Negative Prompt</Label>
                <Textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={2}
                  placeholder="What to avoid..."
                />
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g. MJ-v7"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tags (comma sep.)</Label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="hero, approved"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Thumbnail URL</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://cdn.../thumb.jpg"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Metadata JSON</Label>
                <Textarea
                  value={metadataInput}
                  onChange={(e) => setMetadataInput(e.target.value)}
                  rows={2}
                  placeholder='{"durationSec": 6}'
                />
              </div>
            </div>
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!prompt.trim() || !selectedPlatform || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
