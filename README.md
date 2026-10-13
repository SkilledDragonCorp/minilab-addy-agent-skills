# minilab-addy-agent-skills

**Built by [SkilledDragon LLC](https://skilleddragon.com)** — install [Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills) (MIT) for real, verify `SKILL.md` layout, and run a **lifecycle gate** that turns PR diffs into heading-cited checklists (no invented quality scores).

Featured upstream: [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) · CLI: [`skills@1.7.2`](https://www.npmjs.com/package/skills)

## What we built

| Piece | Purpose |
| --- | --- |
| `src/lifecycle-gate/` | Parse `SKILL.md` headings + unified diff → checklist rows citing heading + line |
| `scripts/install-upstream-skills.sh` | Throwaway `skills` install; compare `skills-lock.json` to `fixtures/expected-skills-lock.json` |
| `.claude/skills/addy-skills-install-verify/` | Lab skill for install + layout verification |
| `.claude/skills/lifecycle-gate-run/` | Lab skill for running the gate CLI |
| CI | `bun test`, skills layout, gitleaks 8.30.1, `bun audit`, Node 24 smoke; separate job for upstream install + e2e |
| `scripts/report.ts` | `bun run report`: runs `check:skills`, `smoke:node`, lock verify and `bun run gate` per fixture diff → `reports/gate.json` + `gate.md` (steps passed/failed, pins, rows, elapsed ms) |

Upstream skill copies are **not** committed — only the lock snapshot and lab-owned skills under `.claude/skills/`.

## Setup

- **Node** `>=24` (see `.nvmrc` → `24`)
- **Bun** `>=1.2.0`

```bash
nvm use   # or fnm / mise
bun install
```

## Tutorial

1. Install upstream skills into a disposable directory (records real `SKILL.md` files):

   ```bash
   export MINILAB_UPSTREAM_WORKDIR="$PWD/.throwaway-skills"
   bash scripts/install-upstream-skills.sh
   ```

2. Run the lifecycle gate on a fixture diff:

   ```bash
   bun run gate -- \
     --skill .throwaway-skills/.claude/skills/code-review-and-quality/SKILL.md \
     --diff fixtures/diffs/dependency-bump.patch
   ```

3. Read `.claude/skills/lifecycle-gate-run/SKILL.md` for when to use review vs TDD skills on agent PRs.

4. **Hedge — stars:** GitHub stars on upstream repos are not a quality metric. Pin CLI version and run this gate on your diffs.

## Test results (local, Oct 13 2026)

```text
$ bun install && bun test && bun run check:skills && bun audit
$ gitleaks dir --redact --exit-code 1 .

bun test v1.4.2
 10 pass
 0 fail
Ran 10 tests across 3 files. [~1.95s]

$ bun run check:skills
OK .claude/skills/addy-skills-install-verify/SKILL.md (name=addy-skills-install-verify, desc=182 chars)
OK .claude/skills/lifecycle-gate-run/SKILL.md (name=lifecycle-gate-run, desc=153 chars)

bun audit v1.4.2
No vulnerabilities found (checked 5 packages)

gitleaks 8.30.1
no leaks found

$ bun run smoke:node
node-smoke-ok
```

## Using these skills in Claude Code and Cursor

- **Claude Code:** open this repo as the project root. Lab skills live at `.claude/skills/addy-skills-install-verify/` and `.claude/skills/lifecycle-gate-run/`. Install upstream Addy skills into a **throwaway** folder (see tutorial), not as committed copies.
- **Cursor:** use the same `.claude/skills/` paths in your workspace. Do not duplicate under `.agents/skills` for this minilab standard.

Run `bun run check:skills` to enforce `name` == folder and `description` ≤ 1024 characters.

## API keys

**None.** CI and default tests are keyless. The `skills` CLI install clones public GitHub content only.

## Limitations

- Gate logic maps diff signals to **headings** deterministically — it does not run an LLM review.
- Only `SKILL.md` is installed per skill (`references/` skipped by the copy install); the gate does not read reference markdown.
- `skills-lock.json` hashes can change when upstream retags; update `fixtures/expected-skills-lock.json` deliberately when you bump upstream.

## Security

See [SECURITY.md](SECURITY.md). Contact: **hello@skilleddragon.com** only.

## License

MIT — see [LICENSE](LICENSE). Upstream [agent-skills](https://github.com/addyosmani/agent-skills) is MIT separately.
