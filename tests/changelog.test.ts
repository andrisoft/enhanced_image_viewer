import { describe, expect, it } from "vitest";
import { compareVersions, parseChangelog, releaseDateOf, sectionsSince } from "../src/shared/changelog.js";

const markdown = `# Changelog

Intro text that is not part of any version.

## [1.2.0] - 2026-11-02

### Added
- Second release note.

## [1.0.0] - 2026-10-19

### Added
- Initial release.
`;

describe("parseChangelog", () => {
  it("reads every dated version section", () => {
    const sections = parseChangelog(markdown);
    expect(sections.map((section) => section.version)).toEqual(["1.2.0", "1.0.0"]);
    expect(sections[0]?.date).toBe("2026-11-02");
    expect(sections[0]?.body).toContain("Second release note.");
    expect(sections[1]?.body).not.toContain("Second release note.");
  });

  it("returns nothing for a changelog without sections", () => {
    expect(parseChangelog("# Changelog\n\nnothing yet\n")).toEqual([]);
  });
});

describe("compareVersions", () => {
  it("orders by major, minor then patch", () => {
    expect(compareVersions("1.2.0", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });
});

describe("sectionsSince", () => {
  const sections = parseChangelog(markdown);

  it("shows only what was released after the last seen version", () => {
    expect(sectionsSince(sections, "1.0.0").map((section) => section.version)).toEqual(["1.2.0"]);
  });

  it("shows nothing when the last seen version is the current one", () => {
    expect(sectionsSince(sections, "1.2.0")).toEqual([]);
  });

  it("shows nothing on a fresh install, where there is no last seen version", () => {
    expect(sectionsSince(sections, null)).toEqual([]);
  });
});

describe("releaseDateOf", () => {
  it("finds the date of a version and returns null for an unknown one", () => {
    const sections = parseChangelog(markdown);
    expect(releaseDateOf(sections, "1.0.0")).toBe("2026-10-19");
    expect(releaseDateOf(sections, "9.9.9")).toBeNull();
  });
});
