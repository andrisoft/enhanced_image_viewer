# Changelog

All notable changes to this project are documented in this file.
Format based on Keep a Changelog; this project uses Semantic Versioning.
Every change is its own dated version; there is no Unreleased section.

## [1.3.1] - 2026-10-20

### Changed
- Internal only: developer notes and everything used to publish the extension to the Chrome Web
  Store are no longer part of the public source; they stay on the maintainer's machine. The
  README now points to GitHub Issues for feedback and to the privacy policy.

## [1.3.0] - 2026-10-20

### Added
- Prepared for publishing in the Chrome Web Store.
- Popup: a "Report an issue" button that opens a new GitHub issue with only the extension version
  prefilled, and, in a store install, a "Feedback / support" button that opens the support tab of
  the store listing. The extension itself still sends nothing; the buttons only open a page.
- `PRIVACY.md` and an MIT `LICENSE`.

### Changed
- The extension is renamed to Clean Image Viewer, so it cannot be confused with an older extension
  of the same name that was flagged over collecting user data. This one collects nothing.
- The development auto-reload switch and the Reload extension button are hidden in a store
  install; an unpacked build still shows them.

## [1.2.2] - 2026-10-19

### Changed
- Internal only: the project notes now record the stale content script trap and what has been
  checked in a real browser so far.

## [1.2.1] - 2026-10-19

### Fixed
- A development reload now refreshes the open image tabs as well. Reloading an extension does not
  re-inject content scripts, so a tab that was already open kept running the previous build and
  looked like the new feature had not arrived. This applies both to the automatic build check and
  to the Reload extension button in the popup.

## [1.2.0] - 2026-10-19

### Added
- Ctrl and an arrow key pans five times as far as the arrow key alone. Alt and Meta are still
  ignored, so the browser's own Alt+Arrow back and forward keep working.

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
