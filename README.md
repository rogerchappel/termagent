# termagent

termagent is a local-first terminal-agent harness for reproducible tasks, command-review checkpoints, transcript export, and proof bundles.

It has a simple personality: do the work locally, show the risky bits plainly, and leave behind artifacts a human can inspect without guesswork.

## Why it exists

When an agent touches a workspace, the hard part is not just execution — it is proving what happened, what was reviewed, and whether the workspace is still in a sane state.

termagent keeps V1 intentionally small:
- fixture-backed session inspection
- explicit high-risk command review state
- workspace checks for expected outputs
- proof bundle export for review or handoff

## Install

```bash
npm install
npm run build
npm link
```

## Quickstart

```bash
termagent inspect ./tests/fixtures/sample-session.json --output ./out
```

Outputs:
- `summary.json`
- `transcript.md`
- `proof-bundle.md`

## Safety

- local-first only
- no hidden network calls
- high-risk commands must carry approval status in the fixture
- output stays inside the directory you choose

## Example workflow

1. Capture a session fixture from your own harness.
2. Run `termagent inspect` against it.
3. Hand the generated proof bundle to a reviewer before any risky follow-up.

## Commands

- `termagent inspect <fixture.json> --output <dir>`

## Development

```bash
npm install
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Contributing

Small, sharp improvements are best: better checks, clearer artifact formats, richer transcript export, and stronger fixture ergonomics.

## Inspiration

This project was inspired by adjacent terminal-agent experiments, including the tiny `codex` repo mentioned in the PRD, but it is intentionally rebuilt as a fresh, local-first tool with different scope and implementation.
