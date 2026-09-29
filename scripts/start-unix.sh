#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORTABLE_NODE_DIR="$PROJECT_ROOT/.tools/node"

cd "$PROJECT_ROOT"

if [ -x "$PORTABLE_NODE_DIR/bin/node" ]; then
  export PATH="$PORTABLE_NODE_DIR/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf 'Node.js/npm nao foram encontrados.\n'
  printf 'Execute o instalador do seu sistema primeiro.\n'
  exit 1
fi

if [ ! -d "node_modules" ]; then
  printf 'Dependencias ainda nao foram instaladas.\n'
  printf 'Execute o instalador do seu sistema primeiro.\n'
  exit 1
fi

printf '\n============================================================\n'
printf '  Power BI Web Dashboard\n'
printf '============================================================\n\n'
printf 'Quando o servidor iniciar, abra:\n'
printf 'http://localhost:5173\n\n'
printf 'Para encerrar, pressione Ctrl+C.\n\n'

exec npm run dev
