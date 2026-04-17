#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_HOME="$(mktemp -d)"
PROJECT_DIR="$TMP_HOME/demo-project"

cleanup() {
  rm -rf "$TMP_HOME"
}
trap cleanup EXIT

mkdir -p "$PROJECT_DIR"
git -C "$PROJECT_DIR" init >/dev/null 2>&1

export HOME="$TMP_HOME"
export ZDOTDIR="$TMP_HOME"
export HISTFILE="$TMP_HOME/.zsh_history"
export NO_COLOR=1
export RECALL_AI_PROVIDER=none
touch "$HISTFILE"

RECALL="bun $ROOT/src/index.ts"
if [[ "${RECALL_USE_BIN:-0}" == "1" && -x "$ROOT/bin/recall" ]]; then
  RECALL="$ROOT/bin/recall"
fi

echo "== Capture sample commands"
id="$($RECALL hook capture --raw-command "bun test" --cwd "$PROJECT_DIR" --shell zsh)"
$RECALL hook update --command-id "$id" --exit-code 0 --duration-ms 37
$RECALL hook capture --raw-command "git status" --cwd "$PROJECT_DIR" --shell zsh --exit-code 0 --duration-ms 12 >/dev/null

echo
echo "== Recent"
$RECALL recent --no-icons

echo
echo "== Search"
$RECALL search bun --no-icons

echo
echo "== Project"
(cd "$PROJECT_DIR" && $RECALL project --no-icons)

echo
echo "== Ignore and delete controls"
$RECALL ignore add secret --no-icons
$RECALL ignore list --no-icons
$RECALL delete --id "$id" --no-icons
