import path from 'node:path';
import { ensureDir, writeTextFile } from '../lib/fs.js';
import type { InspectResult, SessionFixture } from './types.js';

function escapeTableCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/`/g, '\\`')
    .replace(/\r?\n/g, '<br>');
}

function listItem(value: string): string {
  return value.replace(/\r?\n/g, '\n  ');
}

function toMarkdown(result: InspectResult, fixture: SessionFixture): string {
  const checks = result.checks.map((check) => `- [${check.passed ? 'x' : ' '}] ${listItem(check.name)}: ${listItem(check.detail)}`).join('\n');
  const commands = result.commandReviews.map((review) => `| ${escapeTableCell(review.id)} | ${escapeTableCell(review.command)} | ${review.risk} | ${review.requiresApproval ? 'yes' : 'no'} | ${review.approvalStatus} | ${escapeTableCell(review.reason)} |`).join('\n');
  const transcript = fixture.transcript.map((entry) => `- ${entry.at} [${entry.role}] ${listItem(entry.text)}`).join('\n');

  return [
    '# termagent proof bundle',
    '',
    '## Session summary',
    `- Session: ${result.sessionId}`,
    `- Workspace: ${result.workspaceRoot}`,
    `- Objective: ${result.objective}`,
    `- Transcript entries: ${result.transcriptCount}`,
    '',
    '## Workspace checks',
    checks,
    '',
    '## Command review',
    '| ID | Command | Risk | Approval required | Status | Reason |',
    '| --- | --- | --- | --- | --- | --- |',
    commands,
    '',
    '## Transcript timeline',
    transcript,
    '',
    '## Artifact paths',
    `- Summary JSON: ${result.exportArtifacts.summaryPath}`,
    `- Transcript Markdown: ${result.exportArtifacts.transcriptPath}`,
    `- Proof bundle Markdown: ${result.exportArtifacts.proofBundlePath}`
  ].join('\n');
}

function transcriptToMarkdown(fixture: SessionFixture): string {
  return fixture.transcript.map((entry) => {
    const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
    return `- ${entry.at} [${entry.role}] ${listItem(entry.text)}${meta}`;
  }).join('\n');
}

export async function exportArtifacts(outputDir: string, fixture: SessionFixture, result: Omit<InspectResult, 'exportArtifacts'>) {
  await ensureDir(outputDir);
  const summaryPath = path.join(outputDir, 'summary.json');
  const transcriptPath = path.join(outputDir, 'transcript.md');
  const proofBundlePath = path.join(outputDir, 'proof-bundle.md');

  const fullResult = { ...result, exportArtifacts: { summaryPath, transcriptPath, proofBundlePath } };
  await writeTextFile(summaryPath, `${JSON.stringify(fullResult, null, 2)}\n`);
  await writeTextFile(transcriptPath, `${transcriptToMarkdown(fixture)}\n`);
  await writeTextFile(proofBundlePath, `${toMarkdown(fullResult, fixture)}\n`);

  return { summaryPath, transcriptPath, proofBundlePath };
}
