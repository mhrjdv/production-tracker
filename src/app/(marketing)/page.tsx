import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth/server";
import {
  Film,
  Layers,
  GitCompareArrows,
  Chrome,
  ArrowRight,
  Github,
  Crosshair,
  Clock,
  Sparkles,
  LayoutDashboard,
  Bot,
  Plug,
  PanelRight,
  Wifi,
  WifiOff,
  Eye,
  Terminal,
  Globe,
  Shield,
  Cpu,
  MessageSquare,
  Wrench,
  BookOpen,
  Zap,
  Linkedin,
  Twitter,
} from "lucide-react";

export const metadata = {
  title: "Lazer — AI Film Production Orchestration",
  description:
    "Generate anywhere, decide here, ship with traceability. The open-source orchestration layer for AI-assisted film production.",
};

async function AuthNav() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Get Started
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* ─── Nav ─────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Film className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Lazer</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#extension"
              className="hover:text-foreground transition-colors"
            >
              Extension
            </a>
            <a href="#mcp" className="hover:text-foreground transition-colors">
              MCP
            </a>
            <a
              href="#workflow"
              className="hover:text-foreground transition-colors"
            >
              Workflow
            </a>
            <Link
              href="/docs"
              className="hover:text-foreground transition-colors"
            >
              Docs
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="flex items-center gap-3">
                <div className="h-9 w-24 rounded-lg bg-muted/30 animate-pulse" />
              </div>
            }
          >
            <AuthNav />
          </Suspense>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-b from-primary/8 to-transparent blur-3xl" />
          <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-500/5 to-transparent blur-3xl" />
          <div className="absolute top-40 right-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-bl from-emerald-500/5 to-transparent blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Open source &middot; Self-hostable &middot; MCP-native
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              Project tracking &amp;
              <br />
              visibility for{" "}
            </span>
            <span className="bg-gradient-to-r from-primary via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              AI filmmakers.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            The orchestration and traceability layer for AI film production.
            Capture from any platform, compare versions, track decisions &mdash;
            ship with full provenance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/mhrjdv/production-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-all"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>

        {/* Hero visual — abstract timeline representation */}
        <div className="relative mx-auto max-w-5xl mt-20">
          <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-1 shadow-2xl shadow-black/20">
            <div className="rounded-xl bg-gradient-to-b from-muted/30 to-card overflow-hidden">
              {/* Mock NLE timeline */}
              <div className="p-6 space-y-3">
                {/* Ruler */}
                <div className="flex items-end gap-px h-6">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center justify-end"
                    >
                      {i % 6 === 0 && (
                        <span className="text-[9px] text-muted-foreground/40 font-mono mb-0.5">
                          S{String(i + 1).padStart(3, "0")}
                        </span>
                      )}
                      <div
                        className={`w-px ${i % 6 === 0 ? "h-3 bg-border/60" : "h-1.5 bg-border/30"}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Track lanes */}
                {[
                  {
                    label: "Story",
                    color: "bg-slate-500/20",
                    accent: "bg-slate-400/40",
                  },
                  {
                    label: "V1 — Image",
                    color: "bg-cyan-500/15",
                    accent: "bg-cyan-400/35",
                  },
                  {
                    label: "V2 — Video",
                    color: "bg-emerald-500/15",
                    accent: "bg-emerald-400/30",
                  },
                  {
                    label: "A1 — Audio",
                    color: "bg-amber-500/15",
                    accent: "bg-amber-400/30",
                  },
                ].map((lane) => (
                  <div key={lane.label} className="flex items-center gap-3">
                    <span className="text-[10px] font-medium text-muted-foreground/50 w-20 shrink-0 text-right">
                      {lane.label}
                    </span>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 24 }).map((_, i) => {
                        const seed = (i * 7 + lane.label.length * 13) % 10;
                        const filled = seed > 2;
                        const isSelected = filled && seed > 6;
                        return (
                          <div
                            key={i}
                            className={`flex-1 h-7 rounded-sm transition-all ${
                              filled ? lane.accent : lane.color
                            } ${isSelected ? "ring-1 ring-emerald-400/50" : ""}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glow effect under the card */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-t from-primary/5 to-transparent blur-2xl pointer-events-none" />
        </div>
      </section>

      {/* ─── Features ────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for AI film production
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Not another AI generator. A decision layer that sits between you
              and every platform you use.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Chrome,
                title: "Capture from anywhere",
                description:
                  "Chrome extension captures prompts, outputs, and metadata from Sora, Gemini, Freepik, and more. One click.",
              },
              {
                icon: GitCompareArrows,
                title: "Compare & select",
                description:
                  "Side-by-side comparison of asset versions. Track which platform produced what, and why you chose it.",
              },
              {
                icon: Crosshair,
                title: "Shot-level precision",
                description:
                  "Every scene breaks down into shots. Every shot tracks its own prompt packages, versions, and selections.",
              },
              {
                icon: Layers,
                title: "Full traceability",
                description:
                  "From script to final frame, every decision is versioned and traceable. Immutable version history.",
              },
              {
                icon: Clock,
                title: "NLE-style timeline",
                description:
                  "Drag-and-drop timeline with zoom levels, holding area, and act dividers. Sequence your film visually.",
              },
              {
                icon: Bot,
                title: "AI agent access",
                description:
                  "Built-in MCP server with 53 tools. Let Claude, ChatGPT, or Cursor manage your production directly.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border/40 bg-card/50 p-6 hover:border-border/80 hover:bg-card/80 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Chrome Extension ──────────────────────── */}
      <section id="extension" className="py-24 px-6 border-t border-border/30">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground mb-6">
                <Chrome className="h-3.5 w-3.5" />
                Chrome Extension
              </div>

              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Capture without
                <br />
                leaving the platform.
              </h2>

              <p className="text-muted-foreground leading-relaxed mb-8">
                A persistent side panel that lives alongside Sora, Veo,
                Midjourney, and every other generation platform. Auto-detects
                outputs, extracts prompts and parameters, and saves everything
                to the right shot in one click.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: PanelRight,
                    title: "Side Panel API",
                    desc: "Always visible alongside your generation tab. No popup juggling.",
                  },
                  {
                    icon: Eye,
                    title: "Auto-detection",
                    desc: "Platform detectors for Sora, Veo, Midjourney, Freepik, Runway, ElevenLabs, and Suno.",
                  },
                  {
                    icon: Zap,
                    title: "One-click capture",
                    desc: "Ruthless defaults from your last-active context. Project, scene, shot — pre-filled.",
                  },
                  {
                    icon: WifiOff,
                    title: "Offline queue",
                    desc: "Captures queue locally and sync when connection returns. Never lose a generation.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — mock side panel */}
            <div className="relative">
              <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-1 shadow-2xl shadow-black/20">
                <div className="rounded-xl bg-gradient-to-b from-muted/30 to-card overflow-hidden">
                  {/* Side panel header */}
                  <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                        <Film className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-semibold">Lazer</span>
                    </div>
                    <div className="flex gap-1">
                      {["Context", "Capture", "Reuse", "Queue"].map(
                        (tab, i) => (
                          <span
                            key={tab}
                            className={`text-[10px] px-2.5 py-1 rounded-md font-medium ${
                              i === 1
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            {tab}
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Detection result */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Platform detected: Sora
                      </span>
                    </div>

                    {/* Mock captured image */}
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-slate-800 via-indigo-900/40 to-slate-900 flex items-center justify-center border border-border/20">
                      <div className="text-center space-y-1">
                        <Film className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                        <span className="text-[10px] text-muted-foreground/40">
                          Video output detected
                        </span>
                      </div>
                    </div>

                    {/* Mock metadata */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Shot</span>
                        <span className="font-mono text-foreground/80">
                          S003-SH002
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-mono text-foreground/80">
                          Sora v1
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="block mb-1">Prompt</span>
                        <span className="block text-foreground/70 font-mono text-[11px] leading-relaxed bg-muted/30 rounded-md px-2.5 py-2">
                          &quot;Aerial tracking shot over neon-lit city at dusk,
                          volumetric fog...&quot;
                        </span>
                      </div>
                    </div>

                    {/* CTA button */}
                    <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                      Save Capture
                    </button>
                  </div>
                </div>
              </div>

              {/* Glow */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-gradient-to-t from-primary/5 to-transparent blur-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── MCP Server ────────────────────────────── */}
      <section id="mcp" className="py-24 px-6 border-t border-border/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground mb-6">
              <Plug className="h-3.5 w-3.5" />
              Model Context Protocol
            </div>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Let your AI manage
              <br />
              the production.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              53 tools, 7 resources, 5 prompts. Connect Claude, ChatGPT, or
              Cursor to create projects, break down scenes, generate shots,
              review assets, and approve finals &mdash; all through natural
              conversation.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-16">
            {[
              { value: "53", label: "Tools", sublabel: "across 11 domains" },
              {
                value: "7",
                label: "Resources",
                sublabel: "live schema + docs",
              },
              { value: "5", label: "Prompts", sublabel: "workflow templates" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center rounded-xl border border-border/40 bg-card/50 py-5 px-3"
              >
                <div className="text-3xl font-bold tracking-tight mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium">{stat.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {stat.sublabel}
                </div>
              </div>
            ))}
          </div>

          {/* Client cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-16">
            {[
              {
                icon: MessageSquare,
                name: "ChatGPT",
                transport: "OAuth 2.0 + HTTP",
                setup:
                  "Add as MCP server with one URL. OAuth handles auth automatically.",
                accent: "from-emerald-500/10 to-emerald-500/5",
              },
              {
                icon: Terminal,
                name: "Claude Desktop",
                transport: "STDIO",
                setup:
                  "Add to claude_desktop_config.json. Token-based auth. Instant.",
                accent: "from-orange-500/10 to-orange-500/5",
              },
              {
                icon: Cpu,
                name: "Cursor",
                transport: "STDIO",
                setup:
                  "Same STDIO config as Claude Desktop. All tools in the AI panel.",
                accent: "from-blue-500/10 to-blue-500/5",
              },
            ].map((client) => (
              <div
                key={client.name}
                className="group rounded-xl border border-border/40 bg-card/50 overflow-hidden hover:border-border/80 transition-all duration-300"
              >
                <div className={`h-1 bg-gradient-to-r ${client.accent}`} />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <client.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{client.name}</h3>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {client.transport}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {client.setup}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tool domains — mock terminal */}
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono ml-2">
                  MCP tools/list
                </span>
              </div>

              {/* Tool domains */}
              <div className="p-5 font-mono text-[12px] leading-relaxed space-y-0.5">
                {[
                  {
                    domain: "project",
                    count: 5,
                    examples: "list, get, create, update, delete",
                  },
                  {
                    domain: "scene",
                    count: 7,
                    examples: "list, get, create, reorder, keyframe...",
                  },
                  {
                    domain: "shot",
                    count: 6,
                    examples: "list, get, create, update, reorder...",
                  },
                  {
                    domain: "character",
                    count: 6,
                    examples: "list, get, create, portrait...",
                  },
                  {
                    domain: "relationship",
                    count: 6,
                    examples: "scene_assign, shot_sync...",
                  },
                  {
                    domain: "asset",
                    count: 8,
                    examples: "list, create, select, fanout, compare...",
                  },
                  {
                    domain: "prompt_pkg",
                    count: 3,
                    examples: "list, get, create",
                  },
                  {
                    domain: "platform",
                    count: 4,
                    examples: "list, get, create, update",
                  },
                  { domain: "search", count: 2, examples: "assets, scenes" },
                  {
                    domain: "workflow",
                    count: 4,
                    examples: "ingest, project_tree, status...",
                  },
                  { domain: "identity", count: 2, examples: "get, upsert" },
                ].map((d) => (
                  <div key={d.domain} className="flex items-baseline">
                    <span className="text-emerald-500 dark:text-emerald-400 w-28 shrink-0">
                      {d.domain}
                    </span>
                    <span className="text-muted-foreground/60 w-8 shrink-0 text-right mr-3">
                      {d.count}
                    </span>
                    <span className="text-muted-foreground/40 truncate">
                      {d.examples}
                    </span>
                  </div>
                ))}
                <div className="pt-2 text-muted-foreground/50">
                  <span className="text-foreground/70">Total: 53 tools</span>{" "}
                  registered across 11 domains
                </div>
              </div>
            </div>
          </div>

          {/* Features row */}
          <div className="grid gap-4 md:grid-cols-4 mt-12 max-w-4xl mx-auto">
            {[
              { icon: Shield, label: "OAuth 2.0 + PKCE" },
              { icon: Globe, label: "Self-hostable" },
              { icon: Wrench, label: "Zod-validated inputs" },
              { icon: BookOpen, label: "Schema as a resource" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/30 px-4 py-3"
              >
                <f.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Workflow ────────────────────────────── */}
      <section id="workflow" className="py-24 px-6 border-t border-border/30">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Your workflow, organized
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From script to screen in a structured pipeline.
            </p>
          </div>

          <div className="space-y-0">
            {[
              {
                step: "01",
                title: "Upload your script",
                desc: "AI parses scenes, characters, and story beats automatically.",
              },
              {
                step: "02",
                title: "Generate on any platform",
                desc: "Use Sora, Gemini, Midjourney, Runway &mdash; whatever fits the shot.",
              },
              {
                step: "03",
                title: "Capture with one click",
                desc: "Chrome extension grabs the output, prompt, and platform metadata.",
              },
              {
                step: "04",
                title: "Compare & decide",
                desc: "Side-by-side versions, organized by scene and shot. Select your pick.",
              },
              {
                step: "05",
                title: "Assemble & ship",
                desc: "Timeline view for sequencing. Export with full provenance data.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="flex gap-6 items-start py-6 group"
              >
                <div className="shrink-0 flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                    <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors font-mono">
                      {item.step}
                    </span>
                  </div>
                  {i < 4 && (
                    <div className="w-px h-12 bg-gradient-to-b from-border/40 to-transparent" />
                  )}
                </div>
                <div className="pt-1.5">
                  <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Open Source ──────────────────────────── */}
      <section
        id="open-source"
        className="py-24 px-6 border-t border-border/30"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground mb-6">
            <Github className="h-3.5 w-3.5" />
            100% Open Source
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Fully open source.
            <br />
            <span className="text-muted-foreground">No vendor lock-in.</span>
          </h2>

          <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Lazer is completely open source under the MIT license. Self-host it,
            extend it, contribute to it. Your production data stays yours.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/mhrjdv/production-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-all"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Read the Docs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to organize your
            <br />
            AI production?
          </h2>
          <p className="text-muted-foreground mb-8">
            Free and open source. Get started in under 2 minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            Create Free Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────── */}
      <footer className="border-t border-border/30 py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Film className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Lazer</span>
            <span className="text-xs text-muted-foreground/50 ml-1">
              MIT License
            </span>
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/docs"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <a
              href="https://github.com/mhrjdv/production-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/mhrjdv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/-mihirjadhav/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
