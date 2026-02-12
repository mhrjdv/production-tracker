"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/stepper";
import { createProject } from "@/lib/actions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Loader2,
    Plus,
    Trash2,
    Film,
    Users,
    Palette,
    Layers,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
    { title: "Basics", description: "Project info" },
    { title: "Identity", description: "Creative vision" },
    { title: "Characters", description: "Cast setup" },
    { title: "Structure", description: "Acts & scenes" },
    { title: "Review", description: "Confirm & create" },
];

const GENRES = [
    "Action", "Animation", "Comedy", "Documentary", "Drama",
    "Fantasy", "Horror", "Musical", "Mystery", "Romance",
    "Sci-Fi", "Thriller", "Western", "Other",
];

interface CharacterInput {
    name: string;
    role: string;
    coreIdentity: string;
}

interface ProjectForm {
    name: string;
    description: string;
    genre: string;
    tone: string;
    visualStyle: string;
    pacingPhilosophy: string;
    characters: CharacterInput[];
    actCount: number;
    actNames: string[];
}

const initialForm: ProjectForm = {
    name: "",
    description: "",
    genre: "",
    tone: "",
    visualStyle: "",
    pacingPhilosophy: "",
    characters: [],
    actCount: 3,
    actNames: ["Act 1", "Act 2", "Act 3"],
};

