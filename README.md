# termagent

termagent is a local-first CLI for inspecting terminal-agent session fixtures, highlighting risky command decisions, and exporting proof bundles a human can review quickly.

It has a pretty opinionated personality:
- stay local
- make risky actions obvious
- leave behind artifacts that are easy to audit

## Why this exists

A lot of agent tooling is good at *doing* work and weak at *proving* what happened.
termagent focuses on the review layer:
- deterministic fixture input
- explicit approval state for risky commands
- workspace assertions for expected outputs
- portable proof bundles for handoff, review, or incident follow-up

This project was inspired by adjacent terminal-agent experiments, including the tiny `codex` repo referenced in the PRD, but it is a fresh implementation with a narrower, local-first scope.

## MVP features

- `termagent inspect <fixture.json> --output <dir>`
- workspace checks for:
  - missing expected files
  - high-risk commands without approval
  - commands marked approved even though approval was not required
  - transcript coverage for reviewed commands
- artifact export:
  - `summary.json`
  - `transcript.md`
  - `proof-bundle.md`
- summary-only mode for CI or shell scripting

## Install

### From source

```bash
npm install
npm run build
npm link
```

### Local one-shot use

```bash
npm install
npm run build
node dist/src/index.js inspect ./tests/fixtures/sample-session.json --output ./out
```

## Quickstart

```bash
termagent inspect ./tests/fixtures/sample-session.json --output ./out
```

Example summary-only run:

```bash
termagent inspect ./tests/fixtures/sample-session.json --output ./out --summary-only
```

Expected outputs:
- `summary.json`
- `transcript.md`
- `proof-bundle.md`

## Fixture shape

A fixture captures a session snapshot:

```json
{
  "sessionId": "demo-session-001",
  "workspaceRoot": "./sample-workspace",
  "objective": "Inspect a local repo, review proposed commands, and package proof for human review.",
  "expectedPaths": ["README.md", "logs/run.log"],
  "commandReviews": [
    {
      "id": "cmd-2",
      "command": "rm -rf dist && npm run build",
      "reason": "Clean build output before release prep.",
      "risk": "high",
      "requiresApproval": true,
      "approvalStatus": "approved",
      "addedAt": "2026-05-06T09:03:00.000Z"
    }
  ],
  "transcript": [
    {
      "at": "2026-05-06T09:04:00.000Z",
      "role": "tool",
      "text": "Approval received. Build completed cleanly.",
      "meta": {
        "commandReviewId": "cmd-2",
        "approvalStatus": "approved"
      }
    }
  ]
}
```

Approval metadata follows one invariant: when `requiresApproval` is `false`,
`approvalStatus` must remain `pending` because no approval decision applies. When
`requiresApproval` is `true`, the status may be `pending`, `approved`, or
`rejected`.

Every high-risk or approval-required command review must be linked to transcript
evidence. Add `meta.commandReviewId` with the review's exact `id` and
`meta.approvalStatus` with its current status to an applicable transcript entry.
Evidence is checked per review; an unlinked approval phrase or evidence for a
different command does not satisfy the check.

## Example workflow

1. Capture a local session fixture from your own harness.
2. Run `termagent inspect` to validate the workspace and review state.
3. Share the generated proof bundle with a reviewer before any follow-up release or deployment step.

## Proof bundle contents

The markdown proof bundle includes:
- session metadata
- objective and workspace root
- pass/fail checks with details
- risky command review table
- transcript timeline excerpt
- artifact paths for downstream review

## Safety model

- local-first only
- no hidden network calls
- no telemetry
- fixture reads are path-scoped
- output writes stay inside the directory you choose
- high-risk commands must carry explicit approval state

## Agent Skill

See [SKILL.md](SKILL.md) for when an agent should inspect a session fixture, what output writes require approval, and how to validate proof-bundle evidence.

## CLI

```text
termagent

Usage:
  termagent inspect <fixture.json> [--output <dir>] [--summary-only]
  termagent --help
```

Exit codes:
- `0` all checks passed
- `1` usage or runtime error
- `2` inspection completed but one or more checks failed

`--output` requires a directory value. Unknown options and missing option values are
reported as usage errors without creating output artifacts.

## Development

```bash
npm install
npm run check
npm test
npm run build
npm run smoke
npm run validate
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) and the fuller product docs in [docs/](./docs).

## Security

See [SECURITY.md](./SECURITY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Release readiness

Run the release gate before tagging or publishing:

```sh
npm run release:check
npm pack --dry-run
```

The package smoke check prints the tarball contents so missing runtime files are caught before release.
