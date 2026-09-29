#!/usr/bin/env bash
set -euo pipefail

MIN_NODE_MAJOR=20
MIN_NPM_MAJOR=10

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOOLS_ROOT="$PROJECT_ROOT/.tools"
PORTABLE_NODE_DIR="$TOOLS_ROOT/node"

cd "$PROJECT_ROOT"

step() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf '\nERROR: %s\n' "$1" >&2
  exit "${2:-1}"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

download_file() {
  local url="$1"
  local destination="$2"

  if command_exists curl; then
    curl -fL --retry 3 --connect-timeout 20 "$url" -o "$destination"
  elif command_exists wget; then
    wget --tries=3 --timeout=20 -O "$destination" "$url"
  elif command_exists python3; then
    python3 - "$url" "$destination" <<'PY'
import sys
import urllib.request

url, destination = sys.argv[1], sys.argv[2]
with urllib.request.urlopen(url, timeout=30) as response, open(destination, "wb") as target:
    target.write(response.read())
PY
  else
    fail "curl, wget ou python3 nao foram encontrados. Instale um deles e execute novamente."
  fi
}

sha256_file() {
  local file="$1"

  if command_exists sha256sum; then
    sha256sum "$file" | awk '{print tolower($1)}'
  elif command_exists shasum; then
    shasum -a 256 "$file" | awk '{print tolower($1)}'
  elif command_exists openssl; then
    openssl dgst -sha256 "$file" | awk '{print tolower($NF)}'
  else
    fail "Nao foi encontrado sha256sum, shasum ou openssl para validar o download."
  fi
}

major_version() {
  printf '%s' "$1" | sed -E 's/^v?([0-9]+).*/\1/'
}

node_is_compatible() {
  local node_bin="$1"
  local npm_bin="$2"

  [ -x "$node_bin" ] || return 1
  [ -x "$npm_bin" ] || return 1

  local node_version npm_version node_major npm_major
  node_version="$("$node_bin" --version 2>/dev/null || true)"
  npm_version="$("$npm_bin" --version 2>/dev/null || true)"

  [ -n "$node_version" ] || return 1
  [ -n "$npm_version" ] || return 1

  node_major="$(major_version "$node_version")"
  npm_major="$(major_version "$npm_version")"

  [ "$node_major" -ge "$MIN_NODE_MAJOR" ] 2>/dev/null || return 1
  [ "$npm_major" -ge "$MIN_NPM_MAJOR" ] 2>/dev/null || return 1
}

detect_platform() {
  local uname_s uname_m
  uname_s="$(uname -s)"
  uname_m="$(uname -m)"

  case "$uname_s" in
    Linux)
      OS_NAME="Linux"
      PACKAGE_OS="linux"
      ;;
    Darwin)
      OS_NAME="macOS"
      PACKAGE_OS="darwin"
      ;;
    *)
      fail "Sistema operacional nao suportado por este instalador: $uname_s"
      ;;
  esac

  case "$uname_m" in
    x86_64|amd64)
      ARCH="x64"
      ;;
    arm64|aarch64)
      ARCH="arm64"
      ;;
    *)
      fail "Arquitetura nao suportada automaticamente: $uname_m"
      ;;
  esac

  if [ "$OS_NAME" = "Linux" ] && [ "$ARCH" = "x64" ]; then
    if (ldd --version 2>&1 || true) | grep -qi musl; then
      PACKAGE_SUFFIX="linux-x64-musl"
      FILE_KEY="linux-x64-musl"
      return
    fi
  fi

  if [ "$OS_NAME" = "Linux" ]; then
    PACKAGE_SUFFIX="linux-$ARCH"
    FILE_KEY="linux-$ARCH"
  else
    PACKAGE_SUFFIX="darwin-$ARCH"
    FILE_KEY="osx-$ARCH-tar"
  fi
}

find_compatible_node() {
  if command_exists node && command_exists npm; then
    local global_node global_npm
    global_node="$(command -v node)"
    global_npm="$(command -v npm)"
    if node_is_compatible "$global_node" "$global_npm"; then
      NODE_BIN="$global_node"
      NPM_BIN="$global_npm"
      return 0
    fi
  fi

  local portable_node="$PORTABLE_NODE_DIR/bin/node"
  local portable_npm="$PORTABLE_NODE_DIR/bin/npm"
  if node_is_compatible "$portable_node" "$portable_npm"; then
    export PATH="$PORTABLE_NODE_DIR/bin:$PATH"
    NODE_BIN="$portable_node"
    NPM_BIN="$portable_npm"
    return 0
  fi

  return 1
}

