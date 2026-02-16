# CLAUDE.md

Operational guide for Claude-compatible agents in this repo.

## Priority

1. Follow `AGENTS.md`
2. Follow `.agents/rules.md`
3. Follow task-specific skills

## Skill Usage Contract

- If the task touches **product decisions, scope, or roadmap**: apply `lazer-product-bible`.
- If the task touches **database, schema, or migrations**: apply `lazer-schema`.
- If the task touches **web app pages, components, or server actions**: apply `lazer-webapp-dev`.
- If the task touches **Chrome extension, capture, or sync**: apply `lazer-extension-dev`.
- If the task requests **UI/UX design**: apply `ui-ux-pro-max` + `frontend-design`.
- If the task requests **discovery**: run `find-skills` flow first.
- If the task requests **new reusable behavior**: apply `skill-creator`.
- If APIs/tooling are unclear: use Context7 (`resolve-library-id` -> `query-docs`).

## Product Context

Lazer is an **orchestration and traceability layer** for AI-assisted film production. It does NOT generate media. It manages: draft -> generate elsewhere -> capture -> compare -> select -> approve -> assemble.

**Object hierarchy:** Project -> Script -> Scene -> Shot -> Asset Version + Prompt Package.

**Tagline:** "Generate anywhere, decide here, ship with traceability."

## UX Direction

- **Side panel** for Chrome extension (not popup) — persistent workflow alongside generation platforms.
- Four extension modes only: Context, Capture, Reuse, Queue.
- One-click save with ruthless defaults from last-active context.
- Capture once, fan out to multiple platforms, preserve per-platform versions.
- Shot is the unit of capture. Scene is the grouping container.
- Versions are immutable. Selection is not deletion.
- Rights state tracked on every version.

## Output Expectations

- Include concrete implementation steps, not generic design advice.
- Include migration-safe schema/action changes.
- Add links for external facts and platform constraints.
- Follow opinionated defaults from the product research.

## Reference

- `docs/lazer-ux-product-research-2026.md` — Canonical product research
- `docs/ai-film-product-plan-2026.md` — Market and execution plan
- `docs/production-ai-system-blueprint-2026.md` — System architecture
- `.agents/rules.md` — Runtime rules
