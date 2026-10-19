/**
 * Minimal in-memory stand-in for the chrome extension API. It proves the logic, never real
 * browser behavior, so every feature still gets a manual check in Brave.
 */

import { vi } from "vitest";

interface FakeChromeOptions {
  /** A packed install has an update_url in its manifest; unpacked development builds do not. */
  packed?: boolean;
  version?: string;
}

function storageArea() {
  const data = new Map<string, unknown>();
  return {
    data,
    get: vi.fn(async (key?: string | string[] | null) => {
      const result: Record<string, unknown> = {};
      const keys = key === undefined || key === null ? [...data.keys()] : Array.isArray(key) ? key : [key];
      for (const name of keys) {
        if (data.has(name)) result[name] = data.get(name);
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [name, value] of Object.entries(items)) data.set(name, value);
    }),
    remove: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  };
}

export function createFakeChrome(options: FakeChromeOptions = {}) {
  const manifest: Record<string, unknown> = { version: options.version ?? "1.0.0" };
  if (options.packed) manifest.update_url = "https://example.invalid/updates.xml";

  return {
    storage: {
      local: storageArea(),
      session: storageArea(),
      onChanged: { addListener: vi.fn() },
    },
    action: {
      setIcon: vi.fn(async (_details: { tabId?: number; path: Record<string, string> }) => {}),
      setBadgeText: vi.fn(async (_details: { text: string }) => {}),
      setBadgeBackgroundColor: vi.fn(async (_details: { color: string }) => {}),
    },
    alarms: {
      create: vi.fn(async (_name: string, _info: { periodInMinutes: number }) => {}),
      clear: vi.fn(async (_name: string) => true),
      onAlarm: { addListener: vi.fn() },
    },
    runtime: {
      getManifest: () => manifest,
      getURL: (path: string) => `chrome-extension://fake/${path}`,
      reload: vi.fn(),
      sendMessage: vi.fn(async () => undefined),
      onMessage: { addListener: vi.fn() },
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
    },
    tabs: {
      query: vi.fn(async () => [{ id: 1 }]),
      reload: vi.fn(async (_tabId: number) => {}),
      onUpdated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
    },
  };
}

export type FakeChrome = ReturnType<typeof createFakeChrome>;

export function installFakeChrome(options: FakeChromeOptions = {}): FakeChrome {
  const fake = createFakeChrome(options);
  (globalThis as unknown as { chrome: unknown }).chrome = fake;
  return fake;
}
