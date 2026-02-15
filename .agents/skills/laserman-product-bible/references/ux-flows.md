# UX Flows Reference

## Flow 1: Project Creation and Script Ingestion

**Goal:** Script to navigable production structure, fast.

```
Create Project -> Upload Script -> AI Parse -> Review Parse -> Confirm Scene IDs
```

### Steps

1. **Create Project**
   - Template selection: short film, ad, episodic, animation, experimental
   - Set naming scheme and default platforms
   - Minimal form: name, genre, template

2. **Upload Script**
   - Accept PDF, Final Draft (.fdx), plain text
   - Trigger AI parse pipeline (`/api/ai/parse-script`)
   - Show parse progress bar with stage labels (visibility of system status)

3. **Review Parse Output**
   - Display scene list with editable boundaries
   - Inline script excerpt per scene (recognition not recall)
   - Allow renumbering, merging, splitting scenes
   - Scene IDs become permanent anchors — warn before confirming

### Design Rules
- Progress indicator during parse (not spinner — show stage)
- Script text always visible when editing scene metadata
- "Confirm Scene IDs" as explicit action with warning about permanence

## Flow 2: Scene to Shot Breakdown

**Goal:** Turn a scene into capture-ready shot units.

```
Open Scene -> Create Shots (manual/assisted/import) -> Configure Each Shot
```

### Shot Creation Methods

1. **Manual:** "Add Shot" button, pick angle/type, describe intent
2. **Assisted:** AI suggests 3-N coverage options from scene text. User accepts/edits.
3. **Import:** Paste shot list from external document, parse into shots

### Shot Configuration
- Shot code (auto-generated: SH001, SH002)
- Angle: wide, medium, close-up, extreme close-up, OTS, POV, aerial, insert
- Framing notes (free text)
- Camera movement (static, pan, tilt, dolly, crane, handheld, steadicam)
- Lens notes (optional)
- Attached references (character bible links, style refs, location refs)

### Design Rules
- Scene script excerpt always visible in sidebar when editing shots
- Shot list as reorderable cards with drag handles
- Quick-add: keyboard shortcut to add shot without leaving context

## Flow 3: Prompt Packages and Platform Fan-Out

**Goal:** Create prompts once, reuse across platforms.

```
Open Shot -> Create Prompt Package -> Choose Platforms -> Generate Run Cards
```

### Prompt Package Components
- Base prompt (required)
- Negative prompt (optional)
- Style block (optional — visual style direction)
- Character identity block (optional — linked from character bible)
- Camera block (optional — from shot angle/movement)
- Platform overrides (optional — per-platform constraint tweaks)

### Fan-Out to Run Cards
For each selected platform, create a "Run Card":
- Adapted prompt text (platform-aware transforms)
- Required settings checklist (aspect ratio, duration, etc.)
- "Open in Platform" button (deep link to generation tool)
- Status: Not Run -> In Progress -> Captured -> Selected

### Design Rules
- Prompt package is shot-level by default, scene-level as fallback
- Run cards are read-only summaries — user goes to platform to generate
- "Copy prompt" as universal fallback if deep linking is not available
- Show platform constraints inline (max prompt length, supported aspect ratios)

## Flow 4: Capture, Compare, Select

**Goal:** Pull results back, compare fast, pick winners.

```
Generate on platform -> Extension captures -> Versions in gallery -> Compare -> Select winner
```

### Capture (Extension Side)
- See laserman-extension-dev skill for full extension flows
- Extension auto-detects platform and output, user clicks "Save"
- Version lands in Shot -> Assets gallery

### Compare
- Default compare group: same prompt package + shot + time window
- **Grid view:** side-by-side thumbnails with metadata overlay
- **Flipbook:** for video — scrub through iterations at same timecodes
- **Full-screen compare:** A/B toggle or split-screen for detail inspection
- Metadata overlay: platform badge, model name, generation settings

### Select
- "Select as winner" marks one version per asset type per shot
- Previous selection is de-selected (single winner default)
- Selection is non-destructive — all versions remain accessible
- Selected versions bubble to top and get a visual badge

### Approve (Phase 2)
- Status ladder: Draft -> Needs Review -> Reviewed -> Approved -> Final
- Director review flag for routing
- Approval log with timestamp and reviewer

### Design Rules
- Compare view must load fast — lazy load full-res, show thumbnails immediately
- Keyboard shortcuts for cycling through compare group and selecting winner
- "Select" action available from grid, detail, and compare views
- Never delete — archive or reject instead

## Flow 5: Assembly Timeline

**Goal:** Assemble winners into rough cut, hand off.

```
Timeline view -> Lanes by type -> Drag to order -> Export
```

### Timeline Structure
- Lanes: video, image, audio, music, voice/narration
- Default content: selected winners only (toggle to show all versions)
- Each item shows: thumbnail, shot code, platform badge, duration

### Interaction
- Drag-and-drop to reorder within lanes
- Shot sequence defines default order
- Gaps/overlaps allowed (not a precision NLE)

### Export Options
- JSON/CSV shot list with asset URLs and metadata
- OTIO export (Phase 3 — NLE interchange)
- ZIP package with selected media + manifest

### Design Rules
- Timeline is an assembly tool, not an editor — keep it simple
- Selected winners auto-populate lanes in shot order
- "Export" is always one click from timeline view

## UX Heuristics Applied Throughout

| Heuristic | Application |
|-----------|-------------|
| Visibility of system status | Parse progress, sync status, queue state |
| Recognition not recall | Script excerpt inline, context breadcrumbs, metadata overlays |
| Flexibility for experts | Keyboard shortcuts, command palette, batch actions |
| Error prevention | Confirm before permanent scene IDs, warn on rights issues |
| Aesthetic minimalism | One-screen-first design, progressive disclosure for advanced fields |
