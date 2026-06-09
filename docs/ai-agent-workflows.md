# AI Coding Agent Verification

Use `runtime-proof-kit` when an AI coding agent says a web app works and you want browser-level evidence before you review or merge the change.

Unit tests and type checks are still useful, but they do not prove that the app starts, the route loads, visible text renders, and runtime diagnostics are clean. Runtime proof fills that gap with screenshots, console logs, network logs, `proof.json`, and a PR-ready `summary.md`.

## The Problem

AI-generated code often arrives with confident handoff language:

- "Implemented the dashboard."
- "Fixed the route."
- "The app should run now."
- "Tests passed."

Those claims are not the same as runtime evidence. A reviewer still has to ask:

- Did the dev server start?
- Did the browser reach the route?
- Did the expected UI text render?
- Did the page throw browser console errors?
- Is there a screenshot or log trail I can inspect later?

`runtime-proof-kit` turns that review checklist into one repeatable command.

## The Agent Handoff Pattern

Ask the coding agent to include a runtime proof bundle with every UI or web-app change:

```bash
npx --yes runtime-proof-kit check \
  --command "npm run dev" \
  --url http://127.0.0.1:3000 \
  --expect-text "Dashboard" \
  --fail-on-console-error
```

The agent should attach or reference:

- `proof/<name>/summary.md` for the human-readable receipt.
- `proof/<name>/proof.json` for machine-readable metadata.
- `proof/<name>/screenshot.png` for visual confirmation.
- `proof/<name>/console.ndjson` for console messages and page errors.
- `proof/<name>/network.ndjson` for browser requests, responses, and failed requests.

## Multi-Route Proof For Bigger Changes

For pull requests that touch more than one route or viewport, use a config file with `checks`.

```json
{
  "name": "agent-pr-proof",
  "command": "npm run dev",
  "url": "http://127.0.0.1:3000",
  "failOnConsoleError": true,
  "checks": [
    {
      "name": "desktop-dashboard",
      "expectText": ["Dashboard"],
      "viewport": { "width": 1440, "height": 900 }
    },
    {
      "name": "mobile-dashboard",
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

Run it with:

```bash
npx runtime-proof check --config runtime-proof.config.json
```

That produces one aggregate proof suite plus one proof bundle per check.

## Suggested PR Language

Add this to your agent instructions or pull request template:

```md
Before marking a web-app change complete, run runtime proof.

Required handoff:
- Command used
- `proof/<name>/summary.md`
- Screenshot path
- Console/network log paths
- Any failing assertion or runtime error
```

## When To Use It

Runtime proof is especially useful for:

- AI coding agent verification.
- Agentic coding review workflows.
- Vibe coding sessions that still need evidence.
- PR smoke tests before human review.
- Lightweight QA for small web apps.
- CI checks that should preserve screenshots and logs.

It is not a replacement for full end-to-end test suites. It is the fast receipt that proves the app starts, renders, and leaves inspectable evidence.
