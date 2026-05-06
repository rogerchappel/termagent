# termagent PRD

Status: ready
Decision: build

## Summary

termagent is a local-first CLI that inspects terminal-agent session fixtures and emits a reviewable proof bundle. It is for developers who want a tiny, deterministic layer between an agent run and a human sign-off.

## Problem

Terminal agents can modify a workspace quickly, but review quality often collapses into scrolling raw logs and guessing whether risky commands were actually approved. Teams need a lightweight proof artifact that answers:
- what was the session trying to do?
- which risky commands were proposed?
- were they approved, rejected, or still pending?
- did the workspace end up with the expected outputs?

## Users

- solo developers running local agents
- maintainers reviewing agent-assisted changes before merge or release
- incident responders who need a compact session bundle for follow-up

## Goals

- deterministic, local-only inspection of session fixtures
- human-readable proof bundle with enough detail to review quickly
- machine-readable summary for CI or chained tooling
- clear failure signals when approvals or expected outputs are missing

## Non-goals

- live terminal orchestration
- remote agent control
- hidden execution or telemetry
- replacing a full workflow engine in V1

## MVP scope

### CLI
- `termagent inspect <fixture.json> --output <dir> [--summary-only]`

### Inputs
- session metadata
- transcript entries
- command review entries
- expected workspace paths

### Checks
- workspace root exists
- expected files exist
- high-risk commands are explicitly approved
- approval metadata is internally consistent
- reviewed commands have matching transcript evidence

### Outputs
- `summary.json`
- `transcript.md`
- `proof-bundle.md`

## UX principles

- boring and explicit beats magical
- failures should read like a review checklist, not a stack trace
- safe by default, especially around risky commands
- results should work in both terminal and PR/release attachments

## Differentiation

termagent is not trying to be a general agent runner. It focuses on proof, review, and deterministic artifacts. That makes it smaller, easier to trust, and easier to plug into an existing local workflow.

## Verification

- unit tests for inspection and export
- failing fixture coverage for risky/pending cases
- smoke script against real built CLI output
- package dry-run
- CI build/test/check

## Attribution

The original spark came from adjacent experiments including `codex` by Vincent Koc. termagent intentionally avoids name, code, and scope copying; it keeps only the broader inspiration of a terminal-centric agent workflow.
