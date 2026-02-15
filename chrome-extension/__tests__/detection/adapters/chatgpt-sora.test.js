import { describe, it, expect } from "vitest";
import ChatGPTSoraAdapter from "../../../src/detection/adapters/chatgpt-sora.js";
import { createSoraThreadDOM, createSoraStandaloneDOM } from "../../fixtures/sora-thread.js";

describe("ChatGPTSoraAdapter", () => {
  describe("match", () => {
    it("matches sora.com", () => {
      expect(ChatGPTSoraAdapter.match("https://sora.com/create")).toBe(true);
    });

    it("matches chatgpt.com", () => {
      expect(ChatGPTSoraAdapter.match("https://chatgpt.com/chat/abc")).toBe(true);
    });

    it("matches chat.openai.com", () => {
      expect(ChatGPTSoraAdapter.match("https://chat.openai.com/c/abc")).toBe(true);
    });

    it("does not match unrelated URLs", () => {
      expect(ChatGPTSoraAdapter.match("https://midjourney.com")).toBe(false);
      expect(ChatGPTSoraAdapter.match("https://example.com")).toBe(false);
    });
  });

  describe("extractLatest (thread)", () => {
    it("extracts last user->assistant pair prompt", () => {
      const doc = createSoraThreadDOM();
      const result = ChatGPTSoraAdapter.extractLatest(doc);

      expect(result.prompt).toContain("lightning");
    });

    it("extracts video output from last assistant turn", () => {
      const doc = createSoraThreadDOM();
      const result = ChatGPTSoraAdapter.extractLatest(doc);

      expect(result.outputs.length).toBeGreaterThanOrEqual(1);
      expect(result.outputs[0].url).toContain("def456");
      expect(result.outputs[0].type).toBe("video");
    });
  });

  describe("extractLatest (standalone)", () => {
    it("extracts prompt from generation-prompt display", () => {
      const doc = createSoraStandaloneDOM();
      const result = ChatGPTSoraAdapter.extractLatest(doc);

      expect(result.prompt).toContain("cyberpunk");
    });
  });

  describe("extractCandidates", () => {
    it("returns multiple candidates from thread", () => {
      const doc = createSoraThreadDOM();
      const candidates = ChatGPTSoraAdapter.extractCandidates(doc);

      expect(candidates.length).toBeGreaterThanOrEqual(2);
    });

    it("newest candidate is first", () => {
      const doc = createSoraThreadDOM();
      const candidates = ChatGPTSoraAdapter.extractCandidates(doc);

      expect(candidates[0].prompt).toContain("lightning");
      expect(candidates[1].prompt).toContain("lighthouse");
    });
  });

  describe("applyPrompt", () => {
    it("injects prompt into textarea", () => {
      const doc = createSoraThreadDOM();
      const result = ChatGPTSoraAdapter.applyPrompt(doc, "New test prompt");

      expect(result.ok).toBe(true);

      const textarea = doc.querySelector('textarea[data-testid="prompt-textarea"]');
      expect(textarea.value).toBe("New test prompt");
    });

    it("returns error for empty prompt", () => {
      const doc = createSoraThreadDOM();
      const result = ChatGPTSoraAdapter.applyPrompt(doc, "");

      expect(result.ok).toBe(false);
    });
  });
});
