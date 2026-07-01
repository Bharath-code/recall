#!/usr/bin/env bash
# Generate an asciicast demo of Recall for the README.
#
# Prerequisites:
#   brew install asciinema
#   npm install -g agg  (or: brew install agg)
#
# Usage:
#   ./scripts/generate-demo.sh          # record a fresh demo
#   ./scripts/generate-demo.sh --play   # play back an existing recording
#   ./scripts/generate-demo.sh --gif    # convert existing recording to GIF
#
# Output:
#   assets/demo.cast   — asciicast recording
#   assets/demo.gif    — animated GIF (requires agg)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CAST_FILE="$ROOT/assets/demo.cast"
GIF_FILE="$ROOT/assets/demo.gif"

# ─── Prerequisite check ─────────────────────────────────────────────────────
if ! command -v asciinema &>/dev/null; then
  echo "Error: asciinema is not installed. Run: brew install asciinema"
  exit 1
fi

# ─── Play back ──────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--play" ]]; then
  if [[ ! -f "$CAST_FILE" ]]; then
    echo "No recording found at $CAST_FILE"
    exit 1
  fi
  asciinema play "$CAST_FILE"
  exit 0
fi

# ─── Convert to GIF ─────────────────────────────────────────────────────────
if [[ "${1:-}" == "--gif" ]]; then
  if [[ ! -f "$CAST_FILE" ]]; then
    echo "No recording found at $CAST_FILE"
    exit 1
  fi
  if command -v agg &>/dev/null; then
    agg --fps-cap 20 --speed 1.5 "$CAST_FILE" "$GIF_FILE"
    echo "✓ GIF generated at $GIF_FILE"
  else
    echo "agg not found. Install: npm install -g agg"
  fi
  exit 0
fi

# ─── Record demo ────────────────────────────────────────────────────────────
echo "Recording Recall demo..."
echo "Type 'exit' or Ctrl-D to stop recording."
echo ""

# Use a temporary directory so the demo is self-contained and reproducible
TMPDIR="$(mktemp -d)"
export RECALL_TEST_DIR="$TMPDIR"
export HOME="$TMPDIR"

# Build recall from source
cd "$ROOT"
bun run build >/dev/null 2>&1
RECALL_BIN="$ROOT/bin/recall"

# Write the demo commands to a temp script
DEMO_SCRIPT="$TMPDIR/demo.sh"
cat > "$DEMO_SCRIPT" <<SCRIPT
#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  ⚡ Recall — Your terminal remembers what you forget."
echo ""
sleep 1

echo "  \$ recall init --auto"
$RECALL_BIN init --auto 2>/dev/null || true
echo ""

echo "  \$ recall doctor"
$RECALL_BIN doctor 2>/dev/null || true
echo ""

echo "  # Run some commands to build history"
echo "  \\\$ git status"
echo "  \\\$ git diff"
echo "  \\\$ bun test"
echo "  \\\$ docker compose up -d"
echo ""

echo "  \$ recall recent --limit 5"
$RECALL_BIN recent --limit 5 2>/dev/null || true
echo ""

echo "  \$ recall search git"
$RECALL_BIN search git 2>/dev/null || true
echo ""
SCRIPT

chmod +x "$DEMO_SCRIPT"

# Record
asciinema rec --title "Recall Demo" --command "$DEMO_SCRIPT" "$CAST_FILE"

rm -rf "$TMPDIR"

echo ""
echo "✓ Recording saved to $CAST_FILE"
echo "  Convert to GIF:  $0 --gif"
echo "  Play back:       $0 --play"
