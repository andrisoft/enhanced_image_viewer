/**
 * Service worker logic, kept free of listener registration so it can be unit tested against a
 * fake chrome object. MV3 kills and restarts the worker constantly, so nothing is cached in
 * module variables: every piece of state lives in chrome.storage.
 */

import { appendLog } from "../shared/log.js";
import { getErrorCount, isAutoReloadEnabled, setErrorCount } from "../shared/settings.js";

export const ACTIVE_TABS_KEY = "activeTabs";
export const RELOAD_ALARM = "check-for-new-build";
export const BUILD_FILE = "build.json";

const COLOR_ICON = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};

const GRAY_ICON = {
  16: "icons/icon-gray-16.png",
  32: "icons/icon-gray-32.png",
  48: "icons/icon-gray-48.png",
  128: "icons/icon-gray-128.png",
};

async function readActiveTabs(): Promise<number[]> {
  const stored = await chrome.storage.session.get(ACTIVE_TABS_KEY);
  const value = stored[ACTIVE_TABS_KEY];
  return Array.isArray(value) ? (value as number[]) : [];
}

async function writeActiveTabs(tabIds: number[]): Promise<void> {
  await chrome.storage.session.set({ [ACTIVE_TABS_KEY]: tabIds });
}

/** The viewer took over a tab: remember it and switch that tab's icon to the color variant. */
export async function markViewerActive(tabId: number): Promise<void> {
  const tabIds = await readActiveTabs();
  if (!tabIds.includes(tabId)) await writeActiveTabs([...tabIds, tabId]);
  await chrome.action.setIcon({ tabId, path: COLOR_ICON });
}

/**
 * The tab navigated or closed. The browser resets a per-tab icon on navigation by itself, but
 * the remembered set has to be cleaned up here.
 */
export async function markViewerInactive(tabId: number): Promise<void> {
  const tabIds = await readActiveTabs();
  if (tabIds.includes(tabId)) await writeActiveTabs(tabIds.filter((id) => id !== tabId));
}

export async function isViewerActive(tabId: number): Promise<boolean> {
  return (await readActiveTabs()).includes(tabId);
}

/**
 * Reloading the extension does not re-inject content scripts, so an image tab that is already
 * open keeps running the previous build. Refresh those tabs before the reload. Only tabs the
 * viewer reported itself are touched, and chrome.tabs.reload needs no permission.
 */
export async function reloadViewerTabs(): Promise<number> {
  const tabIds = await readActiveTabs();
  for (const tabId of tabIds) {
    try {
      await chrome.tabs.reload(tabId);
    } catch {
      // The tab is gone; nothing to refresh.
    }
  }
  return tabIds.length;
}

/** Gray icon as the extension-wide default: color is only ever set per tab. */
export async function applyDefaultIcon(): Promise<void> {
  await chrome.action.setIcon({ path: GRAY_ICON });
}

/**
 * An unpacked (development) install has no update_url in its manifest. This extension is never
 * published, so the check only guards against the self-reload poll running in a packed build.
 */
export function isDevelopmentInstall(): boolean {
  return !("update_url" in chrome.runtime.getManifest());
}

/**
 * Compares the build id on disk with the one baked into this bundle and reloads the extension
 * when the build script produced a newer one. No reload loop is possible: the new bundle carries
 * the new id.
 */
export async function checkForNewBuild(currentBuildId: string): Promise<boolean> {
  if (!isDevelopmentInstall()) return false;
  if (!(await isAutoReloadEnabled())) return false;

  const response = await fetch(chrome.runtime.getURL(BUILD_FILE), { cache: "no-store" });
  if (!response.ok) return false;
  const data = (await response.json()) as { buildId?: string };
  if (!data.buildId || data.buildId === currentBuildId) return false;

  const refreshed = await reloadViewerTabs();
  await appendLog("info", `New build on disk, reloading the extension (${refreshed} viewer tabs refreshed)`);
  chrome.runtime.reload();
  return true;
}

export async function startReloadAlarm(): Promise<void> {
  if (!isDevelopmentInstall() || !(await isAutoReloadEnabled())) {
    await chrome.alarms.clear(RELOAD_ALARM);
    return;
  }
  await chrome.alarms.create(RELOAD_ALARM, { periodInMinutes: 1 });
}

export async function recordError(message: string): Promise<void> {
  await appendLog("error", message);
  const count = (await getErrorCount()) + 1;
  await setErrorCount(count);
  await chrome.action.setBadgeText({ text: count > 9 ? "9+" : String(count) });
  await chrome.action.setBadgeBackgroundColor({ color: "#b3261e" });
}

export async function clearErrorBadge(): Promise<void> {
  await setErrorCount(0);
  await chrome.action.setBadgeText({ text: "" });
}
