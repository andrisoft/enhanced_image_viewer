/**
 * Capped activity log in chrome.storage.local.
 *
 * An extension cannot write to the usual log folder, so this is the documented substitute. Only
 * the extension's own fixed messages are logged: never a page URL, an image path or any other
 * value that comes from a web page.
 */

export const LOG_KEY = "activityLog";
export const LOG_LIMIT = 200;

export type LogLevel = "info" | "error";

export interface LogEntry {
  at: string;
  level: LogLevel;
  message: string;
}

export async function readLog(): Promise<LogEntry[]> {
  const stored = await chrome.storage.local.get(LOG_KEY);
  const entries = stored[LOG_KEY];
  return Array.isArray(entries) ? (entries as LogEntry[]) : [];
}

export async function appendLog(level: LogLevel, message: string): Promise<void> {
  const entries = await readLog();
  entries.push({ at: new Date().toISOString(), level, message });
  const capped = entries.slice(-LOG_LIMIT);
  await chrome.storage.local.set({ [LOG_KEY]: capped });
}

export async function clearLog(): Promise<void> {
  await chrome.storage.local.remove(LOG_KEY);
}

export function formatLog(entries: LogEntry[]): string {
  return entries.map((entry) => `${entry.at}  ${entry.level.toUpperCase()}  ${entry.message}`).join("\n");
}
