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
              href="#workflow"
              className="hover:text-foreground transition-colors"
            >
              Workflow
            </a>
            <a
              href="#open-source"
              className="hover:text-foreground transition-colors"
            >
              Open Source
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
            Open source &middot; Self-hostable
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              Generate anywhere.
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Decide here.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            The orchestration and traceability layer for AI film production.
            Capture from any platform, compare versions, track decisions &mdash;
            ship with full provenance.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/mihir-lazer/lazer-v2"
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
                icon: Sparkles,
                title: "AI-powered bible",
                description:
                  "Auto-generated creative bible from your script. Characters, world-building, cinematography &mdash; all structured.",
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
              href="https://github.com/mihir-lazer/lazer-v2"
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
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link
              href="/docs"
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </Link>
            <a
              href="https://github.com/mihir-lazer/lazer-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
