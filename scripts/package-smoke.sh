#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$ROOT_DIR"
npm run build >/dev/null
npm pack --pack-destination "$TMP_DIR" >/dev/null
PACKAGE_TGZ="$(find "$TMP_DIR" -maxdepth 1 -name 'termagent-*.tgz' -print -quit)"
test -n "$PACKAGE_TGZ"

mkdir -p "$TMP_DIR/app/workspace/logs" "$TMP_DIR/app/workspace/.termagent"
echo '# Package smoke workspace' > "$TMP_DIR/app/workspace/README.md"
echo 'ok' > "$TMP_DIR/app/workspace/logs/run.log"
echo '[]' > "$TMP_DIR/app/workspace/.termagent/transcript.json"
cp "$ROOT_DIR/scripts/fixtures/package-smoke-session.json" "$TMP_DIR/app/fixture.json"

cd "$TMP_DIR/app"
npm init -y >/dev/null
npm install "$PACKAGE_TGZ" >/dev/null
npx termagent --help >/dev/null
npx termagent inspect fixture.json --output proof --summary-only | grep -q '"sessionId": "package-smoke-session"'
test -s proof/summary.json
test -s proof/proof-bundle.md
