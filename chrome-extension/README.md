# Production Tracker Sync Extension

Manifest V3 Chrome extension for capturing AI generation metadata from any tab and syncing it to scene-level version history.

## What it does

- Captures the current tab URL + page context (prompt/model/media URL) from generation tools.
- Detects previous action context (last capture + selected scene versions) and shows smart intent suggestions.
- Uses a minimal tabbed popup flow:
  - `Capture`: project/scene/platform + prompt capture
  - `Reuse`: load scene versions + intent actions + drafts
  - `Sync`: queue/sync controls + compact result previews
  - `Settings`: token/base URL/BYOK config
- Lets you select `Project -> Scene -> Platform -> Asset Type`.
- Reuses prompt/version history from existing scene versions (`Load` button).
- Auto-saves per-scene drafts and restores previous in-progress capture context.
- One-click prompt autofill and one-click prompt apply into supported page inputs.
- Optional BYOK prompt refinement using any OpenAI-compatible API (`Base URL + Model + Key`).
- Stores each capture in a local queue and syncs asynchronously to:
  - `POST /api/extension/ingest`
- Syncs current selection defaults with your user profile:
  - `GET/PUT /api/extension/profile`
- Fetches existing scene versions for prompt reuse:
  - `GET /api/extension/scene-assets`
- Retries failed sync attempts in the background (alarm-driven).

## Setup

1. In the app, open `/integrations` and create a token.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select this `chrome-extension/` folder.
4. Open extension popup:
   - Set `App URL` (for local dev: `http://localhost:3000`)
   - Paste API token
   - Save
5. Select a project/scene/platform.
6. Use **Auto Fill From Page** or **Load** an existing scene version.
7. Optionally configure BYOK and run **AI Refine Prompt**.
8. Click **Queue & Sync**.

## Queue behavior

- Queue is stored in `chrome.storage.local` as `syncQueue`.
- Background sync runs:
  - Immediately after enqueue
  - Every 2 minutes via `chrome.alarms`
- Failed items retry up to 10 times.

## Security model

- Uses bearer token auth (`Authorization: Bearer lzr_...`).
- Server stores only SHA-256 token hashes.
- Tokens can be revoked from `/integrations`.
- BYOK API keys stay local in `chrome.storage.local` and are not synced to the app profile API.
