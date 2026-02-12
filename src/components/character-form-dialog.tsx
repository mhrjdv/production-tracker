"use client";

import { useState, useTransition, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, X } from "lucide-react";
import { createCharacter, updateCharacter } from "@/lib/actions";

interface CharacterData {
    id?: string;
    name: string;
    role: string;
    coreIdentity?: string | null;
    designPhilosophy?: string | null;
    visualCues: string[];
    bodyLanguage: string[];
    portraitUrl?: string | null;
}

interface CharacterFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    character?: CharacterData;
}

export function CharacterFormDialog({
    open,
    onOpenChange,
    projectId,
    character,
}: CharacterFormDialogProps) {
    const isEdit = !!character?.id;
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState(character?.name ?? "");
    const [role, setRole] = useState(character?.role ?? "");
    const [coreIdentity, setCoreIdentity] = useState(character?.coreIdentity ?? "");
    const [designPhilosophy, setDesignPhilosophy] = useState(character?.designPhilosophy ?? "");
    const [visualCues, setVisualCues] = useState<string[]>(character?.visualCues ?? []);
    const [bodyLanguage, setBodyLanguage] = useState<string[]>(character?.bodyLanguage ?? []);
    const [cueInput, setCueInput] = useState("");
    const [langInput, setLangInput] = useState("");
    const [portraitUrl, setPortraitUrl] = useState(character?.portraitUrl ?? "");
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setName(character?.name ?? "");
        setRole(character?.role ?? "");
        setCoreIdentity(character?.coreIdentity ?? "");
        setDesignPhilosophy(character?.designPhilosophy ?? "");
        setVisualCues(character?.visualCues ?? []);
        setBodyLanguage(character?.bodyLanguage ?? []);
        setCueInput("");
        setLangInput("");
        setPortraitUrl(character?.portraitUrl ?? "");
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const json = await res.json();
            if (json.url) setPortraitUrl(json.url);
        } finally {
            setUploading(false);
        }
    };

    const addTag = (list: string[], setList: (v: string[]) => void, val: string) => {
        const trimmed = val.trim();
        if (trimmed && !list.includes(trimmed)) {
            setList([...list, trimmed]);
        }
    };

    const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
        setList(list.filter((_, i) => i !== idx));
    };

    const handleSubmit = () => {
        if (!name.trim() || !role.trim()) return;
        startTransition(async () => {
            if (isEdit && character?.id) {
                await updateCharacter(character.id, {
                    name: name.trim(),
                    role: role.trim(),
                    coreIdentity: coreIdentity.trim() || null,
                    designPhilosophy: designPhilosophy.trim() || null,
                    visualCues,
                    bodyLanguage,
                    portraitUrl: portraitUrl || null,
                });
            } else {
                await createCharacter(projectId, {
                    name: name.trim(),
                    role: role.trim(),
                    coreIdentity: coreIdentity.trim() || undefined,
                    designPhilosophy: designPhilosophy.trim() || undefined,
                });
            }
            onOpenChange(false);
            if (!isEdit) resetForm();
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v && !isEdit) resetForm(); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Character" : "Add Character"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update character details." : "Add a new character to this project."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Portrait */}
                    <div className="flex items-center gap-4">
                        <div
                            className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border-2 border-dashed border-muted hover:border-primary/50 transition-colors"
                            onClick={() => fileRef.current?.click()}
                        >
                            {portraitUrl ? (
                                <img src={portraitUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <Upload className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Portrait (optional)</Label>
                            <p className="text-xs text-muted-foreground">Click to upload. Max 5MB.</p>
                            {uploading && <p className="text-xs text-primary mt-1">Uploading...</p>}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </div>

                    {/* Name + Role */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="char-name">Name *</Label>
                            <Input id="char-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laser Man" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="char-role">Role *</Label>
                            <Input id="char-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Protagonist" />
                        </div>
                    </div>

                    {/* Core Identity */}
                    <div className="space-y-1.5">
                        <Label htmlFor="char-identity">Core Identity</Label>
                        <Textarea
                            id="char-identity"
                            value={coreIdentity}
                            onChange={(e) => setCoreIdentity(e.target.value)}
                            placeholder="Character's core identity and motivation..."
                            rows={3}
                        />
                    </div>

                    {/* Design Philosophy */}
                    <div className="space-y-1.5">
                        <Label htmlFor="char-philosophy">Design Philosophy</Label>
                        <Textarea
                            id="char-philosophy"
                            value={designPhilosophy}
                            onChange={(e) => setDesignPhilosophy(e.target.value)}
                            placeholder="Visual design approach and narrative function..."
                            rows={2}
                        />
                    </div>

                    {/* Visual Cues */}
                    <div className="space-y-1.5">
                        <Label>Visual Cues</Label>
                        <div className="flex gap-2">
                            <Input
                                value={cueInput}
                                onChange={(e) => setCueInput(e.target.value)}
                                placeholder="Add a visual cue..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addTag(visualCues, setVisualCues, cueInput);
                                        setCueInput("");
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => { addTag(visualCues, setVisualCues, cueInput); setCueInput(""); }}
                            >
                                Add
                            </Button>
                        </div>
                        {visualCues.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {visualCues.map((cue, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                        {cue.length > 40 ? cue.slice(0, 40) + "…" : cue}
                                        <button onClick={() => removeTag(visualCues, setVisualCues, i)} className="ml-0.5 hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Body Language */}
                    <div className="space-y-1.5">
                        <Label>Body Language</Label>
                        <div className="flex gap-2">
                            <Input
                                value={langInput}
                                onChange={(e) => setLangInput(e.target.value)}
                                placeholder="Add body language note..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addTag(bodyLanguage, setBodyLanguage, langInput);
                                        setLangInput("");
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => { addTag(bodyLanguage, setBodyLanguage, langInput); setLangInput(""); }}
                            >
                                Add
                            </Button>
                        </div>
                        {bodyLanguage.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {bodyLanguage.map((lang, i) => (
                                    <Badge key={i} variant="outline" className="gap-1 pr-1">
                                        {lang}
                                        <button onClick={() => removeTag(bodyLanguage, setBodyLanguage, i)} className="ml-0.5 hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending || !name.trim() || !role.trim()}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Character"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
