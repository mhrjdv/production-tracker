---
name: laserman-schema
description: >
  Database schema reference and migration guide for Laserman V2.
  Use when: adding/modifying Prisma models, writing migrations, creating server actions that touch the DB,
  adding API routes, understanding data relationships, planning schema changes for new features.
  Triggers on: "schema", "database", "prisma", "migration", "model", "data model",
  "add field", "new table", "relationship", "foreign key", "index", adding new entities,
  modifying SceneAssetVersion, PromptPackage, Scene, Shot, or any DB-touching code.
---

# Laserman Schema

## Current Schema Location

`prisma/schema.prisma` — PostgreSQL via Prisma ORM v7.

## Object Hierarchy

```
User (auth)
  Project
    Scene (unique: projectId + sceneId)
      Shot (PLANNED — not yet in schema)
        SceneAssetVersion (unique: sceneId + platformKey + assetType + versionNumber)
      PromptPackage (unique: sceneId + versionNumber)
    Character (unique: projectId + name)
    FilmIdentity (unique: projectId)
  ExtensionApiToken (unique: tokenHash)
AiPlatform (unique: slug) — global registry
```

## Critical Gap: Shot Model

The Shot model is the #1 schema addition needed. See [references/schema-reference.md](references/schema-reference.md) for the target Shot model definition and migration plan.

**When adding Shot:**
1. Create the model with scene FK
2. Add nullable `shotId` to SceneAssetVersion and PromptPackage
3. Update unique constraint on SceneAssetVersion to include shotId
4. Migration must be backward-compatible (nullable shotId)

## Enums

```prisma
enum AssetType    { SCRIPT IMAGE VIDEO AUDIO MUSIC VOICE NARRATION STORYBOARD OTHER }
enum AssetStatus  { DRAFT GENERATED SELECTED REJECTED ARCHIVED }
enum RightsState  { UNKNOWN NON_COMMERCIAL COMMERCIAL_ALLOWED RESTRICTED }
```

## Key Patterns

### Immutable Versioning
- `versionNumber` auto-increments per scope (scene + platformKey + assetType)
- Never update an existing version — create a new one
- `parentVersionId` tracks derivation (remix/regen lineage)
- `selected` boolean marks the winner (only one per scope at a time)

### Prompt Package Versioning
- `versionNumber` auto-increments per scene (P1, P2, P3)
- Linked to SceneAssetVersion via `promptPackageId`
- Contains the canonical prompt intent; versions on SceneAssetVersion may differ (platform-adapted)

### Compare Groups
- `compareGroup` string groups versions for side-by-side comparison
- Default key: `{promptPackageId}_{timestamp_window}`
- All versions in a group were generated from the same intent

### Extension Auth
- `ExtensionApiToken` stores SHA-256 hashed tokens
- `tokenPrefix` for display (first 8 chars)
- `revokedAt` for soft-delete, `expiresAt` for TTL
- `lastUsedAt` updated on each authenticated request

### JSON Fields
- `Scene.setting` — location/environment details
- `Scene.camera` — camera direction from script parse
- `PromptPackage.constraints` — platform-specific constraint overrides
- `PromptPackage.metadata` — extra prompt parameters
- `SceneAssetVersion.metadata` — platform-specific generation params
- `SceneAssetVersion.provenance` — rights/audit trail
- `User.extensionPreferences` — last-used project/scene/platform/model
- `FilmIdentity.data` — production bible blob

## Migration Conventions

1. Name migrations descriptively: `YYYYMMDDHHMMSS_description`
2. Always make new FK columns nullable for backward compatibility
3. Add indexes on any FK or frequently-queried column
4. Test with `npx prisma migrate dev` locally before committing
5. Update seed data in `prisma/seed.ts` if adding new required relations

## Server Action Patterns

Server actions in `src/lib/actions.ts` follow:
- `"use server"` directive at file top
- Authenticate via `auth()` from NextAuth
- Validate input with Zod schemas
- Use `prisma.$transaction` for multi-step mutations
- Return `{ success: boolean, data?, error? }` shape
- `revalidatePath()` after mutations

## References

- Full schema field reference with Shot target: [references/schema-reference.md](references/schema-reference.md)
- Current schema file: `prisma/schema.prisma`
- Server actions: `src/lib/actions.ts`
