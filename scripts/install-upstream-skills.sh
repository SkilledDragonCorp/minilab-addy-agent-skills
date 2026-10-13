#!/usr/bin/env bash
# Install addyosmani/agent-skills into a disposable workspace (not the lab tree).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${MINILAB_UPSTREAM_WORKDIR:-$(mktemp -d)}"
CLEANUP=0
if [[ -z "${MINILAB_UPSTREAM_WORKDIR:-}" ]]; then
  CLEANUP=1
  trap 'rm -rf "$WORK"' EXIT
fi

mkdir -p "$WORK"
cd "$WORK"
echo "Upstream install workspace: $WORK"

DISABLE_TELEMETRY=1 bun --bun x skills@1.7.2 add addyosmani/agent-skills \
  --skill code-review-and-quality \
  --skill test-driven-development \
  -a claude-code \
  -y \
  --copy

EXPECTED="$ROOT/fixtures/expected-skills-lock.json"
if [[ ! -f skills-lock.json ]]; then
  echo "Missing skills-lock.json in $WORK" >&2
  exit 1
fi

python3 - <<'PY' "$EXPECTED" "$WORK/skills-lock.json"
import json, sys
exp, got = sys.argv[1], sys.argv[2]
with open(exp) as f: e = json.load(f)
with open(got) as f: g = json.load(f)
if e.get("skills") != g.get("skills"):
    print("skills-lock.json mismatch", file=sys.stderr)
    print("expected skills keys:", sorted(e.get("skills", {})), file=sys.stderr)
    print("got skills keys:", sorted(g.get("skills", {})), file=sys.stderr)
    sys.exit(1)
print("skills-lock.json OK")
PY

for skill in code-review-and-quality test-driven-development; do
  skill_md="$WORK/.claude/skills/$skill/SKILL.md"
  if [[ ! -f "$skill_md" ]]; then
    echo "Missing $skill_md" >&2
    exit 1
  fi
  # Per-skill copy is SKILL.md only — references/ is not required for this lab gate.
  extra_count="$(find "$WORK/.claude/skills/$skill" -mindepth 1 ! -name SKILL.md | wc -l | tr -d ' ')"
  if [[ "$extra_count" != "0" ]]; then
    echo "Unexpected extra files under $skill (only SKILL.md expected)" >&2
    find "$WORK/.claude/skills/$skill" -mindepth 1 ! -name SKILL.md
    exit 1
  fi
done

echo "Upstream skills install verify OK"
