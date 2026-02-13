# AI Film Product Plan (2026)

Last updated: February 13, 2026

## 1) Goal

Design the end-to-end flow for creators building a full project (up to a 30-minute film) with AI, while keeping version control, platform switching, and extension capture fast and reliable.

## 2) Current Baseline In This Repo

What already exists:
- Scene-level asset versioning by `sceneId + platform + assetType + versionNumber`.
- Platform catalog in Prisma seed and extension dropdowns.
- Extension queue with retry + background sync.
- Auto-detect platform hints from active tab URL.
- Prompt reuse from existing scene versions.

Main gap:
- The extension and core UX are feature-rich but dense. Daily workflows need clearer phases (capture/reuse/sync/settings), better defaults, and compact previews.

## 3) 2026 Market Snapshot (Practical)

### Video generation and control
- OpenAI Sora has a new app and highlights remix + auto sound, while Sora 1 web is being deprecated and Sora for Business is pending.
- OpenAI API pricing now lists Sora Video API models with per-second pricing (`sora-2`, `sora-2-pro`).
- Google Vertex AI Veo pricing is per second and includes Veo 3/3.1 (+ Fast variants), plus Lyria 2 music pricing.
- Vertex docs/release notes show advanced controls: first/last frame, extension, reference image workflows, and object insert/remove support.
- Runway pricing is strongly credit/plan-structured with model-specific second equivalents and relaxed-rate "unlimited" modes.
- Luma plan tiers separate non-commercial vs commercial use and expose explicit model credit costs.

### Multi-model convergence
- Adobe Firefly positions "commercially safe" generation, adds video controls, and exposes partner model choice (including Flux, Veo, Runway) with provenance labeling via Content Credentials.
- Leonardo positions a hybrid hosted model marketplace with token plans, queue/concurrency constraints, and model-specific unlimited exclusions.

### Audio/music lane
- ElevenLabs now bundles speech, music, and image/video in one credit system with explicit commercial license tiers.
- Suno/Udio communities show ongoing concern about licensing clarity, retroactive rights, and terms interpretation.

## 4) Community Friction (Reddit-Derived)

High-confidence friction themes:

1. Queue unpredictability and throttling
- Users report long queue times even on premium/unlimited plans in Runway communities.

2. "Unlimited" ambiguity
- Users frequently misunderstand what is truly unlimited vs relaxed/priority or credit-gated modes.

3. Licensing confusion in music tools
- Repeated confusion around free-vs-paid generation rights, retroactive usage, and platform policy changes.

4. Version chaos
- Creators lose track of which prompt/model/output produced a selected shot.

5. Comparison fatigue
- Teams run the same scene across multiple tools but lack consistent side-by-side version review and provenance.

## 5) Target User Flow (30-Min Film)

### Phase A: Project setup
1. Create project.
2. Upload script (PDF/Final Draft/text).
3. Auto-extract scenes and acts.
4. Set production profile (style, frame rate, aspect ratio, rights policy).

### Phase B: Scene planning
1. Generate scene cards with objectives and shot intents.
2. For each scene, define prompt package (core prompt + constraints + negative prompt + references).
3. Save prompt package version `P1`, `P2`, etc.

### Phase C: Multi-platform generation
1. User chooses one or many platforms in one submit action.
2. System creates per-platform jobs from one canonical prompt package.
3. Track status (`queued`, `running`, `generated`, `failed`) by job.

### Phase D: Capture + sync
1. Extension auto-detects platform and fills context.
2. User pastes/edits prompt and output URL once.
3. Queue + sync writes immutable scene asset version.
4. Auto-render compact preview card in scene timeline lane.

### Phase E: Compare + select
1. Side-by-side compare by scene, modality, and platform.
2. Mark selected takes.
3. Lock selected versions and record rationale.

### Phase F: Audio and music
1. Generate voice/narration/music per scene with the same prompt package ID.
2. Enforce rights metadata per track/version.
3. Store stems and final mix references as linked versions.

### Phase G: Assembly
1. Build sequence timeline from selected scene versions.
2. Export EDL/CSV/JSON manifest for NLE handoff.
3. Keep full provenance trail for each shot and audio layer.

## 6) Refined Product Requirements

### P0 (must-have)
- Single prompt -> multi-platform job fan-out.
- Immutable cross-modality versioning with provenance.
- Small preview cards for every generated result in timeline lanes.
- Queue reliability with retry + visible state.
- Platform rights state stored per output.

### P1
- Prompt transform templates per platform (same intent, platform-native syntax).
- Cost/time estimator before submit.
- Batch actions: regenerate failed, duplicate to another platform.
- Selection workflow with compare mode and winner tagging.

### P2
- Collaboration: reviewer comments, approval states, role-based permissions.
- Auto quality scoring (prompt adherence, motion quality, continuity score).
- Assembly export pack with per-scene manifests and legal metadata.

