import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeChrome, type FakeChrome } from "./fake-chrome.js";
import { applyInstallMode } from "../src/popup/install-mode.js";
import { GITHUB_REPO_URL, newIssueUrl, storeSupportUrl } from "../src/shared/feedback.js";

let fake: FakeChrome;

function buildPopupDom(): void {
  document.body.innerHTML = `
    <div id="dev-controls"></div>
    <button id="reload"></button>
    <button id="feedback"></button>
    <button id="report-issue"></button>`;
}

function isHidden(id: string): boolean {
  return (document.getElementById(id) as HTMLElement).hasAttribute("hidden");
}

async function click(id: string): Promise<void> {
  (document.getElementById(id) as HTMLElement).click();
  await Promise.resolve();
}

beforeEach(() => {
  buildPopupDom();
  vi.spyOn(window, "close").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("popup in an unpacked development install", () => {
  beforeEach(() => {
    fake = installFakeChrome({ version: "1.3.0" });
    applyInstallMode(document);
  });

  it("shows the development controls and hides the store support button", () => {
    expect(isHidden("dev-controls")).toBe(false);
    expect(isHidden("reload")).toBe(false);
    expect(isHidden("feedback")).toBe(true);
  });

  it("opens a prefilled GitHub issue that carries only the extension version", async () => {
    await click("report-issue");

    expect(fake.tabs.create).toHaveBeenCalledOnce();
    const url = fake.tabs.create.mock.calls[0]?.[0].url ?? "";
    expect(url.startsWith(`${GITHUB_REPO_URL}/issues/new?body=`)).toBe(true);
    expect(decodeURIComponent(url)).toContain("Extension version: 1.3.0");
  });
});

describe("popup in a store install", () => {
  beforeEach(() => {
    fake = installFakeChrome({ packed: true, version: "1.3.0" });
    applyInstallMode(document);
  });

  it("hides the development controls and offers the store support page", () => {
    expect(isHidden("dev-controls")).toBe(true);
    expect(isHidden("reload")).toBe(true);
    expect(isHidden("feedback")).toBe(false);
  });

  it("opens the support tab of its own store listing", async () => {
    await click("feedback");

    expect(fake.tabs.create).toHaveBeenCalledWith({ url: storeSupportUrl("fakeextensionid") });
  });
});

describe("feedback urls", () => {
  it("builds the store support url from the extension id", () => {
    expect(storeSupportUrl("abc")).toBe("https://chromewebstore.google.com/detail/abc/support");
  });

  it("encodes the issue body", () => {
    expect(newIssueUrl("1.3.0")).toContain("body=Extension%20version%3A%201.3.0");
  });
});
