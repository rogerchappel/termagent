import path from 'node:path';
import { fileExists, listRelativeFiles } from '../lib/fs.js';
import type { SessionFixture, WorkspaceCheck } from './types.js';

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

  return checks;
}
