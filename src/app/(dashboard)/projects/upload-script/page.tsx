"use client";

// ============================================================
// Upload Script Page — Linear-inspired UX
//
// Flow: Paste/Upload → AI Processing → Review → Save
// Design: minimal, fast, keyboard-driven, dark-mode native
// ============================================================

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Upload,
    FileText,
    Sparkles,
    Check,
    ChevronRight,
    Layers,
    Users,
    Palette,
    BookOpen,
    ArrowLeft,
    Loader2,
    AlertCircle,
    Wand2,
    X,
    Film,
} from "lucide-react";
import { saveGeneratedProject } from "@/lib/actions/script-upload";
import type { PipelineResult, PipelineProgress } from "@/lib/ai-pipeline";

// ─── Types ───────────────────────────────────────────────────

type WizardStep = "input" | "processing" | "review" | "saving";

interface StepInfo {
    key: WizardStep;
    label: string;
    icon: React.ElementType;
}

const STEPS: StepInfo[] = [
    { key: "input", label: "Script", icon: FileText },
    { key: "processing", label: "Generate", icon: Sparkles },
    { key: "review", label: "Review", icon: BookOpen },
    { key: "saving", label: "Save", icon: Check },
];

// ─── Component ───────────────────────────────────────────────

export default function UploadScriptPage() {
    const router = useRouter();
    const [step, setStep] = useState<WizardStep>("input");
    const [scriptText, setScriptText] = useState("");
    const [projectName, setProjectName] = useState("");
    const [progress, setProgress] = useState<PipelineProgress | null>(null);
    const [result, setResult] = useState<PipelineResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // ─── File Upload Handler ─────────────────────────────────

    const handleFileUpload = useCallback(
        async (file: File) => {
            if (
                !file.type.includes("text") &&
                !file.name.endsWith(".txt") &&
                !file.name.endsWith(".md") &&
                !file.name.endsWith(".fountain")
            ) {
                toast.error("Please upload a text file (.txt, .md, .fountain)");
                return;
            }

            try {
                const text = await file.text();
                setScriptText(text);
                toast.success(`Loaded "${file.name}" (${text.length.toLocaleString()} chars)`);
            } catch {
                toast.error("Failed to read file");
            }
        },
        []
    );

    // ─── Drag & Drop ─────────────────────────────────────────

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
        },
        [handleFileUpload]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    // ─── AI Generation ───────────────────────────────────────

    const startGeneration = useCallback(async () => {
        setStep("processing");
        setError(null);
        setProgress(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch("/api/ai/parse-script", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scriptText }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Generation failed");
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response stream");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === "progress") {
                            setProgress(data);
                        } else if (data.type === "result") {
                            setResult(data.data);
                            setProjectName(
                                data.data.projectName || "Untitled Project"
                            );
                            setStep("review");
                            toast.success("Generation complete!");
                        } else if (data.type === "error") {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        if (e instanceof SyntaxError) continue;
                        throw e;
                    }
                }
            }
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") {
                setStep("input");
                toast.info("Generation cancelled");
                return;
            }
            const msg = e instanceof Error ? e.message : "Generation failed";
            setError(msg);
            toast.error(msg);
            setStep("input");
        }
    }, [scriptText]);

    // ─── Cancel Generation ───────────────────────────────────

    const cancelGeneration = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    // ─── Save Project ────────────────────────────────────────

    const handleSave = useCallback(() => {
        if (!result) return;

        startTransition(async () => {
            try {
                setStep("saving");
                const { projectId } = await saveGeneratedProject({
                    projectName: projectName || result.projectName,
                    projectDescription: result.projectDescription,
                    genre: result.genre,
                    result,
                });

                toast.success("Project saved!");
                router.push(`/projects/${projectId}`);
            } catch (e) {
                const msg =
                    e instanceof Error ? e.message : "Failed to save";
                toast.error(msg);
                setStep("review");
            }
        });
    }, [result, projectName, router, startTransition]);

    // ─── Step Indicator (Linear-style) ───────────────────────

    const currentStepIndex = STEPS.findIndex((s) => s.key === step);

    // ─── Keyboard Shortcuts ──────────────────────────────────

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                if (step === "input" && scriptText.trim().length >= 50) {
                    startGeneration();
                } else if (step === "review" && result) {
                    handleSave();
                }
            }
        },
        [step, scriptText, result, startGeneration, handleSave]
    );

    // ─── Render ──────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto" onKeyDown={handleKeyDown}>
            {/* Header + Step Indicator */}
            <div className="mb-8 space-y-6">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => router.push("/")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Upload Script
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Paste your script and let AI generate everything
                        </p>
                    </div>
                </div>

                {/* Linear-style step progress */}
                <div className="flex items-center gap-1">
                    {STEPS.map((s, i) => {
                        const isActive = i === currentStepIndex;
                        const isComplete = i < currentStepIndex;
                        const Icon = s.icon;

                        return (
                            <div key={s.key} className="flex items-center gap-1 flex-1">
                                <div
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                                        ${isActive ? "bg-primary text-primary-foreground" : ""}
                                        ${isComplete ? "text-primary" : ""}
                                        ${!isActive && !isComplete ? "text-muted-foreground" : ""}
                                    `}
                                >
                                    {isComplete ? (
                                        <Check className="h-3.5 w-3.5" />
                                    ) : (
                                        <Icon className="h-3.5 w-3.5" />
                                    )}
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ───────────────────────────────────────────────── */}
            {/* Step 1: Script Input                             */}
            {/* ───────────────────────────────────────────────── */}
            {step === "input" && (
                <div className="space-y-4">
                    {/* Drop Zone / Textarea */}
                    <Card
                        className="border-dashed hover:border-primary/40 transition-colors"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <CardContent className="pt-6">
                            {scriptText ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <FileText className="h-4 w-4" />
                                            <span>
                                                {scriptText.length.toLocaleString()} characters
                                                {" · "}
                                                {scriptText.split(/\s+/).length.toLocaleString()} words
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setScriptText("")}
                                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="h-3 w-3 mr-1" />
                                            Clear
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={scriptText}
                                        onChange={(e) => setScriptText(e.target.value)}
                                        placeholder="Paste your script here..."
                                        className="min-h-[400px] font-mono text-sm resize-none bg-muted/30 border-0 focus-visible:ring-1"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center py-16 cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                        <Upload className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium mb-1">
                                        Drop your script file here
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        or click to browse · .txt, .md, .fountain
                                    </p>
                                    <Separator className="my-4 w-32" />
                                    <p className="text-xs text-muted-foreground">
                                        or paste directly in the box below
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Paste fallback if empty */}
                    {!scriptText && (
                        <Textarea
                            value={scriptText}
                            onChange={(e) => setScriptText(e.target.value)}
                            placeholder="Paste your script here..."
                            className="min-h-[200px] font-mono text-sm"
                        />
                    )}

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.fountain"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                    />

                    {/* Action bar */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {scriptText.trim().length >= 50
                                ? "Ready to generate"
                                : "Need at least 50 characters"}
                            {" · "}
                            <kbd className="px-1.5 py-0.5 text-[10px] rounded border bg-muted font-mono">
                                ⌘↩
                            </kbd>{" "}
                            to start
                        </p>
                        <Button
                            onClick={startGeneration}
                            disabled={scriptText.trim().length < 50}
                            className="gap-2"
                        >
                            <Wand2 className="h-4 w-4" />
                            Generate
                        </Button>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────── */}
            {/* Step 2: AI Processing                            */}
            {/* ───────────────────────────────────────────────── */}
            {step === "processing" && (
                <Card>
                    <CardContent className="py-16">
                        <div className="flex flex-col items-center text-center space-y-6">
                            {/* Animated icon */}
                            <div className="relative">
                                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                                </div>
                                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping" />
                            </div>

                            {/* Status text */}
                            <div className="space-y-1">
                                <h3 className="text-lg font-medium">
                                    {progress?.message || "Starting AI pipeline..."}
                                </h3>
                                {progress?.detail && (
                                    <p className="text-sm text-muted-foreground">
                                        {progress.detail}
                                    </p>
                                )}
                            </div>

                            {/* Progress bar */}
                            <div className="w-full max-w-sm space-y-2">
                                <Progress
                                    value={progress?.percentage || 5}
                                    className="h-2"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{getStepLabel(progress?.step)}</span>
                                    <span>{progress?.percentage || 5}%</span>
                                </div>
                            </div>

                            {/* Pipeline steps */}
                            <div className="flex flex-col gap-2 text-sm w-full max-w-xs">
                                {[
                                    { key: "extracting_scenes", label: "Extract Scenes", icon: Layers },
                                    { key: "extracting_characters", label: "Analyze Characters", icon: Users },
                                    { key: "generating_identity", label: "Film Identity", icon: Palette },
                                    { key: "generating_descriptions", label: "Scene Details", icon: BookOpen },
                                ].map((pipelineStep) => {
                                    const isActive =
                                        progress?.step === pipelineStep.key;
                                    const isComplete =
                                        getStepOrder(progress?.step) >
                                        getStepOrder(pipelineStep.key);
                                    const Icon = pipelineStep.icon;

                                    return (
                                        <div
                                            key={pipelineStep.key}
                                            className={`
                                                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                                                ${isActive ? "bg-primary/10 text-primary" : ""}
                                                ${isComplete ? "text-muted-foreground" : ""}
                                                ${!isActive && !isComplete ? "text-muted-foreground/50" : ""}
                                            `}
                                        >
                                            {isComplete ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : isActive ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Icon className="h-4 w-4" />
                                            )}
                                            <span className="font-medium text-xs">
                                                {pipelineStep.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Cancel */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelGeneration}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ───────────────────────────────────────────────── */}
            {/* Step 3: Review                                   */}
            {/* ───────────────────────────────────────────────── */}
            {step === "review" && result && (
                <div className="space-y-6">
                    {/* Project Name (editable) */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Project Name
                        </label>
                        <Input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="text-xl font-semibold h-12 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                            placeholder="Project name..."
                        />
                    </div>

                    {/* Stats bar */}
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{result.scenes.length}</span>
                            <span className="text-muted-foreground">scenes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{result.characters.length}</span>
                            <span className="text-muted-foreground">characters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Film className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary" className="text-xs">
                                {result.genre}
                            </Badge>
                        </div>
                    </div>

                    {/* Tabbed content */}
                    <Tabs defaultValue="scenes" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="scenes" className="gap-1.5 text-xs">
                                <Layers className="h-3.5 w-3.5" />
                                Scenes
                            </TabsTrigger>
                            <TabsTrigger value="characters" className="gap-1.5 text-xs">
                                <Users className="h-3.5 w-3.5" />
                                Characters
                            </TabsTrigger>
                            <TabsTrigger value="identity" className="gap-1.5 text-xs">
                                <Palette className="h-3.5 w-3.5" />
                                Identity
                            </TabsTrigger>
                            <TabsTrigger value="descriptions" className="gap-1.5 text-xs">
                                <BookOpen className="h-3.5 w-3.5" />
                                Details
                            </TabsTrigger>
                        </TabsList>

                        {/* Scenes Tab */}
                        <TabsContent value="scenes">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">
                                        Extracted Scenes
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {result.scenes.length} scenes across{" "}
                                        {new Set(result.scenes.map((s) => s.act)).size} acts
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-2">
                                            {result.scenes.map((scene) => (
                                                <div
                                                    key={scene.scene_id}
                                                    className="flex gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-colors group"
                                                >
                                                    <Badge
                                                        variant="outline"
                                                        className="shrink-0 h-6 font-mono text-[10px]"
                                                    >
                                                        {scene.scene_id}
                                                    </Badge>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm truncate">
                                                            {scene.source_text}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-muted-foreground">
                                                                Act {scene.act}: {scene.act_title}
                                                            </span>
                                                            <span className="text-muted-foreground/30">·</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {scene.story_beat}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Characters Tab */}
                        <TabsContent value="characters">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">
                                        Extracted Characters
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px]">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {result.characters.map((char) => (
                                                <div
                                                    key={char.name}
                                                    className="p-3 rounded-lg border hover:border-primary/30 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="font-medium text-sm">
                                                            {char.name}
                                                        </h4>
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px]"
                                                        >
                                                            {char.role}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {char.core_identity}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Identity Tab */}
                        <TabsContent value="identity">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">
                                        Film Identity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-4">
                                            {Object.entries(
                                                result.filmIdentity.film_identity
                                            ).map(([key, value]) => (
                                                <div key={key}>
                                                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                        {key.replace(/_/g, " ")}
                                                    </label>
                                                    <p className="text-sm mt-0.5">
                                                        {String(value)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Descriptions Tab */}
                        <TabsContent value="descriptions">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">
                                        Scene Descriptions
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {result.sceneDescriptions.length} detailed descriptions
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-4">
                                            {result.sceneDescriptions.map(
                                                (desc) => (
                                                    <div
                                                        key={desc.scene_id}
                                                        className="p-3 rounded-lg border space-y-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className="font-mono text-[10px]"
                                                            >
                                                                {desc.scene_id}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {desc.setting.location}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs">
                                                            {desc.narrative_purpose}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px]"
                                                            >
                                                                {desc.emotional_tone}
                                                            </Badge>
                                                            {desc.visual_motifs.slice(0, 2).map(
                                                                (m) => (
                                                                    <Badge
                                                                        key={m}
                                                                        variant="outline"
                                                                        className="text-[10px]"
                                                                    >
                                                                        {m}
                                                                    </Badge>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Action bar */}
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setStep("input")}
                            className="gap-2 text-muted-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Script
                        </Button>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground mr-2">
                                <kbd className="px-1.5 py-0.5 text-[10px] rounded border bg-muted font-mono">
                                    ⌘↩
                                </kbd>{" "}
                                to save
                            </p>
                            <Button
                                onClick={handleSave}
                                disabled={isPending}
                                className="gap-2"
                            >
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Save Project
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────── */}
            {/* Step 4: Saving                                   */}
            {/* ───────────────────────────────────────────────── */}
            {step === "saving" && (
                <Card>
                    <CardContent className="py-16">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <h3 className="text-lg font-medium">
                                Saving your project...
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Creating scenes, characters, and film identity
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ───────────────────────────────────────────────── */}
            {/* Error State                                      */}
            {/* ───────────────────────────────────────────────── */}
            {error && step === "input" && (
                <Card className="border-destructive/50 mt-4">
                    <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-destructive">
                                    Generation failed
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {error}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto h-6 w-6 shrink-0"
                                onClick={() => setError(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────

function getStepLabel(step?: string): string {
    switch (step) {
        case "extracting_scenes":
            return "Extracting scenes";
        case "extracting_characters":
            return "Analyzing characters";
        case "generating_identity":
            return "Generating identity";
        case "generating_descriptions":
            return "Creating descriptions";
        case "complete":
            return "Complete";
        default:
            return "Initializing";
    }
}

function getStepOrder(step?: string): number {
    switch (step) {
        case "extracting_scenes":
            return 1;
        case "extracting_characters":
            return 2;
        case "generating_identity":
            return 3;
        case "generating_descriptions":
            return 4;
        case "complete":
            return 5;
        default:
            return 0;
    }
}
