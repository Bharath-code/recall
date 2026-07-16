#!/usr/bin/env bash
set -euo pipefail

# ─── Recall MCP Demo Generator ─────────────────────────────────────────────
#
# Seeds a temp repo with realistic command history, then drives the real
# recall_search MCP tool (via the actual MCP server subprocess) with the
# question an agent would ask: "how do I deploy this repo?"
#
# Produces launch-assets/mcp-demo.md — the 60-second launch demo transcript.
#
# Usage:
#   bash scripts/generate-mcp-demo.sh
# ─────────────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="$ROOT/launch-assets/mcp-demo.md"

TMP_HOME=$(mktemp -d)
PROJECT_DIR="$TMP_HOME/recall-demo"
mkdir -p "$PROJECT_DIR"
git -C "$PROJECT_DIR" init -q

export HOME="$TMP_HOME"
export ZDOTDIR="$TMP_HOME"
export NO_COLOR=1
export RECALL_AI_PROVIDER=none

RECALL="bun $ROOT/src/index.ts"

CAPTURE() {
  $RECALL hook capture --raw-command "$1" --cwd "$PROJECT_DIR" --shell zsh \
    --session-id "mcp-demo" --exit-code "${2:-0}" --duration-ms "${3:-100}" >/dev/null 2>&1
}

echo "→ Seeding demo history..."
CAPTURE "git checkout -b feat/dashboard" 0 150
CAPTURE "npm install" 1 3000
CAPTURE "npm install --legacy-peer-deps" 0 4500
CAPTURE "bun run dev" 0 500
CAPTURE "docker compose up -d postgres" 0 2000
CAPTURE "git push origin feat/dashboard" 0 4000
CAPTURE "./scripts/deploy.sh --env production" 0 4100

echo "→ Calling recall_search over MCP (real server, real subprocess)..."
MCP_RESULT=$(cd "$PROJECT_DIR" && bun "$ROOT/scripts/mcp-call.ts" recall_search '{"query":"deploy","limit":3}')

tmp_escaped=$(printf '%s\n' "$TMP_HOME" | sed 's:[][\/.^$*]:\\&:g')
MCP_RESULT=$(printf '%s\n' "$MCP_RESULT" | sed -E "s|${tmp_escaped}/recall-demo|~/demo-project|g")

{
  echo '# Recall MCP Demo — 60 Seconds'
  echo
  echo "> Generated $(date '+%Y-%m-%d')"
  echo
  echo 'This is the real `recall_search` MCP tool, called against a live'
  echo '`recall mcp` server subprocess — not a mockup.'
  echo
  echo '---'
  echo
  echo '## The setup (one time)'
  echo
  echo '```jsonc'
  echo '// .mcp.json'
  echo '{ "mcpServers": { "recall": { "command": "recall", "args": ["mcp"] } } }'
  echo '```'
  echo
  echo '## The exchange'
  echo
  echo '```'
  echo 'You: how do I deploy this repo?'
  echo
  echo 'Claude Code: [calls recall_search({ "query": "deploy", "limit": 3 })]'
  echo '```'
  echo
  echo '## Real tool response'
  echo
  echo '```json'
  echo "$MCP_RESULT"
  echo '```'
  echo
  echo 'Claude Code reads the top hit — the successful `./scripts/deploy.sh'
  echo '--env production` run — and answers from it, not a guess.'
} > "$OUTPUT"

rm -rf "$TMP_HOME"

echo
echo "→ Demo saved to: $OUTPUT"
