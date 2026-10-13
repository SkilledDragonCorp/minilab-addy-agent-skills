---
name: lifecycle-gate-run
description: Run the minilab lifecycle gate on a unified diff plus an upstream Addy Osmani SKILL.md to produce a heading-cited checklist (no invented quality scores).
---

# Lifecycle gate run

Turns **fixture or real PR diff** + **SKILL.md** into a checklist derived from skill headings.

## Command

```bash
bun run gate -- --skill PATH/TO/SKILL.md --diff PATH/TO.patch
```

Example with upstream install in `.throwaway-skills/`:

```bash
bun run gate -- \
  --skill .throwaway-skills/.claude/skills/code-review-and-quality/SKILL.md \
  --diff fixtures/diffs/dependency-bump.patch
```

## Output rules

- Items come from `- [ ]` lines under matched `##` / `###` headings, or a single “apply guidance” row per matched heading.
- Every row cites the heading and line number from `SKILL.md`.
- No numeric quality scores — only structural checklist rows.

## When to use

- Before merge on agent-generated PRs when using Addy’s review or TDD skills.
- In CI (keyless) against fixture diffs to prove the parser stays stable.

## Related lab skill

See `addy-skills-install-verify` for installing upstream skills into a disposable directory.
