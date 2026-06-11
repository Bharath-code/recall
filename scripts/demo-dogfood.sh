#!/usr/bin/env bash
# shellcheck disable=SC2317
set -euo pipefail

# ─── Recall Full Demo ──────────────────────────────────────────────────────
#
# Comprehensive launch demo that exercises all major Recall features.
# Used for:
#   - Recording demo GIFs (pipe to svg-term, terminalizer, etc.)
#   - Product Hunt / launch materials
#   - Quick "show me what Recall does" walkthrough
#
# Usage:
#   bash scripts/demo-dogfood.sh                     # Run demo
#   RECALL_USE_BIN=1 bash scripts/demo-dogfood.sh     # Use compiled binary
#   bash scripts/demo-dogfood.sh --walkthrough        # Annotated steps
# ─────────────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_HOME="$(mktemp -d)"
PROJECT_DIR="$TMP_HOME/recall-demo"
WALKTHROUGH=false
[[ "$*" == *"--walkthrough"* ]] && WALKTHROUGH=true

cleanup() { rm -rf "$TMP_HOME"; }
trap cleanup EXIT

mkdir -p "$PROJECT_DIR"
git -C "$PROJECT_DIR" init -q

export HOME="$TMP_HOME"
export ZDOTDIR="$TMP_HOME"
export HISTFILE="$TMP_HOME/.zsh_history"
export NO_COLOR=1
export RECALL_AI_PROVIDER=none
touch "$HISTFILE"

RECALL="bun '$ROOT/src/index.ts'"
if [[ "${RECALL_USE_BIN:-0}" == "1" && -x "$ROOT/bin/recall" ]]; then
  RECALL="$ROOT/bin/recall"
fi

step() {
  local label="$1"
  if $WALKTHROUGH; then
    echo
    echo "━━━ $label ━━━"
  fi
}

# ─── Step 1: Capture a realistic session ────────────────────────────────────

step "1/6  Capturing commands (simulating a dev session)"

# Simulate a typical dev workflow across multiple sessions
CAPTURE() {
  eval "$RECALL hook capture --raw-command \"$1\" --cwd \"$PROJECT_DIR\" --shell zsh --session-id \"$2\" --exit-code \"${3:-0}\" --duration-ms \"${4:-100}\"" 2>/dev/null
}

SESSION_A="demo-session-a"
SESSION_B="demo-session-b"
SESSION_C="demo-session-c"

# Session A: Fixing a bug
CAPTURE "git checkout -b fix/login-error" "$SESSION_A" 0 150
CAPTURE "npm install" "$SESSION_A" 1 3000
CAPTURE "npm install --legacy-peer-deps" "$SESSION_A" 0 4500
CAPTURE "grep -r 'InvalidToken' src/auth/" "$SESSION_A" 0 230
CAPTURE "vim src/auth/login.ts" "$SESSION_A" 0 120000
CAPTURE "npm test -- --coverage" "$SESSION_A" 0 34000
CAPTURE "git add src/auth/login.ts" "$SESSION_A" 0 80
CAPTURE "git commit -m 'fix: handle invalid token edge case'" "$SESSION_A" 0 120
CAPTURE "git push origin fix/login-error" "$SESSION_A" 1 5000
CAPTURE "git push origin fix/login-error --force" "$SESSION_A" 0 4800

# Session B: Setting up Docker (first failure, then success — auto-learned fix)
CAPTURE "docker compose up -d" "$SESSION_B" 1 1200
CAPTURE "docker compose pull" "$SESSION_B" 0 8000
CAPTURE "docker compose up -d" "$SESSION_B" 0 3500
CAPTURE "docker ps" "$SESSION_B" 0 200

# Session C: Project setup
CAPTURE "cd ~/projects/recall-demo" "$SESSION_C" 0 10
CAPTURE "bun install" "$SESSION_C" 0 15000
CAPTURE "bun run dev" "$SESSION_C" 0 500
CAPTURE "curl http://localhost:3000" "$SESSION_C" 0 120

export HOME="$TMP_HOME" ZDOTDIR="$TMP_HOME"

# ─── Step 2: recall recent ──────────────────────────────────────────────────

step "2/6  recall recent — what did I just do?"

echo "> recall recent --limit 5"
eval "$RECALL recent --no-icons --limit 5" 2>/dev/null || true
echo

# ─── Step 3: recall search ──────────────────────────────────────────────────

step "3/6  recall search — find anything instantly"

echo "> recall search \"docker\""
eval "$RECALL search docker --no-icons" 2>/dev/null || true
echo

echo "> recall search \"git push\" --failed-only"
eval "$RECALL search \"git push\" --no-icons --failed-only" 2>/dev/null || true
echo

# ─── Step 4: recall session ─────────────────────────────────────────────────

step "4/6  recall session — timeline of your work"

echo "> recall session --limit 3"
eval "$RECALL session --no-icons --limit 3" 2>/dev/null || true
echo

# ─── Step 5: recall project ─────────────────────────────────────────────────

step "5/6  recall project — repo context at a glance"

echo "> recall project (inside ~/projects/recall-demo)"
(cd "$PROJECT_DIR" && eval "$RECALL project --no-icons" 2>/dev/null) || true
echo

# ─── Step 6: recall doctor + insight ────────────────────────────────────────

step "6/6  recall doctor — health check + insight"

echo "> recall doctor"
eval "$RECALL doctor --no-icons" 2>/dev/null || true
echo

# ─── Summary ─────────────────────────────────────────────────────────────────

echo
if $WALKTHROUGH; then
  echo "━━━ Demo Complete ━━━"
  echo "All major Recall features demonstrated."
  echo "Ready for GIF recording / Product Hunt / launch materials."
fi
echo "To record a GIF:  svg-term --cast=... --out demo.svg --window"
