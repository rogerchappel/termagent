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

mkdir -p "$TMP_DIR/app"
cd "$TMP_DIR/app"
npm init -y >/dev/null
npm install "$PACKAGE_TGZ" >/dev/null
TERMAGENT_BIN="./node_modules/.bin/termagent"
test -x "$TERMAGENT_BIN"
"$TERMAGENT_BIN" --help >/dev/null
"$TERMAGENT_BIN" inspect ./node_modules/termagent/examples/quickstart/session.json --output ./out
test -s out/summary.json
test -s out/transcript.md
test -s out/proof-bundle.md
"$TERMAGENT_BIN" inspect ./node_modules/termagent/examples/quickstart/session.json --output ./summary-out --summary-only >/dev/null
test -s summary-out/summary.json
test ! -e summary-out/transcript.md
test ! -e summary-out/proof-bundle.md
