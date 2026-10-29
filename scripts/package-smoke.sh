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

# The package's public ESM surface and declarations must work from a clean consumer.
cat > consumer.mjs <<'EOF'
import assert from 'node:assert/strict';
import { inspectFixture } from 'termagent/dist/src/core/inspect.js';
import * as api from 'termagent/dist/src/core/types.js';
assert.equal(typeof inspectFixture, 'function');
assert.deepEqual(Object.keys(api), []);
EOF
node consumer.mjs
cat > consumer.ts <<'EOF'
import type { InspectOptions, InspectResult, SessionFixture } from 'termagent/dist/src/core/types.js';
const options: InspectOptions = { fixturePath: 'fixture.json', outputDir: 'out', summaryOnly: true };
let fixture: SessionFixture;
let result: InspectResult;
void [options, fixture!, result!];
EOF
cat > tsconfig.json <<'EOF'
{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","strict":true,"skipLibCheck":true,"noEmit":true},"include":["consumer.ts"]}
EOF
npx tsc -p tsconfig.json
