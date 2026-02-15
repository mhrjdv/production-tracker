/**
 * Minimal DOM snapshot: Runway with generation history cards.
 */
export function createRunwayHistoryDOM() {
  const html = `
    <div data-testid="generation-card">
      <p class="prompt">A slow-motion shot of a dancer in a rainy alley</p>
      <video src="https://assets.runwayml.com/gen-001.mp4" poster="https://assets.runwayml.com/thumb-001.jpg"></video>
    </div>
    <div data-testid="generation-card">
      <p class="prompt">Timelapse of flowers blooming in a garden</p>
      <video src="https://assets.runwayml.com/gen-002.mp4" poster="https://assets.runwayml.com/thumb-002.jpg"></video>
    </div>
    <textarea data-testid="prompt-input" placeholder="Describe your video">working prompt</textarea>
  `;

  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return doc;
}
