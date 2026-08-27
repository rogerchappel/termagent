import path from 'node:path';
import { fileExists, isDirectory, listRelativeFiles } from '../lib/fs.js';
import type { SessionFixture, WorkspaceCheck } from './types.js';

function hasLinkedReviewEvidence(fixture: SessionFixture, reviewId: string, approvalStatus: string): boolean {
  return fixture.transcript.some((entry) =>
    entry.meta?.commandReviewId === reviewId && entry.meta.approvalStatus === approvalStatus
  );
}

export async function runWorkspaceChecks(fixtureDir: string, fixture: SessionFixture): Promise<WorkspaceCheck[]> {
  const workspaceRoot = path.resolve(fixtureDir, fixture.workspaceRoot);
  const checks: WorkspaceCheck[] = [];

  const workspaceExists = await fileExists(workspaceRoot);
  checks.push({
    name: 'workspace-root-exists',
    passed: workspaceExists,
    detail: workspaceExists ? `Found workspace root at ${workspaceRoot}` : `Missing workspace root at ${workspaceRoot}`
  });

  if (!workspaceExists) {
    return checks;
  }

  const workspaceIsDirectory = await isDirectory(workspaceRoot);
  checks.push({
    name: 'workspace-root-is-directory',
    passed: workspaceIsDirectory,
    detail: workspaceIsDirectory
      ? `Workspace root is a directory: ${workspaceRoot}`
      : `Workspace root is not a directory: ${workspaceRoot}`
  });

  if (!workspaceIsDirectory) {
    return checks;
  }

  const actualFiles = await listRelativeFiles(workspaceRoot);
  for (const expectedPath of fixture.expectedPaths) {
    const passed = actualFiles.includes(expectedPath);
    checks.push({
      name: `expected-path:${expectedPath}`,
      passed,
      detail: passed ? `Found ${expectedPath}` : `Missing ${expectedPath}`
    });
  }

  const highRiskPending = fixture.commandReviews.filter((review) => review.risk === 'high' && review.approvalStatus !== 'approved');
  checks.push({
    name: 'high-risk-commands-reviewed',
    passed: highRiskPending.length === 0,
    detail: highRiskPending.length === 0
      ? 'All high-risk commands were explicitly approved.'
      : `${highRiskPending.length} high-risk command(s) are still pending or rejected.`
  });

  const requiredApprovalPending = fixture.commandReviews.filter((review) =>
    (review.requiresApproval || review.risk === 'high') && review.approvalStatus !== 'approved'
  );
  checks.push({
    name: 'required-commands-approved',
    passed: requiredApprovalPending.length === 0,
    detail: requiredApprovalPending.length === 0
      ? 'Every approval-required command was explicitly approved.'
      : `${requiredApprovalPending.length} approval-required command(s) are still pending or rejected (${requiredApprovalPending.map((review) => `${review.id}: ${review.approvalStatus}`).join(', ')}).`
  });

  const inconsistentApprovals = fixture.commandReviews.filter((review) => !review.requiresApproval && review.approvalStatus !== 'pending');
  checks.push({
    name: 'approval-metadata-consistent',
    passed: inconsistentApprovals.length === 0,
    detail: inconsistentApprovals.length === 0
      ? 'Approval metadata is internally consistent.'
      : `${inconsistentApprovals.length} command(s) do not require approval but record an approval decision (${inconsistentApprovals.map((r) => `${r.id}: ${r.approvalStatus}`).join(', ')}).`
  });

  const transcriptHasEvidence = fixture.commandReviews.every((review) => {
    if (review.risk !== 'high' && !review.requiresApproval) {
      return true;
    }
    return hasLinkedReviewEvidence(fixture, review.id, review.approvalStatus);
  });
  checks.push({
    name: 'transcript-captures-review-state',
    passed: transcriptHasEvidence,
    detail: transcriptHasEvidence
      ? 'Transcript includes linked, state-matched evidence for every applicable command review.'
      : 'Transcript is missing linked, state-matched evidence for one or more applicable command reviews.'
  });

  return checks;
}
