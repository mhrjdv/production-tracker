# Object Model Reference

## Hierarchy

```
Project
  Script
    Scene (permanent ID anchor: S001, S002...)
      Shot (SH001, SH002... inside scene)
        Asset Version (immutable, per asset type)
      Prompt Package (versioned: P1, P2...)
```

## Shot (NEW — must be added)

The Shot model does not yet exist in the Prisma schema. It is the critical missing piece.

### Shot Fields (Target)

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| shotCode | String | User-facing code (SH001, SH002) |
| sceneId | FK -> Scene | Parent scene |
| description | String | Shot description/intent |
| angle | String? | Camera angle (wide, medium, close-up, OTS, etc.) |
| framing | String? | Framing notes |
| movement | String? | Camera movement (pan, tilt, dolly, static, etc.) |
| lensNotes | String? | Lens/focal length notes |
| sortOrder | Int | Order within scene |
| references | Json? | Attached reference images/style refs |

### Migration Impact

When Shot is added:
- SceneAssetVersion gains `shotId` (FK -> Shot, nullable for backward compat)
- PromptPackage gains `shotId` (FK -> Shot, nullable — can be scene-level or shot-level)
- Extension ingest API adds optional `shotId` field
- Unique constraint on SceneAssetVersion changes to include shotId

## Asset Version Fields (Current — complete)

| Field | Type | Purpose | Category |
|-------|------|---------|----------|
| id | cuid | PK | Identity |
| sceneId | FK | Where: scene | Location |
| shotId | FK (future) | Where: shot | Location |
| promptPackageId | FK? | How: source prompt | Lineage |
| platformId | FK? | How: generation platform | Lineage |
| parentVersionId | FK? | Lineage: derived from | Lineage |
| platformKey | String | Platform slug | Identity |
| platformLabel | String | Platform display name | Identity |
| assetType | Enum | What: IMAGE/VIDEO/AUDIO/etc. | Identity |
| status | Enum | DRAFT/GENERATED/SELECTED/REJECTED/ARCHIVED | Governance |
| rightsState | Enum | UNKNOWN/NON_COMMERCIAL/COMMERCIAL_ALLOWED/RESTRICTED | Governance |
| versionNumber | Int | Auto-increment per scope | Identity |
| title | String? | User-facing title | Identity |
| prompt | Text | Full prompt text | How |
| negativePrompt | Text? | Negative prompt | How |
| modelName | String? | AI model used | How |
| sourceUrl | String? | Platform page URL | How |
| externalAssetId | String? | Platform's asset ID | How |
| outputUrl | String? | Stored media URL (R2) | What |
| thumbnailUrl | String? | Preview thumbnail URL | What |
| costEstimateUsd | Float? | Estimated cost | Metrics |
| generationSeconds | Int? | Generation time | Metrics |
| queueWaitSeconds | Int? | Queue wait time | Metrics |
| compareGroup | String? | Fan-out grouping key | Lineage |
| metadata | Json? | Platform-specific params | How |
| provenance | Json? | Policy snapshot + markers | Governance |
| tags | String[] | User tags | Organization |
| notes | Text? | User notes | Organization |
| selected | Boolean | Winner flag | Governance |

## Prompt Package Fields (Current)

| Field | Type | Purpose |
|-------|------|---------|
| id | cuid | PK |
| sceneId | FK | Parent scene |
| shotId | FK (future) | Parent shot (optional) |
| versionNumber | Int | P1, P2, P3... |
| name | String? | Display name |
| prompt | Text | Base prompt |
| negativePrompt | Text? | Negative prompt |
| constraints | Json? | Platform constraints |
| targetAspectRatio | String? | e.g. "16:9" |
| targetDurationSec | Int? | Video duration target |
| styleProfile | String? | Style reference |
| tags | String[] | Tags |
| metadata | Json? | Additional params |

## Compare Groups

A compareGroup is a string key that groups versions for side-by-side comparison. Default grouping: `{promptPackageId}_{shotId}_{timestamp_window}`. All versions in a compare group were generated from the same intent and should be compared together.

## Status Ladder

```
Draft -> Generated -> [Needs Review] -> [Reviewed] -> Selected -> [Approved] -> [Final]
```

Brackets indicate Phase 2 additions. Current schema supports: DRAFT, GENERATED, SELECTED, REJECTED, ARCHIVED.

## Naming Conventions

- Scene IDs: `S001`, `S002`, `S003` (zero-padded, permanent)
- Shot codes: `SH001`, `SH002` (within scene, zero-padded)
- Prompt packages: `P1`, `P2` (version number within scene/shot)
- Version numbers: auto-increment per (scene, shot, platformKey, assetType)
