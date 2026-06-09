import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { CheckOptions, CheckSuiteOptions, ProofResult, ProofSuiteResult } from "./types.js";

export async function runCheck(options: CheckOptions): Promise<ProofResult> {
  const startedAtDate = new Date();
  const runName = sanitizeName(options.name);
  const runDir = path.resolve(options.outDir, runName);
  await mkdir(runDir, { recursive: true });

  const stdoutPath = path.join(runDir, "stdout.log");
  const stderrPath = path.join(runDir, "stderr.log");
  const screenshotPath = path.join(runDir, "screenshot.png");
  const consolePath = path.join(runDir, "console.ndjson");
  const networkPath = path.join(runDir, "network.ndjson");
  const resultPath = path.join(runDir, "proof.json");
  const summaryPath = path.join(runDir, "summary.md");

  let child: ChildProcessWithoutNullStreams | undefined;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const consoleEvents: BrowserConsoleEvent[] = [];
  const consoleErrors: string[] = [];
  const networkEvents: BrowserNetworkEvent[] = [];
  const checks: ProofResult["checks"] = [];

  try {
    if (options.command) {
      child = spawn(options.command, {
        shell: true,
        detached: process.platform !== "win32",
        stdio: "pipe",
        env: process.env,
      });

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk.toString()));
    }

    await waitForUrl(options.url, options.timeoutMs);
    checks.push({
      name: "url-reachable",
      status: "passed",
      message: `${options.url} responded before timeout`,
    });

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: options.viewport });
      page.on("console", (message) => {
        consoleEvents.push({
          timestamp: new Date().toISOString(),
          type: message.type(),
          text: message.text(),
          location: message.location(),
        });
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        consoleEvents.push({
          timestamp: new Date().toISOString(),
          type: "pageerror",
          text: error.message,
        });
        consoleErrors.push(error.message);
      });
      page.on("request", (request) => {
        networkEvents.push({
          timestamp: new Date().toISOString(),
          event: "request",
          method: request.method(),
          url: request.url(),
          resourceType: request.resourceType(),
        });
      });
      page.on("response", (response) => {
        networkEvents.push({
          timestamp: new Date().toISOString(),
          event: "response",
          method: response.request().method(),
          url: response.url(),
          resourceType: response.request().resourceType(),
          status: response.status(),
          statusText: response.statusText(),
        });
      });
      page.on("requestfailed", (request) => {
        networkEvents.push({
          timestamp: new Date().toISOString(),
          event: "requestfailed",
          method: request.method(),
          url: request.url(),
          resourceType: request.resourceType(),
          failureText: request.failure()?.errorText,
        });
      });
      await page.goto(options.url, { waitUntil: "networkidle", timeout: options.timeoutMs });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      checks.push({
        name: "screenshot",
        status: "passed",
        message: `Captured ${relativeArtifact(screenshotPath, runDir)}`,
      });

      for (const expectedText of options.expectText) {
        const bodyText = await page.locator("body").innerText({ timeout: options.timeoutMs });
        const found = bodyText.includes(expectedText);
        checks.push({
          name: `expect-text:${expectedText}`,
          status: found ? "passed" : "failed",
          message: found
            ? `Found expected text: ${expectedText}`
            : `Did not find expected text: ${expectedText}`,
        });
      }

      if (options.failOnConsoleError) {
        checks.push({
          name: "console-errors",
          status: consoleErrors.length === 0 ? "passed" : "failed",
          message:
            consoleErrors.length === 0
              ? "No browser console errors observed"
              : `Observed ${consoleErrors.length} browser console error(s)`,
        });
      }

      checks.push({
        name: "browser-event-logs",
        status: "passed",
        message: `Captured ${consoleEvents.length} console event(s) and ${networkEvents.length} network event(s)`,
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    checks.push({
      name: "runtime-proof",
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (child) {
      await terminateChild(child);
    }
  }

  await writeFile(stdoutPath, stdout.join(""), "utf8");
  await writeFile(stderrPath, stderr.join(""), "utf8");
  await writeJsonLines(consolePath, consoleEvents);
  await writeJsonLines(networkPath, networkEvents);

  const finishedAtDate = new Date();
  const result: ProofResult = {
    name: runName,
    status: checks.every((check) => check.status === "passed") ? "passed" : "failed",
    startedAt: startedAtDate.toISOString(),
    finishedAt: finishedAtDate.toISOString(),
    durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
    url: options.url,
    checks,
    artifacts: {
      proof: relativeArtifact(resultPath, runDir),
      summary: relativeArtifact(summaryPath, runDir),
      screenshot: fileMaybeRelative(screenshotPath, runDir),
      console: relativeArtifact(consolePath, runDir),
      network: relativeArtifact(networkPath, runDir),
      stdout: relativeArtifact(stdoutPath, runDir),
      stderr: relativeArtifact(stderrPath, runDir),
    },
    environment: {
      node: process.version,
      platform: process.platform,
    },
  };

  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(summaryPath, renderSummary(result), "utf8");
  return result;
}

type BrowserConsoleEvent = {
  timestamp: string;
  type: string;
  text: string;
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
};

type BrowserNetworkEvent = {
  timestamp: string;
  event: "request" | "response" | "requestfailed";
  method: string;
  url: string;
  resourceType: string;
  status?: number;
  statusText?: string;
  failureText?: string;
};

async function writeJsonLines(filePath: string, events: Array<BrowserConsoleEvent | BrowserNetworkEvent>): Promise<void> {
  const contents = events.map((event) => JSON.stringify(event)).join("\n");
  await writeFile(filePath, contents ? `${contents}\n` : "", "utf8");
}

export async function runCheckSuite(options: CheckSuiteOptions): Promise<ProofSuiteResult> {
  const startedAtDate = new Date();
  const suiteName = sanitizeName(options.name);
  const suiteDir = path.resolve(options.outDir, suiteName);
  await mkdir(suiteDir, { recursive: true });

  const stdoutPath = path.join(suiteDir, "stdout.log");
  const stderrPath = path.join(suiteDir, "stderr.log");
  const resultPath = path.join(suiteDir, "proof.json");
  const summaryPath = path.join(suiteDir, "summary.md");

  let child: ChildProcessWithoutNullStreams | undefined;
  const stdout: string[] = [];
  const stderr: string[] = [];

  try {
    if (options.command) {
      child = spawn(options.command, {
        shell: true,
        detached: process.platform !== "win32",
        stdio: "pipe",
        env: process.env,
      });

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk.toString()));
    }

    const results = [];
    for (const check of options.checks) {
      results.push(await runCheck({ ...check, command: check.command }));
    }

    const finishedAtDate = new Date();
    const result: ProofSuiteResult = {
      name: suiteName,
      status: results.every((check) => check.status === "passed") ? "passed" : "failed",
      startedAt: startedAtDate.toISOString(),
      finishedAt: finishedAtDate.toISOString(),
      durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
      results: results.map((check) => ({
        name: check.name,
        status: check.status,
        url: check.url,
        artifacts: prefixArtifacts(check.artifacts, check.name),
      })),
      artifacts: {
        proof: relativeArtifact(resultPath, suiteDir),
        summary: relativeArtifact(summaryPath, suiteDir),
        stdout: relativeArtifact(stdoutPath, suiteDir),
        stderr: relativeArtifact(stderrPath, suiteDir),
      },
      environment: {
        node: process.version,
        platform: process.platform,
      },
    };

    await writeFile(stdoutPath, stdout.join(""), "utf8");
    await writeFile(stderrPath, stderr.join(""), "utf8");
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    await writeFile(summaryPath, renderSuiteSummary(result), "utf8");
    return result;
  } finally {
    if (child) {
      await terminateChild(child);
    }
  }
}

