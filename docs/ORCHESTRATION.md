# termagent Orchestration

## Mission
Build a local-first proof tool for terminal-agent sessions: deterministic input, explicit review state, and portable artifacts.

## Factory slices
1. **Product framing** — tighten PRD, README, and scope boundaries.
2. **Fixture model** — define session, transcript, command review, and workspace expectation types.
3. **Inspection engine** — load fixture, run checks, classify failures, and compute exit code.
4. **Artifact export** — emit JSON and markdown outputs for reviewers.
5. **Quality gates** — tests, smoke run, validation script, package dry-run, CI wiring.
6. **Release hygiene** — metadata, security docs, contribution guide, branch protection.

## Safety invariants
- no hidden network access
- no execution of fixture commands
- explicit approval state for high-risk actions
- writes only to caller-selected output directory
- deterministic inspection from local files only

## Review loop
1. Agent or harness records a fixture.
2. Reviewer runs `termagent inspect`.
3. termagent emits pass/fail checks and proof artifacts.
4. Human decides whether the session is safe to trust or continue.
