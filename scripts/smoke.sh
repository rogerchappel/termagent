#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.smoke-out"
rm -rf "$OUT_DIR"
node "$ROOT_DIR/dist/src/index.js" inspect "$ROOT_DIR/tests/fixtures/sample-session.json" --output "$OUT_DIR" --summary-only
node "$ROOT_DIR/dist/src/index.js" inspect "$ROOT_DIR/tests/fixtures/sample-session.json" --output "$OUT_DIR"
test -f "$OUT_DIR/summary.json"
test -f "$OUT_DIR/transcript.md"
test -f "$OUT_DIR/proof-bundle.md"
grep -q 'termagent proof bundle' "$OUT_DIR/proof-bundle.md"
echo "smoke ok: artifacts written to $OUT_DIR"
