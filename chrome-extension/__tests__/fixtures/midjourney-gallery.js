/**
 * Minimal DOM snapshot: Midjourney with job cards.
 */
export function createMidjourneyGalleryDOM() {
  const html = `
    <div class="job-card" data-testid="job-card">
      <div class="prompt-text">a painting of a dragon in watercolor style --v 6.1 --ar 16:9 --seed 42</div>
      <img src="https://cdn.midjourney.com/job-001.png" width="512" height="288" alt="dragon painting" />
    </div>
    <div class="job-card" data-testid="job-card">
      <div class="prompt-text">abstract geometric pattern in blue and gold --v 6.0 --ar 1:1</div>
      <img src="https://cdn.midjourney.com/job-002.png" width="512" height="512" alt="geometric pattern" />
    </div>
    <textarea data-testid="prompt-input" placeholder="Imagine...">new prompt draft</textarea>
  `;

  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return doc;
}