## 7) Chrome Extension Redesign (Minimal, Tab-Switched)

Use 4 tabs only.

1. Capture
- Fields: project, scene, platform, type, title, prompt.
- Smart defaults from profile + page context.
- One primary action: `Queue & Sync`.

2. Reuse
- Dropdown of previous scene versions.
- Buttons: `Load prompt`, `Apply prompt to page`, `Open in web app`.

3. Sync
- Queue list with status and retry count.
- `Sync now` + compact preview box (thumbnail, platform, version, timestamp).

4. Settings
- App URL, token, optional BYOK provider settings.
- Health check button.

### UI rules
- Keep one-screen-first design (no long scroll forms by default).
- Progressive disclosure for advanced metadata.
- Preserve draft per `project::scene`.

## 8) Data Model Refinements

Add/extend:
- `prompt_package_id` on scene versions.
- `parent_version_id` for derivative generations.
- `rights_state` enum (`unknown`, `non_commercial`, `commercial_allowed`, `restricted`).
- `cost_estimate_usd`, `generation_seconds`, `queue_wait_seconds`.
- `provenance` JSON (platform policy snapshot + model + params + source URL hash).

## 9) Metrics

Track:
- Time from script upload to first usable scene asset.
- Generation success/fail by platform.
- Queue delay percentiles.
- Reuse rate of prompt packages.
- Selection conversion (generated -> selected).
- Per-scene cost and iteration count.

## 10) Execution Roadmap

### Sprint 1 (1-2 weeks)
- Extension tabbed UI shell.
- Single prompt multi-platform submit in web app.
- Preview cards in scene detail and timeline lane.

### Sprint 2 (2-3 weeks)
- Prompt package system.
- Compare/select workflow.
- Rights metadata and warnings.

### Sprint 3 (2-3 weeks)
- Cost/time estimator.
- Batch reruns and fallback routing.
- Export manifests for assembly.

## 11) Source Notes

This plan uses official docs/pricing/help pages for capability and cost constraints, plus Reddit signals for user friction.

## Sources

- OpenAI Sora overview: https://openai.com/sora/
- Sora help (generation, tiers, wait times, deprecation notes): https://help.openai.com/en/articles/9957612-generating-videos-on-sora
- Sora billing FAQ: https://help.openai.com/en/articles/10245774-generating-videos-on-sora
- OpenAI API pricing (includes Sora Video API pricing): https://openai.com/api/pricing/
- Runway pricing: https://runwayml.com/pricing/
- Luma pricing: https://lumalabs.ai/pricing
- Google Vertex AI Veo docs: https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos
- Google Vertex AI pricing (Veo + Lyria): https://cloud.google.com/vertex-ai/generative-ai/pricing
- Google Vertex AI release notes: https://cloud.google.com/vertex-ai/generative-ai/docs/release-notes
- Google Cloud blog (Veo 3 / Imagen 4 / Lyria 2): https://cloud.google.com/blog/products/ai-machine-learning/announcing-veo-3-imagen-4-and-lyria-2-on-vertex-ai
- Adobe Firefly commercially safe announcement: https://news.adobe.com/news/2025/02/firefly-web-app-commercially-safe
- Adobe model-choice announcement (partner models + Content Credentials): https://blog.adobe.com/en/publish/2025/03/18/adobes-approach-customer-choice-in-ai-models
- Tribeca + OpenAI filmmaker collaboration: https://tribecafilm.com/press-center/press-releases/tribeca-studios-and-openai-launch-ear-long-collaboration-to-support-independent-filmmakers-in-creating-ai-integrated-short-films
- ElevenLabs pricing: https://elevenlabs.io/pricing
- Leonardo pricing: https://leonardo.ai/pricing/
- Suno help (free use): https://help.suno.com/en/articles/2746945-is-suno-free-to-use
- Suno help (commercial use): https://help.suno.com/en/articles/2856353-commercial-use
- Udio help (subscriptions): https://support.udio.com/hc/en-us/articles/31232795395863-how-do-subscriptions-work
- Udio help (licensing/copyright): https://support.udio.com/hc/en-us/articles/37519865277207-licensing-and-copyright-policy
- Runway Reddit queue friction sample 1: https://www.reddit.com/r/runwayml/comments/1irnes3/
- Runway Reddit queue friction sample 2: https://www.reddit.com/r/runwayml/comments/1f3a3n4/
- Runway Reddit queue friction sample 3: https://www.reddit.com/r/runwayml/comments/1fhkfum/
- Suno Reddit licensing confusion sample 1: https://www.reddit.com/r/SunoAI/comments/1mje6cu/
- Suno Reddit licensing confusion sample 2: https://www.reddit.com/r/SunoAI/comments/1pyw2lp/
- Udio/Suno licensing discussion sample: https://www.reddit.com/r/SunoAI/comments/1olqy3o/
