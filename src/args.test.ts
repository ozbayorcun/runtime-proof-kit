import { describe, expect, it } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("parses the check command", () => {
    expect(
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
    ).toEqual({
      url: "http://127.0.0.1:3000",
      command: undefined,
      expectText: "Hello",
      name: "smoke",
      outDir: "proof",
      timeoutMs: 30000,
      viewport: { width: 390, height: 844 },
    });
  });

  it("requires a url", () => {
    expect(() => parseArgs(["check"])).toThrow("Missing required --url");
  });
});
