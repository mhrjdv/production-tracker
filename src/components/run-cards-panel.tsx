"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CheckCircle2,
    Circle,
    Copy,
    ExternalLink,
    Loader2,
} from "lucide-react";
import {
    generateRunCards,
    type RunCard,
    type RunCardStatus,
} from "@/lib/fanout-utils";

// ─── Status styling map ─────────────────────────────────────

const STATUS_CONFIG: Record<
    RunCardStatus,
    { label: string; className: string }
> = {
    NOT_RUN: {
        label: "Not Run",
        className: "bg-muted text-muted-foreground border-border",
    },
    IN_PROGRESS: {
        label: "In Progress",
        className: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
    },
    CAPTURED: {
        label: "Captured",
        className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    },
    SELECTED: {
        label: "Selected",
        className: "bg-primary text-primary-foreground",
    },
};

// ─── Props ───────────────────────────────────────────────────

interface RunCardsPanelProps {
    promptPackage: {
        id: string;
        prompt: string;
        negativePrompt: string | null;
        targetAspectRatio: string | null;
        targetDurationSec: number | null;
        styleProfile: string | null;
    };
    platforms: Array<{
        slug: string;
        name: string;
    }>;
    /** Existing assets to determine run card statuses */
    assets?: Array<{
        platformKey: string;
        promptPackageId: string | null;
        selected: boolean;
        status: string;
    }>;
    onCopyPrompt?: (prompt: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function RunCardsPanel({
    promptPackage,
    platforms,
    assets = [],
    onCopyPrompt,
}: RunCardsPanelProps) {
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [copyingKey, setCopyingKey] = useState<string | null>(null);

    // Generate base run cards from fanout utils
    const baseCards = useMemo(
        () => generateRunCards(promptPackage, platforms),
        [promptPackage, platforms],
    );

    // Reconcile statuses with actual assets
    const runCards: RunCard[] = useMemo(() => {
        return baseCards.map((card) => {
            const matchingAsset = assets.find(
                (a) =>
                    a.platformKey === card.platformKey &&
                    a.promptPackageId === promptPackage.id,
            );

            if (!matchingAsset) return card;

            let resolvedStatus: RunCardStatus;
            if (matchingAsset.selected) {
                resolvedStatus = "SELECTED";
            } else if (
                matchingAsset.status === "GENERATED" ||
                matchingAsset.status === "DRAFT"
            ) {
                resolvedStatus = "CAPTURED";
            } else {
                resolvedStatus = "CAPTURED";
            }

            return { ...card, status: resolvedStatus };
        });
    }, [baseCards, assets, promptPackage.id]);

    // Summary counts
    const summary = useMemo(() => {
        const total = runCards.length;
        const captured = runCards.filter(
            (c) => c.status === "CAPTURED" || c.status === "SELECTED",
        ).length;
        const selected = runCards.filter((c) => c.status === "SELECTED").length;
        return { total, captured, selected };
    }, [runCards]);

    const toggleExpanded = useCallback((platformKey: string) => {
        setExpandedCards((prev) => {
            const next = new Set(prev);
            if (next.has(platformKey)) {
                next.delete(platformKey);
            } else {
                next.add(platformKey);
            }
            return next;
        });
    }, []);

    const handleCopyPrompt = useCallback(
        async (platformKey: string, prompt: string) => {
            setCopyingKey(platformKey);
            try {
                if (onCopyPrompt) {
                    onCopyPrompt(prompt);
                } else {
                    await navigator.clipboard.writeText(prompt);
                }
            } catch {
                // Silently fail — clipboard may not be available
            } finally {
                setTimeout(() => setCopyingKey(null), 1200);
            }
        },
        [onCopyPrompt],
    );

    if (runCards.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Run Cards</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {summary.total} platform{summary.total !== 1 ? "s" : ""}
                        {summary.captured > 0 &&
                            `, ${summary.captured} captured`}
                        {summary.selected > 0 &&
                            `, ${summary.selected} selected`}
                    </p>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {runCards.map((card) => {
                    const isExpanded = expandedCards.has(card.platformKey);
                    const isCopying = copyingKey === card.platformKey;
                    const statusConfig = STATUS_CONFIG[card.status];

                    return (
                        <Card
                            key={card.platformKey}
                            className={
                                card.status === "SELECTED"
                                    ? "border-primary/50"
                                    : ""
                            }
                        >
                            <CardContent className="pt-4 space-y-3">
                                {/* Header: platform name + status badge */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                            {card.platformName}
                                        </Badge>
                                        <Badge
                                            className={statusConfig.className}
                                        >
                                            {card.status === "CAPTURED" && (
                                                <CheckCircle2 className="h-3 w-3" />
                                            )}
                                            {card.status === "SELECTED" && (
                                                <CheckCircle2 className="h-3 w-3" />
                                            )}
                                            {card.status === "IN_PROGRESS" && (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            )}
                                            {card.status === "NOT_RUN" && (
                                                <Circle className="h-3 w-3" />
                                            )}
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Adapted prompt — truncated unless expanded */}
                                <div>
                                    <p
                                        className={`text-sm whitespace-pre-wrap ${
                                            isExpanded
                                                ? ""
                                                : "line-clamp-3"
                                        }`}
                                    >
                                        {card.adaptedPrompt}
                                    </p>
                                    {card.adaptedPrompt.length > 180 && (
                                        <button
                                            type="button"
                                            className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            onClick={() =>
                                                toggleExpanded(card.platformKey)
                                            }
                                        >
                                            {isExpanded
                                                ? "Show less"
                                                : "Show more"}
                                        </button>
                                    )}
                                </div>

                                {/* Settings checklist */}
                                {card.settingsChecklist.length > 0 && (
                                    <ul className="space-y-1">
                                        {card.settingsChecklist.map(
                                            (item, index) => (
                                                <li
                                                    key={index}
                                                    className="flex items-start gap-2 text-xs text-muted-foreground"
                                                >
                                                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                                                    <span>{item}</span>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {card.deepLink && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            asChild
                                        >
                                            <a
                                                href={card.deepLink}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Open in {card.platformName}
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() =>
                                            handleCopyPrompt(
                                                card.platformKey,
                                                card.adaptedPrompt,
                                            )
                                        }
                                    >
                                        {isCopying ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                        {isCopying
                                            ? "Copied"
                                            : "Copy Prompt"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </CardContent>
        </Card>
    );
}
