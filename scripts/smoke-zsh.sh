#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_HOME="$(mktemp -d)"
PROJECT_DIR="$TMP_HOME/smoke-project"

cleanup() {
  rm -rf "$TMP_HOME"
}
trap cleanup EXIT

mkdir -p "$PROJECT_DIR"
git -C "$PROJECT_DIR" init >/dev/null 2>&1
touch "$TMP_HOME/.zshrc"

export HOME="$TMP_HOME"
export ZDOTDIR="$TMP_HOME"
export HISTFILE="$TMP_HOME/.zsh_history"
export SHELL="/bin/zsh"
export NO_COLOR=1
export RECALL_AI_PROVIDER=none
touch "$HISTFILE"

RECALL="bun $ROOT/src/index.ts"
if [[ "${RECALL_USE_BIN:-0}" == "1" && -x "$ROOT/bin/recall" ]]; then
  RECALL="$ROOT/bin/recall"
fi

$RECALL init --auto --no-icons >/dev/null
$RECALL init --auto --no-icons >/dev/null

install_count="$(grep -c "Recall Shell Hook" "$TMP_HOME/.zshrc")"
if [[ "$install_count" != "1" ]]; then
  echo "Expected exactly one Recall hook block, found $install_count" >&2
  exit 1
fi

id="$($RECALL hook capture --raw-command "echo smoke" --cwd "$PROJECT_DIR" --shell zsh)"
$RECALL hook update --command-id "$id" --exit-code 0 --duration-ms 5

if ! $RECALL recent --no-icons | grep -q "echo smoke"; then
  echo "Smoke command was not captured" >&2
  exit 1
fi

echo "Recall zsh smoke test passed"
