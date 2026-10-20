/**
 * Popup parts that depend on how the extension was installed. An unpacked build shows the
 * development controls; a store install hides them and offers the store's support page instead.
 */

import { newIssueUrl, storeSupportUrl } from "../shared/feedback.js";
import { isDevelopmentInstall } from "../shared/install.js";

function setHidden(root: ParentNode, id: string, hidden: boolean): void {
  const element = root.querySelector<HTMLElement>(`#${id}`);
  if (element) element.hidden = hidden;
}

function openAndClose(url: string): void {
  void chrome.tabs.create({ url }).then(() => window.close());
}

export function applyInstallMode(root: ParentNode): void {
  const development = isDevelopmentInstall();
  setHidden(root, "dev-controls", !development);
  setHidden(root, "reload", !development);
  setHidden(root, "feedback", development);

  root.querySelector("#feedback")?.addEventListener("click", () => {
    openAndClose(storeSupportUrl(chrome.runtime.id));
  });
  root.querySelector("#report-issue")?.addEventListener("click", () => {
    openAndClose(newIssueUrl(chrome.runtime.getManifest().version));
  });
}
