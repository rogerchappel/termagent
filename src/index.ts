#!/usr/bin/env node
import { runInspectCommand } from './commands/inspect.js';

function printHelp(): void {
  console.log(`termagent

Usage:
  termagent inspect <fixture.json> [--output <dir>] [--summary-only]
  termagent --help

Commands:
  inspect   Inspect a local terminal-agent fixture, verify review state, and export proof artifacts.`);
}

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  let exitCode = 0;
  if (command === 'inspect') {
    exitCode = await runInspectCommand(args);
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    exitCode = 1;
  }

  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
