import type { CheckOptions } from "./types.js";

export function parseArgs(argv: string[]): CheckOptions {
  const command = argv[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    throw new UsageError();
  }

  if (command !== "check") {
    throw new Error(`Unknown command: ${command}`);
  }

  const values = new Map<string, string>();
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    values.set(key, next);
    index += 1;
  }

  const url = values.get("url");
  if (!url) {
    throw new Error("Missing required --url");
  }

  return {
    url,
    command: values.get("command"),
    expectText: values.get("expect-text"),
    name: values.get("name") ?? "runtime-proof",
    outDir: values.get("out") ?? "proof",
    timeoutMs: numberValue(values.get("timeout-ms"), 30_000, "--timeout-ms"),
    viewport: parseViewport(values.get("viewport") ?? "1440x900"),
  };
}

function numberValue(value: string | undefined, fallback: number, label: string): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`);
  }

  return parsed;
}

function parseViewport(value: string): { width: number; height: number } {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) {
    throw new Error("--viewport must look like 1440x900");
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

export class UsageError extends Error {
  constructor() {
    super("Usage requested");
  }
}

export const usage = `runtime-proof-kit

Usage:
  runtime-proof check --url <url> [options]

Options:
  --command <cmd>        Command to start before checking the URL
  --expect-text <text>   Text that must appear on the page
  --name <name>          Proof run name, default: runtime-proof
  --out <dir>            Artifact directory, default: proof
  --timeout-ms <ms>      Startup/check timeout, default: 30000
  --viewport <WxH>       Browser viewport, default: 1440x900
`;
