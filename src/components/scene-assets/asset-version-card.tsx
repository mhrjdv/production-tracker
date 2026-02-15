"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Check,
    Columns3,
    ExternalLink,
    Shield,
    Star,
    Trash2,
} from "lucide-react";
import type { SceneAssetItem } from "./types";

// ─── Props ──────────────────────────────────────────────────

interface AssetVersionCardProps {
    asset: SceneAssetItem;
    isPending: boolean;
    isComparing: boolean;
    onSelectWinner: (assetId: string) => void;
    onToggleCompare: (assetId: string) => void;
    onOpenRights: (asset: SceneAssetItem) => void;
    onReusePrompt: (asset: SceneAssetItem) => void;
    onArchive: (assetId: string) => void;
    onDelete: (assetId: string) => void;
}

// ─── Component ──────────────────────────────────────────────

export function AssetVersionCard({
    asset,
    isPending,
    isComparing,
    onSelectWinner,
    onToggleCompare,
    onOpenRights,
    onReusePrompt,
    onArchive,
    onDelete,
}: AssetVersionCardProps) {
    return (
        <Card className={asset.selected ? "border-primary/50" : ""}>
            <CardContent className="pt-4 space-y-3">
                {/* Header badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{asset.platformLabel}</Badge>
                        <Badge>{asset.assetType}</Badge>
                        <Badge variant={asset.selected ? "default" : "secondary"}>
                            v{asset.versionNumber}
                        </Badge>
                        <Badge variant="outline">{asset.status}</Badge>
                        <Badge variant="outline">{asset.rightsState}</Badge>
                        {asset.promptPackageId && (
                            <Badge variant="secondary">Prompt Package</Badge>
                        )}
                        {asset.selected && (
                            <Badge className="gap-1">
                                <Star className="h-3 w-3" />
                                Selected
                            </Badge>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {new Date(asset.createdAt).toLocaleString()}
                    </div>
                </div>

                {/* Title */}
                {asset.title && <p className="text-sm font-medium">{asset.title}</p>}

                {/* Prompt */}
                <p className="text-sm whitespace-pre-wrap">{asset.prompt}</p>
                {asset.negativePrompt && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        Negative: {asset.negativePrompt}
                    </p>
                )}

                {/* Links & model */}
                {(asset.sourceUrl || asset.outputUrl || asset.modelName) && (
                    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                        {asset.modelName && <div>Model: {asset.modelName}</div>}
                        {asset.sourceUrl && (
                            <a
                                href={asset.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                            >
                                Source <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                        {asset.outputUrl && (
                            <a
                                href={asset.outputUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                            >
                                Output <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                )}

                {/* Cost & timing metrics */}
                {(asset.costEstimateUsd !== null || asset.generationSeconds !== null || asset.queueWaitSeconds !== null) && (
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>Cost: {asset.costEstimateUsd !== null ? `$${asset.costEstimateUsd.toFixed(3)}` : "-"}</span>
                        <span>Gen: {asset.generationSeconds ?? "-"}s</span>
                        <span>Queue: {asset.queueWaitSeconds ?? "-"}s</span>
                    </div>
                )}

                {/* Tags, metadata, provenance */}
                {(asset.tags.length > 0 || asset.metadata || asset.provenance) && (
                    <div className="space-y-2">
                        {asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {asset.tags.map((tag) => (
                                    <Badge key={`${asset.id}-${tag}`} variant="secondary" className="text-[10px]">
                                        #{tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {asset.metadata && (
                            <div className="rounded-md border bg-muted/30 px-2 py-1.5">
                                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                    {JSON.stringify(asset.metadata, null, 2)}
                                </pre>
                            </div>
                        )}
                        {asset.provenance && (
                            <div className="rounded-md border bg-muted/30 px-2 py-1.5">
                                <p className="text-[11px] font-medium mb-1">Provenance</p>
                                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                    {JSON.stringify(asset.provenance, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Thumbnail */}
                {asset.thumbnailUrl && (
                    <div className="overflow-hidden rounded-md border bg-muted/20">
                        <img
                            src={asset.thumbnailUrl}
                            alt={`Thumbnail for ${asset.platformLabel} v${asset.versionNumber}`}
                            className="h-28 w-full object-cover"
                        />
                    </div>
                )}

                {/* Notes */}
                {asset.notes && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{asset.notes}</p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    {!asset.selected && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => onSelectWinner(asset.id)}
                            disabled={isPending}
                        >
                            <Check className="h-3.5 w-3.5" />
                            Mark Selected
                        </Button>
                    )}
                    <Button
                        variant={isComparing ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onToggleCompare(asset.id)}
                    >
                        <Columns3 className="h-3.5 w-3.5" />
                        {isComparing ? "Comparing" : "Compare"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onOpenRights(asset)}
                    >
                        <Shield className="h-3.5 w-3.5" />
                        Rights
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReusePrompt(asset)}
                        disabled={isPending}
                    >
                        Reuse Prompt
                    </Button>
                    {asset.status !== "ARCHIVED" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onArchive(asset.id)}
                            disabled={isPending}
                        >
                            Archive
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(asset.id)}
                        disabled={isPending}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
