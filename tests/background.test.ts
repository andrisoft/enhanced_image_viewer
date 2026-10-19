import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeChrome, type FakeChrome } from "./fake-chrome.js";
import {
  ACTIVE_TABS_KEY,
  RELOAD_ALARM,
  applyDefaultIcon,
  checkForNewBuild,
  isDevelopmentInstall,
  isViewerActive,
  markViewerActive,
  markViewerInactive,
  recordError,
  startReloadAlarm,
} from "../src/background/core.js";
import { AUTO_RELOAD_KEY } from "../src/shared/settings.js";
import { LOG_KEY, LOG_LIMIT, appendLog, readLog } from "../src/shared/log.js";

let fake: FakeChrome;

function stubBuildFile(buildId: string, ok = true): void {
  globalThis.fetch = vi.fn(async () => ({
    ok,
    json: async () => ({ buildId }),
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  fake = installFakeChrome();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("per tab state", () => {
  it("remembers a viewer tab and gives it the color icon", async () => {
    await markViewerActive(7);

    expect(await isViewerActive(7)).toBe(true);
    expect(fake.storage.session.data.get(ACTIVE_TABS_KEY)).toEqual([7]);
    const [call] = fake.action.setIcon.mock.calls.at(-1) as [{ tabId: number; path: Record<string, string> }];
    expect(call.tabId).toBe(7);
    expect(call.path[16]).toContain("icon-16.png");
  });

  it("does not store a tab twice", async () => {
    await markViewerActive(7);
    await markViewerActive(7);
    expect(fake.storage.session.data.get(ACTIVE_TABS_KEY)).toEqual([7]);
  });

  it("forgets a tab that navigated away or closed", async () => {
    await markViewerActive(7);
    await markViewerActive(9);
    await markViewerInactive(7);

    expect(await isViewerActive(7)).toBe(false);
    expect(await isViewerActive(9)).toBe(true);
  });

  it("uses the gray icon as the extension wide default", async () => {
    await applyDefaultIcon();
    const [call] = fake.action.setIcon.mock.calls.at(-1) as [{ path: Record<string, string> }];
    expect(call.path[16]).toContain("icon-gray-16.png");
  });
});

describe("self reload", () => {
  it("treats a build without an update_url as a development install", () => {
    expect(isDevelopmentInstall()).toBe(true);
    installFakeChrome({ packed: true });
    expect(isDevelopmentInstall()).toBe(false);
  });

  it("does nothing when the build id on disk is the current one", async () => {
    stubBuildFile("build-1");
    expect(await checkForNewBuild("build-1")).toBe(false);
    expect(fake.runtime.reload).not.toHaveBeenCalled();
  });

  it("reloads the extension when a newer build is on disk", async () => {
    stubBuildFile("build-2");
    expect(await checkForNewBuild("build-1")).toBe(true);
    expect(fake.runtime.reload).toHaveBeenCalledOnce();
  });

  it("stays quiet when the setting is off", async () => {
    await fake.storage.local.set({ [AUTO_RELOAD_KEY]: false });
    stubBuildFile("build-2");

    expect(await checkForNewBuild("build-1")).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(fake.runtime.reload).not.toHaveBeenCalled();
  });

  it("never polls in a packed install", async () => {
    fake = installFakeChrome({ packed: true });
    stubBuildFile("build-2");
    expect(await checkForNewBuild("build-1")).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("creates the alarm when enabled and clears it when disabled", async () => {
    await startReloadAlarm();
    expect(fake.alarms.create).toHaveBeenCalledWith(RELOAD_ALARM, { periodInMinutes: 1 });

    await fake.storage.local.set({ [AUTO_RELOAD_KEY]: false });
    await startReloadAlarm();
    expect(fake.alarms.clear).toHaveBeenCalledWith(RELOAD_ALARM);
  });
});

describe("error reporting", () => {
  it("logs the error and badges the toolbar icon", async () => {
    await recordError("Uncaught error: boom");
    await recordError("Uncaught error: boom again");

    const entries = await readLog();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.level).toBe("error");
    expect(fake.action.setBadgeText).toHaveBeenLastCalledWith({ text: "2" });
  });
});

describe("activity log", () => {
  it("caps the stored entries", async () => {
    for (let index = 0; index < LOG_LIMIT + 10; index += 1) {
      await appendLog("info", `entry ${index}`);
    }
    const entries = (await readLog()) as { message: string }[];
    expect(entries).toHaveLength(LOG_LIMIT);
    expect(entries.at(-1)?.message).toBe(`entry ${LOG_LIMIT + 9}`);
    expect(fake.storage.local.data.has(LOG_KEY)).toBe(true);
  });
});
