#!/usr/bin/env bash
set -euo pipefail
node --version | grep -E '^v24\.' >/dev/null
node -e "console.log('node-smoke-ok')"
