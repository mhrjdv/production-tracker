/**
 * Minimal DOM snapshot: Gemini with user-query and model-response custom elements.
 */
export function createGeminiThreadDOM() {
  const html = `
    <user-query>Generate an image of a futuristic Tokyo skyline</user-query>
    <model-response>
      <img src="https://lh3.googleusercontent.com/img-abc.jpg" width="512" height="512" />
      <p>Here is your generated image of a futuristic Tokyo skyline.</p>
    </model-response>
    <user-query>Now make it at sunset with cherry blossoms</user-query>
    <model-response>
      <img src="https://lh3.googleusercontent.com/img-def.jpg" width="512" height="512" />
      <p>I've updated the image with a sunset and cherry blossoms.</p>
    </model-response>
    <div class="ql-editor" contenteditable="true">typing here</div>
  `;

  // jsdom doesn't natively support custom elements, but querySelectorAll works
  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return doc;
}
