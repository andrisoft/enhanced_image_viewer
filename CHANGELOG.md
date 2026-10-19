# Changelog

All notable changes to this project are documented in this file.
Format based on Keep a Changelog; this project uses Semantic Versioning.
Every change is its own dated version; there is no Unreleased section.

## [1.1.1] - 2026-10-19

### Changed
- Arrow key steps are about a fifth of what they were: one press now moves 2% of the window
  instead of 10%, which is a far finer movement on a zoomed in image.

## [1.1.0] - 2026-10-19

### Added
- Arrow key panning: once the image is larger than the window, the arrow keys move the view by a
  tenth of the window in that direction. The key press is only consumed when something actually
  moved, so browser shortcuts and an image that fits the window are left alone.

## [1.0.0] - 2026-10-19

### Added
- Initial release.
- Wheel zoom anchored at the mouse cursor on images opened directly in a tab.
- Drag to pan with the left mouse button, with `grab` / `grabbing` cursor feedback.
- Double click toggles between the base view (fits the window, never above 100%) and the fill
  view (scales a small image up until it touches a window edge).
- Zoom state is per tab only; the browser's own per-domain zoom is never used.
- Runs only on `.jpg`, `.jpeg` and `.png` URLs, over http, https and `file://`. Adding a format
  means one word in `src/shared/extensions.ts` plus a rebuild; because that changes the manifest
  match patterns, Brave asks to re-approve the extension's permissions afterwards.
- Popup with status, version footer, a one-time "What's new" view, the full changelog, an error
  log export and a development auto-reload switch.
