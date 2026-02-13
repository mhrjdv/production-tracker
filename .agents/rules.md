# rules.md

Canonical shared rules for all agent directories in this project.

## Directory Policy

- `.agents` is canonical.
- `.agent`, `.cursor`, `.codex` should use symlinks to canonical skills/rules.

## Skill Discovery + Installation

1. Discover
- `npx skills find "<query>"`

2. Install
- `npx skills add <owner/repo@skill> -g -y`

3. Verify
- check skill is visible under global shared skills path.

## Context7 Policy

- For tool/library uncertainty, use Context7 before improvising.
- Always call `resolve-library-id` first, then `query-docs`.

## Skill Creation Policy

Use `skill-creator` when any repeated workflow appears at least 3 times, especially:
- multi-platform prompt adaptation
- scene asset QA rubric
- extension capture validation
- rights/licensing checks by platform

## Product-Specific UX Rules

- Scene is the primary object.
- Version is immutable append-only.
- Prompt package is reusable across platforms.
- Platform-specific transforms are generated, not hand-copied.
- Every output should have provenance metadata (`source`, `model`, `timestamp`, `platform`, `cost_estimate`, `rights_state`).

## Chrome Extension Rules

The extension should stay minimal with tab sections:

1. `Capture`
- Project, Scene, Platform, Type, Prompt.
- Auto-detect platform from URL and auto-fill context.

2. `Reuse`
- Load previous scene prompt/version.
- One-click apply prompt to current page.

3. `Sync`
- Queue size, retry status, sync now.
- Show small preview cards for latest captured outputs.

4. `Settings`
- App URL, token, optional BYOK provider/model/key.

## Research Rules

- Use current-year web research for market/platform changes.
- Prefer official docs/help/pricing pages.
- Add Reddit/user-community evidence for friction assumptions.

## Source Reference

- Full research and product plan: `docs/ai-film-product-plan-2026.md`
