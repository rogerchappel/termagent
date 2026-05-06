#!/usr/bin/env node
import { runInspectCommand } from './commands/inspect.js';

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(`termagent

Usage:
  termagent inspect <fixture.json> --output <dir>

Commands:
  inspect   Verify a local terminal-agent fixture, review command safety, and export proof artifacts.`);
    return;
  }

  let exitCode = 0;
  if (command === 'inspect') {
    exitCode = await runInspectCommand(args);
  } else {
    console.error(`Unknown command: ${command}`);
    exitCode = 1;
  }

  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
