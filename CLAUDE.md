# CLAUDE.md

Operational guide for Claude-compatible agents in this repo.

## Priority

1. Follow `AGENTS.md`
2. Follow `.agents/rules.md`
3. Follow task-specific skills

## Skill Usage Contract

- If the task requests discovery: run `find-skills` flow first.
- If the task requests UI/UX: apply `ui-ux-pro-max` + `frontend-design`.
- If the task requests new reusable behavior: apply `skill-creator`.
- If APIs/tooling are unclear: use Context7 (`resolve-library-id` -> `query-docs`).

## Product Context

This project manages AI-assisted film production with scene-centric versioning and extension-based capture from external generation tools.

## UX Direction

- Keep Chrome extension workflow minimal and tabbed.
- Favor defaults and auto-detection from active tab URL/context.
- Capture once, fan out to multiple platforms, and preserve per-platform versions.

## Output Expectations

- Include concrete implementation steps, not generic design advice.
- Include migration-safe schema/action changes.
- Add links for external facts and platform constraints.

## Reference

- `docs/ai-film-product-plan-2026.md`
- `.agents/rules.md`