export default function NewProjectPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<ProjectForm>(initialForm);
    const [isPending, startTransition] = useTransition();

    const updateForm = (updates: Partial<ProjectForm>) => {
        setForm((prev) => ({ ...prev, ...updates }));
    };

    const canProceed = () => {
        switch (step) {
            case 0:
                return form.name.trim().length > 0;
            case 1:
                return true; // Optional
            case 2:
                return true; // Optional
            case 3:
                return true; // Optional
            case 4:
                return true;
            default:
                return false;
        }
    };

    const addCharacter = () => {
        updateForm({
            characters: [
                ...form.characters,
                { name: "", role: "", coreIdentity: "" },
            ],
        });
    };

    const removeCharacter = (index: number) => {
        updateForm({
            characters: form.characters.filter((_, i) => i !== index),
        });
    };

    const updateCharacter = (
        index: number,
        field: keyof CharacterInput,
        value: string
    ) => {
        const updated = [...form.characters];
        updated[index] = { ...updated[index], [field]: value };
        updateForm({ characters: updated });
    };

    const handleActCountChange = (count: number) => {
        const newNames = Array.from({ length: count }, (_, i) =>
            form.actNames[i] ?? `Act ${i + 1}`
        );
        updateForm({ actCount: count, actNames: newNames });
    };

    const handleSubmit = () => {
        startTransition(async () => {
            try {
                const identity =
                    form.tone || form.visualStyle || form.pacingPhilosophy
                        ? {
                            film_identity: {
                                tone: form.tone || "",
                                genre: form.genre || "",
                                visual_style: form.visualStyle || "",
                                pacing_philosophy: form.pacingPhilosophy || "",
                            },
                            structure: {
                                acts: form.actNames,
                            },
                        }
                        : undefined;

                const validCharacters = form.characters.filter(
                    (c) => c.name.trim() && c.role.trim()
                );

                await createProject({
                    name: form.name.trim(),
                    description: form.description.trim() || undefined,
                    genre: form.genre || undefined,
                    identity,
                    characters:
                        validCharacters.length > 0
                            ? validCharacters.map((c) => ({
                                name: c.name.trim(),
                                role: c.role.trim(),
                                coreIdentity: c.coreIdentity.trim() || undefined,
                            }))
                            : undefined,
                });

                toast.success("Project created successfully!");
            } catch {
                toast.error("Failed to create project. Please try again.");
            }
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">New Project</h1>
                <p className="text-muted-foreground mt-1">
                    Set up your production in a few simple steps
                </p>
            </div>

            <Stepper steps={STEPS} currentStep={step} />

            <Card>
                <CardContent className="pt-6">
                    {/* Step 1: Basics */}
                    {step === 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Film className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Project Basics</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Name and describe your production
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Project Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="My Film Project"
                                    value={form.name}
                                    onChange={(e) => updateForm({ name: e.target.value })}
                                    className="text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    placeholder="A brief overview of your production..."
                                    value={form.description}
                                    onChange={(e) => updateForm({ description: e.target.value })}
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="genre">Genre</Label>
                                <Select
                                    value={form.genre}
                                    onValueChange={(v) => updateForm({ genre: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a genre" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GENRES.map((g) => (
                                            <SelectItem key={g} value={g.toLowerCase()}>
                                                {g}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Creative Identity */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Palette className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Creative Identity</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Define the artistic vision — you can refine later
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tone">Tone & Mood</Label>
                                <textarea
                                    id="tone"
                                    placeholder="e.g., Dark and brooding with moments of dry humor..."
                                    value={form.tone}
                                    onChange={(e) => updateForm({ tone: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="visualStyle">Visual Style</Label>
                                <textarea
                                    id="visualStyle"
                                    placeholder="e.g., High-contrast cinematography, neon-noir palette..."
                                    value={form.visualStyle}
                                    onChange={(e) => updateForm({ visualStyle: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pacing">Pacing Philosophy</Label>
                                <textarea
                                    id="pacing"
                                    placeholder="e.g., Slow-burn tension with explosive releases..."
                                    value={form.pacingPhilosophy}
                                    onChange={(e) =>
                                        updateForm({ pacingPhilosophy: e.target.value })
                                    }
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Characters */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold">Characters</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Add your main cast — more can be added later
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addCharacter}
                                    className="gap-1"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add
                                </Button>
                            </div>

                            {form.characters.length === 0 ? (
                                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                                    <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground mb-3">
                                        No characters added yet
                                    </p>
                                    <Button variant="outline" size="sm" onClick={addCharacter}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Character
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {form.characters.map((char, i) => (
                                        <Card key={i} className="bg-muted/30">
                                            <CardContent className="pt-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-1 space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Name</Label>
                                                                <Input
                                                                    placeholder="Character name"
                                                                    value={char.name}
                                                                    onChange={(e) =>
                                                                        updateCharacter(i, "name", e.target.value)
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Role</Label>
                                                                <Input
                                                                    placeholder="e.g., Protagonist"
                                                                    value={char.role}
                                                                    onChange={(e) =>
                                                                        updateCharacter(i, "role", e.target.value)
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Core Identity</Label>
                                                            <Input
                                                                placeholder="Brief description of who they are"
                                                                value={char.coreIdentity}
                                                                onChange={(e) =>
                                                                    updateCharacter(
                                                                        i,
                                                                        "coreIdentity",
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => removeCharacter(i)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Structure */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Layers className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Scene Structure</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Define your narrative structure — scenes can be added after
                                        creation
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Number of Acts</Label>
                                <Select
                                    value={String(form.actCount)}
                                    onValueChange={(v) => handleActCountChange(Number(v))}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                            <SelectItem key={n} value={String(n)}>
                                                {n} {n === 1 ? "act" : "acts"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label>Act Names</Label>
                                {form.actNames.map((name, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Badge variant="outline" className="shrink-0 tabular-nums">
                                            {i + 1}
                                        </Badge>
                                        <Input
                                            value={name}
                                            onChange={(e) => {
                                                const updated = [...form.actNames];
                                                updated[i] = e.target.value;
                                                updateForm({ actNames: updated });
                                            }}
                                            placeholder={`Act ${i + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Check className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Review & Create</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Double-check everything before creating your project
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Card className="bg-muted/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Project Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Name</span>
                                            <span className="font-medium">{form.name}</span>
                                        </div>
                                        {form.description && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground shrink-0">
                                                    Description
                                                </span>
                                                <span className="text-right line-clamp-2">
                                                    {form.description}
                                                </span>
                                            </div>
                                        )}
                                        {form.genre && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Genre</span>
                                                <Badge variant="secondary">{form.genre}</Badge>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {(form.tone || form.visualStyle || form.pacingPhilosophy) && (
                                    <Card className="bg-muted/30">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">
                                                Creative Identity
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            {form.tone && (
                                                <div>
                                                    <span className="text-muted-foreground text-xs">
                                                        Tone
                                                    </span>
                                                    <p className="line-clamp-2">{form.tone}</p>
                                                </div>
                                            )}
                                            {form.visualStyle && (
                                                <div>
                                                    <span className="text-muted-foreground text-xs">
                                                        Visual Style
                                                    </span>
                                                    <p className="line-clamp-2">{form.visualStyle}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {form.characters.filter((c) => c.name.trim()).length > 0 && (
                                    <Card className="bg-muted/30">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">
                                                Characters (
                                                {form.characters.filter((c) => c.name.trim()).length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {form.characters
                                                    .filter((c) => c.name.trim())
                                                    .map((c, i) => (
                                                        <Badge key={i} variant="outline">
                                                            {c.name}
                                                            {c.role && (
                                                                <span className="text-muted-foreground ml-1">
                                                                    — {c.role}
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="bg-muted/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                            Structure ({form.actCount}{" "}
                                            {form.actCount === 1 ? "act" : "acts"})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {form.actNames.map((name, i) => (
                                                <Badge key={i} variant="secondary">
                                                    {name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={() => {
                        if (step === 0) {
                            router.push("/");
                        } else {
                            setStep((s) => s - 1);
                        }
                    }}
                    disabled={isPending}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {step === 0 ? "Cancel" : "Back"}
                </Button>

                {step < STEPS.length - 1 ? (
                    <Button
                        onClick={() => setStep((s) => s + 1)}
                        disabled={!canProceed()}
                    >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending || !form.name.trim()}
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4 mr-2" />
                        )}
                        Create Project
                    </Button>
                )}
            </div>
        </div>
    );
}
