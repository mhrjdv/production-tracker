# Schema Reference

## Target Shot Model (To Be Added)

```prisma
model Shot {
  id          String   @id @default(cuid())
  shotCode    String   @map("shot_code")      // SH001, SH002
  sceneId     String   @map("scene_id")
  scene       Scene    @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  description String   @db.Text
  angle       String?                          // wide, medium, close-up, OTS, POV, aerial, insert
  framing     String?                          // framing notes
  movement    String?                          // pan, tilt, dolly, crane, handheld, steadicam, static
  lensNotes   String?  @map("lens_notes")
  references  Json?                            // attached reference images, style refs
  sortOrder   Int      @default(0) @map("sort_order")
  assets      SceneAssetVersion[]
  promptPackages PromptPackage[]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([sceneId, shotCode])
  @@index([sceneId])
  @@map("shots")
}
```

### Migration Steps for Shot

1. Create Shot model
2. Add to Scene: `shots Shot[]`
3. Add to SceneAssetVersion: `shotId String? @map("shot_id")` + relation + index
4. Add to PromptPackage: `shotId String? @map("shot_id")` + relation + index
5. Update SceneAssetVersion unique: `@@unique([sceneId, shotId, platformKey, assetType, versionNumber])`
   - Keep old unique as fallback during migration with conditional index
6. Seed default shot per existing scene (SH001 = "master shot")

## Full Model Reference

### User
```
id, name, email (unique), emailVerified, passwordHash, image, extensionPreferences (Json?)
Relations: accounts, sessions, projects, sceneAssets, promptPackages, apiTokens
```

### Project
```
id, name, description?, genre?, status (default: "active"), coverImage?, userId (FK)
Relations: scenes, characters, identity
Indexes: userId
```

### Scene
```
id, sceneId (user-facing: S001), projectId (FK), sourceText, reason, act, actTitle,
macroScene, storyBeat, narrativePurpose?, emotionalTone?, setting (Json?), camera (Json?),
actions[], visualMotifs[], constraints[], charactersPresent[], keyframeUrl?, sortOrder
Relations: promptPackages, assets, shots (future)
Unique: projectId + sceneId
Indexes: projectId
```

### Character
```
id, name, projectId (FK), role, designPhilosophy?, visualCues[], bodyLanguage[],
coreIdentity?, portraitUrl?
Unique: projectId + name
Indexes: projectId
```

### FilmIdentity
```
id, projectId (FK, unique), data (Json)
```

### PromptPackage
```
id, sceneId (FK), shotId (FK, future), versionNumber (default 1), name?,
prompt (Text), negativePrompt? (Text), constraints (Json?),
targetAspectRatio?, targetDurationSec?, styleProfile?, tags[], metadata (Json?),
createdById? (FK)
Unique: sceneId + versionNumber (will become sceneId + shotId + versionNumber)
Indexes: sceneId, createdById
```

### AiPlatform
```
id, slug (unique), name, provider?, homepageUrl?, docsUrl?,
specialties[], supportedOutput (AssetType[]), notes?
Relations: sceneAssets
```

### SceneAssetVersion
```
id, sceneId (FK), shotId (FK, future), promptPackageId? (FK), platformId? (FK),
parentVersionId? (FK, self-ref), platformKey, platformLabel,
assetType (enum), status (enum, default DRAFT), rightsState (enum, default UNKNOWN),
versionNumber (default 1), title?, prompt (Text), negativePrompt? (Text),
modelName?, sourceUrl?, externalAssetId?, outputUrl?, thumbnailUrl?,
costEstimateUsd?, generationSeconds?, queueWaitSeconds?,
compareGroup?, metadata (Json?), provenance (Json?), tags[], notes? (Text),
selected (default false), createdById? (FK)
Self-relation: parentVersion -> derivedVersions (SceneAssetDerivatives)
Unique: sceneId + platformKey + assetType + versionNumber
Indexes: sceneId, promptPackageId, parentVersionId, platformKey, assetType, status,
         rightsState, compareGroup, createdById
```

### ExtensionApiToken
```
id, userId (FK), name, tokenHash (unique), tokenPrefix, lastUsedAt?, expiresAt?, revokedAt?
Indexes: userId, revokedAt
```

## Version Number Auto-Increment Pattern

```typescript
// In server action, before creating a new SceneAssetVersion:
const maxVersion = await prisma.sceneAssetVersion.aggregate({
  where: { sceneId, platformKey, assetType },
  _max: { versionNumber: true },
});
const nextVersion = (maxVersion._max.versionNumber ?? 0) + 1;
```

## Extension Preferences JSON Shape

Stored in `User.extensionPreferences`:
```json
{
  "defaultProjectId": "clx...",
  "defaultSceneId": "clx...",
  "defaultShotId": "clx...",
  "defaultPlatform": "sora",
  "defaultAssetType": "VIDEO",
  "defaultModel": "sora-2",
  "platformPlans": {
    "sora": "plus",
    "elevenlabs": "pro",
    "suno": "free"
  }
}
```

## Provenance JSON Shape

Stored in `SceneAssetVersion.provenance`:
```json
{
  "platform": "sora",
  "platformPlan": "plus",
  "modelId": "sora-2",
  "modelVersion": "2024-12",
  "captureMethod": "extension-dom",
  "captureTimestamp": "2026-02-14T10:30:00Z",
  "sourceUrlHash": "sha256:abc123...",
  "synthIdExpected": false,
  "c2paPresent": false,
  "visibleWatermark": false,
  "generationParams": {
    "aspectRatio": "16:9",
    "duration": 5,
    "seed": 42,
    "steps": null
  }
}
```
