#!/usr/bin/env bash
# ─── Integration test for promoted commands ──────────────────────────────
# Covers: recall ask, recall fix, recall forgotten-tools, and --json flags
# Usage: bash scripts/test-promoted.sh

set -euo pipefail
PASS=0
FAIL=0

pass()  { PASS=$((PASS + 1)); echo "  ✅ PASS: $1"; }
fail()  { FAIL=$((FAIL + 1)); echo "  ❌ FAIL: $1"; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_HOME="$(mktemp -d)"
PROJECT_DIR="$TMP_HOME/demo-project"
OUT="$TMP_HOME/output.txt"

cleanup() { rm -rf "$TMP_HOME"; }
trap cleanup EXIT

mkdir -p "$PROJECT_DIR"
git -C "$PROJECT_DIR" init >/dev/null 2>&1

export HOME="$TMP_HOME"
export ZDOTDIR="$TMP_HOME"
export NO_COLOR=1
export RECALL_AI_PROVIDER=none

# CRITICAL: ensure experimental gating is OFF
unset RECALL_EXPERIMENTAL

RECALL="bun $ROOT/src/index.ts"
if [[ "${RECALL_USE_BIN:-0}" == "1" && -x "$ROOT/bin/recall" ]]; then
  RECALL="$ROOT/bin/recall"
fi

echo "━━━ Test Suite: Promoted Commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ───── Setup: capture commands ─────────────────────────────────────────
echo "  [setup] Capturing sample commands..."

# Successful commands
for cmd in "npm run dev" "git status" "npm test" "bun run build" "docker ps" "git commit"; do
  id="$($RECALL hook capture --raw-command "$cmd" --cwd "$PROJECT_DIR" --shell zsh --session-id "test-session")"
  $RECALL hook update --command-id "$id" --exit-code 0 --duration-ms 15 >/dev/null
done

# A failed command (for `recall fix` to detect) — must be unique to avoid dedup
id="$($RECALL hook capture --raw-command "python missing-script.py" --cwd "$PROJECT_DIR" --shell zsh --session-id "test-session")"
$RECALL hook update --command-id "$id" --exit-code 1 --duration-ms 200 >/dev/null

# ──────────────────────────────────────────────────────────────────────────
echo ""
echo "── 1. recall forgotten-tools ───────────────────────────────────────"

# Works without RECALL_EXPERIMENTAL
$RECALL forgotten-tools --no-icons > "$OUT" 2>&1
if grep -q "recall forgotten-tools" "$OUT"; then
  pass "forgotten-tools runs without RECALL_EXPERIMENTAL"
else
  fail "forgotten-tools did not produce expected output"
  head -5 "$OUT"
fi

# JSON output
$RECALL forgotten-tools --json > "$OUT" 2>&1
if grep -q '^\[' "$OUT"; then
  pass "forgotten-tools --json returns an array"
else
  fail "forgotten-tools --json did not return an array"
  head -3 "$OUT"
fi

# ──────────────────────────────────────────────────────────────────────────
echo ""
echo "── 2. recall ask (keyword fallback) ────────────────────────────────"

# Keyword search works without AI
$RECALL ask "git" --no-icons > "$OUT" 2>&1
if grep -q -i "git\|no results\|no matching" "$OUT"; then
  pass "ask keyword fallback runs without RECALL_EXPERIMENTAL"
else
  fail "ask keyword fallback failed"
  head -5 "$OUT"
fi

# JSON output for keyword search
$RECALL ask "docker" --json > "$OUT" 2>&1
if grep -q '"search_method"' "$OUT"; then
  pass "ask --json includes search_method field"
else
  fail "ask --json missing search_method"
  head -3 "$OUT"
fi

# ──────────────────────────────────────────────────────────────────────────
echo ""
echo "── 3. recall fix ───────────────────────────────────────────────────"

# Shows the captured failure
$RECALL fix --no-icons > "$OUT" 2>&1
if grep -q "missing-script" "$OUT"; then
  pass "fix shows recent failures without RECALL_EXPERIMENTAL"
else
  fail "fix did not show expected failure info"
  head -10 "$OUT"
fi

# JSON output for fix
$RECALL fix --json > "$OUT" 2>&1
if grep -q '"fixes"' "$OUT"; then
  pass "fix --json returns fixes array"
else
  fail "fix --json missing fixes field"
  head -3 "$OUT"
fi

# ──────────────────────────────────────────────────────────────────────────
echo ""
echo "── 4. --json flag on core commands ────────────────────────────────"

# recent --json
$RECALL recent --json > "$OUT" 2>&1
if head -1 "$OUT" | grep -q '^\['; then
  pass "recent --json returns an array"
else
  fail "recent --json did not return an array"
  head -3 "$OUT"
fi

# search --json
$RECALL search "npm" --json > "$OUT" 2>&1
if head -1 "$OUT" | grep -q '^\['; then
  pass "search --json returns an array"
else
  fail "search --json did not return an array"
  head -3 "$OUT"
fi

# project --json
(cd "$PROJECT_DIR" && $RECALL project --json) > "$OUT" 2>&1
if grep -q '"repo"' "$OUT"; then
  pass "project --json returns structured object"
else
  fail "project --json did not return structured object"
  head -3 "$OUT"
fi

# doctor --json
$RECALL doctor --json > "$OUT" 2>&1
if grep -q '"healthy"' "$OUT"; then
  pass "doctor --json returns healthy status"
else
  fail "doctor --json missing healthy field"
  head -3 "$OUT"
fi

# ──────────────────────────────────────────────────────────────────────────
echo ""
echo "── 5. RECALL_EXPERIMENTAL is NOT required ──────────────────────────"

# Direct check: these commands should NOT error with "not found"
for cmd in "forgotten-tools" "ask" "fix"; do
  if $RECALL "$cmd" --help 2>&1 | grep -q "Experimental"; then
    fail "$cmd --help still marked as experimental"
  else
    pass "$cmd is promoted (no 'Experimental' label)"
  fi
done

# ──────────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Results: $PASS passed, $FAIL failed"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
