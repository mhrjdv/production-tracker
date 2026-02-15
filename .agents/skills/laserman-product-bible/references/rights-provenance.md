# Rights, Provenance, and Audit Reference

## Principle

Every captured version must carry rights and provenance metadata. The credible UX is: "we track what we can, we surface uncertainty clearly." Do not overpromise automation.

## Rights State Enum

| Value | Meaning | When to Set |
|-------|---------|-------------|
| UNKNOWN | Cannot determine commercial rights | Default for all captures |
| NON_COMMERCIAL | Free-tier output, no commercial license | Free plans on Suno, Luma free, etc. |
| COMMERCIAL_ALLOWED | Paid plan with commercial license | Paid Sora, Pro ElevenLabs, etc. |
| RESTRICTED | Platform-specific restrictions apply | Beta outputs, specific model constraints |

## Platform Licensing Summary

### Video Platforms
- **Sora (OpenAI):** Paid ChatGPT Plus/Pro includes commercial license. API pricing per-second.
- **Veo (Google):** Vertex AI pricing per-second. SynthID watermark on all outputs.
- **Runway:** Credit-based, plan-structured. Commercial rights on paid plans.
- **Luma:** Tiers separate non-commercial vs commercial. Model-specific credit costs.
- **Kling:** Check per-plan terms. Commercial use varies by tier.

### Image Platforms
- **Freepik:** User responsible for third-party infringement. Professional use allowed if clear.
- **Midjourney:** Commercial rights on paid plans. Free trial is non-commercial.
- **Adobe Firefly:** "Commercially safe" positioning. Content Credentials (C2PA) on outputs.
- **Leonardo:** Token-based plans. Model-specific unlimited exclusions.

### Audio/Music Platforms
- **ElevenLabs:** Free = no commercial license. Paid = commercial (with Beta constraints). Credit system covers speech + music + image.
- **Suno:** Free = Suno-owned, non-commercial. Paid = user-owned + commercial license. Copyright protection uncertain.
- **Udio:** Subscription-based. Free vs paid licensing distinction.

## Provenance Markers

### SynthID
- Google's invisible watermark on AI-generated content
- Present on: Veo video outputs, Gemini/Nano Banana image outputs
- Detection: not user-visible, but metadata may indicate presence
- Store: `provenance.synthIdExpected: true` when platform is Google

### C2PA / Content Credentials
- Open standard for digital content provenance
- Present on: Adobe Firefly outputs (Content Credentials)
- Detection: look for C2PA manifest in file metadata
- Store: `provenance.c2paPresent: true/false` when detectable

### Platform-Specific Markers
- Some platforms add visible watermarks on free-tier outputs
- Store: `provenance.visibleWatermark: true/false`

## Provenance JSON Structure

```json
{
  "platform": "sora",
  "platformPlan": "plus",
  "modelId": "sora-2",
  "modelVersion": "2024-12",
  "captureMethod": "extension-dom",
  "captureTimestamp": "2026-02-14T10:30:00Z",
  "sourceUrlHash": "sha256:...",
  "synthIdExpected": false,
  "c2paPresent": false,
  "visibleWatermark": false,
  "platformTosVersion": "2026-01",
  "notes": ""
}
```

## "OK to Ship?" Checklist

Display this per-version in a Rights & Provenance drawer:

1. **Source platform identified?** (auto-detected)
2. **User plan level set?** (free/paid — manually set or inferred from profile)
3. **Commercial use allowed?** (derived from plan level + platform rules)
4. **Watermark/provenance markers noted?** (SynthID, C2PA, visible watermarks)
5. **Third-party content risk assessed?** (manual — did the prompt reference copyrighted material?)
6. **Attribution requirements met?** (platform-specific — some require credit)

Status: All green = "Likely OK to ship" / Any yellow = "Review needed" / Any red = "Do not ship"

## Audit Trail

Every version change must be logged:
- Status transitions (Draft -> Generated -> Selected -> Approved)
- Selection/deselection events with timestamp and userId
- Rights state changes with reason
- Export events (when/who/what format)

Phase 2 adds: reviewer comments, approval signatures, decision rationale.

## Implementation Notes

- `rightsState` is already an enum in the schema (RightsState)
- `provenance` is already a JSON field on SceneAssetVersion
- The "OK to ship?" checklist is a UI computation, not stored — derive from provenance + rightsState
- Platform plan level should be stored in User.extensionPreferences per platform
