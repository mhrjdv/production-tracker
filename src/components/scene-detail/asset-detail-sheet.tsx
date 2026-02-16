"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { shouldSkipOptimization } from "@/lib/image-utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  ExternalLink,
  Copy,
  Trash2,
  Archive,
  ArchiveRestore,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  updateSceneAssetVersion,
  deleteSceneAssetVersion,
} from "@/lib/actions";
import { RightsDrawer } from "@/components/rights-drawer";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { AssetItem } from "./types";

// ─── Helpers ───────────────────────────────────────────────

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "SELECTED":
    case "FINAL":
      return "default";
    case "REJECTED":
      return "destructive";
    case "ARCHIVED":
      return "outline";
    default:
      return "secondary";
  }
}

function rightsBadgeColor(state: string): string {
  switch (state) {
    case "COMMERCIAL_ALLOWED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "NON_COMMERCIAL":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "RESTRICTED":
      return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400";
    default:
      return "";
  }
}

// ─── Props ─────────────────────────────────────────────────

interface AssetDetailSheetProps {
  asset: AssetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

// ─── Component ─────────────────────────────────────────────

export function AssetDetailSheet({
  asset,
  open,
  onOpenChange,
  onDeleted,
}: AssetDetailSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [rightsOpen, setRightsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  // Prefer thumbnail (800px WebP) for next/image — full-res originals (5-33MB)
  // cause TimeoutError in the image optimization proxy
  const imgSrc = asset.thumbnailUrl ?? asset.outputUrl;
  const isVideo = asset.assetType === "VIDEO";
  const isR2 = imgSrc?.includes("r2.dev") ?? false;

  const handleToggleSelected = () => {
    startTransition(async () => {
      await updateSceneAssetVersion(asset.id, {
        selected: !asset.selected,
      });
      onOpenChange(false);
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      await updateSceneAssetVersion(asset.id, { status: "ARCHIVED" });
      onOpenChange(false);
    });
  };

  const handleUnarchive = () => {
    startTransition(async () => {
      await updateSceneAssetVersion(asset.id, { status: "GENERATED" });
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSceneAssetVersion(asset.id);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    });
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(asset.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {asset.title ?? `${asset.platformLabel} v${asset.versionNumber}`}
              {asset.selected && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              )}
            </SheetTitle>
            <SheetDescription>
              {asset.assetType} &middot; {asset.platformLabel} &middot; v
              {asset.versionNumber}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-6">
            {/* Header badges */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{asset.platformLabel}</Badge>
              <Badge>{asset.assetType}</Badge>
              <Badge variant={statusBadgeVariant(asset.status)}>
                {asset.status}
              </Badge>
              <Badge
                variant="outline"
                className={rightsBadgeColor(asset.rightsState)}
              >
                {asset.rightsState}
              </Badge>
            </div>

            {/* Preview */}
            {imgSrc && (
              <div className="overflow-hidden rounded-lg border bg-muted/20">
                {isVideo ? (
                  <video
                    src={imgSrc}
                    controls
                    className="w-full max-h-80 object-contain"
                  />
                ) : (
                  <Image
                    src={imgSrc}
                    alt={`${asset.platformLabel} v${asset.versionNumber}`}
                    width={512}
                    height={320}
                    className="w-full max-h-80 object-contain"
                    sizes="(max-width: 512px) 100vw, 512px"
                    quality={80}
                    priority
                    unoptimized={shouldSkipOptimization(
                      imgSrc,
                      !!asset.thumbnailUrl,
                    )}
                  />
                )}
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Prompt
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs"
                  onClick={copyPrompt}
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3">
                {asset.prompt}
              </p>
            </div>

            {/* Negative prompt */}
            {asset.negativePrompt && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Negative Prompt
                </p>
                <p className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3">
                  {asset.negativePrompt}
                </p>
              </div>
            )}

            {/* Model, Source, Output links */}
            <div className="grid gap-2 text-sm">
              {asset.modelName && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-[60px]">
                    Model
                  </span>
                  <span>{asset.modelName}</span>
                </div>
              )}
              {asset.sourceUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-[60px]">
                    Source
                  </span>
                  <a
                    href={asset.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline truncate"
                  >
                    {asset.sourceUrl}{" "}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              {asset.outputUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-[60px]">
                    Output
                  </span>
                  <a
                    href={asset.outputUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline truncate"
                  >
                    {asset.outputUrl}{" "}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Tags */}
            {asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {asset.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Metadata (collapsible) */}
            {asset.metadata && Object.keys(asset.metadata).length > 0 && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setMetadataExpanded((v) => !v)}
                >
                  {metadataExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Metadata
                </button>
                {metadataExpanded && (
                  <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap rounded-md border bg-muted/30 p-2">
                    {JSON.stringify(asset.metadata, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Notes */}
            {asset.notes && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}

            {/* Cost & timing */}
            {(asset.costEstimateUsd !== null ||
              asset.generationSeconds !== null) && (
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {asset.costEstimateUsd !== null && (
                  <span>Cost: ${asset.costEstimateUsd.toFixed(3)}</span>
                )}
                {asset.generationSeconds !== null && (
                  <span>Gen: {asset.generationSeconds}s</span>
                )}
                {asset.queueWaitSeconds !== null && (
                  <span>Queue: {asset.queueWaitSeconds}s</span>
                )}
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={asset.selected ? "outline" : "default"}
                size="sm"
                className="gap-1.5"
                onClick={handleToggleSelected}
                disabled={isPending}
              >
                <Star
                  className={`h-3.5 w-3.5 ${asset.selected ? "fill-amber-400 text-amber-400" : ""}`}
                />
                {asset.selected ? "Deselect" : "Select as Winner"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setRightsOpen(true)}
              >
                <Shield className="h-3.5 w-3.5" />
                Rights
              </Button>
              {asset.status === "ARCHIVED" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleUnarchive}
                  disabled={isPending}
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Unarchive
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleArchive}
                  disabled={isPending}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete asset version?"
        description="This will permanently delete this asset version. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        disabled={isPending}
      />

      {/* Rights sub-drawer */}
      <RightsDrawer
        open={rightsOpen}
        onOpenChange={setRightsOpen}
        asset={
          asset
            ? {
                id: asset.id,
                platformKey: asset.platformKey,
                platformLabel: asset.platformLabel,
                rightsState: asset.rightsState,
                provenance: asset.provenance,
                modelName: asset.modelName,
                tags: asset.tags,
              }
            : null
        }
      />
    </>
  );
}
