/**
 * Feedback links. The extension sends nothing itself: each button only opens one of these pages
 * in a new tab.
 */

export const GITHUB_REPO_URL = "https://github.com/andrisoft/clean-image-viewer";

/** The Support tab of the extension's own Chrome Web Store listing; only valid for a store install. */
export function storeSupportUrl(extensionId: string): string {
  return `https://chromewebstore.google.com/detail/${encodeURIComponent(extensionId)}/support`;
}

/** A new GitHub issue with only the extension version prefilled, never anything from a page. */
export function newIssueUrl(version: string): string {
  const body = `Extension version: ${version}\n\nWhat happened:\n`;
  return `${GITHUB_REPO_URL}/issues/new?body=${encodeURIComponent(body)}`;
}
