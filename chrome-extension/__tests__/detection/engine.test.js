import { describe, it, expect } from "vitest";
import { findAdapter, extractLatest, extractCandidates, applyPrompt } from "../../src/detection/engine.js";
import { createSoraThreadDOM, createSoraStandaloneDOM } from "../fixtures/sora-thread.js";
import { createGeminiThreadDOM } from "../fixtures/gemini-thread.js";
import { createMidjourneyGalleryDOM } from "../fixtures/midjourney-gallery.js";
import { createRunwayHistoryDOM } from "../fixtures/runway-history.js";
import { createElevenLabsHistoryDOM } from "../fixtures/elevenlabs-history.js";
import { createEmptyPageDOM } from "../fixtures/empty-page.js";

describe("findAdapter", () => {
  it("returns Sora adapter for sora.com", () => {
    const adapter = findAdapter("https://sora.com/create");
    expect(adapter.platformKey).toBe("openai-sora");
  });

  it("returns Sora adapter for chatgpt.com", () => {
    const adapter = findAdapter("https://chatgpt.com/g/sora-chat");
    expect(adapter.platformKey).toBe("openai-sora");
  });

  it("returns Gemini adapter for gemini.google.com", () => {
    const adapter = findAdapter("https://gemini.google.com/chat");
    expect(adapter.platformKey).toBe("google-veo");
  });

  it("returns Midjourney adapter for midjourney.com", () => {
    const adapter = findAdapter("https://www.midjourney.com/explore");
    expect(adapter.platformKey).toBe("midjourney");
  });

  it("returns Runway adapter for app.runwayml.com", () => {
    const adapter = findAdapter("https://app.runwayml.com/generate");
    expect(adapter.platformKey).toBe("runway");
  });

  it("returns ElevenLabs adapter for elevenlabs.io", () => {
    const adapter = findAdapter("https://elevenlabs.io/speech-synthesis");
    expect(adapter.platformKey).toBe("elevenlabs");
  });

  it("returns generic fallback for unknown URLs", () => {
    const adapter = findAdapter("https://example.com/random");
    expect(adapter.platformKey).toBe("__generic__");
  });

  it("returns generic fallback for empty URL", () => {
    const adapter = findAdapter("");
    expect(adapter.platformKey).toBe("__generic__");
  });

  it("returns generic fallback for null URL", () => {
    const adapter = findAdapter(null);
    expect(adapter.platformKey).toBe("__generic__");
  });

  // Thin wrapper adapters
  it("returns Kling adapter", () => {
    expect(findAdapter("https://klingai.com/create").platformKey).toBe("kling-ai");
  });

  it("returns Luma adapter", () => {
    expect(findAdapter("https://lumalabs.ai/dream-machine").platformKey).toBe("luma-dream-machine");
  });

  it("returns Freepik adapter", () => {
    expect(findAdapter("https://www.freepik.com/pikaso").platformKey).toBe("freepik-ai");
  });

  it("returns Leonardo adapter", () => {
    expect(findAdapter("https://app.leonardo.ai/create").platformKey).toBe("leonardo-ai");
  });

  it("returns Ideogram adapter", () => {
    expect(findAdapter("https://ideogram.ai/generate").platformKey).toBe("ideogram");
  });

  it("returns Adobe Firefly adapter", () => {
    expect(findAdapter("https://firefly.adobe.com/generate").platformKey).toBe("adobe-firefly");
  });

  it("returns Flux adapter", () => {
    expect(findAdapter("https://blackforestlabs.ai/create").platformKey).toBe("bfl-flux");
  });

  it("returns Suno adapter", () => {
    expect(findAdapter("https://suno.com/create").platformKey).toBe("suno");
  });

  it("returns Udio adapter", () => {
    expect(findAdapter("https://udio.com/create").platformKey).toBe("udio");
  });

  it("returns Stable Audio adapter", () => {
    expect(findAdapter("https://stableaudio.com/generate").platformKey).toBe("stable-audio");
  });
});

describe("extractLatest", () => {
  it("extracts latest from Sora thread (last assistant turn)", () => {
    const doc = createSoraThreadDOM();
    const result = extractLatest(doc, "https://chatgpt.com/sora");

    expect(result.latestCandidate.prompt).toContain("lightning");
    expect(result.latestCandidate.outputs.length).toBeGreaterThanOrEqual(1);
    expect(result.latestCandidate.outputs[0].url).toContain("def456");
    expect(result.latestCandidate.confidence).toBe(1.0);
    expect(result.adapter.platformKey).toBe("openai-sora");
    expect(result.debug.engineVersion).toBe("2.0.0");
  });

  it("extracts from Sora standalone (prompt display)", () => {
    const doc = createSoraStandaloneDOM();
    const result = extractLatest(doc, "https://sora.com/create");

    expect(result.latestCandidate.prompt).toContain("cyberpunk");
    expect(result.latestCandidate.outputs.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts from Gemini thread", () => {
    const doc = createGeminiThreadDOM();
    const result = extractLatest(doc, "https://gemini.google.com/chat");

    expect(result.latestCandidate.prompt).toContain("sunset");
    expect(result.latestCandidate.outputs.length).toBeGreaterThanOrEqual(1);
    expect(result.adapter.platformKey).toBe("google-veo");
  });

  it("extracts from Midjourney gallery (latest job card)", () => {
    const doc = createMidjourneyGalleryDOM();
    const result = extractLatest(doc, "https://www.midjourney.com/explore");

    expect(result.latestCandidate.prompt).toContain("dragon");
    expect(result.adapter.platformKey).toBe("midjourney");
  });

  it("extracts from Runway history", () => {
    const doc = createRunwayHistoryDOM();
    const result = extractLatest(doc, "https://app.runwayml.com/generate");

    expect(result.latestCandidate.prompt).toContain("dancer");
    expect(result.latestCandidate.outputs.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts from ElevenLabs history", () => {
    const doc = createElevenLabsHistoryDOM();
    const result = extractLatest(doc, "https://elevenlabs.io/speech-synthesis");

    expect(result.adapter.platformKey).toBe("elevenlabs");
  });

  it("uses generic fallback for empty page", () => {
    const doc = createEmptyPageDOM();
    const result = extractLatest(doc, "https://example.com");

    expect(result.adapter.platformKey).toBe("__generic__");
    expect(result.latestCandidate.confidence).toBeLessThanOrEqual(0.7);
  });
});

describe("extractCandidates", () => {
  it("returns multiple candidates from Sora thread", () => {
    const doc = createSoraThreadDOM();
    const result = extractCandidates(doc, "https://chatgpt.com/sora");

    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
    // First should be newest (lightning)
    expect(result.candidates[0].prompt).toContain("lightning");
    // Second should be older (lighthouse)
    expect(result.candidates[1].prompt).toContain("lighthouse");
  });

  it("returns multiple candidates from Midjourney gallery", () => {
    const doc = createMidjourneyGalleryDOM();
    const result = extractCandidates(doc, "https://www.midjourney.com/explore");

    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it("respects maxCandidates option", () => {
    const doc = createSoraThreadDOM();
    const result = extractCandidates(doc, "https://chatgpt.com/sora", { maxCandidates: 1 });

    expect(result.candidates.length).toBeLessThanOrEqual(1);
  });
});
