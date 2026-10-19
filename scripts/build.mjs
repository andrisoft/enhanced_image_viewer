/**
 * Builds a loadable dist/ with esbuild.
 *
 * Order matters: dist/build.json is written LAST, after the bundles are on disk, and carries the
 * same build id that is baked into the bundles. The service worker polls that file and reloads
 * the extension when the ids differ, so a finished build lands in the browser without a visit to
 * brave://extensions.
 */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import * as esbuild from "esbuild";
import { allMatchPatterns, IMAGE_EXTENSIONS } from "../src/shared/extensions.ts";
import { renderIcons } from "./icons.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(projectRoot, "src");
const distDir = join(projectRoot, "dist");
const watch = process.argv.includes("--watch");

const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
const version = packageJson.version;
const buildId = randomUUID();

const sharedOptions = {
  bundle: true,
  target: "chrome120",
  logLevel: "info",
  loader: { ".css": "text" },
  define: { __BUILD_ID__: JSON.stringify(buildId) },
};

const entries = [
  { in: join(srcDir, "content", "index.ts"), out: join(distDir, "content.js"), format: "iife" },
  { in: join(srcDir, "background", "index.ts"), out: join(distDir, "background.js"), format: "esm" },
  { in: join(srcDir, "popup", "popup.ts"), out: join(distDir, "popup.js"), format: "iife" },
];

async function writeManifest() {
  const template = JSON.parse(await readFile(join(srcDir, "manifest.json"), "utf8"));
  template.version = version;
  template.content_scripts[0].matches = allMatchPatterns();
  await writeFile(join(distDir, "manifest.json"), `${JSON.stringify(template, null, 2)}\n`, "utf8");
}

async function copyStaticFiles() {
  await cp(join(srcDir, "popup", "popup.html"), join(distDir, "popup.html"));
  await cp(join(srcDir, "popup", "popup.css"), join(distDir, "popup.css"));
  await cp(join(projectRoot, "CHANGELOG.md"), join(distDir, "CHANGELOG.md"));
  await renderIcons(join(distDir, "icons"));
}

async function writeBuildStamp() {
  const stamp = { version, buildId, builtAt: new Date().toISOString() };
  await writeFile(join(distDir, "build.json"), `${JSON.stringify(stamp, null, 2)}\n`, "utf8");
}

async function buildOnce() {
  await Promise.all(
    entries.map((entry) =>
      esbuild.build({ ...sharedOptions, entryPoints: [entry.in], outfile: entry.out, format: entry.format }),
    ),
  );
  await writeManifest();
  await copyStaticFiles();
  await writeBuildStamp();
}

if (!watch) {
  await rm(distDir, { recursive: true, force: true });
}
await mkdir(distDir, { recursive: true });

if (watch) {
  // Watch mode deliberately keeps one build id, so it never triggers the self-reload.
  const contexts = await Promise.all(
    entries.map((entry) =>
      esbuild.context({ ...sharedOptions, entryPoints: [entry.in], outfile: entry.out, format: entry.format }),
    ),
  );
  await writeManifest();
  await copyStaticFiles();
  await writeBuildStamp();
  await Promise.all(contexts.map((context) => context.watch()));
  console.log(`watching, version ${version}`);
} else {
  await buildOnce();
  console.log(`built version ${version} (${buildId}) for: ${IMAGE_EXTENSIONS.join(", ")}`);
}
