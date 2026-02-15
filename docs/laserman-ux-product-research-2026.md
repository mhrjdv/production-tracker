# Laserman V2 User Experience Flow for AI Film Production Orchestration

Last updated: February 14, 2026

## Product definition that will actually work

You are not building "an AI filmmaking app." You are building an **orchestration and traceability layer** that sits between (a) a script and production structure (scenes, shots, angles) and (b) a messy ecosystem of third-party generation tools (Sora, Gemini/Nano Banana, Freepik, Kling, etc.). That is the wedge.

This is the same strategic move that makes the best "opinionated" workflow products win: they pick a specific job, then enforce a default way of working so teams do not invent chaos as they scale. Linear explicitly frames this as "opinionated software" that guides users toward a default process instead of being a general purpose tool where everyone invents their own workflow.

Your updated constraint (no native image/audio/video generation) is a strength if you commit to it. It forces clarity:

- The app manages structure (project -> script -> scenes -> shots), intent (prompt packages), and outcomes (captured outputs as immutable versions).
- The extension is the "bridge" that detects and captures what happened on third-party sites quickly, then files it correctly with minimal clicks.

If you try to be universal and flexible everywhere, you will recreate ShotGrid in slow motion and lose. If you are opinionated about the AI asset lifecycle (draft -> generate elsewhere -> capture -> compare -> select -> approve -> assemble), you can win.

## What the best existing systems teach you

You should shamelessly borrow from production tracking tools, review tools, and Linear-style interaction design.

Modern production tracking systems center on **shots/assets, tasks, statuses, reviews, and history**. Autodesk Flow Production Tracking (formerly ShotGrid) positions itself as production management plus review, tracking assets, connecting people, and keeping a pulse on tasks, budgets, and timelines. Their reviewing guidance emphasizes a tight loop: review submissions, log feedback, iterate until shots are final, while tracking versions, their status, and historical information.

Kitsu (CGWire) similarly leans into planning and reporting, scheduling tasks, tracking time, and reviewing lots of shots quickly in high-volume contexts like 2D animation. ftrack describes "Versions" as the reviewable entities for creative output (image, video, PDF), with related versions and activity history surfacing iteration over time.

For review and collaboration, Frame.io frames its value as a centralized asset management and collaboration platform that centralizes feedback and streamlines end-to-end creative workflows.

On the interaction design side, your biggest risk is building a "dashboard museum" where users work everywhere except your product. The fix is to adopt the heuristics that make complex systems usable:

- **Visibility of system status:** always keep users informed about what is going on through appropriate feedback in reasonable time.
- **Recognition rather than recall:** minimize memory load by making options and context visible.
- **Flexibility and efficiency for experts:** provide accelerators like shortcuts so power users move fast without bloating the UI for novices.

Linear's own behavior is consistent with this: they invest heavily in keyboard shortcuts and even redesigned their shortcuts help to make it searchable, because shortcuts make the application "a lot faster to use."

Takeaway: your UX must support two modes simultaneously: "studio process" structure and "creator speed" capture.

## Core object model and information architecture

To cover "script to production-grade outputs" without generating anything, you need one ruthless principle: **everything captured must land in an unambiguous place and remain traceable forever**.

Minimum viable hierarchy:

```
Project
  Script (source file + parsed representation)
    Scene (from script parse, editable)
      Shot (inside scene, because your real unit of capture is a shot/angle)
        Asset Type (image, video, audio, music, reference, etc.)
          Asset Version (immutable capture record)
      Prompt Package (reusable intent bundle)
```

Why "Shot" must exist: you already describe scene 001 having 3 angles. That is a shot list problem. A shot list is commonly defined as a document that maps out the shots in a scene, acting as a checklist and aligning director and cinematographer coverage. If you stop at "Scene," users will hack around it with naming conventions and your data will rot.

Each captured Asset Version must store, at minimum:

