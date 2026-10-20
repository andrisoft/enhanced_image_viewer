/**
 * An unpacked (development) install has no update_url in its manifest; the Chrome Web Store adds
 * one to every installed copy. Used by the service worker (the build poll only runs in development)
 * and by the popup (development controls and the store support page depend on it).
 */
export function isDevelopmentInstall(): boolean {
  return !("update_url" in chrome.runtime.getManifest());
}
