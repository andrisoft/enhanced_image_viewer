# Enhanced Image Viewer

A small Brave / Chromium extension (Manifest V3) for images you open directly in a tab: zoom with
the mouse wheel, drag to pan, double click to switch between fitting and filling the window.

The zoom lives in that one tab only. The browser's own Ctrl+wheel zoom is stored per domain, so it
changes every tab of that site; this extension never touches it.

## What it does

| Input | Effect |
|---|---|
| Mouse wheel | Zoom in and out around the point under the cursor |
| Left button held, then move | Pan the image (`grab` / `grabbing` cursor) |
| Arrow keys | Pan left, right, up and down, once the image is larger than the window |
| Double click | Switch between the base view (fits the window, never above 100%) and the fill view (a small image is scaled up until it touches a window edge) |
| Window resize | The view is recomputed, keeping the point that was in the middle |

## Where it runs, and what it never does

It is injected only into URLs ending in `.jpg`, `.jpeg` or `.png`, over `http`, `https` and
`file://`. On a normal web page the content script is not loaded at all. Even there it runs two
checks before doing anything: the document must really be an image document and must not be SVG.

It has no network access, collects nothing, stores no page data, and sends nothing anywhere. The
only stored values are its own settings, a capped local activity log and the last changelog
version you have seen.

Known limit, on purpose: an image URL without a file extension (for example
`https://pbs.twimg.com/media/Abc?format=jpg`) is not matched, because matching happens on the URL.

## Setup, step by step

1. Install [Node.js](https://nodejs.org/) (version 20 or newer), then open a terminal in this
   folder.
2. `npm install`
3. `npm run build` - this writes the loadable extension into `dist/`.
4. Open `brave://extensions` in Brave.
5. Turn on **Developer mode** (top right).
6. Click **Load unpacked** and pick the `dist` folder inside this project.
7. **For local files:** on the extension's **Details** page turn on **Allow access to file URLs**.
   Without it, `file:///C:/...` images are not handled.
8. Pin the extension: click the puzzle piece icon in the toolbar, then the pin next to Enhanced
   Image Viewer. The icon is gray on normal pages and colored in a tab where the viewer is active.
9. Try it: open any `.jpg` or `.png` by direct link, or drag a local image file into a new tab.

### After a code change

`npm run build` and the extension reloads itself within a minute (see below). To reload at once,
open the popup and press **Reload extension**, or press the reload arrow on `brave://extensions`.

## Adding another image format

`src/shared/extensions.ts` holds the single list:

```ts
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
```

Add an extension (lowercase, no dot), run `npm run build`, then reload the extension. Because this
changes the manifest's match patterns, Brave asks you to re-approve the extension's permissions
afterwards.

## Development

| Command | What it does |
|---|---|
| `npm run build` | Builds `dist/` |
| `npm run watch` | Rebuilds on save (does not trigger the self-reload) |
| `npm test` | Runs the Vitest suite |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run icons` | Re-renders the icons from `assets/icon.svg` |

**Self-reload.** The build writes `dist/build.json` last, with a fresh build id that is also baked
into the bundles. The service worker polls that file once a minute and reloads the extension when
the ids differ, so a finished build lands in the browser without visiting `brave://extensions`. It
only ever runs for unpacked installs and can be switched off in the popup.

**Tests.** Vitest with happy-dom plus an in-memory fake `chrome` object. These prove the logic,
never real browser behavior, so changes still need a quick check in Brave.

## Note

Built with AI assistance (Claude Code).
