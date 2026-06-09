import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { CheckOptions, ProofResult } from "./types.js";

export async function runCheck(options: CheckOptions): Promise<ProofResult> {
  const startedAtDate = new Date();
  const runDir = path.resolve(options.outDir, sanitizeName(options.name));
  await mkdir(runDir, { recursive: true });

  const stdoutPath = path.join(runDir, "stdout.log");
  const stderrPath = path.join(runDir, "stderr.log");
  const screenshotPath = path.join(runDir, "screenshot.png");
  const resultPath = path.join(runDir, "proof.json");

  let child: ChildProcessWithoutNullStreams | undefined;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const checks: ProofResult["checks"] = [];

  try {
    if (options.command) {
      child = spawn(options.command, {
        shell: true,
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
      await page.goto(options.url, { waitUntil: "networkidle", timeout: options.timeoutMs });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      checks.push({
        name: "screenshot",
        status: "passed",
        message: `Captured ${relativeArtifact(screenshotPath, runDir)}`,
      });

      if (options.expectText) {
        const bodyText = await page.locator("body").innerText({ timeout: options.timeoutMs });
        const found = bodyText.includes(options.expectText);
        checks.push({
          name: "expect-text",
          status: found ? "passed" : "failed",
          message: found
            ? `Found expected text: ${options.expectText}`
            : `Did not find expected text: ${options.expectText}`,
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
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  }

  await writeFile(stdoutPath, stdout.join(""), "utf8");
  await writeFile(stderrPath, stderr.join(""), "utf8");

  const finishedAtDate = new Date();
  const result: ProofResult = {
    name: options.name,
    status: checks.every((check) => check.status === "passed") ? "passed" : "failed",
    startedAt: startedAtDate.toISOString(),
    finishedAt: finishedAtDate.toISOString(),
    durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
    url: options.url,
    checks,
    artifacts: {
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
  return result;
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

function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-|-$/g, "") || "runtime-proof";
}

function relativeArtifact(filePath: string, runDir: string): string {
  return path.relative(runDir, filePath);
}

function fileMaybeRelative(filePath: string, runDir: string): string | undefined {
  return relativeArtifact(filePath, runDir);
}
