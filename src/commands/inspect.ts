import { inspectFixture } from '../core/inspect.js';

export async function runInspectCommand(args: string[]): Promise<number> {
  const fixturePath = args[0];
  if (!fixturePath) {
    console.error('Usage: termagent inspect <fixture.json> [--output <dir>] [--summary-only]');
    return 1;
  }

  let outputDir = './out';
  let summaryOnly = false;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--output') {
      outputDir = args[index + 1] ?? outputDir;
      index += 1;
    } else if (arg === '--summary-only') {
      summaryOnly = true;
    }
  }

  const result = await inspectFixture({ fixturePath, outputDir, summaryOnly });
  if (summaryOnly) {
    console.log(JSON.stringify({
      sessionId: result.sessionId,
      objective: result.objective,
      passedChecks: result.checks.filter((check) => check.passed).length,
      failedChecks: result.checks.filter((check) => !check.passed).length
    }, null, 2));
    return result.checks.every((check) => check.passed) ? 0 : 2;
  }

  console.log(JSON.stringify(result, null, 2));
  return result.checks.every((check) => check.passed) ? 0 : 2;
}
