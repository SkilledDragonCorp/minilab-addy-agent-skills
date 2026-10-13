---
name: addy-skills-install-verify
description: Install Addy Osmani agent-skills with skills CLI 1.7.2 into a throwaway workspace, verify skills-lock.json and SKILL.md-only copies (no references/), and record hashes for CI parity.
---

# Addy skills install verify

Educational minilab — upstream skills are **not** committed as this repo’s canonical skills.

## Install (throwaway workspace only)

```bash
export WORK=$(mktemp -d)
cd "$WORK"
DISABLE_TELEMETRY=1 bun --bun x skills@1.7.2 add addyosmani/agent-skills \
  --skill code-review-and-quality \
  --skill test-driven-development \
  -a claude-code -y --copy
```

Compare `skills-lock.json` to `fixtures/expected-skills-lock.json` in this minilab.

## Layout checks

- Each installed skill folder contains **only** `SKILL.md` (the CLI copy step skips `references/`).
- Frontmatter `name` matches the folder name.
- Lifecycle gate reads **headings** from `SKILL.md` only — not reference markdown.

## Keyless CI

From repo root:

```bash
bash scripts/install-upstream-skills.sh
bun run check:skills
```

## Hedge — stars

GitHub star counts on [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) are a popularity signal, not proof of fit for your codebase. Pin versions and run your own gate.
