/** Persisted settings and state, all in chrome.storage.local. */

export const AUTO_RELOAD_KEY = "devAutoReload";
export const LAST_SEEN_VERSION_KEY = "lastSeenVersion";
export const ERROR_COUNT_KEY = "errorCount";

/** Development auto-reload is on by default, but only ever runs for unpacked installs. */
export async function isAutoReloadEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get(AUTO_RELOAD_KEY);
  return stored[AUTO_RELOAD_KEY] !== false;
}

export async function setAutoReloadEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [AUTO_RELOAD_KEY]: enabled });
}

export async function getLastSeenVersion(): Promise<string | null> {
  const stored = await chrome.storage.local.get(LAST_SEEN_VERSION_KEY);
  const value = stored[LAST_SEEN_VERSION_KEY];
  return typeof value === "string" ? value : null;
}

export async function setLastSeenVersion(version: string): Promise<void> {
  await chrome.storage.local.set({ [LAST_SEEN_VERSION_KEY]: version });
}

export async function getErrorCount(): Promise<number> {
  const stored = await chrome.storage.local.get(ERROR_COUNT_KEY);
  const value = stored[ERROR_COUNT_KEY];
  return typeof value === "number" ? value : 0;
}

export async function setErrorCount(count: number): Promise<void> {
  await chrome.storage.local.set({ [ERROR_COUNT_KEY]: count });
}
