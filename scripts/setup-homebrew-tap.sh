#!/usr/bin/env bash
# ─── One-time Homebrew tap setup ─────────────────────────────────────────
# Run this ONCE to create the homebrew-recall tap repository on GitHub and
# populate it with the initial formula. After this, the CI release workflow
# will keep the formula up to date automatically.
#
# Prerequisites:
#   - gh CLI installed and authenticated (gh auth status)
#   - Permissions to create repos under your GitHub org/user
#
# Usage:
#   bash scripts/setup-homebrew-tap.sh [org]
#
#   [org] — GitHub org or username (default: the owner of origin remote)

set -euo pipefail

ORG="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FORMULA_SRC="$ROOT/homebrew/Formula/recall.rb"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# ── Resolve org ─────────────────────────────────────────────────────────
if [[ -z "$ORG" ]]; then
  # Try to extract owner from the git remote
  REMOTE_URL="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
  if echo "$REMOTE_URL" | grep -q 'github.com'; then
    ORG="$(echo "$REMOTE_URL" | sed -n 's|.*github.com[:/]\([^/]*\)/.*|\1|p')"
  fi
fi

if [[ -z "$ORG" ]]; then
  echo "Error: Could not detect GitHub org. Pass it as argument:" >&2
  echo "  bash scripts/setup-homebrew-tap.sh <org>" >&2
  exit 1
fi

TAP_REPO="${ORG}/homebrew-recall"
TAP_DIR="$TMP_DIR/homebrew-recall"

echo "━━━ Setting up Homebrew tap ────────────────────────────────────────"
echo "  Source formula: $FORMULA_SRC"
echo "  Target tap:     $TAP_REPO"
echo ""

# ── Create the tap repo on GitHub ──────────────────────────────────────
echo "  [1/4] Creating GitHub repository $TAP_REPO..."
if gh repo view "$TAP_REPO" --json name >/dev/null 2>&1; then
  echo "  Repository already exists. Updating formula only."
else
  gh repo create "$TAP_REPO" --public \
    --description "Homebrew tap for Recall CLI — shell history, project memory, and workflow detection" \
    --homepage "https://github.com/${ORG}/recall"
  echo "  ✓ Created $TAP_REPO"
fi

# ── Clone and prep ─────────────────────────────────────────────────────
echo "  [2/4] Cloning $TAP_REPO..."
gh repo clone "$TAP_REPO" "$TAP_DIR" 2>/dev/null || {
  # Repo exists but is empty — init it
  mkdir -p "$TAP_DIR"
  git -C "$TAP_DIR" init
  git -C "$TAP_DIR" remote add origin "https://github.com/${TAP_REPO}.git"
}

# ── Copy formula ───────────────────────────────────────────────────────
echo "  [3/4] Installing formula..."
mkdir -p "$TAP_DIR/Formula"
cp "$FORMULA_SRC" "$TAP_DIR/Formula/recall.rb"

# ── Copy CI workflow ──────────────────────────────────────────────────
echo "  [4/4] Installing CI workflow..."
mkdir -p "$TAP_DIR/.github/workflows"
cp "$ROOT/.github/workflows/update-formula.yml" "$TAP_DIR/.github/workflows/"

# ── Commit and push ───────────────────────────────────────────────────
cd "$TAP_DIR"
if [[ -z "$(git -C "$TAP_DIR" status --porcelain)" ]]; then
  echo "  No changes to commit."
else
  git add -A
  git commit -m "Initial formula: Recall CLI v$(grep '^  version' Formula/recall.rb | sed 's/.*"\(.*\)".*/\1/')"
  git push origin main 2>/dev/null || git push origin HEAD:main
  echo "  ✓ Pushed to $TAP_REPO"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Homebrew tap is set up!"
echo ""
echo "  Users can now install Recall with:"
echo ""
echo "    brew tap ${ORG}/recall"
echo "    brew install recall"
echo ""
echo "  Next release will auto-update via CI."
echo ""
