import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runLifecycleGate } from "../src/lifecycle-gate/index.ts";

const ROOT = join(import.meta.dir, "..");
const FIX = join(ROOT, "fixtures", "diffs");
const WORK =
  process.env.MINILAB_UPSTREAM_WORKDIR ??
  join(ROOT, ".throwaway-skills");

const SKILLS = {
  review: join(WORK, ".claude", "skills", "code-review-and-quality", "SKILL.md"),
  tdd: join(WORK, ".claude", "skills", "test-driven-development", "SKILL.md"),
};

function skillReady(): boolean {
  try {
    readFileSync(SKILLS.review, "utf8");
    readFileSync(SKILLS.tdd, "utf8");
    return true;
  } catch {
    return false;
  }
}

describe("e2e upstream skills + lifecycle gate", () => {
  test("install script leaves real SKILL.md for gate fixtures", async () => {
    if (!skillReady()) {
      const proc = Bun.spawn(["bash", join(ROOT, "scripts", "install-upstream-skills.sh")], {
        cwd: ROOT,
        env: { ...process.env, MINILAB_UPSTREAM_WORKDIR: WORK },
        stdout: "pipe",
        stderr: "pipe",
      });
      const code = await proc.exited;
      const out = await new Response(proc.stdout).text();
      const err = await new Response(proc.stderr).text();
      expect(code).toBe(0);
      expect(out + err).toContain("Upstream skills install verify OK");
    }
    expect(skillReady()).toBe(true);
  });

  test("gate on feature diff cites TDD Verification", () => {
    const skill = readFileSync(SKILLS.tdd, "utf8");
    const diff = readFileSync(join(FIX, "feature-without-tests.patch"), "utf8");
    const result = runLifecycleGate(skill, diff);
    expect(result.skillName).toBe("test-driven-development");
    expect(
      result.entries.some(
        (e) =>
          e.citeHeading.includes("Verification") &&
          e.text.includes("Every new behavior"),
      ),
    ).toBe(true);
  });

  test("gate on dependency diff cites review Dependency Discipline", () => {
    const skill = readFileSync(SKILLS.review, "utf8");
    const diff = readFileSync(join(FIX, "dependency-bump.patch"), "utf8");
    const result = runLifecycleGate(skill, diff);
    expect(
      result.entries.some((e) =>
        e.citeHeading.includes("Dependency Discipline"),
      ),
    ).toBe(true);
  });
});
