"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Columns3 } from "lucide-react";
import type { SceneAssetItem } from "./types";

// ─── Types ──────────────────────────────────────────────────

interface CompareGroupEntry {
    key: string;
    items: SceneAssetItem[];
    metrics: {
        totalVersions: number;
        platformCount: number;
        avgCostUsd: number | null;
        avgGenerationSeconds: number | null;
    };
}

interface AssetCompareViewProps {
    comparedAssets: SceneAssetItem[];
    compareGroups: CompareGroupEntry[];
    compareAssetIds: string[];
    onToggleCompare: (assetId: string) => void;
    onClearCompare: () => void;
}

// ─── Sub-component: Manual Compare Panel ────────────────────

function ManualComparePanel({
    comparedAssets,
    onClearCompare,
}: {
    comparedAssets: SceneAssetItem[];
    onClearCompare: () => void;
}) {
    if (comparedAssets.length <= 1) return null;

    return (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Columns3 className="h-4 w-4" />
                        Compare Variants ({comparedAssets.length})
                    </CardTitle>
                    <Button type="button" variant="ghost" size="sm" onClick={onClearCompare}>
                        Clear Compare
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {comparedAssets.map((asset) => (
                        <div key={asset.id} className="rounded-md border bg-background/70 p-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="outline">{asset.platformLabel}</Badge>
                                <Badge variant="secondary">v{asset.versionNumber}</Badge>
                                <Badge variant="outline">{asset.rightsState}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-5">{asset.prompt}</p>
                            {asset.thumbnailUrl && (
                                <img
                                    src={asset.thumbnailUrl}
                                    alt={`${asset.platformLabel} preview`}
                                    className="h-24 w-full rounded object-cover border"
                                />
                            )}
                            <p className="text-[11px] text-muted-foreground">
                                {asset.costEstimateUsd !== null ? `$${asset.costEstimateUsd.toFixed(3)}` : "-"}{" "}
                                · {asset.generationSeconds ?? "-"}s gen · {asset.queueWaitSeconds ?? "-"}s wait
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Sub-component: Auto Compare Groups ─────────────────────

function AutoCompareGroups({
    compareGroups,
    onToggleCompare,
}: {
    compareGroups: CompareGroupEntry[];
    onToggleCompare: (assetId: string) => void;
}) {
    if (compareGroups.length === 0) return null;

    return (
        <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <Columns3 className="h-4 w-4" />
                    Auto Compare Groups ({compareGroups.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {compareGroups.map((group) => (
                    <div key={group.key} className="rounded-md border bg-background/70 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-medium">{group.metrics.totalVersions} versions</span>
                                <span className="text-muted-foreground">
                                    across {group.metrics.platformCount} platform
                                    {group.metrics.platformCount !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {group.metrics.avgCostUsd !== null && (
                                    <span>Avg ${group.metrics.avgCostUsd.toFixed(3)}</span>
                                )}
                                {group.metrics.avgGenerationSeconds !== null && (
                                    <span>Avg {group.metrics.avgGenerationSeconds.toFixed(0)}s</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {group.items.map((item) => (
                                <Badge
                                    key={item.id}
                                    variant={item.selected ? "default" : "outline"}
                                    className="cursor-pointer text-[10px]"
                                    onClick={() => onToggleCompare(item.id)}
                                >
                                    {item.platformLabel} v{item.versionNumber}
                                    {item.selected ? " \u2605" : ""}
                                </Badge>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ─── Main Component ─────────────────────────────────────────

export function AssetCompareView({
    comparedAssets,
    compareGroups,
    onToggleCompare,
    onClearCompare,
}: AssetCompareViewProps) {
    return (
        <>
            <ManualComparePanel
                comparedAssets={comparedAssets}
                onClearCompare={onClearCompare}
            />
            <AutoCompareGroups
                compareGroups={compareGroups}
                onToggleCompare={onToggleCompare}
            />
        </>
    );
}
