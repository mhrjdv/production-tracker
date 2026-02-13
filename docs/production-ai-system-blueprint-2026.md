# Production AI System Blueprint (2026)

Last updated: **February 12, 2026**

This document describes the target operating model for a film/animation production house using multi-platform AI generation with heavy scene-level versioning.

## Core problem

A 300-500 scene production requires:

- Script-level traceability per scene
- Multiple model/platform attempts per scene (`v1..vN`)
- Prompt + model + output + notes captured together
- Fast selection of the best attempt across platforms
- Audio/music/narration tracked like visual assets, not separately

## System shape implemented in this repo

### 1) Data model

Added:

- `AiPlatform`
  - canonical platform registry (slug, provider, specialties, supported output types)
- `SceneAssetVersion`
  - one generated attempt/version for a scene
  - includes prompt, model, source URL, output URL, status, selected flag, and version number
- `ExtensionApiToken`
  - token-based auth for browser extension sync
  - hash-only storage and revocation support

### 2) In-app workflows

- Scene detail now includes **AI Assets & Versions** panel.
- Team can add versions per platform/type, mark a selected winner, archive, or delete.
- Version numbering auto-increments by `(scene, platform, asset_type)`.

### 3) Extension sync workflows

API endpoints:

- `GET /api/extension/projects`
- `GET /api/extension/scenes?projectId=...`
- `GET /api/extension/platforms`
- `POST /api/extension/ingest`

Browser extension (MV3):

- Popup-based capture from current tab
- Project/scene/platform selection
- Local async queue + retry sync
- Token-authenticated ingestion (no cookie dependency)

### 4) Token lifecycle

- Create/revoke tokens from `/integrations`
- Token value shown once, DB stores hash
- Extension sends bearer token on every sync request

## Platform strategy (2026)

Use platform strengths as **routing hints**, not hard rules:

- **Sora / Veo / Kling / Runway**: motion-heavy video generation
- **Midjourney / Freepik / image-first tools**: look-dev, keyframes, style locking
- **Suno**: music and soundtrack ideation
- **ElevenLabs**: narration, character voice, dubbing/speech workflows

All attempts should still be captured in the same `SceneAssetVersion` model so downstream editorial has one consistent timeline.

## Recommended production flow

1. Upload script and generate initial project scenes.
2. For each scene:
   - Generate image concepts across image platforms
   - Generate video passes from chosen stills/storyboards
   - Generate voice/music per scene beat
3. Mark selected versions by asset type.
4. Export selected set for editorial.
5. Keep rejected/archived versions for auditability and prompt learning.

## Evidence sources (official docs/pages)

- OpenAI Sora product page: https://openai.com/sora/
- OpenAI Sora help article (generation limits/deprecations): https://help.openai.com/en/articles/9957612-generating-videos-on-sora
- Google DeepMind Veo overview: https://deepmind.google/models/veo/
- Google Vertex AI Veo model docs: https://cloud.google.com/vertex-ai/generative-ai/docs/models/veo/2-0-generate-videos
- Midjourney docs: https://docs.midjourney.com/docs/quick-start
- Freepik AI Suite docs: https://docs.freepik.com/ai-suite
- ElevenLabs docs overview: https://elevenlabs.io/docs/overview
- Chrome Extensions MV3 docs: https://developer.chrome.com/docs/extensions/mv3/manifest
- Chrome Extensions messaging docs: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
