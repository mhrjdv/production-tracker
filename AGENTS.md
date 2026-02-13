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

- `ui-ux-pro-max`
- `frontend-design`
- `behavioral-product-design`
- `product-designer`
- `vercel-react-best-practices`
- `web-design-guidelines`
- `find-skills`
- `skill-creator`

## Product Rules

- Treat this product as a multimodal production OS (script, image, video, audio, music, voice).
- Preserve scene-level version history as the core primitive.
- Optimize for minimal user effort in the Chrome extension (fast capture, auto-detect, tabbed flow).
- Never overwrite user-created versions; always append immutable versions with metadata.

## Research + Planning Rules

- For market/current-platform questions, use web research with current dates.
- Prefer official docs/pricing/help pages and add source links.
- For community pain points, include Reddit evidence but treat it as directional.

## Reference

- Detailed 2026 product and UX plan: `docs/ai-film-product-plan-2026.md`
- Canonical runtime rules: `.agents/rules.md`
