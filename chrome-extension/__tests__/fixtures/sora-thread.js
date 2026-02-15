/**
 * Minimal DOM snapshot: ChatGPT/Sora with 2 conversation turns.
 */
export function createSoraThreadDOM() {
  const html = `
    <div data-message-author-role="user">
      <p>A cinematic shot of a lighthouse on a stormy coast, waves crashing, 4K HDR</p>
    </div>
    <div data-message-author-role="assistant">
      <video src="https://files.oaiusercontent.com/video-abc123.mp4" poster="https://files.oaiusercontent.com/thumb-abc123.jpg"></video>
      <p>Here is your generated video of a lighthouse on a stormy coast.</p>
    </div>
    <div data-message-author-role="user">
      <p>Make it more dramatic with lightning in the background</p>
    </div>
    <div data-message-author-role="assistant">
      <video src="https://files.oaiusercontent.com/video-def456.mp4" poster="https://files.oaiusercontent.com/thumb-def456.jpg"></video>
      <p>Here's the updated version with lightning.</p>
    </div>
    <textarea data-testid="prompt-textarea" placeholder="Message ChatGPT">current input bar text</textarea>
  `;

  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return doc;
}

/**
 * Minimal DOM snapshot: Sora standalone (no thread, prompt display only)
 */
export function createSoraStandaloneDOM() {
  const html = `
    <div data-testid="generation-prompt">A neon-lit cyberpunk city at night</div>
    <div class="generation-result">
      <video src="https://files.oaiusercontent.com/video-standalone.mp4"></video>
    </div>
    <textarea data-testid="sora-prompt-input" placeholder="Describe your video">A neon-lit cyberpunk city at night</textarea>
  `;

  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return doc;
}
