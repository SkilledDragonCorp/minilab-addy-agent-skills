#!/usr/bin/env bun
/**
 * Keyless gate report for minilab-addy-agent-skills.
 *
 * Runs the real package scripts as subprocesses — `bun run check:skills`,
 * `bun run smoke:node`, and `bun run gate` once per fixture diff — plus an
 * in-process lock comparison, then writes reports/gate.json + reports/gate.md.
 * Deterministic apart from timings and generated_at. A failed step is recorded
 * (exit code + output tail) and the report is still written; exit 1 when red.
 *
 * Prerequisite for the gate steps: upstream skills installed into
 * .throwaway-skills (export MINILAB_UPSTREAM_WORKDIR=$PWD/.throwaway-skills &&
 * bash scripts/install-upstream-skills.sh). Missing install = failed gate steps.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const REPORTS = join(ROOT, "reports");
const DIFFS = join(ROOT, "fixtures", "diffs");
const LOCAL_SKILLS = join(ROOT, ".claude", "skills");
const THROWAWAY = process.env.MINILAB_UPSTREAM_WORKDIR ?? join(ROOT, ".throwaway-skills");
const THROWAWAY_SKILLS = join(THROWAWAY, ".claude", "skills");
const EXPECTED_LOCK = join(ROOT, "fixtures", "expected-skills-lock.json");
const INSTALLED_LOCK = join(THROWAWAY, "skills-lock.json");
const GATE_SKILL = "code-review-and-quality";

type Step = { id: string; command: string; ok: boolean; exit_code: number; elapsed_ms: number; output: string };

function run(id: string, cmd: string[]): Step {
  const t0 = performance.now();
  const r = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "pipe", stderr: "pipe", env: { ...process.env } });
  const output = `${r.stdout?.toString() ?? ""}${r.stderr?.toString() ?? ""}`;
  return {
    id,
    command: cmd.join(" "),
    ok: r.exitCode === 0,
    exit_code: r.exitCode ?? 1,
    elapsed_ms: Math.round(performance.now() - t0),
    output,
  };
}

function listSkillDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => existsSync(join(dir, n, "SKILL.md"))).sort();
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

const tAll = performance.now();

// 1. Local skills layout / frontmatter.
const checkSkills = run("check:skills", ["bun", "run", "check:skills"]);
const frontmatterOk = (checkSkills.output.match(/^OK .*SKILL\.md/gm) || []).length;

// 2. Node 24 engines smoke.
const smoke = run("smoke:node", ["bun", "run", "smoke:node"]);
const smokeOk = smoke.ok && /node-smoke-ok/.test(smoke.output);
smoke.ok = smokeOk;
const nodeVersion = (Bun.spawnSync(["node", "--version"], { cwd: ROOT }).stdout?.toString() ?? "").trim() || "unknown";

// 3. Pin: installed lock snapshot must equal the committed fixture (in-process, no network).
const tLock = performance.now();
const expectedLock = readJson(EXPECTED_LOCK);
const expectedSkills: Record<string, any> = expectedLock.skills ?? {};
let installedSkills: Record<string, any> | null = null;
let lockNote = "";
if (existsSync(INSTALLED_LOCK)) {
  installedSkills = readJson(INSTALLED_LOCK).skills ?? {};
  lockNote = JSON.stringify(installedSkills) === JSON.stringify(expectedSkills) ? "installed skills-lock.json matches fixtures/expected-skills-lock.json" : "installed skills-lock.json differs from fixtures/expected-skills-lock.json";
} else {
  lockNote = `no ${INSTALLED_LOCK}; run scripts/install-upstream-skills.sh with MINILAB_UPSTREAM_WORKDIR`;
}
const pinnedNames = Object.keys(expectedSkills).sort();
const pinnedVerified = pinnedNames.filter((n) => installedSkills && JSON.stringify(installedSkills[n]) === JSON.stringify(expectedSkills[n]) && existsSync(join(THROWAWAY_SKILLS, n, "SKILL.md")));
const verifyLock: Step = {
  id: "verify:lock",
  command: "compare skills-lock.json to fixtures/expected-skills-lock.json (in-process)",
  ok: pinnedVerified.length === pinnedNames.length && pinnedNames.length > 0,
  exit_code: pinnedVerified.length === pinnedNames.length && pinnedNames.length > 0 ? 0 : 1,
  elapsed_ms: Math.round(performance.now() - tLock),
  output: lockNote,
};

// 4..n. Lifecycle gate: one `bun run gate` per fixture diff against the pinned review skill.
const gateSkillPath = join(THROWAWAY_SKILLS, GATE_SKILL, "SKILL.md");
const diffFiles = existsSync(DIFFS) ? readdirSync(DIFFS).filter((n) => n.endsWith(".patch")).sort() : [];
const gateSkillRel = gateSkillPath.startsWith(`${ROOT}/`) ? gateSkillPath.slice(ROOT.length + 1) : gateSkillPath;
const gateRuns = diffFiles.map((diff) => {
  const step = run(`gate:${diff.replace(/\.patch$/, "")}`, ["bun", "run", "gate", "--", "--skill", gateSkillRel, "--diff", join("fixtures", "diffs", diff)]);
  const entries = (step.output.match(/^- \[ \] /gm) || []).length;
  const summary = step.output.match(/^Diff: (.+)$/m)?.[1] ?? "";
  const cited = (step.output.match(/_\(cite: [^)]*line \d+/g) || []).length;
  // Every checklist row must cite a heading + line; a docs-only diff legitimately yields 0 rows.
  step.ok = step.ok && entries === cited && /^# Lifecycle gate — /m.test(step.output);
  return { step, diff, entries, summary };
});

const elapsed_ms = Math.round(performance.now() - tAll);

const steps: Step[] = [checkSkills, smoke, verifyLock, ...gateRuns.map((g) => g.step)];
const steps_passed = steps.filter((s) => s.ok).length;
const steps_failed = steps.length - steps_passed;
const ok = steps_failed === 0;

const localSkills = listSkillDirs(LOCAL_SKILLS);
const gate_elapsed_ms = gateRuns.reduce((n, g) => n + g.step.elapsed_ms, 0);
const checklist_entries = gateRuns.reduce((n, g) => n + g.entries, 0);

const payload = {
  generated_at: new Date().toISOString(),
  lab: "minilab-addy-agent-skills",
  keyless: true,
  ok,
  steps_total: steps.length,
  steps_passed,
  steps_failed,
  elapsed_ms,
  elapsed_s: Math.round(elapsed_ms / 100) / 10,
  skills: {
    upstream_repo: "addyosmani/agent-skills",
    cli: "skills@1.7.2",
    agent: "claude-code",
    pinned: pinnedNames.length,
    pinned_names: pinnedNames,
    pinned_verified: pinnedVerified.length,
    lock_match: verifyLock.ok,
    lock_note: lockNote,
    local: localSkills.length,
    local_names: localSkills,
    frontmatter_ok: frontmatterOk,
  },
  gate: {
    skill: GATE_SKILL,
    skill_path: gateSkillRel,
    diffs: gateRuns.length,
    runs_passed: gateRuns.filter((g) => g.step.ok).length,
    checklist_entries,
    elapsed_ms: gate_elapsed_ms,
    runs: gateRuns.map((g) => ({ diff: g.diff, ok: g.step.ok, entries: g.entries, summary: g.summary, elapsed_ms: g.step.elapsed_ms })),
  },
  node: { smoke_ok: smokeOk, version: nodeVersion, bun: Bun.version },
  steps: steps.map(({ id, command, ok, exit_code, elapsed_ms }) => ({ id, command, ok, exit_code, elapsed_ms })),
  failures: steps.filter((s) => !s.ok).map((s) => ({ id: s.id, exit_code: s.exit_code, output_tail: s.output.trim().split("\n").slice(-12).join("\n") })),
  headline: {
    skills_pinned: pinnedNames.length,
    steps_passed,
    steps_total: steps.length,
    seconds: Math.round(elapsed_ms / 100) / 10,
    checklist_entries,
    local_skills: localSkills.length,
  },
};

mkdirSync(REPORTS, { recursive: true });
writeFileSync(join(REPORTS, "gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

const md = [
  "# Addy agent-skills lifecycle gate — keyless report",
  "",
  `- **Generated:** ${payload.generated_at}`,
  `- **Result:** ${ok ? "GREEN" : "RED"} — ${steps_passed} / ${steps.length} steps passed, ${steps_failed} failed`,
  `- **Upstream skills pinned:** ${pinnedNames.length} (${pinnedNames.join(", ")}) via ${payload.skills.cli} \`-a ${payload.skills.agent}\`; lock match: ${verifyLock.ok ? "yes" : "NO"}`,
  `- **Local lab skills:** ${localSkills.length} (${localSkills.join(", ")}); frontmatter OK: ${frontmatterOk}`,
  `- **Lifecycle gate:** ${payload.gate.runs_passed} / ${gateRuns.length} fixture diffs, ${checklist_entries} heading-cited checklist rows, ${gate_elapsed_ms} ms`,
  `- **Node smoke:** ${smokeOk ? "ok" : "FAILED"} (${payload.node.version})`,
  `- **Elapsed:** ${elapsed_ms} ms (~${payload.elapsed_s} s)`,
  "",
  "## Steps",
  "",
  ...steps.map((s) => `- \`${s.id}\`: ${s.ok ? "PASS" : "FAIL"} (exit ${s.exit_code}, ${s.elapsed_ms} ms) — \`${s.command}\``),
  "",
  "## Gate runs",
  "",
  ...gateRuns.map((g) => `- \`${g.diff}\`: ${g.step.ok ? "PASS" : "FAIL"} — ${g.entries} rows (${g.summary || "no summary"})`),
  "",
  ...(payload.failures.length ? ["## Failures", "", ...payload.failures.map((f) => `### ${f.id} (exit ${f.exit_code})\n\n\`\`\`\n${f.output_tail}\n\`\`\``), ""] : []),
].join("\n");
writeFileSync(join(REPORTS, "gate.md"), md);

console.log(JSON.stringify({ ok, steps_passed, steps_total: steps.length, elapsed_ms, skills_pinned: pinnedNames.length, lock_match: verifyLock.ok, checklist_entries, generated_at: payload.generated_at }, null, 2));
if (!ok) process.exit(1);
