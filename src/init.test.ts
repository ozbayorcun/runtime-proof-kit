import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseInitArgs, runInit } from "./init.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("parseInitArgs", () => {
  it("parses init options", () => {
    expect(
      parseInitArgs([
        "--template",
        "vite",
        "--url",
        "http://127.0.0.1:5173",
        "--expect-text",
        "Hello",
        "--expect-text",
        "World",
        "--no-ci",
        "--force",
      ]),
    ).toMatchObject({
      template: "vite",
      url: "http://127.0.0.1:5173",
      expectText: ["Hello", "World"],
      includeCi: false,
      force: true,
    });
  });
});

describe("runInit", () => {
  it("writes a config and GitHub Actions workflow", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "runtime-proof-init-"));
    tempDirs.push(cwd);

    const result = await runInit(parseInitArgs(["--template", "next"]), cwd);
    const config = JSON.parse(await readFile(result.configPath, "utf8")) as {
      command: string;
      url: string;
      expectText: string[];
    };
    const workflow = await readFile(result.workflowPath ?? "", "utf8");

    expect(config).toMatchObject({
      command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
      url: "http://127.0.0.1:3000",
      expectText: ["TODO: replace with visible page text"],
    });
    expect(workflow).toContain("npx --yes runtime-proof-kit check --config runtime-proof.config.json");
  });
});
