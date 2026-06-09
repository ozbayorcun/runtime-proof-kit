# Contributing

Thanks for helping improve `runtime-proof-kit`.

## Local Setup

```bash
npm install
npm run check
npm run proof:example
```

## Pull Request Bar

Please keep changes focused and include at least one of:

- a unit test for parser or output behavior
- an example command/config
- a real proof artifact from `npm run proof:example`

## Design Principles

- Keep the CLI small and readable.
- Prefer proof artifacts people can inspect over clever assertions.
- Avoid collecting secrets from app logs, screenshots, or environment variables.
- Make the first-run path work on a clean machine.
