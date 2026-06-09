import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { CheckOptions, ProofResult } from "./types.js";

export async function runCheck(options: CheckOptions): Promise<ProofResult> {
  const startedAtDate = new Date();
  const runName = sanitizeName(options.name);
  const runDir = path.resolve(options.outDir, runName);
  await mkdir(runDir, { recursive: true });

  const stdoutPath = path.join(runDir, "stdout.log");
  const stderrPath = path.join(runDir, "stderr.log");
  const screenshotPath = path.join(runDir, "screenshot.png");
  const resultPath = path.join(runDir, "proof.json");
  const summaryPath = path.join(runDir, "summary.md");

  let child: ChildProcessWithoutNullStreams | undefined;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const consoleErrors: string[] = [];
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
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
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
