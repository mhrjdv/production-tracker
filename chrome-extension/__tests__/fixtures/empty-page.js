/**
 * Minimal DOM snapshot: Empty page with no AI platform content.
 */
export function createEmptyPageDOM() {
  const html = `
    <h1>Welcome to Example.com</h1>
    <p>This is a regular webpage with no AI generation content.</p>
    <input type="text" placeholder="Search..." value="" />
    <img src="https://example.com/logo.png" width="100" height="50" />
  `;

  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return doc;
}
