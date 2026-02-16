---
name: lazer-extension-dev
description: >
  Chrome extension development guide for Lazer V2 capture bridge.
  Use when: building or modifying the Chrome extension, adding platform detectors,
  working on capture/sync/queue logic, side panel UI, content scripts, background service worker,
  extension API endpoints, or extension auth flow.
  Triggers on: "extension", "chrome extension", "side panel", "capture", "content script",
  "background worker", "platform detection", "auto-detect", "manifest", "MV3",
  "popup", "sync queue", "retry", "bearer token", extension API routes,
  any file in chrome-extension/ directory, /api/extension/* routes.
---

# Lazer Extension Dev

## Architecture Overview

The extension is the product's true surface. If it is mediocre, the platform fails.

```
chrome-extension/
  manifest.json          # MV3 manifest
  sidepanel.html         # Side panel UI (TARGET — replacing popup)
  sidepanel.css          # Side panel styles
  sidepanel.js           # Side panel logic
  background.js          # Service worker (sync, alarms, message passing)
  content-script.js      # DOM detection + extraction per platform
  detectors/             # Platform-specific detector modules (TARGET)
    sora.js
    gemini-veo.js
    freepik.js
```

**Current state:** Uses popup (popup.html/js/css). Target: migrate to Side Panel API.

## Why Side Panel, Not Popup

- Popup is temporary and cramped — closes when focus leaves
- Side panel is persistent alongside the webpage
- Side panel supports real workflow (context + capture + reuse + queue)
- Chrome Side Panel API: `chrome.sidePanel.setOptions()`

## Side Panel Modes (Exactly Four)

### 1. Context
- Active project selector
- Active scene selector
- Active shot selector (Phase 1)
- Active asset type (image/video/audio/music)
- Active prompt package (optional)
- Defaults from last-used context (stored in extension preferences)

### 2. Capture
- Auto-detected outputs list (new items not yet saved)
- Per-item "Save" button (one click)
- Batch "Save All (N)" button
- Toggle: "Mark newest as selected winner" (power users)
- Each card shows: tiny preview, platform badge, model, timestamp

### 3. Reuse
- Prompt package picker (from active scene/shot)
- "Apply to Page" button (fills platform prompt fields via content script)
- "Copy to Clipboard" fallback
- Recent prompts list

### 4. Queue
- Local queue with sync status per item
- Retry count and error details
- "Sync Now" button
- "Open Web App" link for error investigation
- Visibility of system status — always show what is pending/failed/synced

## Capture Algorithm

See [references/capture-algorithm.md](references/capture-algorithm.md) for per-platform detector specs.

### Algorithm Steps

1. **Confirm platform:** URL pattern match + DOM anchor detection
2. **Extract prompt and settings:** prompt text, model, aspect ratio, duration, seed
3. **Extract outputs:** `<img>` URLs, `<video>` sources, download links
4. **Identify new items:** compare hashes against locally stored captures
5. **Render cards:** preview + metadata in side panel
6. **One-click Save:** enqueue sync payload, mark as "Queued", update to "Synced" on success

### Capture Strategy

**Primary:** DOM-based extraction (content script reads page elements)
**Fallback:** Metadata + thumbnail screenshot (when direct media access fails)
**Constraint:** MV3 declarativeNetRequest cannot intercept response bodies. Do NOT rely on network sniffing.

### Fallback Handling

If direct media URL extraction fails:
- Save metadata (prompt, settings, platform) as the version
- Capture visible thumbnail via canvas screenshot
- Mark asset as "reference only" (no stored media, just metadata)
- User can manually add outputUrl later from web app

## Extension API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/extension/profile` | User preferences (defaults) |
| PUT | `/api/extension/profile` | Update preferences |
| GET | `/api/extension/projects` | List user projects |
| GET | `/api/extension/scenes?projectId=` | List project scenes |
| GET | `/api/extension/platforms` | List AI platforms |
| GET | `/api/extension/scene-assets` | Get scene assets |
| POST | `/api/extension/ingest` | Ingest captured asset |

All endpoints use Bearer token auth via `Authorization: Bearer lm_xxx` header.

## Auth Flow

```
User generates token in web app (/integrations)
  → Token stored as SHA-256 hash in DB (ExtensionApiToken)
  → User pastes raw token into extension settings
  → Extension stores token in chrome.storage.local
  → Every API call includes: Authorization: Bearer lm_xxx
  → Server validates: hash(token) matches tokenHash in DB
  → Check: not revoked, not expired
  → Update lastUsedAt
```

## Sync Queue

```
Capture → Local Queue (IndexedDB/chrome.storage) → Background Sync → API
```

- Alarm-driven: sync every 2 minutes via `chrome.alarms`
- Retry: up to 10 attempts with exponential backoff
- Queue states: Queued → Syncing → Synced / Failed
- Optimistic UI: show "Queued" immediately on save, update on sync result
- Offline-resilient: queue persists in chrome.storage.local

## Permissions Model

### Progressive Permissions

Do NOT request all host permissions at install. Instead:
1. Start with `storage`, `tabs`, `alarms`, `sidePanel`
2. When user enables a platform, request host permission dynamically:
   ```javascript
   chrome.permissions.request({
     origins: ["https://sora.com/*"]
   });
   ```
3. Show what will be captured (prompt text, settings, media links)
4. Provide "Pause capture on this site" toggle

### Current Permissions (manifest.json)

```json
{
  "permissions": ["storage", "tabs", "alarms"],
  "host_permissions": ["http://*/*", "https://*/*"]
}
```

**Target:** Replace blanket `http://*/*` with per-platform dynamic permissions.

## Content Script Pattern

```javascript
// content-script.js
(function() {
  const url = window.location.href;
  const detector = detectPlatform(url);
  if (!detector) return;

  // Extract data from DOM
  const data = detector.extract(document);

  // Send to side panel via message passing
  chrome.runtime.sendMessage({
    type: "PLATFORM_DETECTED",
    platform: detector.platform,
    data: data
  });
})();
```

## Message Passing

```
Content Script ←→ Background Worker ←→ Side Panel
     ↑                    ↑
   DOM access         API calls, storage, alarms
```

- Content script → Background: `chrome.runtime.sendMessage`
- Background → Content script: `chrome.tabs.sendMessage`
- Side panel ↔ Background: `chrome.runtime.sendMessage`

## One-Click Save Defaults

In priority order:
1. Use last active context (project/scene/shot/asset type)
2. If prompt contains ID pattern (`S001_SH003`), auto-suggest match
3. If context is missing, show single inline selector with search
4. Remember choice for next save

## References

- Platform detector specs: [references/capture-algorithm.md](references/capture-algorithm.md)
- Extension API details: [references/extension-api.md](references/extension-api.md)
- Current extension code: `chrome-extension/`
- Server-side auth: `src/lib/extension-auth.ts`
- Ingest endpoint: `src/app/api/extension/ingest/route.ts`
