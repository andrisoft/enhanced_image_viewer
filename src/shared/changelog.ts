/**
 * Parses the bundled CHANGELOG.md. The `## [x.y.z] - YYYY-MM-DD` heading is the join key between
 * the changelog and the stored last-seen version, so the heading format has to stay stable.
 */

export interface ChangelogSection {
  version: string;
  date: string;
  body: string;
}

const HEADING = /^##\s*\[(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/;

export function parseChangelog(markdown: string): ChangelogSection[] {
  const sections: { version: string; date: string; lines: string[] }[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = HEADING.exec(line);
    if (match) {
      sections.push({ version: match[1]!, date: match[2]!, lines: [] });
      continue;
    }
    sections.at(-1)?.lines.push(line);
  }
  return sections.map((section) => ({
    version: section.version,
    date: section.date,
    body: section.lines.join("\n").trim(),
  }));
}

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return 0;
}

/** Sections released after `lastSeenVersion`, newest first. Empty when there is nothing new. */
export function sectionsSince(sections: ChangelogSection[], lastSeenVersion: string | null): ChangelogSection[] {
  if (!lastSeenVersion) return [];
  return sections.filter((section) => compareVersions(section.version, lastSeenVersion) > 0);
}

export function releaseDateOf(sections: ChangelogSection[], version: string): string | null {
  return sections.find((section) => section.version === version)?.date ?? null;
}
