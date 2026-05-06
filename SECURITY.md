# Security Policy

## Scope

termagent is a local-first inspection tool. It should not make network calls, execute fixture commands, or collect telemetry.

## Supported versions

Only the latest release on `main` is supported.

## Reporting a vulnerability

Open a private security advisory or email the maintainer through the address listed on GitHub if a private path is preferred.

Please report issues such as:
- unintended command execution
- path traversal or unsafe output writes
- accidental network access or telemetry
- proof bundle data leaks beyond the inspected fixture/workspace

## Security expectations

- risky commands remain data, not executable instructions
- output paths are caller-controlled and explicit
- inspection results should be deterministic from local inputs
