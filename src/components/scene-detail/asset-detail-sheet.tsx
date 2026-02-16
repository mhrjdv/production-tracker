"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { shouldSkipOptimization } from "@/lib/image-utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  ExternalLink,
  Copy,
  Trash2,
  Archive,
  ArchiveRestore,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ClipboardCopy,
  ImageOff,
  Loader2,
  X,
} from "lucide-react";
import {
  updateSceneAssetVersion,
  deleteSceneAssetVersion,
} from "@/lib/actions";
import { RightsDrawer } from "@/components/rights-drawer";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ASSET_STATUSES,
  validateOptionalUrl,
} from "@/components/scene-assets/types";
import { normalizeTagList } from "@/lib/scene-assets-utils";
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

function parseOptionalNumber(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ─── Edit Form State ────────────────────────────────────────

interface EditFormState {
  title: string;
  prompt: string;
  negativePrompt: string;
  modelName: string;
  sourceUrl: string;
  outputUrl: string;
  thumbnailUrl: string;
  tags: string;
  notes: string;
  status: string;
  costEstimateUsd: string;
  generationSeconds: string;
  queueWaitSeconds: string;
}

function initEditForm(asset: AssetItem): EditFormState {
  return {
    title: asset.title ?? "",
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt ?? "",
    modelName: asset.modelName ?? "",
    sourceUrl: asset.sourceUrl ?? "",
    outputUrl: asset.outputUrl ?? "",
    thumbnailUrl: asset.thumbnailUrl ?? "",
    tags: asset.tags.join(", "),
    notes: asset.notes ?? "",
    status: asset.status,
    costEstimateUsd: asset.costEstimateUsd?.toString() ?? "",
    generationSeconds: asset.generationSeconds?.toString() ?? "",
    queueWaitSeconds: asset.queueWaitSeconds?.toString() ?? "",
  };
}

// ─── Props ─────────────────────────────────────────────────

interface AssetDetailSheetProps {
  asset: AssetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

// ─── Component ─────────────────────────────────────────────

export function AssetDetailSheet({
  asset,
  open,
  onOpenChange,
  onDeleted,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: AssetDetailSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [rightsOpen, setRightsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [copyingImage, setCopyingImage] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");

  const [imgLoading, setImgLoading] = useState(true);
  // Track whether full-res image is ready (for progressive loading)
  const [fullReady, setFullReady] = useState(false);

  // Reset local state when navigating between assets
  const assetId = asset?.id ?? null;
  useEffect(() => {
    setImgError(false);
    setImgLoading(true);
    setFullReady(false);
    setIsEditing(false);
    setEditForm(null);
    setEditError(null);
    setMetadataExpanded(false);
    setCopied(false);
  }, [assetId]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  const resetOnClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setIsEditing(false);
        setEditForm(null);
        setEditError(null);
        setImgError(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  // Preload full-res image in background when we have a thumbnail to show first
  const thumbnailSrc = asset?.thumbnailUrl ?? null;
  const outputSrc = asset?.outputUrl ?? null;
  useEffect(() => {
    if (!thumbnailSrc || !outputSrc || thumbnailSrc === outputSrc) return;
    setFullReady(false);
    const img = new window.Image();
    img.onload = () => setFullReady(true);
    img.src = outputSrc;
    return () => {
      img.onload = null;
    };
  }, [thumbnailSrc, outputSrc]);

  if (!asset) return null;

  // Show thumbnail first (fast, browser-cached from gallery grid), upgrade to full when ready
  const hasThumb = !!asset.thumbnailUrl;
  const hasFull = !!asset.outputUrl && asset.outputUrl !== asset.thumbnailUrl;
  const imgSrc = hasThumb
    ? fullReady && hasFull
      ? asset.outputUrl!
      : asset.thumbnailUrl!
    : asset.outputUrl;
  const isVideo = asset.assetType === "VIDEO";

  const handleToggleSelected = () => {
    startTransition(async () => {
      await updateSceneAssetVersion(asset.id, {
        selected: !asset.selected,
      });
      resetOnClose(false);
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      await updateSceneAssetVersion(asset.id, { status: "ARCHIVED" });
      resetOnClose(false);
    });
  };

  const handleUnarchive = () => {
    startTransition(async () => {
      await updateSceneAssetVersion(asset.id, { status: "GENERATED" });
      resetOnClose(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSceneAssetVersion(asset.id);
      setDeleteOpen(false);
      onDeleted?.();
      resetOnClose(false);
    });
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(asset.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyImageToClipboard = async () => {
    // Prefer outputUrl (full quality), fall back to thumbnailUrl
    const url = asset.outputUrl ?? asset.thumbnailUrl;
    if (!url) return;

    setCopyingImage("loading");
    try {
      // Fetch via our proxy to bypass CORS (R2 bucket has no CORS headers)
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();

      // Clipboard API requires image/png — convert if needed
      const pngBlob =
        blob.type === "image/png"
          ? blob
          : await new Promise<Blob>((resolve, reject) => {
              const img = new window.Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(
                  (b) => (b ? resolve(b) : reject(new Error("Canvas failed"))),
                  "image/png",
                );
              };
              img.onerror = () => reject(new Error("Image decode failed"));
              img.src = URL.createObjectURL(blob);
            });

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopyingImage("done");
      setTimeout(() => setCopyingImage("idle"), 1500);
    } catch {
      setCopyingImage("error");
      setTimeout(() => setCopyingImage("idle"), 2000);
    }
  };

  const startEditing = () => {
    setEditForm(initEditForm(asset));
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
    setEditError(null);
  };

  const handleSave = () => {
    if (!editForm) return;
    setEditError(null);

    try {
      const sourceUrl = validateOptionalUrl(editForm.sourceUrl, "Source URL");
      const outputUrl = validateOptionalUrl(editForm.outputUrl, "Output URL");
      const thumbnailUrl = validateOptionalUrl(
        editForm.thumbnailUrl,
        "Thumbnail URL",
      );
      const tags = normalizeTagList(editForm.tags);

      startTransition(async () => {
        try {
          await updateSceneAssetVersion(asset.id, {
            title: editForm.title.trim() || null,
            prompt: editForm.prompt.trim(),
            negativePrompt: editForm.negativePrompt.trim() || null,
            modelName: editForm.modelName.trim() || null,
            sourceUrl,
            outputUrl,
            thumbnailUrl,
            tags,
            notes: editForm.notes.trim() || null,
            status: editForm.status as AssetItem["status"],
            costEstimateUsd: parseOptionalNumber(editForm.costEstimateUsd),
            generationSeconds: parseOptionalNumber(editForm.generationSeconds),
            queueWaitSeconds: parseOptionalNumber(editForm.queueWaitSeconds),
          });
          setIsEditing(false);
          setEditForm(null);
        } catch (err) {
          setEditError(err instanceof Error ? err.message : "Save failed");
        }
      });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Validation failed");
    }
  };

  const updateField = (field: keyof EditFormState, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <>
      <Sheet open={open} onOpenChange={resetOnClose}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle className="flex-1 min-w-0 flex items-center gap-2 truncate">
                {asset.title ??
                  `${asset.platformLabel} v${asset.versionNumber}`}
                {asset.selected && (
                  <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                )}
              </SheetTitle>
              <div className="flex items-center gap-0.5 shrink-0">
                {(hasPrev || hasNext) && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onPrev}
                      disabled={!hasPrev}
                      aria-label="Previous asset"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onNext}
                      disabled={!hasNext}
                      aria-label="Next asset"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-1"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </div>
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

            {/* Preview with skeleton + progressive loading */}
            <div className="overflow-hidden rounded-lg border bg-muted/20 relative group/preview">
              {/* Copy image button — top-right over the image */}
              {imgSrc && !imgError && !isVideo && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 z-10 gap-1.5 opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-md bg-background/90 backdrop-blur-sm"
                  onClick={copyImageToClipboard}
                  disabled={copyingImage === "loading"}
                >
                  {copyingImage === "loading" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  )}
                  {copyingImage === "done"
                    ? "Copied!"
                    : copyingImage === "error"
                      ? "Failed"
                      : "Copy"}
                </Button>
              )}
              {imgSrc && !imgError ? (
                isVideo ? (
                  <video
                    src={imgSrc}
                    controls
                    className="w-full max-h-80 object-contain"
                  />
                ) : (
                  <>
                    {/* Skeleton while initial load */}
                    {imgLoading && !fullReady && (
                      <div className="aspect-video">
                        <div className="h-full w-full animate-pulse bg-muted/60 rounded" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                          <p className="text-[11px] text-muted-foreground/60">
                            Loading preview...
                          </p>
                        </div>
                      </div>
                    )}
                    <Image
                      key={imgSrc}
                      src={imgSrc}
                      alt={`${asset.platformLabel} v${asset.versionNumber}`}
                      width={576}
                      height={360}
                      className={`w-full max-h-80 object-contain transition-opacity duration-150 ${
                        imgLoading && !fullReady
                          ? "opacity-0 absolute"
                          : "opacity-100"
                      }`}
                      sizes="(max-width: 576px) 100vw, 576px"
                      quality={75}
                      priority
                      unoptimized={shouldSkipOptimization(imgSrc, hasThumb)}
                      onLoad={() => setImgLoading(false)}
                      onError={() => {
                        setImgError(true);
                        setImgLoading(false);
                      }}
                    />
                    {/* Upgrading indicator */}
                    {!imgLoading && hasThumb && hasFull && !fullReady && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5">
                        <Loader2 className="h-3 w-3 animate-spin text-white/70" />
                        <span className="text-[10px] text-white/70">HD</span>
                      </div>
                    )}
                  </>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ImageOff className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-xs">
                    {imgError
                      ? "Failed to load preview"
                      : "No preview available"}
                  </p>
                </div>
              )}
            </div>

            {isEditing && editForm ? (
              <EditForm
                form={editForm}
                onUpdate={updateField}
                error={editError}
                isPending={isPending}
                onSave={handleSave}
                onCancel={cancelEditing}
              />
            ) : (
              <>
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

                {/* Model, Source, Output links — overflow-safe */}
                <div className="grid gap-2 text-sm min-w-0">
                  {asset.modelName && (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0 min-w-[60px]">
                        Model
                      </span>
                      <span className="truncate">{asset.modelName}</span>
                    </div>
                  )}
                  {asset.sourceUrl && (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0 min-w-[60px]">
                        Source
                      </span>
                      <a
                        href={asset.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline min-w-0"
                      >
                        <span className="truncate">{asset.sourceUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {asset.outputUrl && (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0 min-w-[60px]">
                        Output
                      </span>
                      <a
                        href={asset.outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline min-w-0"
                      >
                        <span className="truncate">{asset.outputUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px]"
                      >
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
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={startEditing}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
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
              </>
            )}
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

// ─── Edit Form Sub-component ─────────────────────────────────

function EditForm({
  form,
  onUpdate,
  error,
  isPending,
  onSave,
  onCancel,
}: {
  form: EditFormState;
  onUpdate: (field: keyof EditFormState, value: string) => void;
  error: string | null;
  isPending: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={form.title}
          onChange={(e) => onUpdate("title", e.target.value)}
          placeholder="Optional title"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-prompt">Prompt</Label>
        <Textarea
          id="edit-prompt"
          value={form.prompt}
          onChange={(e) => onUpdate("prompt", e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-neg-prompt">Negative Prompt</Label>
        <Textarea
          id="edit-neg-prompt"
          value={form.negativePrompt}
          onChange={(e) => onUpdate("negativePrompt", e.target.value)}
          rows={2}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-model">Model</Label>
          <Input
            id="edit-model"
            value={form.modelName}
            onChange={(e) => onUpdate("modelName", e.target.value)}
            placeholder="e.g. gemini-2.0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => onUpdate("status", v)}
          >
            <SelectTrigger id="edit-status">
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-source-url">Source URL</Label>
        <Input
          id="edit-source-url"
          value={form.sourceUrl}
          onChange={(e) => onUpdate("sourceUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-output-url">Output URL</Label>
        <Input
          id="edit-output-url"
          value={form.outputUrl}
          onChange={(e) => onUpdate("outputUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-thumbnail-url">Thumbnail URL</Label>
        <Input
          id="edit-thumbnail-url"
          value={form.thumbnailUrl}
          onChange={(e) => onUpdate("thumbnailUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-cost">Cost ($)</Label>
          <Input
            id="edit-cost"
            type="number"
            step="0.001"
            min="0"
            value={form.costEstimateUsd}
            onChange={(e) => onUpdate("costEstimateUsd", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-gen-s">Gen (s)</Label>
          <Input
            id="edit-gen-s"
            type="number"
            step="1"
            min="0"
            value={form.generationSeconds}
            onChange={(e) => onUpdate("generationSeconds", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-queue-s">Queue (s)</Label>
          <Input
            id="edit-queue-s"
            type="number"
            step="1"
            min="0"
            value={form.queueWaitSeconds}
            onChange={(e) => onUpdate("queueWaitSeconds", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-tags">Tags</Label>
        <Input
          id="edit-tags"
          value={form.tags}
          onChange={(e) => onUpdate("tags", e.target.value)}
          placeholder="tag1, tag2, tag3"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          value={form.notes}
          onChange={(e) => onUpdate("notes", e.target.value)}
          rows={2}
          placeholder="Optional notes"
        />
      </div>

      <Separator />

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isPending || !form.prompt.trim()}
          className="gap-1.5"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save Changes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
