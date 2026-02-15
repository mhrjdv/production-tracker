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

## Product Identity

Laserman = **orchestration and traceability layer** for AI film production. No native generation.

Lifecycle: draft -> generate elsewhere -> capture -> compare -> select -> approve -> assemble.

## Object Model Rules

- **Project -> Script -> Scene -> Shot -> Asset Version** is the hierarchy.
- Shot is the unit of capture. Scene is the grouping container.
- Prompt Package is reusable across platforms, versioned per scene/shot.
- Asset Version is immutable. Never update — always create new version.
- Selected boolean marks the winner. Only one winner per scope at a time.

## Immutability Rules

- Never overwrite a SceneAssetVersion. Always create a new one.
- `parentVersionId` tracks derivation for remix/regen.
- `compareGroup` groups versions from the same prompt intent for side-by-side comparison.
- Selection is not deletion. All versions remain accessible.

## UX Rules

### Web App
- Scene and Shot views are the primary workspace. Everything else supports them.
- Script excerpt always visible when editing scene/shot (recognition not recall).
- Show parse progress, sync status, queue state (visibility of system status).
- Keyboard shortcuts for power users. Command palette (`Cmd+K`) for global search.
- Timeline shows selected winners only by default.

### Chrome Extension
- Side panel (NOT popup) with exactly four modes:
  1. **Context** — project/scene/shot/asset type/prompt package selectors
  2. **Capture** — auto-detected outputs, one-click save
  3. **Reuse** — prompt package picker, apply to page
  4. **Queue** — sync status, retry, failures

### Capture Defaults
- Default to last-active context (project/scene/shot/asset type).
- If prompt contains ID pattern (`S001_SH003`), auto-suggest match.
- One-click save: no complex forms. Single inline selector with search if context is missing.

## Extension Rules

- DOM-based capture only. No network sniffing (MV3 constraint).
- Fallback: metadata + screenshot when direct media URL extraction fails.
- Progressive permissions: request host permissions per-platform, not blanket.
- Queue is offline-resilient: chrome.storage.local, alarm-driven sync, exponential backoff.
- Bearer token auth for all API calls.

## Rights and Provenance Rules

- Every version must have a `rightsState` (UNKNOWN, NON_COMMERCIAL, COMMERCIAL_ALLOWED, RESTRICTED).
- `provenance` JSON tracks: platform, plan, model, capture method, timestamp, watermark markers.
- Surface uncertainty clearly. Do not overpromise automation.
- "OK to ship?" checklist is a UI computation — derive from provenance + rightsState.
- Platform plan level stored per-user per-platform in extension preferences.

## Schema Rules

- Name migrations: `YYYYMMDDHHMMSS_description`
- New FK columns are always nullable for backward compatibility.
- Add indexes on FKs and frequently-queried columns.
- `versionNumber` auto-increments per scope (scene + shot + platformKey + assetType).
- JSON fields: `metadata`, `provenance`, `constraints`, `setting`, `camera`, `references`.

## Server Action Rules

- Authenticate first with `auth()`.
- Validate all input with Zod.
- Use `prisma.$transaction` for multi-step mutations.
- Return `{ success, data?, error? }` shape.
- Call `revalidatePath()` after mutations.

## Research Rules

- Use current-year web research for market/platform changes.
- Prefer official docs/help/pricing pages.
- Add Reddit/user-community evidence for friction assumptions.

## Source Reference

- Product research: `docs/laserman-ux-product-research-2026.md`
- Market plan: `docs/ai-film-product-plan-2026.md`
- System blueprint: `docs/production-ai-system-blueprint-2026.md`
