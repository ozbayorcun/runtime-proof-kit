# runtime-proof-kit

[![npm version](https://img.shields.io/npm/v/runtime-proof-kit.svg)](https://www.npmjs.com/package/runtime-proof-kit)
[![CI](https://github.com/ozbayorcun/runtime-proof-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/ozbayorcun/runtime-proof-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)
[![Playwright](https://img.shields.io/badge/Playwright-ready-2ead33.svg)](https://playwright.dev/)

Proof bundles for apps that are supposed to run.

`runtime-proof-kit` is a tiny Playwright-powered CLI that opens a URL, checks expected text, captures a screenshot, and writes a structured proof report. It is built for AI-assisted coding, PR handoffs, demos, and lightweight QA where "the code changed" is less useful than "the app started, rendered, and left evidence."

![runtime-proof-kit demo](assets/readme/runtime-proof-demo.gif)

## Get Started

Choose the path that fits your workflow:

| Workflow | Best for | Command |
| --- | --- | --- |
| Try once | Checking any public URL | `npx --yes runtime-proof-kit check --url https://example.com --expect-text "Example Domain"` |
| Add to a project | Repeated local or CI checks | `npm install --save-dev runtime-proof-kit` |
| Use from GitHub | Testing unreleased `main` | `npm exec --yes --package github:ozbayorcun/runtime-proof-kit -- runtime-proof check ...` |

Run a one-off proof from npm:

```bash
npx --yes runtime-proof-kit check \
  --url https://example.com \
  --expect-text "Example Domain"
```

After installing in a project:

```bash
npm install --save-dev runtime-proof-kit
npx runtime-proof check --url https://example.com --expect-text "Example Domain"
```

That creates a proof bundle:

```text
proof/
  runtime-proof/
    proof.json
    summary.md
    screenshot.png
```

## Check A Local App

Start a local app, wait for it to respond, assert page text, and keep screenshots/logs:

```bash
npx runtime-proof check \
  --name basic-smoke \
  --command "npm run dev" \
  --url http://127.0.0.1:3000 \
  --expect-text "Dashboard" \
  --fail-on-console-error
```

For this repository's bundled example:

```bash
npm install
npm run proof:example
```

## Use A Config File

Keep repeatable checks in JSON:

```bash
npx runtime-proof check --config runtime-proof.config.json
```

```json
{
  "name": "basic-smoke",
  "command": "node examples/basic/server.mjs",
  "url": "http://127.0.0.1:4173",
  "expectText": ["Runtime Proof Kit", "expected text"],
  "failOnConsoleError": true,
  "outDir": "proof",
  "timeoutMs": 30000,
  "viewport": {
    "width": 1440,
    "height": 900
  }
}
```

CLI flags override config values.

## CLI Reference

```text
runtime-proof check --url <url> [options]
runtime-proof check --config runtime-proof.config.json

Options:
  --config <path>       JSON config file
  --command <cmd>       Command to start before checking the URL
  --expect-text <text>  Text that must appear on the page; repeatable
  --fail-on-console-error
                        Fail if the page logs a console error
  --name <name>         Proof run name, default: runtime-proof
  --out <dir>           Artifact directory, default: proof
  --timeout-ms <ms>     Startup/check timeout, default: 30000
  --viewport <WxH>      Browser viewport, default: 1440x900
```

## Proof Report

`proof.json` is designed for machines. `summary.md` is designed for PR comments, CI artifacts, and agent handoffs.

![Example proof screenshot](assets/readme/proof-screenshot.png)

Example `summary.md`:

```markdown
# Runtime Proof: basic-smoke

Status: PASSED
URL: http://127.0.0.1:4173
Duration: 1.42s

## Checks

- PASS url-reachable: http://127.0.0.1:4173 responded before timeout
- PASS screenshot: Captured screenshot.png
- PASS expect-text:Runtime Proof Kit: Found expected text: Runtime Proof Kit
```

```json
{
  "name": "basic-smoke",
  "status": "passed",
  "url": "http://127.0.0.1:4173",
  "checks": [
    {
      "name": "url-reachable",
      "status": "passed",
      "message": "http://127.0.0.1:4173 responded before timeout"
    },
    {
      "name": "screenshot",
      "status": "passed",
      "message": "Captured screenshot.png"
    }
  ],
  "artifacts": {
    "proof": "proof.json",
    "summary": "summary.md",
    "screenshot": "screenshot.png",
    "stdout": "stdout.log",
    "stderr": "stderr.log"
  }
}
```

## GitHub Actions

Use `runtime-proof` as a small runtime gate in CI:

```yaml
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npm run check
- run: npx runtime-proof check --config runtime-proof.config.json
```

This repository's CI also uploads the generated `proof/` directory as a workflow artifact.

## Why This Exists

AI coding agents can produce a lot of code quickly, but teams still need simple evidence that the app:

- starts cleanly
- serves the intended page
- renders in a browser
- contains expected user-facing state
- leaves behind artifacts someone else can inspect

This project is intentionally narrower than a full end-to-end test framework. It is a receipt generator for runtime sanity.

## Development

```bash
npm install
npm run check
npm run proof:example
```

Regenerate the README screenshot and GIF:

```bash
npm run assets:readme
```

Proof bundles can include screenshots and logs. Review them before sharing publicly.

## Roadmap

- Multiple URL checks per run
- Mobile and desktop screenshot sets
- Console and network event logs
- Markdown summary output
- Video capture for short walkthroughs
- Redaction rules for logs and screenshots

## License

MIT
