# Runtime Proof For Next.js

Use this setup to prove that a Next.js app starts, renders expected text, and produces a browser proof bundle for review.

## Initialize

From a Next.js project:

```bash
npx --yes runtime-proof-kit init --template next --expect-text "Dashboard"
```

This writes:

- `runtime-proof.config.json`
- `.github/workflows/runtime-proof.yml`

## Generated Shape

The Next.js template uses:

```json
{
  "command": "npm run dev -- --hostname 127.0.0.1 --port 3000",
  "url": "http://127.0.0.1:3000"
}
```

Edit `expectText` to match text that appears on your page.

## Run Locally

```bash
npx runtime-proof check --config runtime-proof.config.json
```

## Recommended Multi-Check Config

```json
{
  "name": "next-proof",
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
    }
  ]
}
```
