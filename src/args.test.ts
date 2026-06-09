import { describe, expect, it } from "vitest";
import { isCheckSuiteOptions, parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("parses the check command", async () => {
    await expect(
      parseArgs([
        "check",
        "--url",
        "http://127.0.0.1:3000",
        "--expect-text",
        "Hello",
        "--name",
        "smoke",
        "--viewport",
        "390x844",
      ]),
    ).resolves.toEqual({
      url: "http://127.0.0.1:3000",
      command: undefined,
      expectText: ["Hello"],
      failOnConsoleError: false,
      name: "smoke",
      outDir: "proof",
      timeoutMs: 30000,
      viewport: { width: 390, height: 844 },
    });
  });

  it("supports repeatable expected text checks", async () => {
    await expect(
      parseArgs([
        "check",
        "--url",
        "https://example.com",
        "--expect-text",
        "Example",
        "--expect-text",
        "Domain",
        "--fail-on-console-error",
      ]),
    ).resolves.toMatchObject({
      expectText: ["Example", "Domain"],
      failOnConsoleError: true,
    });
  });

  it("requires a url", async () => {
    await expect(parseArgs(["check"])).rejects.toThrow("Missing required --url");
  });

  it("parses multi-check config files", async () => {
    const options = await parseArgs(["check", "--config", "examples/config/multi-check.config.json"]);

    expect(isCheckSuiteOptions(options)).toBe(true);
    if (!isCheckSuiteOptions(options)) {
      throw new Error("Expected suite options");
    }

    expect(options).toMatchObject({
      name: "multi-smoke",
      command: "node examples/basic/server.mjs",
      outDir: "proof",
      checks: [
        {
          name: "desktop-home",
          url: "http://127.0.0.1:4173",
          expectText: ["Runtime Proof Kit"],
          outDir: "proof/multi-smoke",
          viewport: { width: 1440, height: 900 },
        },
        {
          name: "mobile-home",
          url: "http://127.0.0.1:4173",
          expectText: ["expected text"],
          outDir: "proof/multi-smoke",
          viewport: { width: 390, height: 844 },
        },
      ],
    });
  });
});
