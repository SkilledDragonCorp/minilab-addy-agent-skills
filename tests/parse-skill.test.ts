import { describe, expect, test } from "bun:test";
import {
  parseSkillHeadings,
  stripFrontmatter,
} from "../src/lifecycle-gate/parse-skill.ts";

const SAMPLE = `---
name: demo
description: x
---

# Title

## Alpha

- [ ] first item

\`\`\`markdown
## Inside fence
- [ ] ignored
\`\`\`

## Beta

### Gamma

- [ ] nested item
`;

describe("parseSkillHeadings", () => {
  test("strips frontmatter", () => {
    expect(stripFrontmatter(SAMPLE)).toMatch(/^# Title/m);
  });

  test("collects checklist items outside fences", () => {
    const headings = parseSkillHeadings(SAMPLE);
    const alpha = headings.find((h) => h.title === "Alpha");
    expect(alpha?.checklistItems).toEqual(["first item"]);
    const gamma = headings.find((h) => h.title === "Gamma");
    expect(gamma?.checklistItems).toEqual(["nested item"]);
    expect(headings.some((h) => h.title === "Inside fence")).toBe(false);
  });
});
