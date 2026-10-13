import type { SkillHeading } from "./types.ts";

/** Strip YAML frontmatter; return body only. */
export function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!match) return content;
  return content.slice(match[0].length);
}

/**
 * Parse ## and ### headings from SKILL.md body.
 * Collects `- [ ]` checklist lines under each heading, skipping fenced code blocks.
 */
export function parseSkillHeadings(skillMarkdown: string): SkillHeading[] {
  const body = stripFrontmatter(skillMarkdown);
  const lines = body.split(/\r?\n/);
  const headings: SkillHeading[] = [];
  let inFence = false;
  let current: SkillHeading | null = null;

  const closeCurrent = () => {
    if (current) headings.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2 || h3) {
      closeCurrent();
      current = {
        level: h2 ? 2 : 3,
        title: (h2 ?? h3)![1].trim(),
        line: i + 1,
        checklistItems: [],
      };
      continue;
    }

    const item = line.match(/^- \[ \] (.+)$/);
    if (item && current) {
      current.checklistItems.push(item[1].trim());
    }
  }
  closeCurrent();
  return headings;
}

export function readSkillNameFromFrontmatter(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  for (const line of match[1].split("\n")) {
    const m = line.match(/^name:\s*(.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}
