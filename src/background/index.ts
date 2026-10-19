/**
 * Service worker entry point. Every listener is registered synchronously at top level, because
 * MV3 restarts the worker for each event.
 */

import { appendLog } from "../shared/log.js";
import {
  MSG_RELOAD,
  MSG_TAB_STATUS,
  MSG_VIEWER_ACTIVE,
  type TabStatusRequest,
} from "../shared/messages.js";
import {
  RELOAD_ALARM,
  applyDefaultIcon,
  checkForNewBuild,
  isViewerActive,
  markViewerActive,
  markViewerInactive,
  recordError,
  reloadViewerTabs,
  startReloadAlarm,
} from "./core.js";

self.addEventListener("error", (event) => {
  void recordError(`Uncaught error: ${event.message}`);
});

self.addEventListener("unhandledrejection", (event) => {
  void recordError(`Unhandled rejection: ${String(event.reason)}`);
});

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    await applyDefaultIcon();
    await appendLog("info", `Extension ${details.reason}: version ${chrome.runtime.getManifest().version}`);
    await startReloadAlarm();
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    await applyDefaultIcon();
    await startReloadAlarm();
  })();
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const type = (message as { type?: string })?.type;

  if (type === MSG_VIEWER_ACTIVE) {
    const tabId = sender.tab?.id;
    if (tabId !== undefined) void markViewerActive(tabId);
    return false;
  }

  if (type === MSG_TAB_STATUS) {
    const tabId = (message as TabStatusRequest).tabId;
    void isViewerActive(tabId).then((active) => sendResponse({ active }));
    return true;
  }

  if (type === MSG_RELOAD) {
    // Refresh the image tabs first, otherwise they keep running the previous content script.
    void reloadViewerTabs().finally(() => chrome.runtime.reload());
    return false;
  }

  return false;
});

// A tab that starts loading something else is no longer a viewer tab. The url is not read here,
// so no tabs host permission is needed.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") void markViewerInactive(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void markViewerInactive(tabId);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== RELOAD_ALARM) return;
  void checkForNewBuild(__BUILD_ID__).catch((error: unknown) => {
    void recordError(`Build check failed: ${String(error)}`);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.devAutoReload) void startReloadAlarm();
});
