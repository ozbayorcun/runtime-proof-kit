# runtime-proof-kit

Collect proof that an app actually runs.

`runtime-proof-kit` is a small CLI for smoke-testing a local app or URL and saving the evidence: reachability, browser screenshot, expected text checks, process logs, and a structured `proof.json` report.

It is built for AI-assisted coding workflows where "I changed the app" is not enough. The repo, PR, or handoff should include a proof bundle.

## What It Produces

```text
proof/
  basic-smoke/
    proof.json
    screenshot.png
    stdout.log
    stderr.log
```

`proof.json` records:

- URL checked
- pass/fail status
- checks performed
- artifact filenames
- duration
- Node/platform metadata

## Install

```bash
npm install
npm run build
```

During local development:

```bash
npm run dev -- check --url https://example.com --expect-text "Example Domain"
```

After publishing or linking:

```bash
runtime-proof check --url https://example.com --expect-text "Example Domain"
```

## Check A Local App

Use `--command` when the proof run should start the app first:

```bash
npm run dev -- check \
  --name basic-smoke \
  --command "node examples/basic/server.mjs" \
  --url http://127.0.0.1:4173 \
  --expect-text "Runtime Proof Kit"
```

Options:

```text
--command <cmd>        Command to start before checking the URL
--expect-text <text>   Text that must appear on the page
--name <name>          Proof run name, default: runtime-proof
--out <dir>            Artifact directory, default: proof
--timeout-ms <ms>      Startup/check timeout, default: 30000
--viewport <WxH>       Browser viewport, default: 1440x900
```

## Why This Exists

AI coding agents can produce a lot of code quickly, but teams still need simple evidence that the app:

- starts cleanly
- serves the intended page
- renders in a browser
- contains the expected user-facing state
- leaves behind artifacts someone else can inspect

This project is intentionally narrower than full end-to-end testing. It is a receipt generator for runtime sanity.

## Roadmap

- Multiple URL checks per run
- Mobile and desktop screenshot sets
- JSON config file support
- Console error and network failure capture
- GitHub Actions summary output
- Video capture for short walkthroughs
- Redaction rules for logs and screenshots

## License

MIT
