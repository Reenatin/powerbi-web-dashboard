#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
"$ROOT/scripts/list-models-unix.sh"
printf '\nPressione Enter para fechar...'
read -r _
