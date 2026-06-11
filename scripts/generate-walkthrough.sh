#!/usr/bin/env bash
set -euo pipefail

# ─── Recall Walkthrough Generator ──────────────────────────────────────────
#
# Generates a launch-ready walkthrough.md with captured terminal output.
# Each command's output is captured as a code block for documentation,
# landing page copy, or conversion to SVG/GIF via svg-term-cli.
#
# Usage:
#   bash scripts/generate-walkthrough.sh              # Generate walkthrough.md
#   bash scripts/generate-walkthrough.sh --svg         # Also try to record SVG via svg-term
# ─────────────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="$ROOT/launch-assets/walkthrough.md"
SVG_DIR="$ROOT/launch-assets/screenshots"
GEN_SVG=false
[[ "$*" == *"--svg"* ]] && GEN_SVG=true

mkdir -p "$(dirname "$OUTPUT")"
[[ "$GEN_SVG" == true ]] && mkdir -p "$SVG_DIR"

# ─── Helpers ─────────────────────────────────────────────────────────────────

header() {
  {
    echo
    echo "## $1"
    echo
    echo '```'
  } >> "$OUTPUT"
}

footer() {
  echo '```' >> "$OUTPUT"
  echo >> "$OUTPUT"
}

capture_section() {
  local title="$1"
  local cmd="$2"
  local label="${3:-}"

  header "$title"
  echo "$ $cmd" >> "$OUTPUT"
  eval "$cmd" >> "$OUTPUT" 2>/dev/null || true
  footer

  echo "  ✓ $title${label:+ ($label)}"
}

# ─── Sanitize: strip machine-specific absolute paths ──────────────────────
# Replaces project root and temp dir paths with generic placeholders so the
# walkthrough can be shared publicly without leaking the author's filesystem.

sanitize_output() {
  local root_escaped
  root_escaped=$(printf '%s\n' "$ROOT" | sed 's:[][\/.^$*]:\\&:g')

  local tmp_escaped
  tmp_escaped=$(printf '%s\n' "$TMP_HOME" | sed 's:[][\/.^$*]:\\&:g')

  # 1) Replace "bun /abs/path/src/index.ts <args>" with "recall <args>"
  #    so command examples look like what users actually type.
  sed -i '' "s|bun ${root_escaped}/src/index\.ts|recall|g" "$OUTPUT"

  # 2) Replace remaining project root references with "recall"
  sed -i '' "s|${root_escaped}|recall|g" "$OUTPUT"

  # 3) Replace temp project dir with generic "~/demo-project"
  sed -i '' "s|${tmp_escaped}/recall-demo|~/demo-project|g" "$OUTPUT"

  # 4) Replace the broader temp home dir with "~" (the HOME simulation).
  #    Paths like $TMP_HOME/.recall/recall.db become ~/.recall/recall.db.
  sed -i '' "s|${tmp_escaped}|~|g" "$OUTPUT"

  # 5) Handle the macOS /private symlink resolution.
  #    The path "/private/var/folders/..." is macOS's /private→/var symlink.
  #    Add a /private prefix to the temp dir to catch this:
  sed -i '' "s|/private${tmp_escaped}|~/.recall|g" "$OUTPUT"

  # 6) Handle the truncated variant (output windowed to terminal width)
  #    e.g., "/private/var/folders/7j/qbtvlct579jc5… (git repo)"
  sed -i '' -E "s|/private/var/folders/[^ ]+…|~/.recall|g" "$OUTPUT"

  echo "  ✓ Output sanitized (absolute paths → placeholders)"
}

# ─── Generate Walkthrough ───────────────────────────────────────────────────

{
  echo '# Recall Walkthrough'
  echo
  echo "> Generated $(date '+%Y-%m-%d')"
  echo
  echo 'This walkthrough demonstrates all major Recall features.'
  echo 'Each section shows the command and its terminal output.'
  echo
  echo '---'
  echo
} >> "$OUTPUT"

echo "→ Generating launch walkthrough..."

# Run the demo script to seed data
bash "$ROOT/scripts/demo-dogfood.sh" > /dev/null 2>&1

# Source the same env as the demo
TMP_HOME=$(mktemp -d)
PROJECT_DIR="$TMP_HOME/recall-demo"

mkdir -p "$PROJECT_DIR"
git -C "$PROJECT_DIR" init -q

export HOME="$TMP_HOME"
export ZDOTDIR="$TMP_HOME"
export NO_COLOR=1
export RECALL_AI_PROVIDER=none

RECALL="bun $ROOT/src/index.ts"

# Seed data
SESSION_W="walkthrough-session"

CAPTURE() {
  $RECALL hook capture --raw-command "$1" --cwd "$PROJECT_DIR" --shell zsh --session-id "$SESSION_W" --exit-code "${2:-0}" --duration-ms "${3:-100}" >/dev/null 2>&1
}

CAPTURE "git checkout -b feat/dashboard" 0 150
CAPTURE "npm install" 1 3000
CAPTURE "npm install --legacy-peer-deps" 0 4500
CAPTURE "bun run dev" 0 500
CAPTURE "docker compose up -d postgres" 0 2000
CAPTURE "npx prisma migrate dev" 0 8000
CAPTURE "curl http://localhost:3000/api/health" 0 230
CAPTURE "git add src/" 0 50
CAPTURE "git commit -m 'feat: add dashboard api'" 0 100
CAPTURE "git push origin feat/dashboard" 0 4000
CAPTURE "recall search docker" 0 50
CAPTURE "recall session" 0 30

# Section 1: Quick Start
capture_section "Quick Start" "$RECALL init --help 2>/dev/null | head -20" "init help"

# Section 2: Search
capture_section "Search Commands" "$RECALL search docker --no-icons --limit 5" "basic search"
capture_section "Search with Filters" "$RECALL search git --no-icons --failed-only" "failed-only filter"
capture_section "Smart Search" "$RECALL search 'prisma migrate' --no-icons" "specific query"

# Section 3: Recent & Session
capture_section "Recent Commands" "$RECALL recent --no-icons --limit 5" "recent list"

# Section 4: Project Context
capture_section "Project Context" "cd '$PROJECT_DIR' && $RECALL project --no-icons 2>/dev/null" "project view"

# Section 5: Session Timeline
capture_section "Session Timeline" "$RECALL session --no-icons --limit 3" "session timeline"

# Section 6: Doctor & Insight
capture_section "Health Check & Insight" "$RECALL doctor --no-icons" "doctor output"

# Section 7: JSON output
capture_section "Programmatic Output (JSON)" "$RECALL recent --limit 2 --json 2>/dev/null | head -30" "json output"

# Sanitize before cleanup (so temp dir paths are still available)
sanitize_output

# Cleanup
rm -rf "$TMP_HOME"

echo
echo "→ Walkathon saved to: $OUTPUT"
echo "→ Lines: $(wc -l < "$OUTPUT")"
echo
echo "To convert to SVG:  npm install -g svg-term-cli && svg-term --in=$OUTPUT --out=recall-demo.svg"
