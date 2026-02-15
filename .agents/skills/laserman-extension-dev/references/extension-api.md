# Extension API Reference

## Authentication

All extension endpoints use Bearer token auth:

```
Authorization: Bearer lm_abc123def456...
```

Server validation in `src/lib/extension-auth.ts`:
1. Extract token from `Authorization` header
2. SHA-256 hash the token
3. Look up `ExtensionApiToken` by `tokenHash`
4. Check `revokedAt` is null and `expiresAt` is not past
5. Update `lastUsedAt`
6. Return `{ userId, tokenId }` or null

## Endpoints

### GET /api/extension/profile

Returns user's extension preferences (last-used defaults).

**Response:**
```json
{
  "user": {
    "id": "clx...",
    "name": "Mihir",
    "email": "mihir@example.com"
  },
  "preferences": {
    "defaultProjectId": "clx...",
    "defaultSceneId": "clx...",
    "defaultShotId": null,
    "defaultPlatform": "sora",
    "defaultAssetType": "VIDEO",
    "defaultModel": "sora-2",
    "platformPlans": {
      "sora": "plus",
      "elevenlabs": "pro"
    }
  }
}
```

### PUT /api/extension/profile

Updates extension preferences.

**Body:**
```json
{
  "defaultProjectId": "clx...",
  "defaultSceneId": "clx...",
  "defaultPlatform": "sora"
}
```

### GET /api/extension/projects

Lists all projects for the authenticated user.

**Response:**
```json
{
  "projects": [
    { "id": "clx...", "name": "Short Film", "status": "active", "sceneCount": 12 }
  ]
}
```

### GET /api/extension/scenes?projectId=clx...

Lists scenes for a project.

**Response:**
```json
{
  "scenes": [
    {
      "id": "clx...",
      "sceneId": "S001",
      "sourceText": "INT. APARTMENT - NIGHT...",
      "act": 1,
      "actTitle": "Setup",
      "sortOrder": 0,
      "assetCount": 5,
      "selectedCount": 2
    }
  ]
}
```

### GET /api/extension/platforms

Lists available AI platforms.

**Response:**
```json
{
  "platforms": [
    {
      "id": "clx...",
      "slug": "sora",
      "name": "Sora",
      "provider": "OpenAI",
      "supportedOutput": ["VIDEO", "IMAGE"]
    }
  ]
}
```

### GET /api/extension/scene-assets?sceneId=clx...&assetType=VIDEO

Gets scene assets for reuse (prompt loading, version history).

**Query params:**
- `sceneId` (required)
- `shotId` (optional, Phase 1)
- `assetType` (optional filter)
- `platformKey` (optional filter)
- `selected` (optional, "true"/"false")

**Response:**
```json
{
  "assets": [
    {
      "id": "clx...",
      "versionNumber": 3,
      "prompt": "A vast desert...",
      "platformKey": "sora",
      "assetType": "VIDEO",
      "selected": true,
      "thumbnailUrl": "https://...",
      "status": "SELECTED"
    }
  ]
}
```

### POST /api/extension/ingest

Ingests a captured asset. This is the critical endpoint.

**Body:**
```json
{
  "sceneId": "clx...",
  "shotId": "clx...",
  "platformKey": "sora",
  "platformLabel": "Sora",
  "assetType": "VIDEO",
  "title": "S001_SH001_v3",
  "prompt": "A vast desert landscape at golden hour...",
  "negativePrompt": "",
  "modelName": "sora-2",
  "sourceUrl": "https://sora.com/g/abc123",
  "outputUrl": "https://r2.example.com/...",
  "thumbnailUrl": "https://r2.example.com/thumb/...",
  "metadata": { "aspectRatio": "16:9", "duration": 5 },
  "provenance": { "platform": "sora", "captureMethod": "extension-dom" },
  "promptPackageId": "clx...",
  "tags": ["take-3"],
  "markAsSelected": false
}
```

**Server behavior:**
1. Validate Bearer token
2. Verify scene belongs to user
3. Look up platform by `platformKey` (or create if new)
4. Auto-increment `versionNumber` for scope (sceneId + platformKey + assetType)
5. Create `SceneAssetVersion` with all fields
6. If `markAsSelected`, deselect previous winner and mark new one
7. Update user's extension preferences (last-used scene/platform)
8. Return created version

**Response:**
```json
{
  "success": true,
  "version": {
    "id": "clx...",
    "versionNumber": 3,
    "status": "GENERATED",
    "selected": false
  }
}
```

## Error Responses

All errors follow:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

| Status | Code | Meaning |
|--------|------|---------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | TOKEN_REVOKED | Token has been revoked |
| 404 | SCENE_NOT_FOUND | Scene doesn't exist or doesn't belong to user |
| 422 | VALIDATION_ERROR | Invalid input fields |
| 500 | INTERNAL_ERROR | Server error |

## Rate Limiting

No rate limiting currently implemented. Future consideration:
- Per-token rate limit (e.g., 60 requests/minute)
- Queue burst protection (max 50 items in sync batch)

## CORS

Extension API routes should allow requests from the extension origin:
- `chrome-extension://{extension-id}`
- In practice, extension service worker fetches bypass CORS
