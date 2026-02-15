/* ==========================================================
   Messaging – Wrapped chrome.tabs.sendMessage with timeout
   and automatic content script injection fallback.
   ========================================================== */

/**
 * Ensure the content script is loaded in the given tab.
 * Pings first; if no response, injects programmatically.
 */
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "__ping__" });
    return true;
  } catch {
    // Content script not loaded — inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["dist/content-script.js"],
      });
      return true;
    } catch (injectErr) {
      // Cannot inject (e.g., chrome:// pages, extension pages)
      throw new Error(
        `Cannot reach page: ${injectErr.message || "injection failed"}`,
      );
    }
  }
}

/**
 * Send message to content script with timeout and auto-injection fallback.
 */
export function sendMessageWithTimeout(tabId, message, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Content script did not respond within timeout"));
    }, timeoutMs);

    ensureContentScript(tabId)
      .then(() => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