- **What:** media file (or secure reference), thumbnails/previews, asset type
- **Where:** project/scene/shot (and optionally sequence/act)
- **How:** platform (Sora, Gemini, Freepik, etc.), model/version when visible, prompt text, negative prompt, seed, aspect ratio, duration, other settings you can reliably detect
- **When:** timestamps, capture event, sync status
- **Lineage:** parentVersionId (derived from), compareGroup (fan-out set), "selected" boolean or winner pointer
- **Governance:** rights state, usage notes, provenance markers (watermark flags)

This mirrors how production systems treat reviewable outputs. Flow Production Tracking explicitly leans on versions, statuses, and history in the review loop. ftrack's "Versions" are also explicitly reviewable entities with related versions and activity history.

Navigation should be ruthlessly limited to the views that map to real decisions:

- **Production:** Scene list (grouped by act/sequence), shot breakdown inside each scene
- **Scene detail:** script excerpt, shot list, assets gallery, selected winners
- **Shot detail:** prompt packages, captured versions (grid + compare), approvals
- **Timeline:** assembly lane (selected winners only by default), with optional "all versions" overlay
- **Search:** global command palette for scenes/shots/versions/prompts

Opinionated default: users primarily live in Scene and Shot views; everything else exists to support them.

## End-to-end UX flow in the web app

This is the "control tower" flow. It is not where generation happens. It is where planning, structure, review, and selection happen.

### Project creation and script ingestion

User goal: go from script to a navigable production structure fast.

Flow:
1. Create Project
   - Choose a template: short film, ad, episodic, animation, experimental
   - Set default naming scheme (for scenes/shots) and default platforms enabled
2. Upload Script
   - Parse into scenes, characters, locations, props (with your AI pipeline)
3. Review Parse Output
   - User edits scene boundaries, renumbers scenes if needed
   - Confirm "Scene IDs" are stable, because they become permanent anchors for everything else

Design requirements:
- Show parse progress explicitly and continuously (visibility of system status).
- Never force memory: show the script excerpt inline when editing a scene or shot (recognition rather than recall).

### Scene to shot breakdown

User goal: turn a scene into capture-ready shot units.

Flow:
1. Open Scene
2. Create Shot List (3 ways)
   - Manual: "Add Shot," choose angle/type, add description
   - Assisted: suggest 3 to N coverage options based on scene text
   - Import: paste a shot list from elsewhere
3. For each Shot
   - Define basics: shot code, angle, framing, lens/movement notes (optional)
   - Attach references: character bible, style refs, location refs

This is where you become "film production universal." Not by adding features, but by making the shot unit flexible.

### Prompt packages and platform fan-out without generating

User goal: create prompts once, then reuse across platforms and iterations.

Flow:
1. Open Shot
2. Create Prompt Package
   - Components: base prompt, negative prompt, style block, character identity block, camera block, platform overrides
3. Choose Fan-out Targets
   - Select platforms (Sora, Gemini/Nano Banana, Freepik, etc.)
4. Execution model (since you do not generate):
   - App creates "Run Cards" per platform with:
     - Prompt text (adapted to platform constraints)
     - Required settings checklist (aspect ratio, duration, etc.)
     - Button: "Open in Platform" (deep link)
     - Status: Not run / In progress / Captured / Selected

This is critical: you are building a **runbook** for creativity, not the generator.

### Capture, compare, select, and approve

User goal: pull results back from the web, compare fast, pick winners, keep everything.

Flow:
1. After generating on a platform, user captures output via extension (detailed in next section)
2. Captured versions appear in Shot -> Assets gallery
3. Compare
   - Default compareGroup = everything captured from the same prompt package and shot within a time window
   - Compare view supports:
     - Side-by-side grid
     - Flipbook for video iterations
     - Metadata overlay (platform, model, settings)
4. Select Winner
   - Mark exactly one "selected" per asset type stage by default (configurable)
