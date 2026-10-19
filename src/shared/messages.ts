/** Message names exchanged between the content script, the popup and the service worker. */

/** Content script to service worker: this tab is an image document the viewer took over. */
export const MSG_VIEWER_ACTIVE = "viewer-active";

/** Popup to service worker: is the viewer active in this tab? */
export const MSG_TAB_STATUS = "tab-status";

/** Popup to service worker: reload the extension now. */
export const MSG_RELOAD = "reload-extension";

export interface TabStatusRequest {
  type: typeof MSG_TAB_STATUS;
  tabId: number;
}

export interface TabStatusResponse {
  active: boolean;
}
