# Changelog

All notable changes to this project are documented in this file.
Format based on Keep a Changelog; this project uses Semantic Versioning.
Every change is its own dated version; there is no Unreleased section.

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