5. Approve (optional but important for teams)
   - Status ladder that mirrors production reality: Draft -> Needs Review -> Reviewed -> Approved -> Final
   - Flow Production Tracking highlights status usage to route review work (for example "Pending Review," director review flags, finals).

Opinionated rule: selection is not deletion. Everything stays, but the timeline and exports use selected winners by default.

### Assembly timeline and exports

User goal: assemble selected winners into a rough cut timeline, then hand off.

Flow:
1. Timeline view shows lanes (image/video/audio/music)
2. Default lane content = selected winners only
3. User drags winners into order (shot sequence)
4. Export package options:
   - JSON/CSV shot list with links to selected assets
   - OTIO export for editorial interchange if you go deep on NLE handoff (recommended long-term)
     OpenTimelineIO is explicitly designed as an interchange format and API for editorial cut information, referencing external media (not containing it).

If you do OTIO later, it is a serious differentiator for "production grade" workflows, because it anchors your tool in real post pipelines instead of being a nice gallery.

## Chrome extension side panel UX flow and auto detection

This is your true product surface. If the extension is mediocre, the whole platform fails.

### Why side panel, not popup

A popup is temporary and cramped. A side panel is persistent and supports real workflow.

Chrome's Side Panel API is explicitly meant to host extension content in the browser's side panel alongside the main webpage. That matches your requirement: "a chrome extension with side bar."

### Side panel UX structure

The side panel needs exactly four modes, nothing else:

**Context**
- Active project
- Active scene
- Active shot
- Active asset type (image, video, audio, etc.)
- Active prompt package (optional)

**Capture**
- Auto-detected outputs list (new, not yet saved)
- Button per item: "Save" (one click)
- Optional batch: "Save all (N)"
- Toggle: "Mark newest as selected winner" (power users)

**Reuse**
- Prompt package picker
- Button: "Apply to page" (fills platform prompt fields)
- Recent prompts and "copy to clipboard" fallback

**Queue**
- Shows local queue and sync failures
- Retry, clear, "open web app error details"
- This is where you honor visibility of system status.

**Settings**
- Platform enable/disable
- Mapping rules per platform
- Privacy controls and host permissions

### The capture algorithm the UX needs to support

Auto detection is not magic. It is disciplined heuristics per platform.

For each supported platform you maintain a "detector" that tries, in order:

1. **Confirm platform and page state**
   - URL pattern match
   - Presence of known DOM anchors (prompt textarea, output grid container)
2. **Extract prompt and settings**
   - Prompt text
   - Model name if shown
   - Aspect ratio, duration, seed if visible
3. **Extract outputs**
   - For images: locate `<img>` URLs or canvas snapshots
   - For video: locate `<video>` source URLs or download links
4. **Identify "new" items**
   - Compare to last captured hashes stored locally
5. **Render detected items in the side panel as cards**
   - Show tiny preview
   - Show extracted metadata (platform, model, time)
6. **One click "Save"**
   - Immediately enqueues a sync payload (do not block on upload)
   - Optimistically marks as "Queued," then "Synced" on success

Chrome extension content scripts are designed to run in the context of a webpage and can read and modify page content via standard Web APIs, but only when host permissions are granted. This is the technical basis for DOM-based detection.

### Security and permissions you cannot hand-wave

Host permissions are sensitive and users will see warnings. Chromium extension guidance makes it explicit that declaring a content script triggers the same install-time warning as requesting host permissions, and users are effectively allowing the extension access to data on that origin.

So your UX must:
- Ask for permissions progressively (only for platforms the user enables)
- Be explicit about what you capture (prompt text, settings, media links)
- Provide an in-panel "Pause capture on this site" switch

### Network and data capture constraints you must design around

A lot of teams fantasize about "sniffing the output from network calls." In MV3, that is severely limited in practice, and privacy direction is clear.

Chrome's declarativeNetRequest API is explicitly designed so extensions can block/modify requests without intercepting them and viewing their content, for privacy. That means your safest and most reliable capture strategy is DOM-based plus explicit user action, not passive network surveillance.

