# GitHub Actions Runtime Proof

Use `runtime-proof-kit` in GitHub Actions when you want every pull request to produce a browser proof bundle: screenshot, browser console log, network log, `proof.json`, and `summary.md`.

This is useful for AI-generated code, agentic coding workflows, and ordinary web-app smoke tests where reviewers need evidence that the app actually rendered.

## Quick CI Workflow

Create `.github/workflows/runtime-proof.yml`:

```yaml
name: Runtime proof

on:
  pull_request:
  workflow_dispatch:

jobs:
  runtime-proof:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npx playwright install --with-deps chromium

      - run: npx runtime-proof check --config runtime-proof.config.json

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: runtime-proof
          path: proof/
```

## Generate The Files

The initializer can write both a starter config and a GitHub Actions workflow:

```bash
npx --yes runtime-proof-kit init --template next
```

For Vite:

```bash
npx --yes runtime-proof-kit init --template vite
```

Then edit `runtime-proof.config.json` so `expectText` matches text that should be visible in your app.

## Example Config

```json
{
  "name": "pr-smoke",
  "command": "npm run dev -- --hostname 127.0.0.1 --port 3000",
  "url": "http://127.0.0.1:3000",
  "expectText": ["Dashboard"],
  "failOnConsoleError": true,
  "outDir": "proof",
  "timeoutMs": 30000,
  "viewport": {
    "width": 1440,
    "height": 900
  }
}
```

## Multi-Check CI

Use `checks` when CI should prove more than one route, viewport, or page state:

```json
{
  "name": "pr-proof",
  "command": "npm run dev -- --hostname 127.0.0.1 --port 3000",
  "url": "http://127.0.0.1:3000",
  "failOnConsoleError": true,
  "checks": [
    {
      "name": "desktop-home",
      "expectText": ["Dashboard"],
      "viewport": { "width": 1440, "height": 900 }
    },
    {
      "name": "mobile-home",
      "expectText": ["Dashboard"],
      "viewport": { "width": 390, "height": 844 }
    },
    {
      "name": "health",
      "url": "http://127.0.0.1:3000/health",
      "expectText": ["ok"]
    }
  ]
}
```

## Review The Artifact

After the workflow runs, download the `runtime-proof` artifact from GitHub Actions.

The important files are:

- `summary.md`: human-readable PR receipt.
- `proof.json`: machine-readable proof metadata.
- `screenshot.png`: browser screenshot.
- `console.ndjson`: console messages and page errors.
- `network.ndjson`: requests, responses, and failed requests.

For failed runs, upload still happens because the artifact step uses `if: always()`.

## Recommended Agent Instruction

If you use coding agents, add this to your repo instructions:

```md
For web-app changes, run `npx runtime-proof check --config runtime-proof.config.json`
before saying the work is complete. Include the generated `summary.md`
path and mention any browser console or network errors.
```
