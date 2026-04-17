#!/usr/bin/env bash
set -euo pipefail

binary="${1:-}"

if [[ -z "$binary" ]]; then
  echo "Usage: scripts/sign-macos.sh <binary>" >&2
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  exit 0
fi

if [[ ! -f "$binary" ]]; then
  echo "Binary not found: $binary" >&2
  exit 1
fi

entitlements="$(mktemp)"
cleanup() {
  rm -f "$entitlements"
}
trap cleanup EXIT

cat > "$entitlements" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-executable-page-protection</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
PLIST

# Bun's compiled executable may inherit a stale signature from the embedded
# runtime. Remove it before applying a local ad-hoc signature; otherwise macOS
# can kill the process at launch with SIGKILL.
codesign --remove-signature "$binary" 2>/dev/null || true
codesign --force --sign - --entitlements "$entitlements" "$binary" >/dev/null
codesign --verify "$binary" >/dev/null
