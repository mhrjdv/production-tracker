/* ==========================================================
   esbuild – Chrome Extension build script
   Entry points: sidepanel, background (service worker), content-script
   Outputs to chrome-extension/dist/
   ========================================================== */

import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watchMode = process.argv.includes("--watch");

const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy detectors into dist/ for side panel URL matching (detect.js).
// Content script V2 bundles adapters + detectors via esbuild imports.
function copyDetectors() {
  const detectorsSource = path.join(__dirname, "detectors");
  const detectorsDest = path.join(distDir, "detectors");

  if (!fs.existsSync(detectorsDest)) {
    fs.mkdirSync(detectorsDest, { recursive: true });
  }

  const files = fs.readdirSync(detectorsSource);
  for (const file of files) {
    if (file.endsWith(".js")) {
      fs.copyFileSync(
        path.join(detectorsSource, file),
        path.join(detectorsDest, file),
      );
    }
  }

  console.log(`[build] Copied ${files.filter((f) => f.endsWith(".js")).length} detector files to dist/detectors/`);
}

// Common build options
const commonOptions = {
  bundle: true,
  sourcemap: true,
  target: ["chrome120"],
  logLevel: "info",
};

// Side panel: IIFE format (loaded via <script> in sidepanel.html)
const sidepanelOptions = {
  ...commonOptions,
  entryPoints: [path.join(__dirname, "src/sidepanel.js")],
  outfile: path.join(distDir, "sidepanel.js"),
  format: "iife",
};

// Background service worker: ESM format (required by MV3 service workers with type: module)
const backgroundOptions = {
  ...commonOptions,
  entryPoints: [path.join(__dirname, "src/background.js")],
  outfile: path.join(distDir, "background.js"),
  format: "esm",
};

// Content script: IIFE format (injected into web pages)
const contentScriptOptions = {
  ...commonOptions,
  entryPoints: [path.join(__dirname, "src/content-script.js")],
  outfile: path.join(distDir, "content-script.js"),
  format: "iife",
};

async function build() {
  copyDetectors();

  if (watchMode) {
    const contexts = await Promise.all([
      esbuild.context(sidepanelOptions),
      esbuild.context(backgroundOptions),
      esbuild.context(contentScriptOptions),
    ]);

    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("[build] Watching for changes...");
  } else {
    await Promise.all([
      esbuild.build(sidepanelOptions),
      esbuild.build(backgroundOptions),
      esbuild.build(contentScriptOptions),
    ]);
    console.log("[build] Build complete.");
  }
}

build().catch((err) => {
  console.error("[build] Build failed:", err);
  process.exit(1);
});
