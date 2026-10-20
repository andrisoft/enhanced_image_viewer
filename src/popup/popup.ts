/**
 * Popup: tab status, the one-time "what's new" view, the full changelog, the error log, feedback
 * links and the development auto-reload switch. Every text node is set with textContent.
 */

import {
  parseChangelog,
  releaseDateOf,
  sectionsSince,
  type ChangelogSection,
} from "../shared/changelog.js";
import { clearLog, formatLog, readLog } from "../shared/log.js";
import { applyInstallMode } from "./install-mode.js";
import { MSG_RELOAD, MSG_TAB_STATUS } from "../shared/messages.js";
import { getLastSeenVersion, isAutoReloadEnabled, setAutoReloadEnabled, setLastSeenVersion } from "../shared/settings.js";

const version = chrome.runtime.getManifest().version;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
}

function el(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function renderSections(target: HTMLElement, sections: ChangelogSection[]): void {
  target.textContent = "";
  if (sections.length === 0) {
    target.appendChild(el("p", "entry-body", "No entries."));
    return;
  }
  for (const section of sections) {
    target.appendChild(el("p", "entry-version", `${section.version} - ${section.date}`));
    target.appendChild(el("p", "entry-body", section.body));
  }
}

function showPanel(id: "main" | "changelog" | "log"): void {
  for (const panel of ["main", "changelog", "log"] as const) {
    byId(panel).hidden = panel !== id;
  }
}

async function loadChangelog(): Promise<ChangelogSection[]> {
  try {
    const response = await fetch(chrome.runtime.getURL("CHANGELOG.md"), { cache: "no-store" });
    return parseChangelog(await response.text());
  } catch {
    return [];
  }
}

async function showTabStatus(): Promise<void> {
  const status = byId("status");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) {
    status.textContent = "No active tab.";
    return;
  }
  try {
    const response = (await chrome.runtime.sendMessage({ type: MSG_TAB_STATUS, tabId: tab.id })) as
      | { active?: boolean }
      | undefined;
    const active = response?.active === true;
    status.textContent = active ? "Active in this tab." : "This tab is not an image document.";
    status.classList.toggle("active", active);
  } catch {
    status.textContent = "Status unavailable.";
  }
}

async function showWhatsNew(sections: ChangelogSection[]): Promise<void> {
  const lastSeen = await getLastSeenVersion();
  if (lastSeen === null) {
    // Fresh install: remember the version silently, never show the dialog.
    await setLastSeenVersion(version);
    return;
  }
  const fresh = sectionsSince(sections, lastSeen);
  if (fresh.length === 0) return;

  renderSections(byId("whats-new-body"), fresh);
  byId("whats-new").hidden = false;
  byId("whats-new-dismiss").addEventListener("click", () => {
    void setLastSeenVersion(version);
    byId("whats-new").hidden = true;
  });
}

async function showLog(): Promise<void> {
  const body = byId("log-body");
  body.textContent = "";
  const entries = await readLog();
  if (entries.length === 0) {
    body.appendChild(el("p", "entry-body", "The log is empty."));
  } else {
    for (const entry of entries) {
      const line = `${entry.at}  ${entry.level.toUpperCase()}  ${entry.message}`;
      body.appendChild(el("div", entry.level === "error" ? "error-line" : "", line));
    }
  }
  showPanel("log");
}

function exportLogFile(text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `clean-image-viewer-log-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function init(): Promise<void> {
  const sections = await loadChangelog();
  const releaseDate = releaseDateOf(sections, version);
  byId("footer").textContent = releaseDate ? `v${version} · ${releaseDate}` : `v${version}`;

  const autoReload = byId<HTMLInputElement>("auto-reload");
  autoReload.checked = await isAutoReloadEnabled();
  autoReload.addEventListener("change", () => void setAutoReloadEnabled(autoReload.checked));

  byId("show-changelog").addEventListener("click", () => {
    renderSections(byId("changelog-body"), sections);
    showPanel("changelog");
  });
  byId("show-log").addEventListener("click", () => void showLog());
  byId("export-log").addEventListener("click", () => {
    void readLog().then((entries) => exportLogFile(formatLog(entries)));
  });
  byId("clear-log").addEventListener("click", () => {
    void clearLog().then(() => void showLog());
  });
  byId("reload").addEventListener("click", () => void chrome.runtime.sendMessage({ type: MSG_RELOAD }));
  for (const button of document.querySelectorAll("[data-back]")) {
    button.addEventListener("click", () => showPanel("main"));
  }

  applyInstallMode(document);
  await showTabStatus();
  await showWhatsNew(sections);
}

void init();
