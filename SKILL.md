# termagent Agent Skill

Use this skill when an agent needs to inspect a terminal-agent session fixture and produce a local proof bundle for human review.

## When To Use

- Before handing off an agent run that included risky shell commands.
- During release readiness when a reviewer needs command decisions, approvals, and expected artifacts in one bundle.
- After an incident or failed run where the transcript and command review state should be summarized.
- When a CI or audit job needs a deterministic pass/fail check over a session fixture.

## Required Inputs

- A local session fixture JSON file.
- A workspace root referenced by the fixture.
- An output directory for generated review artifacts.

## Tools

- Filesystem read access to the fixture and workspace paths.
- Filesystem write access to the selected proof-bundle output directory.
- Shell access for `termagent inspect`.

## Side-Effect Boundaries

- `termagent inspect` does not execute commands from the fixture.
- It writes `summary.json`, `transcript.md`, and `proof-bundle.md` under the output directory.
- It must not repair missing files, approve risky commands, or mutate the captured transcript unless the user explicitly asks for follow-up edits.

## Approval Requirements

- Ask before overwriting an existing proof bundle with unrelated user changes.
- Treat every approval-required command as acceptable only when its status is
  `approved`, regardless of risk; high-risk commands always require approval.
- Ask before moving, redacting, or deleting transcript content.

## Workflow

1. Inspect workspace status and locate the fixture.
2. Run a summary-only check when a terse CI signal is enough:

   ```bash
   termagent inspect ./tests/fixtures/sample-session.json --output ./out --summary-only
   ```

3. Produce a full proof bundle for review:

   ```bash
   termagent inspect ./tests/fixtures/sample-session.json --output ./out
   ```

4. Read `out/summary.json` and `out/proof-bundle.md`.
5. Report failed checks, high-risk commands, missing expected files, and artifact paths.

## Validation

Run these checks after changing fixture inspection or skill guidance:

```bash
npm run check
npm test
npm run build
npm run smoke
npm run package:smoke
```
