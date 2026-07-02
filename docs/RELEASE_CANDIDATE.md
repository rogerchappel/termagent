# Release Candidate Notes

## Scope

This release candidate packages `termagent` as an agent-run proof-bundle skill with explicit side-effect and approval boundaries.

## Included

- Agent skill instructions in `SKILL.md`.
- Existing terminal-session fixture inspection CLI.
- Proof bundle output for reviewer handoff.
- Local validation, smoke, and package checks.

## Verification

Run before requesting review:

```bash
npm run check
npm test
npm run build
npm run smoke
npm run package:smoke
```

## Classification

`ship` once the release-candidate PR is green and the package tarball includes `SKILL.md`.

