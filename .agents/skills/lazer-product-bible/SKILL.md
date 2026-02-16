---
name: lazer-product-bible
description: >
  Canonical product definition for Lazer V2 — an AI film production orchestration and traceability layer.
  Use when making ANY product decision, designing features, prioritizing work, writing copy, or evaluating scope.
  Use when asked about: product strategy, what Lazer is, object model, UX philosophy, phased roadmap,
  competitive positioning, what to build vs what NOT to build. Triggers on: "what should we build",
  "product direction", "feature priority", "roadmap", "object model", "how does Lazer work",
  "what is the product", design reviews, scope discussions, architecture decisions.
---

# Lazer Product Bible

## Identity

Lazer is an **orchestration and traceability layer** for AI-assisted film production. It sits between a script/production structure and the ecosystem of third-party generation tools. It does NOT generate media.

**Tagline:** "Generate anywhere, decide here, ship with traceability."

## What Lazer IS

- A scene-centric production control tower for AI-generated content
- An opinionated filing system: draft -> generate elsewhere -> capture -> compare -> select -> approve -> assemble
- A prompt lineage tracker (prompt packages -> fan-out -> captured versions)
- A Chrome extension bridge for one-click capture from generation platforms
- A rights and provenance surface ("we track what we can, surface uncertainty clearly")

## What Lazer is NOT

- NOT a media generator (no image/audio/video generation)
- NOT a general project management tool (no tasks, sprints, assignments)
- NOT a universal DAM (only AI-generated production assets with provenance)
- NOT a ShotGrid/ftrack clone (no deep pipeline integration, no render farm)

## Object Model

```
Project
  Script (source file + parsed representation)
    Scene (from script parse, editable, permanent ID anchor)
      Shot (inside scene — the real unit of capture/angle)
        Asset Type (image, video, audio, music, voice, etc.)
          Asset Version (immutable capture record with full provenance)
      Prompt Package (reusable intent bundle, versioned)
```

**Critical rule:** Shot MUST exist as a first-class object. Without it, users hack naming conventions and data rots. See [references/object-model.md](references/object-model.md) for full field specs.

## Opinionated Defaults (Non-Negotiable)

1. **Versions are immutable.** Never overwrite. Always append. Selection is not deletion.
2. **Shot is the unit of capture.** Not Scene. A scene has many shots/angles.
3. **One-click save.** Context defaults from last-active project/scene/shot. No complex forms.
4. **Selected winners drive timeline.** Timeline and exports show selected versions by default.
5. **Three platforms done well > twenty done poorly.** Phase 1 targets Sora, Gemini/Veo, Freepik.
6. **Prompt packages are reusable.** Create once, fan out to multiple platforms.
7. **Rights state is always tracked.** Every version has a rights state (unknown/non-commercial/commercial/restricted).
8. **DOM-based capture, not network sniffing.** MV3 constraint. Fallback to metadata + screenshot.

## UX Modes

The product supports two simultaneous modes:
- **Studio process:** structure, review, approval, export (web app)
- **Creator speed:** capture, reuse, iterate fast (Chrome extension)

## Navigation (Web App)

Ruthlessly limited to views that map to real decisions:
- **Production:** Scene list grouped by act/sequence, shot breakdown per scene
- **Scene detail:** script excerpt, shot list, assets gallery, selected winners
- **Shot detail:** prompt packages, captured versions (grid + compare), approvals
- **Timeline:** assembly lanes (selected winners by default), optional all-versions overlay
- **Search:** global command palette for scenes/shots/versions/prompts

## Extension Modes

Exactly four modes in the side panel:
- **Context:** active project/scene/shot/asset type/prompt package
- **Capture:** auto-detected outputs, one-click save, batch save
- **Reuse:** prompt package picker, apply to page, copy to clipboard
- **Queue:** sync status, retry, failures

## Phased Roadmap

See [references/ux-flows.md](references/ux-flows.md) for detailed flows per phase.

### Phase 1: Capture and Filing System
- Shot as first-class object in schema and UI
- Side panel capture on 3 platforms (Sora, Gemini/Veo, Freepik)
- Immutable versioning, compare groups, winner selection
- Keyboard accelerators, command palette

### Phase 2: Review and Approvals
- Status routing: Draft -> Needs Review -> Reviewed -> Approved -> Final
- Frame-accurate video compare, annotation, decision logging
- Audit history per version

### Phase 3: Standards and Pipeline Credibility
- OTIO export for NLE handoff
- Provenance surfacing (SynthID, C2PA)
- Export manifests with per-scene legal metadata

## Decision Framework

When evaluating a feature request:
1. Does it serve the orchestration/traceability wedge?
2. Does it make capture or selection faster?
3. Does it add provenance or rights clarity?
4. Can it ship without native generation?

If no to all four, it is out of scope.

## References

- Full UX flows and interaction patterns: [references/ux-flows.md](references/ux-flows.md)
- Object model field specs and schema gaps: [references/object-model.md](references/object-model.md)
- Rights, provenance, and platform licensing: [references/rights-provenance.md](references/rights-provenance.md)
- Product research source: `docs/lazer-ux-product-research-2026.md`
- Market and execution plan: `docs/ai-film-product-plan-2026.md`
