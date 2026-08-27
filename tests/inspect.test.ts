import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
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

test('workspace root checks distinguish missing paths, files, and directories', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'termagent-workspace-root-'));
  const fixturePath = path.join(tempDir, 'fixture.json');
  await writeFile(fixturePath, '{}', 'utf8');

  const missingChecks = await runWorkspaceChecks(tempDir, fixtureWithReviews({ workspaceRoot: './missing' }));
  assert.deepEqual(missingChecks, [{
    name: 'workspace-root-exists',
    passed: false,
    detail: `Missing workspace root at ${path.join(tempDir, 'missing')}`
  }]);

  const fileChecks = await runWorkspaceChecks(tempDir, fixtureWithReviews({ workspaceRoot: './fixture.json' }));
  assert.equal(fileChecks.find((check) => check.name === 'workspace-root-exists')?.passed, true);
  assert.deepEqual(fileChecks.find((check) => check.name === 'workspace-root-is-directory'), {
    name: 'workspace-root-is-directory',
    passed: false,
    detail: `Workspace root is not a directory: ${fixturePath}`
  });

  const directoryChecks = await runWorkspaceChecks(tempDir, fixtureWithReviews({ workspaceRoot: '.' }));
  assert.equal(directoryChecks.find((check) => check.name === 'workspace-root-exists')?.passed, true);
  assert.equal(directoryChecks.find((check) => check.name === 'workspace-root-is-directory')?.passed, true);
});

test('inspectFixture rejects malformed nested fixture fields before writing artifacts', async () => {
  const validReview = {
    id: 'cmd-1', command: 'npm test', reason: 'Verify.', risk: 'low', requiresApproval: false,
    approvalStatus: 'pending', addedAt: '2026-05-06T09:00:00.000Z'
  };
  const validTranscript = { at: '2026-05-06T09:01:00.000Z', role: 'tool', text: 'Done.' };
  const cases: Array<[unknown, RegExp]> = [
    [{ expectedPaths: 'README.md' }, /Invalid fixture: expectedPaths must be an array\./],
    [{ expectedPaths: [42] }, /Invalid fixture: expectedPaths\[0\] must be a string\./],
    [{ commandReviews: [{ ...validReview, risk: 'critical' }] }, /Invalid fixture: commandReviews\[0\]\.risk must be one of/],
    [{ transcript: [{ ...validTranscript, meta: { approvalStatus: 'maybe' } }] }, /Invalid fixture: transcript\[0\]\.meta\.approvalStatus must be one of/]
  ];

  for (const [overrides, expectedError] of cases) {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'termagent-invalid-fixture-'));
    const fixturePath = path.join(tempDir, 'fixture.json');
    const outputDir = path.join(tempDir, 'proof');
    const fixture = fixtureWithReviews(overrides as Partial<SessionFixture>);
    await writeFile(fixturePath, JSON.stringify(fixture), 'utf8');

    await assert.rejects(inspectFixture({ fixturePath, outputDir }), expectedError);
    assert.deepEqual(await readdir(tempDir), ['fixture.json']);
  }
});

test('inspectFixture rejects duplicate command review IDs before writing artifacts', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'termagent-duplicate-review-'));
  const fixturePath = path.join(tempDir, 'fixture.json');
  const outputDir = path.join(tempDir, 'proof');
  const review = {
    id: 'cmd-duplicate', command: 'npm publish', reason: 'Release.', risk: 'high' as const,
    requiresApproval: true, approvalStatus: 'approved' as const, addedAt: '2026-05-06T09:00:00.000Z'
  };
  await writeFile(fixturePath, JSON.stringify(fixtureWithReviews({
    commandReviews: [review, { ...review, command: 'npm unpublish' }],
    transcript: [{
      at: '2026-05-06T09:01:00.000Z', role: 'user', text: 'Approved.',
      meta: { commandReviewId: review.id, approvalStatus: review.approvalStatus }
    }]
  })), 'utf8');

  await assert.rejects(
    inspectFixture({ fixturePath, outputDir }),
    /Invalid fixture: commandReviews\[1\]\.id duplicates commandReviews\[0\]\.id \("cmd-duplicate"\)\./
  );
  assert.deepEqual(await readdir(tempDir), ['fixture.json']);
});

test('exports Markdown-safe command rows and indented multiline transcripts', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'termagent-markdown-'));
  const fixturePath = path.join(tempDir, 'fixture.json');
  const outputDir = path.join(tempDir, 'proof');
  const fixture = fixtureWithReviews({
    commandReviews: [{
      id: 'pipe|id', command: 'npm test | tee `result`.log', reason: 'verify | capture\nfor review', risk: 'low',
      requiresApproval: false, approvalStatus: 'pending', addedAt: '2026-05-06T09:00:00.000Z'
    }],
    transcript: [{
      at: '2026-05-06T09:01:00.000Z', role: 'tool', text: 'first line\nsecond line'
    }]
  });
  await writeFile(fixturePath, JSON.stringify(fixture), 'utf8');

  const result = await inspectFixture({ fixturePath, outputDir });
  const proof = await readFile(result.exportArtifacts.proofBundlePath, 'utf8');
  const transcript = await readFile(result.exportArtifacts.transcriptPath, 'utf8');

  assert.match(proof, /\| pipe\\\|id \| npm test \\\| tee \\\`result\\\`\.log \| low \| no \| pending \| verify \\\| capture<br>for review \|/);
  assert.match(proof, /- 2026-05-06T09:01:00\.000Z \[tool\] first line\n  second line/);
  assert.match(transcript, /first line\n  second line/);
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

test('required approvals pass only when approved at every risk level', async () => {
  for (const risk of ['low', 'medium', 'high'] as const) {
    for (const approvalStatus of ['pending', 'rejected', 'approved'] as ApprovalStatus[]) {
      const fixture = fixtureWithReviews({
        commandReviews: [{
          id: `${risk}-${approvalStatus}`, command: 'npm publish', reason: 'Release.', risk,
          requiresApproval: true, approvalStatus, addedAt: '2026-05-06T09:00:00.000Z'
        }],
        transcript: [{
          at: '2026-05-06T09:01:00.000Z', role: 'user', text: `Review is ${approvalStatus}.`,
          meta: { commandReviewId: `${risk}-${approvalStatus}`, approvalStatus }
        }]
      });
      const checks = await runWorkspaceChecks(path.dirname(passingFixturePath), fixture);
      assert.equal(
        checks.find((check) => check.name === 'required-commands-approved')?.passed,
        approvalStatus === 'approved',
        `${risk} ${approvalStatus}`
      );
      assert.equal(
        checks.find((check) => check.name === 'transcript-captures-review-state')?.passed,
        true,
        'linked evidence records state but does not grant approval'
      );
    }
  }
});

test('high-risk commands require approval despite fixture metadata', async () => {
  const fixture = fixtureWithReviews({ commandReviews: [{
    id: 'high-metadata-false', command: 'npm publish', reason: 'Release.', risk: 'high',
    requiresApproval: false, approvalStatus: 'pending', addedAt: '2026-05-06T09:00:00.000Z'
  }] });
  const checks = await runWorkspaceChecks(path.dirname(passingFixturePath), fixture);
  assert.equal(checks.find((check) => check.name === 'required-commands-approved')?.passed, false);
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
