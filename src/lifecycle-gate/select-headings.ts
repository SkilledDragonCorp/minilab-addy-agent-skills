import type { ChecklistEntry, DiffSignals, SkillHeading } from "./types.ts";

type HeadingPredicate = (signals: DiffSignals) => string | null;

function titleMatches(title: string, pattern: RegExp): boolean {
  return pattern.test(title);
}

/** Deterministic mapping from diff signals → skill sections (by heading title). */
function predicatesForSkill(skillName: string): Record<string, HeadingPredicate> {
  const common: Record<string, HeadingPredicate> = {
    Verification: (s) =>
      !s.documentationOnly ? "non-documentation change in diff" : null,
  };

  if (skillName === "test-driven-development") {
    return {
      ...common,
      "When to Use": (s) =>
        s.touchesSource && !s.touchesTests
          ? "source changed without test files in diff"
          : null,
      "Discover the Stack First": (s) =>
        s.touchesSource ? "source or behavior change" : null,
      "The Prove-It Pattern (Bug Fixes)": (s) =>
        s.touchesSource && !s.touchesTests
          ? "behavior change without accompanying tests in diff"
          : null,
      Overview: (s) =>
        s.documentationOnly ? "documentation-only diff (confirm TDD skip)" : null,
    };
  }

  // code-review-and-quality (default upstream review skill)
  return {
    ...common,
    "The Review Checklist": (s) =>
      !s.documentationOnly ? "merge-bound code or config change" : null,
    "Review Process": (s) =>
      !s.documentationOnly ? "requires structured review steps" : null,
    "Dependency Discipline": (s) =>
      s.touchesDependencies ? "dependency or lockfile paths in diff" : null,
    "Change Sizing": (s) =>
      s.addedLines > 80 ? "large addition (>80 added lines in fixture diff)" : null,
    "The Five-Axis Review": (s) =>
      s.touchesSource ? "source files in diff" : null,
    "1. Correctness": (s) => (s.touchesSource ? "source files in diff" : null),
    "2. Readability & Simplicity": (s) =>
      s.touchesSource ? "source files in diff" : null,
    "3. Architecture": (s) => (s.touchesSource ? "source files in diff" : null),
    "4. Security": (s) =>
      s.touchesSecuritySensitive || s.touchesSource
        ? s.touchesSecuritySensitive
          ? "security-sensitive paths in diff"
          : "source change — security axis applies"
        : null,
    "5. Performance": (s) =>
      s.touchesSource ? "source files in diff" : null,
  };
}

function headingKey(h: SkillHeading): string {
  return h.title.replace(/^\d+\.\s*/, "");
}

export function buildChecklistFromHeadings(
  skillName: string,
  headings: SkillHeading[],
  signals: DiffSignals,
): ChecklistEntry[] {
  const rules = predicatesForSkill(skillName);
  const entries: ChecklistEntry[] = [];
  const seen = new Set<string>();

  const push = (h: SkillHeading, reason: string, text: string) => {
    const key = `${h.line}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({
      text,
      citeHeading: h.level === 2 ? `## ${h.title}` : `### ${h.title}`,
      citeLine: h.line,
      reason,
    });
  };

  for (const h of headings) {
    const rule =
      rules[h.title] ??
      rules[headingKey(h)] ??
      Object.entries(rules).find(([k]) => titleMatches(h.title, new RegExp(k, "i")))?.[1];

    const reason = rule?.(signals) ?? null;
    if (!reason) continue;

    if (h.checklistItems.length > 0) {
      for (const item of h.checklistItems) {
        push(h, reason, item);
      }
    } else {
      push(
        h,
        reason,
        `Apply guidance under ${h.level === 2 ? "##" : "###"} ${h.title}`,
      );
    }
  }

  return entries;
}
