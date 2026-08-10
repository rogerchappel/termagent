import { inspectFixture } from '../core/inspect.js';

const usage = 'Usage: termagent inspect <fixture.json> [--output <dir>] [--summary-only]';

function usageError(message: string): number {
  console.error(`${message}\n${usage}`);
  return 1;
}

export async function runInspectCommand(args: string[]): Promise<number> {
  const fixturePath = args[0];
  if (!fixturePath) {
    return usageError('Missing fixture path.');
  }

  let outputDir = './out';
  let summaryOnly = false;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--output') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        return usageError('Option --output requires a directory.');
      }
      outputDir = value;
      index += 1;
    } else if (arg === '--summary-only') {
      summaryOnly = true;
    } else {
      return usageError(`Unknown option: ${arg}`);
    }
  }

  const result = await inspectFixture({ fixturePath, outputDir, summaryOnly });
  const passedChecks = result.checks.filter((check) => check.passed).length;
  const failedChecks = result.checks.length - passedChecks;

  if (summaryOnly) {
    console.log(JSON.stringify({
      sessionId: result.sessionId,
      objective: result.objective,
      passedChecks,
      failedChecks
    }, null, 2));
    return failedChecks === 0 ? 0 : 2;
  }

  console.log(JSON.stringify(result, null, 2));
  return failedChecks === 0 ? 0 : 2;
}
