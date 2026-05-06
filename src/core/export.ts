import path from 'node:path';
import { ensureDir, writeTextFile } from '../lib/fs.js';
import type { InspectResult, SessionFixture } from './types.js';

function toMarkdown(result: InspectResult): string {
  const checks = result.checks.map((check) => `- [${check.passed ? 'x' : ' '}] ${check.name}: ${check.detail}`).join('\n');
  const commands = result.commandReviews.map((review) => `- ${review.command} — ${review.risk} risk, ${review.approvalStatus}`).join('\n');
  return [
    `# termagent proof bundle`,
    '',
    `- Session: ${result.sessionId}`,
    `- Workspace: ${result.workspaceRoot}`,
    `- Objective: ${result.objective}`,
    `- Transcript entries: ${result.transcriptCount}`,
    '',
    '## Workspace checks',
    checks,
    '',
    '## Command review',
    commands
  ].join('\n');
}

function transcriptToMarkdown(fixture: SessionFixture): string {
  return fixture.transcript.map((entry) => {
    const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
    return `- ${entry.at} [${entry.role}] ${entry.text}${meta}`;
  }).join('\n');
}

export async function exportArtifacts(outputDir: string, fixture: SessionFixture, result: Omit<InspectResult, 'exportArtifacts'>) {
  await ensureDir(outputDir);
  const summaryPath = path.join(outputDir, 'summary.json');
  const transcriptPath = path.join(outputDir, 'transcript.md');
  const proofBundlePath = path.join(outputDir, 'proof-bundle.md');

  await writeTextFile(summaryPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeTextFile(transcriptPath, `${transcriptToMarkdown(fixture)}\n`);
  await writeTextFile(proofBundlePath, `${toMarkdown({ ...result, exportArtifacts: { summaryPath, transcriptPath, proofBundlePath } })}\n`);

  return { summaryPath, transcriptPath, proofBundlePath };
}
