import type { DiffSignals } from "./types.ts";

const TEST_PATH =
  /(?:^|\/)(test|tests|__tests__|spec)(?:\/|$)|\.(test|spec)\.[a-z]+$/i;
const SOURCE_PATH =
  /(?:^|\/)(src|lib|app|packages|server|api)(?:\/|$)|\.(ts|tsx|js|jsx|py|go|rs|java|rb)$/i;
const DEP_PATH =
  /(?:^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lock|bun\.lockb|Cargo\.lock|go\.sum|Gemfile\.lock|poetry\.lock|requirements\.txt)$/i;
const SECURITY_PATH =
  /(?:auth|login|session|jwt|oauth|password|crypto|secret|acl|permission|guard)/i;

export function parseDiffSignals(unifiedDiff: string): DiffSignals {
  const files: string[] = [];
  let addedLines = 0;

  for (const line of unifiedDiff.split(/\r?\n/)) {
    const fileHeader = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileHeader) {
      const path = fileHeader[1].trim();
      if (path !== "/dev/null") files.push(path);
      continue;
    }
    if (line.startsWith("+++")) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) addedLines += 1;
  }

  const unique = [...new Set(files)];
  const documentationOnly =
    unique.length > 0 && unique.every((f) => /\.(md|mdx|rst|txt)$/i.test(f));

  const touchesTests = unique.some((f) => TEST_PATH.test(f));
  const touchesSource = unique.some((f) => SOURCE_PATH.test(f));
  const touchesDependencies = unique.some((f) => DEP_PATH.test(f));
  const touchesSecuritySensitive = unique.some((f) => SECURITY_PATH.test(f));

  return {
    files: unique,
    documentationOnly,
    touchesSource,
    touchesTests,
    touchesDependencies,
    touchesSecuritySensitive,
    addedLines,
  };
}

export function summarizeDiff(signals: DiffSignals): string {
  if (signals.files.length === 0) return "empty diff";
  const parts = [`${signals.files.length} file(s)`];
  if (signals.documentationOnly) parts.push("documentation only");
  if (signals.touchesSource) parts.push("source");
  if (signals.touchesTests) parts.push("tests");
  if (signals.touchesDependencies) parts.push("dependencies");
  if (signals.touchesSecuritySensitive) parts.push("security-sensitive paths");
  return parts.join(", ");
}
