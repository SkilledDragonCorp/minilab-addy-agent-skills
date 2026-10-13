import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseDiffSignals,
  runLifecycleGate,
} from "../src/lifecycle-gate/index.ts";

const FIX = join(import.meta.dir, "..", "fixtures", "diffs");

const MINI_SKILL = `---
name: code-review-and-quality
description: demo
---

## Dependency Discipline

Upgrade deps carefully.

## Verification

- [ ] Tests pass
- [ ] Build succeeds
`;

describe("parseDiffSignals", () => {
  test("detects documentation-only diffs", () => {
    const diff = readFileSync(join(FIX, "docs-only.patch"), "utf8");
    const s = parseDiffSignals(diff);
    expect(s.documentationOnly).toBe(true);
    expect(s.touchesSource).toBe(false);
  });

  test("detects source without tests", () => {
    const diff = readFileSync(join(FIX, "feature-without-tests.patch"), "utf8");
    const s = parseDiffSignals(diff);
    expect(s.touchesSource).toBe(true);
    expect(s.touchesTests).toBe(false);
  });

  test("detects dependency paths", () => {
    const diff = readFileSync(join(FIX, "dependency-bump.patch"), "utf8");
    const s = parseDiffSignals(diff);
    expect(s.touchesDependencies).toBe(true);
  });
});

describe("runLifecycleGate", () => {
  test("emits checklist items with heading citations", () => {
    const diff = readFileSync(join(FIX, "dependency-bump.patch"), "utf8");
    const result = runLifecycleGate(MINI_SKILL, diff);
    expect(result.entries.some((e) => e.text === "Tests pass")).toBe(true);
    expect(result.entries.every((e) => e.citeHeading.startsWith("#"))).toBe(
      true,
    );
    expect(result.entries.some((e) => e.citeHeading.includes("Verification"))).toBe(
      true,
    );
    expect(
      result.entries.some((e) => e.citeHeading.includes("Dependency Discipline")),
    ).toBe(true);
  });

  test("docs-only diff skips merge verification items", () => {
    const diff = readFileSync(join(FIX, "docs-only.patch"), "utf8");
    const result = runLifecycleGate(MINI_SKILL, diff);
    expect(result.entries.length).toBe(0);
  });
});
