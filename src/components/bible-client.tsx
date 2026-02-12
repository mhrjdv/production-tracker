"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { updateFilmIdentity } from "@/lib/actions";

// ─── Editable Section Card ──────────────────────────────────

function SectionCard({
    sectionKey,
    sectionTitle,
    content,
    fullData,
    projectId,
    colSpan,
    description,
}: {
    sectionKey: string;
    sectionTitle: string;
    content: Record<string, unknown>;
    fullData: Record<string, unknown>;
    projectId: string;
    colSpan?: boolean;
    description?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [entries, setEntries] = useState(
        Object.entries(content).map(([key, value]) => ({
            key,
            value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
        }))
    );

    const updateEntry = (idx: number, field: "key" | "value", val: string) => {
        setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)));
    };

    const removeEntry = (idx: number) => {
        setEntries((prev) => prev.filter((_, i) => i !== idx));
    };

    const addEntry = () => {
        setEntries((prev) => [...prev, { key: "", value: "" }]);
    };

    const cancel = () => {
        setEntries(
            Object.entries(content).map(([key, value]) => ({
                key,
                value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
            }))
        );
        setEditing(false);
    };

    const save = () => {
        startTransition(async () => {
            const updatedSection: Record<string, unknown> = {};
            for (const entry of entries) {
                if (entry.key.trim()) {
                    try {
                        updatedSection[entry.key.trim()] = JSON.parse(entry.value);
                    } catch {
                        updatedSection[entry.key.trim()] = entry.value;
                    }
                }
            }
            await updateFilmIdentity(projectId, { ...fullData, [sectionKey]: updatedSection });
            setEditing(false);
        });
    };

    if (editing) {
        return (
            <Card className={`border-primary/30 shadow-md transition-all ${colSpan ? "md:col-span-2" : ""}`}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="capitalize">{sectionTitle}</CardTitle>
                            {description && <CardDescription>{description}</CardDescription>}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={cancel} disabled={isPending} className="gap-1">
                                <X className="h-3.5 w-3.5" /> Cancel
                            </Button>
                            <Button size="sm" onClick={save} disabled={isPending} className="gap-1">
                                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {entries.map((entry, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                            <Input
                                value={entry.key}
                                onChange={(e) => updateEntry(idx, "key", e.target.value)}
                                placeholder="key"
                                className="w-36 shrink-0 text-xs font-mono"
                            />
                            <Textarea
                                value={entry.value}
                                onChange={(e) => updateEntry(idx, "value", e.target.value)}
                                rows={2}
                                className="text-sm flex-1"
                            />
                            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive mt-1" onClick={() => removeEntry(idx)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" className="gap-1" onClick={addEntry}>
                        <Plus className="h-3.5 w-3.5" /> Add Field
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // View mode
    return (
        <Card className={`group relative hover:border-primary/20 transition-all ${colSpan ? "md:col-span-2" : ""}`}>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
            </div>
            <CardHeader>
                <CardTitle className="capitalize">{sectionTitle}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(content).map(([key, value]) => (
                    <div key={key}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {key.replace(/_/g, " ")}
                        </p>
                        {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1.5">
                                {(value as string[]).map((item, i) => (
                                    <Badge key={i} variant="outline">{item}</Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm leading-relaxed">
                                {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                            </p>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ─── Main Bible Client ──────────────────────────────────────

export function BibleClient({
    projectId,
    projectName,
    hasIdentity,
    filmIdentity,
    filmData,
    structure,
}: {
    projectId: string;
    projectName: string;
    hasIdentity: boolean;
    filmIdentity: Record<string, string>;
    filmData: Record<string, unknown>;
    structure: Record<string, unknown>;
}) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
                        {projectName}
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">Creative Bible</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Creative Bible</h1>
                <p className="text-muted-foreground mt-1">Your production&apos;s creative vision and identity</p>
            </div>

            {!hasIdentity ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-semibold mb-1">No creative identity yet</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                            Define your film&apos;s tone, visual style, and narrative stance to guide your production.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Film Identity */}
                    {Object.keys(filmIdentity).length > 0 && (
                        <SectionCard
                            sectionKey="film_identity"
                            sectionTitle="Film Identity"
                            description="Core creative pillars of the production"
                            content={filmIdentity}
                            fullData={filmData}
                            projectId={projectId}
                            colSpan
                        />
                    )}

                    {/* Other sections */}
                    {Object.entries(filmData)
                        .filter(([key]) => key !== "film_identity" && key !== "structure")
                        .map(([section, content]) => (
                            <SectionCard
                                key={section}
                                sectionKey={section}
                                sectionTitle={section.replace(/_/g, " ")}
                                content={typeof content === "object" && content !== null ? (content as Record<string, unknown>) : { value: content }}
                                fullData={filmData}
                                projectId={projectId}
                            />
                        ))}

                    {/* Structure */}
                    {Object.keys(structure).length > 0 && (
                        <SectionCard
                            sectionKey="structure"
                            sectionTitle="Structure"
                            content={structure}
                            fullData={filmData}
                            projectId={projectId}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
