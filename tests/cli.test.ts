import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const cliPath = path.resolve('dist/src/index.js');
const fixturePath = path.resolve('tests/fixtures/sample-session.json');
const failingFixturePath = path.resolve('tests/fixtures/failing-session.json');

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [cliPath, 'inspect', fixturePath, ...args], {
    cwd,
    encoding: 'utf8'
  });
}

test('inspect CLI rejects --output without a value and creates no artifacts', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'termagent-cli-'));
  const result = runCli(['--output'], cwd);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Option --output requires a directory\./);
  assert.match(result.stderr, /Usage: termagent inspect/);
  assert.deepEqual(await readdir(cwd), []);
});

test('inspect CLI rejects an option token as the --output value and creates no artifacts', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'termagent-cli-'));
  const result = runCli(['--output', '--summary-only'], cwd);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Option --output requires a directory\./);
  assert.deepEqual(await readdir(cwd), []);
});

test('inspect CLI rejects unknown options and creates no artifacts', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'termagent-cli-'));
  const result = runCli(['--typo', '--summary-only'], cwd);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option: --typo/);
  assert.deepEqual(await readdir(cwd), []);
});

test('inspect CLI accepts --output with --summary-only', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'termagent-cli-'));
  const outputDir = path.join(cwd, 'proof');
  const result = runCli(['--output', outputDir, '--summary-only'], cwd);

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout) as { sessionId: string; passedChecks: number; failedChecks: number };
  assert.equal(summary.sessionId, 'demo-session-001');
  assert.equal(summary.failedChecks, 0);
  assert.ok(summary.passedChecks > 0);
  assert.deepEqual((await readdir(outputDir)).sort(), ['proof-bundle.md', 'summary.json', 'transcript.md']);
});

test('inspect CLI preserves exit code 2 when integrity checks fail', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'termagent-cli-fail-'));
  const result = spawnSync(process.execPath, [cliPath, 'inspect', failingFixturePath, '--output', path.join(cwd, 'proof'), '--summary-only'], {
    cwd,
    encoding: 'utf8'
  });

  assert.equal(result.status, 2, result.stderr);
  const summary = JSON.parse(result.stdout) as { failedChecks: number };
  assert.ok(summary.failedChecks > 0);
});
