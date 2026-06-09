import { readFile } from "node:fs/promises";
import type { CheckOptions, ProofConfig } from "./types.js";

type RawArgs = {
  config?: string;
  url?: string;
  command?: string;
  expectText: string[];
  failOnConsoleError?: boolean;
  name?: string;
  outDir?: string;
  timeoutMs?: number;
  viewport?: {
    width: number;
    height: number;
  };
};

export async function parseArgs(argv: string[]): Promise<CheckOptions> {
  const command = argv[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    throw new UsageError();
  }

  if (command !== "check") {
    throw new Error(`Unknown command: ${command}`);
  }

  const raw: RawArgs = { expectText: [] };
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === "fail-on-console-error") {
      raw.failOnConsoleError = true;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    assignValue(raw, key, next);
    index += 1;
  }

  const config = raw.config ? await readConfig(raw.config) : {};
  const merged = mergeConfig(config, raw);
  const url = merged.url;
  if (!url) {
    throw new Error("Missing required --url or config url");
  }

  validateUrl(url);

  return {
    url,
    command: merged.command,
    expectText: merged.expectText ?? [],
    failOnConsoleError: merged.failOnConsoleError ?? false,
    name: merged.name ?? "runtime-proof",
    outDir: merged.outDir ?? "proof",
    timeoutMs: merged.timeoutMs ?? 30_000,
    viewport: merged.viewport ?? parseViewport("1440x900"),
  };
}

function assignValue(raw: RawArgs, key: string, value: string): void {
  switch (key) {
    case "config":
      raw.config = value;
      break;
    case "url":
      raw.url = value;
      break;
    case "command":
      raw.command = value;
      break;
    case "expect-text":
      raw.expectText.push(value);
      break;
    case "name":
      raw.name = value;
      break;
    case "out":
      raw.outDir = value;
      break;
    case "timeout-ms":
      raw.timeoutMs = numberValue(value, "--timeout-ms");
      break;
    case "viewport":
      raw.viewport = parseViewport(value);
      break;
    default:
      throw new Error(`Unknown option: --${key}`);
  }
}

function numberValue(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`);
  }

  return parsed;
}

async function readConfig(filePath: string): Promise<ProofConfig> {
  const raw = await readFile(filePath, "utf8");
  const config = JSON.parse(raw) as ProofConfig;
  if (config.expectText && !Array.isArray(config.expectText)) {
    throw new Error("Config expectText must be an array of strings");
  }
  return config;
}

function mergeConfig(config: ProofConfig, raw: RawArgs): ProofConfig {
  return {
    ...config,
    url: raw.url ?? config.url,
    command: raw.command ?? config.command,
    expectText: raw.expectText.length > 0 ? raw.expectText : config.expectText,
    failOnConsoleError: raw.failOnConsoleError ?? config.failOnConsoleError,
    name: raw.name ?? config.name,
    outDir: raw.outDir ?? config.outDir,
    timeoutMs: raw.timeoutMs ?? config.timeoutMs,
    viewport: raw.viewport ?? config.viewport,
  };
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

function validateUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error("--url must be a valid http(s) URL");
  }
}

export class UsageError extends Error {
  constructor() {
    super("Usage requested");
  }
}

export const usage = `runtime-proof-kit

Usage:
  runtime-proof check --url <url> [options]
  runtime-proof check --config runtime-proof.config.json

Options:
  --config <path>       JSON config file
  --command <cmd>        Command to start before checking the URL
  --expect-text <text>   Text that must appear on the page; repeatable
  --fail-on-console-error
                         Fail if the page logs a console error
  --name <name>          Proof run name, default: runtime-proof
  --out <dir>            Artifact directory, default: proof
  --timeout-ms <ms>      Startup/check timeout, default: 30000
  --viewport <WxH>       Browser viewport, default: 1440x900
`;