install_portable_node() {
  step "Node.js $MIN_NODE_MAJOR+ / npm $MIN_NPM_MAJOR+ nao encontrados. Preparando Node.js LTS portatil..."

  detect_platform

  mkdir -p "$TOOLS_ROOT"
  local download_dir="$TOOLS_ROOT/_download"
  local extract_dir="$TOOLS_ROOT/_extract"
  rm -rf "$download_dir" "$extract_dir"
  mkdir -p "$download_dir" "$extract_dir"

  local index_path="$download_dir/index.tab"
  local index_url="https://nodejs.org/dist/index.tab"

  printf 'Consultando releases oficiais do Node.js...\n'
  download_file "$index_url" "$index_path"

  local version
  version="$(
    awk -F '\t' -v key="$FILE_KEY" -v min="$MIN_NODE_MAJOR" '
      NR > 1 && $10 != "-" {
        files = "," $3 ","
        wanted = "," key ","
        v = $1
        sub(/^v/, "", v)
        split(v, parts, ".")
        if (parts[1] + 0 >= min && index(files, wanted) > 0) {
          print $1
          exit
        }
      }
    ' "$index_path"
  )"

  [ -n "$version" ] || fail "Nao foi encontrada uma release LTS compativel para $OS_NAME/$ARCH."

  local archive="node-$version-$PACKAGE_SUFFIX.tar.gz"
  local base_url="https://nodejs.org/dist/$version"
  local archive_path="$download_dir/$archive"
  local shasums_path="$download_dir/SHASUMS256.txt"

  printf 'Baixando %s para %s/%s de nodejs.org...\n' "$version" "$OS_NAME" "$ARCH"
  download_file "$base_url/$archive" "$archive_path"
  download_file "$base_url/SHASUMS256.txt" "$shasums_path"

  printf 'Validando SHA-256 publicado pelo Node.js...\n'
  local expected_hash actual_hash
  expected_hash="$(awk -v file="$archive" '$2 == file { print tolower($1); exit }' "$shasums_path")"
  [ -n "$expected_hash" ] || fail "Checksum oficial de $archive nao encontrado."

  actual_hash="$(sha256_file "$archive_path")"
  [ "$expected_hash" = "$actual_hash" ] || fail "Falha de integridade: SHA-256 do Node.js baixado nao confere."

  printf 'Checksum OK.\n'
  printf 'Extraindo runtime local...\n'

  tar -xzf "$archive_path" -C "$extract_dir"

  local extracted_dir="$extract_dir/node-$version-$PACKAGE_SUFFIX"
  [ -x "$extracted_dir/bin/node" ] || fail "node nao foi encontrado apos a extracao do pacote oficial."

  rm -rf "$PORTABLE_NODE_DIR"
  mv "$extracted_dir" "$PORTABLE_NODE_DIR"
  rm -rf "$download_dir" "$extract_dir"

  export PATH="$PORTABLE_NODE_DIR/bin:$PATH"
  NODE_BIN="$PORTABLE_NODE_DIR/bin/node"
  NPM_BIN="$PORTABLE_NODE_DIR/bin/npm"

  node_is_compatible "$NODE_BIN" "$NPM_BIN" || fail "Runtime portatil preparado, mas Node/npm nao atendem aos requisitos."

  printf 'Node.js portatil pronto em .tools/node.\n'
}

printf 'Power BI Web Dashboard - Unix Setup\n'
printf 'Project: %s\n' "$PROJECT_ROOT"

if ! find_compatible_node; then
  install_portable_node
fi

step "Validando Node.js e npm"
printf 'Node.js: %s\n' "$("$NODE_BIN" --version)"
printf 'npm: v%s\n' "$("$NPM_BIN" --version)"

step "Instalando dependencias do projeto"
"$NPM_BIN" install

if [ ! -f ".env" ]; then
  step "Criando arquivo .env"
  cp ".env.example" ".env"
  printf '.env criado a partir de .env.example.\n'
  printf 'As credenciais do Power BI continuam vazias por seguranca.\n'
else
  step "Arquivo .env ja existe"
  printf 'O arquivo existente foi preservado.\n'
fi

step "Executando diagnostico"
"$NPM_BIN" run doctor || true

printf '\n============================================================\n'
printf 'Setup finalizado para %s.\n\n' "$OS_NAME"
printf 'Proximos passos:\n'
printf '1. Preencha o .env para conectar ao Power BI.\n'
printf '2. Configure config/dashboard.json.\n'

if [ "$OS_NAME" = "macOS" ]; then
  printf '3. Execute ./start-macos.command\n'
else
  printf '3. Execute ./start-linux.sh\n'
fi

printf '4. Abra http://localhost:5173\n\n'
printf 'Credenciais Power BI ausentes no doctor sao esperadas enquanto o .env estiver vazio.\n'
