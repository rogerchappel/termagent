import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
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

test('inspect CLI fails pending and rejected required approvals without reporting all checks passed', async () => {
  for (const approvalStatus of ['pending', 'rejected']) {
    const cwd = await mkdtemp(path.join(os.tmpdir(), `termagent-cli-${approvalStatus}-`));
    const localFixturePath = path.join(cwd, 'fixture.json');
    const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as Record<string, any>;
    fixture.workspaceRoot = path.dirname(fixturePath);
    fixture.expectedPaths = [];
    fixture.commandReviews = [{
      id: `medium-${approvalStatus}`, command: 'npm install', reason: 'Install.', risk: 'medium',
      requiresApproval: true, approvalStatus, addedAt: '2026-05-06T09:00:00.000Z'
    }];
    fixture.transcript = [{
      at: '2026-05-06T09:01:00.000Z', role: 'user', text: `Review is ${approvalStatus}.`,
      meta: { commandReviewId: `medium-${approvalStatus}`, approvalStatus }
    }];
    await writeFile(localFixturePath, JSON.stringify(fixture), 'utf8');

    const result = spawnSync(process.execPath, [cliPath, 'inspect', localFixturePath, '--summary-only'], {
      cwd, encoding: 'utf8'
    });
    assert.equal(result.status, 2, result.stderr);
    const summary = JSON.parse(result.stdout) as { passedChecks: number; failedChecks: number };
    assert.ok(summary.failedChecks > 0);
    assert.ok(summary.passedChecks < summary.passedChecks + summary.failedChecks);
  }
});

test('inspect CLI rejects duplicate command review IDs with no artifacts', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'termagent-cli-duplicate-'));
  const localFixturePath = path.join(cwd, 'fixture.json');
  const outputDir = path.join(cwd, 'proof');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as {
    commandReviews: Array<Record<string, unknown>>;
  };
  fixture.commandReviews.push({ ...fixture.commandReviews[0] });
  await writeFile(localFixturePath, JSON.stringify(fixture), 'utf8');

  const result = spawnSync(process.execPath, [cliPath, 'inspect', localFixturePath, '--output', outputDir], {
    cwd,
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /commandReviews\[2\]\.id duplicates commandReviews\[0\]\.id/);
  assert.deepEqual(await readdir(cwd), ['fixture.json']);
});

test('inspect CLI reports a regular-file workspace root as a failed check', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'termagent-cli-file-root-'));
  const localFixturePath = path.join(cwd, 'fixture.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as { workspaceRoot: string };
  fixture.workspaceRoot = './fixture.json';
  await writeFile(localFixturePath, JSON.stringify(fixture), 'utf8');

  const result = spawnSync(process.execPath, [cliPath, 'inspect', localFixturePath], {
    cwd,
    encoding: 'utf8'
  });

  assert.equal(result.status, 2, result.stderr);
  assert.doesNotMatch(result.stderr, /ENOTDIR/);
  const inspection = JSON.parse(result.stdout) as { checks: Array<{ name: string; passed: boolean }> };
  assert.equal(inspection.checks.some((check) => check.name === 'workspace-root-is-directory' && !check.passed), true);
});
