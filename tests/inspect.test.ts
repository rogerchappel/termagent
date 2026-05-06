import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import { inspectFixture } from '../src/core/inspect.js';

const passingFixturePath = path.resolve('tests/fixtures/sample-session.json');
const failingFixturePath = path.resolve('tests/fixtures/failing-session.json');

test('inspectFixture exports summary, transcript, and proof bundle', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'termagent-test-'));
  const result = await inspectFixture({ fixturePath: passingFixturePath, outputDir: tempDir });

  assert.equal(result.sessionId, 'demo-session-001');
  assert.equal(result.checks.every((check) => check.passed), true);

  const summary = JSON.parse(await readFile(result.exportArtifacts.summaryPath, 'utf8')) as { objective: string };
  assert.equal(summary.objective, 'Inspect a local repo, review proposed commands, and package proof for human review.');

  const proofBundle = await readFile(result.exportArtifacts.proofBundlePath, 'utf8');
  assert.match(proofBundle, /termagent proof bundle/);
  assert.match(proofBundle, /high-risk-commands-reviewed/);
  assert.match(proofBundle, /Transcript timeline/);
});

test('inspectFixture reports failing checks for pending high-risk review and missing files', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'termagent-test-fail-'));
  const result = await inspectFixture({ fixturePath: failingFixturePath, outputDir: tempDir });

  assert.equal(result.sessionId, 'demo-session-002');
  assert.equal(result.checks.some((check) => check.name === 'high-risk-commands-reviewed' && !check.passed), true);
  assert.equal(result.checks.some((check) => check.name === 'transcript-captures-review-state' && !check.passed), true);
  assert.equal(result.checks.some((check) => check.name === 'expected-path:missing.txt' && !check.passed), true);
});
