import path from 'node:path';
import { loadFixture } from './fixture.js';
import { runWorkspaceChecks } from './checks.js';
import { exportArtifacts } from './export.js';
import type { InspectOptions, InspectResult } from './types.js';

export async function inspectFixture(options: InspectOptions): Promise<InspectResult> {
  const fixturePath = path.resolve(options.fixturePath);
  const fixtureDir = path.dirname(fixturePath);
  const fixture = await loadFixture(fixturePath);
  const checks = await runWorkspaceChecks(fixtureDir, fixture);

  const partial = {
    sessionId: fixture.sessionId,
    workspaceRoot: path.resolve(fixtureDir, fixture.workspaceRoot),
    objective: fixture.objective,
    checks,
    commandReviews: fixture.commandReviews,
    transcriptCount: fixture.transcript.length
  };

  const exportArtifactsResult = await exportArtifacts(path.resolve(options.outputDir), fixture, partial);

  return {
    ...partial,
    exportArtifacts: exportArtifactsResult
  };
}
