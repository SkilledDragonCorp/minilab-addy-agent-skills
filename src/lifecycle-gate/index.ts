import { summarizeDiff, parseDiffSignals } from "./parse-diff.ts";
import { parseSkillHeadings, readSkillNameFromFrontmatter } from "./parse-skill.ts";
import { buildChecklistFromHeadings } from "./select-headings.ts";
import type { LifecycleGateResult } from "./types.ts";

export function runLifecycleGate(
  skillMarkdown: string,
  unifiedDiff: string,
): LifecycleGateResult {
  const skillName =
    readSkillNameFromFrontmatter(skillMarkdown) ?? "unknown-skill";
  const headings = parseSkillHeadings(skillMarkdown);
  const signals = parseDiffSignals(unifiedDiff);
  const entries = buildChecklistFromHeadings(skillName, headings, signals);

  return {
    skillName,
    diffSummary: summarizeDiff(signals),
    entries,
  };
}

export function formatGateMarkdown(result: LifecycleGateResult): string {
  const lines = [
    `# Lifecycle gate — ${result.skillName}`,
    "",
    `Diff: ${result.diffSummary}`,
    "",
    "## Checklist",
    "",
  ];

  if (result.entries.length === 0) {
    lines.push("_No headings matched this diff (documentation-only or empty)._");
    return lines.join("\n");
  }

  for (const e of result.entries) {
    lines.push(
      `- [ ] ${e.text} _(cite: ${e.citeHeading}, line ${e.citeLine}; ${e.reason})_`,
    );
  }
  return lines.join("\n");
}

export { parseSkillHeadings, parseDiffSignals, buildChecklistFromHeadings };
export type * from "./types.ts";
