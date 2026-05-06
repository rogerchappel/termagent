# Contributing

Thanks for helping sharpen termagent.

## Ground rules

- Keep the project local-first.
- Do not add telemetry or hidden network behavior.
- Prefer small, reviewable pull requests.
- Preserve explicit safety language around risky commands.

## Development

```bash
npm install
npm run check
npm test
npm run build
npm run smoke
npm run validate
```

## What good contributions look like

- clearer proof-bundle output
- stronger fixture validation
- better failing test coverage
- more useful reviewer ergonomics without extra magic

## Before opening a PR

- add or update tests
- run the full validation script
- update docs if user-visible behavior changed

## Code style

- TypeScript, ES modules
- keep functions small and explicit
- optimize for readability over cleverness
