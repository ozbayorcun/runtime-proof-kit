# Runtime Proof For Vite

Use this setup to prove that a Vite app starts, renders expected text, and produces a browser proof bundle for review.

## Initialize

From a Vite project:

```bash
npx --yes runtime-proof-kit init --template vite --expect-text "Dashboard"
```

This writes:

- `runtime-proof.config.json`
- `.github/workflows/runtime-proof.yml`

## Generated Shape

The Vite template uses:

```json
{
  "command": "npm run dev -- --host 127.0.0.1 --port 5173",
  "url": "http://127.0.0.1:5173"
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
  "name": "vite-proof",
  "command": "npm run dev -- --host 127.0.0.1 --port 5173",
  "url": "http://127.0.0.1:5173",
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
