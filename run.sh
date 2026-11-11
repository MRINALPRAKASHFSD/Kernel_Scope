#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
command -v python3 >/dev/null || { echo 'Python 3 required' >&2; exit 127; }
mkdir -p outputs
printf '%s Bash launcher invoked; args=%q\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> outputs/launcher.log
exec python3 -m os_sim.cli "$@"
