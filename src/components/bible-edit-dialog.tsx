"use client";

import { useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";
import { updateFilmIdentity } from "@/lib/actions";

interface BibleEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    sectionKey: string;
    sectionTitle: string;
    sectionData: Record<string, unknown>;
    fullData: Record<string, unknown>;
}

export function BibleEditDialog({
    open,
    onOpenChange,
    projectId,
    sectionKey,
    sectionTitle,
    sectionData,
    fullData,
}: BibleEditDialogProps) {
    const [isPending, startTransition] = useTransition();
    const [entries, setEntries] = useState<Array<{ key: string; value: string }>>(
        Object.entries(sectionData).map(([key, value]) => ({
            key,
            value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
        }))
    );

    const updateEntry = (idx: number, field: "key" | "value", val: string) => {
        setEntries((prev) =>
            prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e))
        );
    };

    const removeEntry = (idx: number) => {
        setEntries((prev) => prev.filter((_, i) => i !== idx));
    };

    const addEntry = () => {
        setEntries((prev) => [...prev, { key: "", value: "" }]);
    };

    const handleSave = () => {
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

            const newData = { ...fullData, [sectionKey]: updatedSection };
            await updateFilmIdentity(projectId, newData);
            onOpenChange(false);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit: {sectionTitle}</DialogTitle>
                    <DialogDescription>
                        Modify the key-value pairs for this section.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    {entries.map((entry, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                            <div className="w-40 shrink-0">
                                <Label className="text-xs text-muted-foreground mb-1 block">Key</Label>
                                <Input
                                    value={entry.key}
                                    onChange={(e) => updateEntry(idx, "key", e.target.value)}
                                    placeholder="key_name"
                                    className="text-xs font-mono"
                                />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground mb-1 block">Value</Label>
                                <Textarea
                                    value={entry.value}
                                    onChange={(e) => updateEntry(idx, "value", e.target.value)}
                                    rows={2}
                                    className="text-sm"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeEntry(idx)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}

                    <Button variant="outline" size="sm" className="gap-1" onClick={addEntry}>
                        <Plus className="h-3.5 w-3.5" /> Add Field
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
