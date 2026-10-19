/**
 * The single source of truth for which images the extension handles.
 *
 * The build script turns this list into the manifest's content script match patterns, so the
 * extension is never injected into anything else. To support another format, add its extension
 * here (lowercase, no dot), run `npm run build` and reload the extension. Brave will ask to
 * re-approve the extension's permissions, because its match patterns changed.
 *
 * Known limit: an image URL without a file extension (for example
 * https://pbs.twimg.com/media/Abc?format=jpg) cannot be matched this way.
 */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];

/**
 * Match patterns for one extension. The path part of a Chrome match pattern is case sensitive,
 * so the uppercase spelling needs its own patterns. The `?*` variants cover URLs that carry a
 * query string after the file name.
 */
export function matchPatternsFor(extension: string): string[] {
  const patterns: string[] = [];
  for (const ext of [extension.toLowerCase(), extension.toUpperCase()]) {
    patterns.push(`*://*/*.${ext}`, `*://*/*.${ext}?*`, `file:///*.${ext}`);
  }
  return patterns;
}

/** Every match pattern the manifest should declare. */
export function allMatchPatterns(extensions: string[] = IMAGE_EXTENSIONS): string[] {
  return extensions.flatMap(matchPatternsFor);
}
