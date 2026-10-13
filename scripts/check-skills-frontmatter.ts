#!/usr/bin/env bun
/** Validate .claude/skills/<folder>/SKILL.md layout and frontmatter. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SKILLS_ROOT = join(ROOT, ".claude", "skills");
const MAX_DESCRIPTION = 1024;

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const out: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

let failed = false;

if (!statSync(SKILLS_ROOT, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`Missing skills directory: ${SKILLS_ROOT}`);
  process.exit(1);
}

for (const folder of readdirSync(SKILLS_ROOT)) {
  const skillPath = join(SKILLS_ROOT, folder, "SKILL.md");
  try {
    statSync(skillPath);
  } catch {
    console.error(`Expected ${skillPath}`);
    failed = true;
    continue;
  }
  const content = readFileSync(skillPath, "utf8");
  const fm = parseFrontmatter(content);
  if (!fm?.name || !fm?.description) {
    console.error(`${skillPath}: frontmatter must include name and description`);
    failed = true;
    continue;
  }
  if (fm.name !== folder) {
    console.error(
      `${skillPath}: frontmatter name "${fm.name}" must match folder "${folder}"`,
    );
    failed = true;
  }
  if (fm.description.length > MAX_DESCRIPTION) {
    console.error(
      `${skillPath}: description length ${fm.description.length} exceeds ${MAX_DESCRIPTION}`,
    );
    failed = true;
  }
  console.log(`OK ${skillPath} (name=${fm.name}, desc=${fm.description.length} chars)`);
}

if (failed) process.exit(1);
