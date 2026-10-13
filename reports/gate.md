# Addy agent-skills lifecycle gate — keyless report

- **Generated:** 2026-10-13T15:01:36.299Z
- **Result:** GREEN — 6 / 6 steps passed, 0 failed
- **Upstream skills pinned:** 2 (code-review-and-quality, test-driven-development) via skills@1.7.2 `-a claude-code`; lock match: yes
- **Local lab skills:** 2 (addy-skills-install-verify, lifecycle-gate-run); frontmatter OK: 2
- **Lifecycle gate:** 3 / 3 fixture diffs, 25 heading-cited checklist rows, 190 ms
- **Node smoke:** ok (v24.14.1)
- **Elapsed:** 763 ms (~0.8 s)

## Steps

- `check:skills`: PASS (exit 0, 106 ms) — `bun run check:skills`
- `smoke:node`: PASS (exit 0, 393 ms) — `bun run smoke:node`
- `verify:lock`: PASS (exit 0, 1 ms) — `compare skills-lock.json to fixtures/expected-skills-lock.json (in-process)`
- `gate:dependency-bump`: PASS (exit 0, 59 ms) — `bun run gate -- --skill .throwaway-skills/.claude/skills/code-review-and-quality/SKILL.md --diff fixtures/diffs/dependency-bump.patch`
- `gate:docs-only`: PASS (exit 0, 62 ms) — `bun run gate -- --skill .throwaway-skills/.claude/skills/code-review-and-quality/SKILL.md --diff fixtures/diffs/docs-only.patch`
- `gate:feature-without-tests`: PASS (exit 0, 69 ms) — `bun run gate -- --skill .throwaway-skills/.claude/skills/code-review-and-quality/SKILL.md --diff fixtures/diffs/feature-without-tests.patch`

## Gate runs

- `dependency-bump.patch`: PASS — 10 rows (2 file(s), dependencies)
- `docs-only.patch`: PASS — 0 rows (1 file(s), documentation only)
- `feature-without-tests.patch`: PASS — 15 rows (1 file(s), source)
