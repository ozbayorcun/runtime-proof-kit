import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProofConfig } from "./types.js";

type InitTemplate = "generic" | "next" | "vite";

export type InitOptions = {
  template: InitTemplate;
  configPath: string;
  workflowPath: string;
  includeCi: boolean;
  force: boolean;
  url?: string;
  command?: string;
  expectText: string[];
};

export type InitResult = {
  configPath: string;
  workflowPath?: string;
};

type TemplateDefaults = {
  url: string;
  command: string;
  expectText: string[];
};

const templateDefaults: Record<InitTemplate, TemplateDefaults> = {
  generic: {
    url: "http://127.0.0.1:3000",
    command: "npm run dev",
    expectText: ["TODO: replace with visible page text"],
  },
  next: {
    url: "http://127.0.0.1:3000",
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    expectText: ["TODO: replace with visible page text"],
  },
  vite: {
    url: "http://127.0.0.1:5173",
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    expectText: ["TODO: replace with visible page text"],
  },
};

export function parseInitArgs(argv: string[]): InitOptions {
  const raw: InitOptions = {
    template: "generic",
    configPath: "runtime-proof.config.json",
    workflowPath: ".github/workflows/runtime-proof.yml",
    includeCi: true,
    force: false,
    expectText: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === "force") {
      raw.force = true;
      continue;
    }

    if (key === "no-ci") {
      raw.includeCi = false;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    assignInitValue(raw, key, next);
    index += 1;
  }

  return raw;
}

export async function runInit(options: InitOptions, cwd = process.cwd()): Promise<InitResult> {
  const defaults = templateDefaults[options.template];
  const config: ProofConfig = {
    name: "runtime-proof",
    command: options.command ?? defaults.command,
    url: options.url ?? defaults.url,
    expectText: options.expectText.length > 0 ? options.expectText : defaults.expectText,
    failOnConsoleError: true,
    outDir: "proof",
    timeoutMs: 30000,
    viewport: {
      width: 1440,
      height: 900,
    },
  };

  const configPath = path.resolve(cwd, options.configPath);
  await writeGeneratedFile(configPath, `${JSON.stringify(config, null, 2)}\n`, options.force);

  if (!options.includeCi) {
    return { configPath };
  }

  const workflowPath = path.resolve(cwd, options.workflowPath);
  await writeGeneratedFile(workflowPath, renderGithubWorkflow(options.configPath), options.force);

  return { configPath, workflowPath };
}

function assignInitValue(raw: InitOptions, key: string, value: string): void {
  switch (key) {
    case "template":
      raw.template = parseTemplate(value);
      break;
    case "config":
      raw.configPath = value;
      break;
    case "workflow":
      raw.workflowPath = value;
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
    default:
      throw new Error(`Unknown option: --${key}`);
  }
}

function parseTemplate(value: string): InitTemplate {
  if (value === "generic" || value === "next" || value === "vite") {
    return value;
  }

  throw new Error("--template must be one of: generic, next, vite");
}

async function writeGeneratedFile(filePath: string, contents: string, force: boolean): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, { encoding: "utf8", flag: force ? "w" : "wx" });
}

function renderGithubWorkflow(configPath: string): string {
  return `name: Runtime Proof

on:
  pull_request:
  push:
    branches: [main]

jobs:
  runtime-proof:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx --yes runtime-proof-kit check --config ${configPath}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: runtime-proof
          path: proof/
`;
}
