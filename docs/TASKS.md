# termagent Tasks

## Foundation
- Scaffold a TypeScript CLI package with docs, tests, validation, and release metadata.
- Define a fixture format for sessions, command reviews, transcripts, and expected workspace outputs.

## MVP
- Implement `termagent inspect <fixture.json> --output <dir>`.
- Run workspace checks for expected files and high-risk approvals.
- Export `summary.json`, `transcript.md`, and `proof-bundle.md`.

## Quality
- Add unit coverage for inspect/export flow.
- Add fixture-backed CLI smoke tests.
- Keep the project local-first with no hidden network behavior.
