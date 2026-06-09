# Playwright Smoke Test CLI vs Runtime Proof

`runtime-proof-kit` uses Playwright, but it is not trying to replace Playwright Test.

Use Playwright Test when you need a full end-to-end test suite. Use `runtime-proof-kit` when you need a fast proof receipt that a web app starts, renders expected text, and leaves screenshots and logs for review.

## Short Version

| Need | Use |
| --- | --- |
| Full browser test suite | Playwright Test |
| Page objects, fixtures, retries, traces | Playwright Test |
| One command that starts an app and captures proof | `runtime-proof-kit` |
| PR-ready markdown summary | `runtime-proof-kit` |
| AI coding agent runtime verification | `runtime-proof-kit` |
| Browser screenshot plus console/network logs | `runtime-proof-kit` |

## Why Not Just Write A Playwright Test?

You should, when the behavior deserves durable test coverage.

But many coding-agent handoffs need something lighter:

- Start the local app.
- Wait for a URL.
- Assert visible text.
- Capture screenshot.
- Capture browser console and network logs.
- Write a markdown receipt a reviewer can scan.

That is what `runtime-proof-kit` optimizes for.

## Example

```bash
npx --yes runtime-proof-kit check \
  --command "npm run dev" \
  --url http://127.0.0.1:3000 \
  --expect-text "Dashboard" \
  --fail-on-console-error
```

Output:

```text
proof/
  runtime-proof/
    proof.json
    summary.md
    screenshot.png
    console.ndjson
    network.ndjson
```

## Where It Fits

`runtime-proof-kit` is best at the boundary between implementation and review:

- A coding agent claims a route works.
- A teammate wants proof before pulling the branch.
- CI should preserve evidence even when the smoke check fails.
- A small app needs confidence without a full E2E suite yet.

Playwright Test is best once you know the behavior is important enough to maintain as a real test suite.

## Use Both

A healthy setup can use both tools:

```bash
npm test
npx runtime-proof check --config runtime-proof.config.json
```

Tests protect expected behavior. Runtime proof makes the handoff inspectable.
