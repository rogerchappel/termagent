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
npx termagent --help >/dev/null

# Summary-only mode must leave even a pre-existing output directory untouched.
mkdir -p out
printf 'keep me\n' > out/sentinel.txt
npx termagent inspect ./node_modules/termagent/examples/quickstart/session.json --output ./out --summary-only
test "$(cat out/sentinel.txt)" = 'keep me'
test "$(find out -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')" = 1
