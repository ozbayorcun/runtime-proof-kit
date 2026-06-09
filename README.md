# runtime-proof-kit

Proof bundles for apps that are supposed to run.

`runtime-proof-kit` is a tiny CLI that checks a URL, optionally starts a local app first, opens the page in Playwright, asserts expected text, captures a screenshot, and writes a structured proof report.

It is built for AI-assisted coding, PR handoffs, demos, and lightweight QA where "the code changed" is less useful than "the app started, rendered, and left evidence."

## Quick Start

```bash
npm install
npm run proof:example
```

That starts the bundled example app and writes:

```text
proof/
  basic-smoke/
    proof.json
    screenshot.png
    stdout.log
    stderr.log
```

## Use It Directly

Check any reachable URL:

```bash
npm run dev -- check \
  --url https://example.com \
  --expect-text "Example Domain"
```

Start a local app, wait for it, and collect proof:

```bash
npm run dev -- check \
  --name basic-smoke \
  --command "node examples/basic/server.mjs" \
  --url http://127.0.0.1:4173 \
  --expect-text "Runtime Proof Kit" \
  --expect-text "expected text" \
  --fail-on-console-error
```

After publishing or linking the package:

```bash
runtime-proof check --url https://example.com --expect-text "Example Domain"
```

## Use A Config File

```bash
npm run dev -- check --config examples/config/runtime-proof.config.json
```

Example:

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

## CLI Options

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

`proof.json` is designed to be attached to PRs, CI artifacts, or agent handoffs.

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
    "screenshot": "screenshot.png",
    "stdout": "stdout.log",
    "stderr": "stderr.log"
  }
}
```

## GitHub Actions

The included workflow runs:

```bash
npm ci
npx playwright install --with-deps chromium
npm run check
npm run proof:example
```

It uploads the generated `proof/` directory as a workflow artifact.

## Why This Exists

AI coding agents can produce a lot of code quickly, but teams still need simple evidence that the app:

- starts cleanly
- serves the intended page
- renders in a browser
- contains expected user-facing state
- leaves behind artifacts someone else can inspect

This project is intentionally narrower than a full end-to-end test framework. It is a receipt generator for runtime sanity.

## Artifact Safety

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
