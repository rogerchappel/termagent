# termagent Orchestration

## Goal
Build a local-first CLI that helps humans review terminal-agent work through deterministic fixtures, explicit command review, and proof bundles.

## Execution slices
1. **Scaffold** — initialize the OSS CLI repo and copy the PRD.
2. **Model** — define session, transcript, command review, and workspace check types.
3. **Inspect command** — load a fixture, run checks, and emit structured results.
4. **Proof export** — write summary and markdown artifacts for human review.
5. **Quality gates** — tests, smoke script, validate script, and README/examples.
6. **Release prep** — git history, GitHub metadata, branch protection.

## Safety invariants
- No hidden network calls.
- High-risk commands must show explicit approval state.
- Fixture runs are deterministic and path-scoped.
