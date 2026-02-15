# AGENTS.md

This repository uses a shared skill and rules setup across `.agents`, `.agent`, `.cursor`, and `.codex`.

## Skill Source Of Truth

- Canonical skills folder: `.agents/skills`
- Other agent folders should symlink to canonical skills/rules.
- Do not duplicate skill logic in multiple folders.

## Required Skill Workflow

1. Discover skills first for new capability requests.
- Run: `npx skills find "<task or domain>"`
- Example: `npx skills find "product design"`

2. Install only relevant skills.
- Run: `npx skills add <owner/repo@skill> -g -y`
- Restart agent clients after install to load new skills.

3. Use Context7 when skill/tool behavior is unclear.
- First: `mcp__context7__resolve-library-id`
- Then: `mcp__context7__query-docs`

4. Create or update internal skills when repeated workflows are missing.
- Use the `skill-creator` skill.
- Keep each skill focused (single problem domain, explicit triggers, reproducible steps).

## Default Skills For This Project

### General
- `ui-ux-pro-max` — Advanced UI/UX design patterns
- `frontend-design` — Production-grade frontend interfaces
- `behavioral-product-design` — Behavioral science for product design
- `product-designer` — Expert product design
- `vercel-react-best-practices` — React/Next.js optimization
- `web-design-guidelines` — Web design standards
- `find-skills` — Skill discovery
- `skill-creator` — Create new skills

### Laserman-Specific
- `laserman-product-bible` — Product definition, object model, UX philosophy, roadmap
- `laserman-schema` — Database schema, migrations, data model patterns
- `laserman-webapp-dev` — Web app pages, components, server actions, API routes
- `laserman-extension-dev` — Chrome extension, side panel, capture algorithm, platform detectors

## Product Identity

Laserman is an **orchestration and traceability layer** for AI-assisted film production. It does NOT generate media. It manages the lifecycle: draft -> generate elsewhere -> capture -> compare -> select -> approve -> assemble.

**Tagline:** "Generate anywhere, decide here, ship with traceability."

## Product Rules (Non-Negotiable)

1. **Shot is first-class.** The Shot model is the unit of capture inside a Scene. Scene alone is not enough.
2. **Versions are immutable.** Never overwrite. Always append. Selection is not deletion.
3. **One-click save.** Context defaults from last-active project/scene/shot. No complex forms.
4. **Selected winners drive timeline.** Timeline and exports show selected versions by default.
5. **Three platforms done well > twenty done poorly.** Phase 1: Sora, Gemini/Veo, Freepik.
6. **Prompt packages are reusable.** Create once, fan out to multiple platforms.
7. **Rights state is always tracked.** Every version has a rights state.
8. **DOM-based capture.** MV3 constraint. No network sniffing. Fallback to metadata + screenshot.
9. **Side panel, not popup.** Chrome Side Panel API for persistent workflow.
10. **Opinionated defaults.** One good way of doing things, not infinite workflows.

## UX Heuristics

- **Visibility of system status:** parse progress, sync status, queue state always visible
- **Recognition not recall:** script excerpt inline, context breadcrumbs, metadata overlays
- **Flexibility for experts:** keyboard shortcuts, command palette, batch actions

## Object Hierarchy

```
Project -> Script -> Scene -> Shot -> Asset Version
                                  -> Prompt Package
```

## Chrome Extension Rules

Side panel with exactly four modes:
1. **Context** — active project/scene/shot/asset type/prompt package
2. **Capture** — auto-detected outputs, one-click save, batch save
3. **Reuse** — prompt package picker, apply to page
4. **Queue** — sync status, retry, failures

## Phased Roadmap

- **Phase 1:** Shot model, side panel capture on 3 platforms, immutable versioning, compare groups, winner selection, keyboard accelerators
- **Phase 2:** Status routing (Needs Review -> Approved -> Final), frame-accurate video compare, annotation, audit history
- **Phase 3:** OTIO export, provenance surfacing (SynthID, C2PA)

## Research + Planning Rules

- For market/current-platform questions, use web research with current dates.
- Prefer official docs/pricing/help pages and add source links.
- For community pain points, include Reddit evidence but treat it as directional.

## Reference

- Canonical product research: `docs/laserman-ux-product-research-2026.md`
- Market and execution plan: `docs/ai-film-product-plan-2026.md`
- System architecture: `docs/production-ai-system-blueprint-2026.md`
- Canonical runtime rules: `.agents/rules.md`
