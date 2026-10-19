/**
 * Renders every extension icon from the single source SVG with resvg-js.
 *
 * Two variants are produced: the color icon, and a gray one used as the extension-wide default
 * so the toolbar button shows at a glance whether the viewer is active in the current tab.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = join(projectRoot, "assets", "icon.svg");
const SIZES = [16, 32, 48, 128];

/** Color to gray mapping for the inactive variant; keys must match the colors in icon.svg. */
const GRAY_PALETTE = {
  "#1f6feb": "#5c5c5c",
  "#ffffff": "#d6d6d6",
  "#facc15": "#b4b4b4",
  "#2ea043": "#8c8c8c",
  "#0d1117": "#2b2b2b",
};

function toGray(svg) {
  let grayed = svg;
  for (const [color, gray] of Object.entries(GRAY_PALETTE)) {
    grayed = grayed.split(color).join(gray);
  }
  return grayed;
}

function renderPng(svg, size) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  return resvg.render().asPng();
}

export async function renderIcons(outDir) {
  const svg = await readFile(SOURCE_SVG, "utf8");
  const graySvg = toGray(svg);
  await mkdir(outDir, { recursive: true });

  const written = [];
  for (const size of SIZES) {
    const color = join(outDir, `icon-${size}.png`);
    const gray = join(outDir, `icon-gray-${size}.png`);
    await writeFile(color, renderPng(svg, size));
    await writeFile(gray, renderPng(graySvg, size));
    written.push(color, gray);
  }
  return written;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const written = await renderIcons(join(projectRoot, "dist", "icons"));
  console.log(`icons: ${written.length} files written`);
}