export function renderSummary(result: ProofResult): string {
  const lines = [
    `# Runtime Proof: ${result.name}`,
    "",
    `Status: ${result.status.toUpperCase()}`,
    `URL: ${result.url}`,
    `Duration: ${formatDuration(result.durationMs)}`,
    `Started: ${result.startedAt}`,
    `Finished: ${result.finishedAt}`,
    "",
    "## Checks",
    "",
    ...result.checks.flatMap((check) => [
      `- ${check.status === "passed" ? "PASS" : "FAIL"} ${check.name}: ${check.message}`,
    ]),
    "",
    "## Artifacts",
    "",
    ...Object.entries(result.artifacts)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([name, artifact]) => `- ${name}: \`${artifact}\``),
    "",
    "## Environment",
    "",
    `- Node: ${result.environment.node}`,
    `- Platform: ${result.environment.platform}`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export function renderSuiteSummary(result: ProofSuiteResult): string {
  const lines = [
    `# Runtime Proof: ${result.name}`,
    "",
    `Status: ${result.status.toUpperCase()}`,
    `Duration: ${formatDuration(result.durationMs)}`,
    `Started: ${result.startedAt}`,
    `Finished: ${result.finishedAt}`,
    "",
    "## Checks",
    "",
    ...result.results.flatMap((check) => [
      `- ${check.status === "passed" ? "PASS" : "FAIL"} ${check.name}: ${check.url}`,
      ...Object.entries(check.artifacts)
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([name, artifact]) => `  - ${name}: \`${artifact}\``),
    ]),
    "",
    "## Artifacts",
    "",
    ...Object.entries(result.artifacts)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([name, artifact]) => `- ${name}: \`${artifact}\``),
    "",
    "## Environment",
    "",
    `- Node: ${result.environment.node}`,
    `- Platform: ${result.environment.platform}`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function prefixArtifacts(artifacts: ProofResult["artifacts"], checkName: string): ProofResult["artifacts"] {
  return Object.fromEntries(
    Object.entries(artifacts)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([key, value]) => [key, `${checkName}/${value}`]),
  ) as ProofResult["artifacts"];
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  let lastError = "";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function terminateChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  signalChild(child, "SIGTERM");
  await Promise.race([waitForExit(child), delay(1_000)]);

  if (child.exitCode === null && child.signalCode === null) {
    signalChild(child, "SIGKILL");
    await Promise.race([waitForExit(child), delay(1_000)]);
  }
}

function signalChild(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  try {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, signal);
      return;
    }
  } catch {
    // Fall back to signaling the shell process directly.
  }

  child.kill(signal);
}

function waitForExit(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-|-$/g, "") || "runtime-proof";
}

function relativeArtifact(filePath: string, runDir: string): string {
  return path.relative(runDir, filePath);
}

function fileMaybeRelative(filePath: string, runDir: string): string | undefined {
  return relativeArtifact(filePath, runDir);
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}