If you must fetch cross-origin resources, Chrome's extension docs note the pattern where a content script messages the extension to fetch URLs the extension has access to, and also warns about the security risk of forged messages from malicious pages. You also need to account for newer behavior where content script fetches have been brought closer to normal web CORS expectations over time.

UX implication: always have a fallback capture option:
- Save metadata + thumbnail screenshot if direct media download fails
- Mark the asset as "reference only" vs "stored media"

### One click save requires ruthless defaults

One click save only works if "where does this belong?" is already answered.

Your side panel should default in this order:
1. Use last active context (project/scene/shot/asset type)
2. If prompt includes an ID pattern (for example `S001_SH003`), auto-suggest the match
3. If platform has a "project" or "folder" UI, optionally map that to your project (advanced)

If context is missing, the save action should not open a complex form. It should open a single inline selector with search, then remember the choice.

## Rights, provenance, and audit as first-class UX

If you want "production grade," you cannot treat licensing and provenance as footnotes. You are building a system that helps people ship content commercially while juggling multiple tool licenses.

Freepik explicitly states that because they cannot control the generated output, the user is responsible for ensuring it does not infringe third-party rights, and that professional use is allowed if clear of infringements.

ElevenLabs is blunt: the free plan does not include a commercial license, paid plans include a commercial license (with constraints, for example Beta Services limitations), and attribution requirements vary.

Suno's own help guidance distinguishes ownership/commercial permissions by plan: free plan outputs are owned by Suno and allowed for non-commercial use, paid plans grant ownership plus a commercial use license, while also cautioning that outputs may not be eligible for copyright protection in some jurisdictions.

Google's Nano Banana documentation states that Nano Banana refers to Gemini native image generation models in the Gemini API and that generated images include a SynthID watermark. DeepMind's Veo materials also describe native audio video generation capabilities and note that videos made with Veo will be marked with SynthID for watermarking and detection.

C2PA provides an open technical standard to establish origin and edits of digital content, explicitly targeting provenance and authenticity.

What this means for your UX:

- Every captured version should have a "Rights & Provenance" drawer:
  - Source platform
  - User plan flag (free vs paid, manually set or inferred)
  - Commercial use status (unknown if you cannot infer)
  - Watermark/provenance markers detected (SynthID present, content credentials present)
  - A simple "OK to ship?" checklist that producers can use

Do not overpromise automation here. The credible UX is: "we track what we can, we surface uncertainty clearly."

## Hard truths and the recommended forward path

You have two possible futures. One is a bloated production tracker clone. The other is a fast orchestration layer that studios actually keep open all day. Choose the second.

The market is already full of heavy tools that track tasks and versions. ShotGrid/Flow Production Tracking covers production tracking, review, integrations, and status history. Kitsu covers scheduling, dispatching, reviewing, planning, and reporting. ftrack centers versions as reviewable entities with history and related versions. Frame.io anchors collaboration and review at scale.

So your wedge must be: **AI platform capture + prompt lineage + script-to-shot semantics**, delivered with Linear-grade speed and defaults. Linear's "opinionated software" framing is your playbook: one really good way of doing things, not infinite workflows.

A realistic phased roadmap that matches your constraint (no generation):

### Phase one: capture and filing system
- Shots as first-class objects
- Side panel capture that works on 3 platforms extremely well (not 20 poorly)
- Immutable versioning, compare groups, winner selection
- Keyboard accelerators and searchable help (copy Linear's approach to shortcut adoption)

### Phase two: review and approvals that feel like production
- Status routing for review, "needs director review," finals, audit history (borrow from Flow Production Tracking review loop concepts)
- Frame-accurate compare for video, quick annotation, decision logging

### Phase three: standards and pipeline credibility
- OTIO export so your timeline can land in real editorial pipelines
- Provenance surfacing (SynthID, C2PA where available)

If you do this, your UX story becomes simple and strong: "Generate anywhere, decide here, ship with traceability."
