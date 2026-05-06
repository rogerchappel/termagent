import path from 'node:path';
import { fileExists, listRelativeFiles } from '../lib/fs.js';
import type { SessionFixture, WorkspaceCheck } from './types.js';

function includesApprovalEvidence(text: string): boolean {
  return /approv(ed|al)|reject(ed)?|pending review|held for approval/i.test(text);
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

  const inconsistentApprovals = fixture.commandReviews.filter((review) => !review.requiresApproval && review.approvalStatus !== 'approved');
  checks.push({
    name: 'approval-metadata-consistent',
    passed: inconsistentApprovals.length === 0,
    detail: inconsistentApprovals.length === 0
      ? 'Approval metadata is internally consistent.'
      : `${inconsistentApprovals.length} command(s) do not require approval but were marked ${inconsistentApprovals.map((r) => r.approvalStatus).join(', ')}.`
  });

  const transcriptHasEvidence = fixture.commandReviews.every((review) => {
    if (review.risk !== 'high' && !review.requiresApproval) {
      return true;
    }
    return fixture.transcript.some((entry) => includesApprovalEvidence(entry.text));
  });
  checks.push({
    name: 'transcript-captures-review-state',
    passed: transcriptHasEvidence,
    detail: transcriptHasEvidence
      ? 'Transcript includes approval/review evidence for risky commands.'
      : 'Transcript is missing approval/review evidence for one or more risky commands.'
  });

  return checks;
}
