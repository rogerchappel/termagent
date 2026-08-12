import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import { inspectFixture } from '../src/core/inspect.js';
import { runWorkspaceChecks } from '../src/core/checks.js';
import type { ApprovalStatus, SessionFixture } from '../src/core/types.js';

const passingFixturePath = path.resolve('tests/fixtures/sample-session.json');
const failingFixturePath = path.resolve('tests/fixtures/failing-session.json');
const packageSmokeFixturePath = path.resolve('scripts/fixtures/package-smoke-session.json');

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

function fixtureWithReviews(overrides: Partial<SessionFixture> = {}): SessionFixture {
  return {
    sessionId: 'review-regression',
    workspaceRoot: './sample-workspace',
    objective: 'Verify review integrity.',
    expectedPaths: [],
    commandReviews: [],
    transcript: [],
    ...overrides
  };
}

test('approval metadata rejects decisions for commands that require no approval', async () => {
  for (const approvalStatus of ['approved', 'rejected'] as ApprovalStatus[]) {
    const fixture = fixtureWithReviews({ commandReviews: [{
      id: `unnecessary-${approvalStatus}`, command: 'npm test', reason: 'Run tests.', risk: 'low',
      requiresApproval: false, approvalStatus, addedAt: '2026-05-06T09:00:00.000Z'
    }] });
    const checks = await runWorkspaceChecks(path.dirname(passingFixturePath), fixture);
    assert.equal(checks.find((check) => check.name === 'approval-metadata-consistent')?.passed, false);
  }
});

test('approval metadata accepts pending when no approval is required', async () => {
  const fixture = fixtureWithReviews({ commandReviews: [{
    id: 'not-required', command: 'npm test', reason: 'Run tests.', risk: 'low',
    requiresApproval: false, approvalStatus: 'pending', addedAt: '2026-05-06T09:00:00.000Z'
  }] });
  const checks = await runWorkspaceChecks(path.dirname(passingFixturePath), fixture);
  assert.equal(checks.find((check) => check.name === 'approval-metadata-consistent')?.passed, true);
});

test('package smoke fixture preserves consistent approval metadata', async () => {
  const fixture = JSON.parse(await readFile(packageSmokeFixturePath, 'utf8')) as SessionFixture;
  fixture.workspaceRoot = path.relative(path.dirname(packageSmokeFixturePath), path.resolve('tests/fixtures/sample-workspace'));
  fixture.expectedPaths = [];
  const checks = await runWorkspaceChecks(path.dirname(packageSmokeFixturePath), fixture);

  assert.equal(checks.find((check) => check.name === 'approval-metadata-consistent')?.passed, true);
});

test('transcript evidence is linked and state-matched for every applicable review', async () => {
  for (const approvalStatus of ['approved', 'rejected', 'pending'] as ApprovalStatus[]) {
    const reviews = ['cmd-a', 'cmd-b'].map((id) => ({
      id, command: 'npm publish', reason: 'Release.', risk: 'high' as const,
      requiresApproval: true, approvalStatus, addedAt: '2026-05-06T09:00:00.000Z'
    }));
    const fixture = fixtureWithReviews({
      commandReviews: reviews,
      transcript: [{
        at: '2026-05-06T09:01:00.000Z', role: 'user', text: `Review is ${approvalStatus}.`,
        meta: { commandReviewId: 'cmd-a', approvalStatus }
      }]
    });
    const incomplete = await runWorkspaceChecks(path.dirname(passingFixturePath), fixture);
    assert.equal(incomplete.find((check) => check.name === 'transcript-captures-review-state')?.passed, false);

    fixture.transcript.push({
      at: '2026-05-06T09:02:00.000Z', role: 'user', text: `Second review is ${approvalStatus}.`,
      meta: { commandReviewId: 'cmd-b', approvalStatus }
    });
    const complete = await runWorkspaceChecks(path.dirname(passingFixturePath), fixture);
    assert.equal(complete.find((check) => check.name === 'transcript-captures-review-state')?.passed, true);
  }
});
