/**
 * Minimal DOM snapshot: ElevenLabs with history items.
 */
export function createElevenLabsHistoryDOM() {
  const html = `
    <div class="history-item">
      <div class="text">Welcome to the world of AI-generated voices, where anything is possible.</div>
      <audio src="https://api.elevenlabs.io/v1/audio/gen-001.mp3"></audio>
    </div>
    <div class="history-item">
      <div class="text">The quick brown fox jumps over the lazy dog.</div>
      <audio src="https://api.elevenlabs.io/v1/audio/gen-002.mp3"></audio>
    </div>
    <textarea data-testid="tts-input" placeholder="Enter text">current TTS input</textarea>
  `;

  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return doc;
}
