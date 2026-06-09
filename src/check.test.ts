import { describe, expect, it } from "vitest";
import { renderSummary } from "./check.js";
import type { ProofResult } from "./types.js";

describe("renderSummary", () => {
  it("renders a PR-ready markdown proof summary", () => {
    const result: ProofResult = {
      name: "basic-smoke",
      status: "passed",
      startedAt: "2026-06-09T03:00:00.000Z",
      finishedAt: "2026-06-09T03:00:01.250Z",
      durationMs: 1250,
      url: "https://example.com",
      checks: [
        {
          name: "url-reachable",
          status: "passed",
          message: "https://example.com responded before timeout",
        },
        {
          name: "expect-text:Example Domain",
          status: "passed",
          message: "Found expected text: Example Domain",
        },
      ],
      artifacts: {
        proof: "proof.json",
        summary: "summary.md",
        screenshot: "screenshot.png",
        stdout: "stdout.log",
        stderr: "stderr.log",
      },
      environment: {
        node: "v22.0.0",
        platform: "darwin",
      },
    };

    expect(renderSummary(result)).toMatchInlineSnapshot(`
      "# Runtime Proof: basic-smoke

      Status: PASSED
      URL: https://example.com
      Duration: 1.25s
      Started: 2026-06-09T03:00:00.000Z
      Finished: 2026-06-09T03:00:01.250Z

      ## Checks

      - PASS url-reachable: https://example.com responded before timeout
      - PASS expect-text:Example Domain: Found expected text: Example Domain

      ## Artifacts

      - proof: \`proof.json\`
      - summary: \`summary.md\`
      - screenshot: \`screenshot.png\`
      - stdout: \`stdout.log\`
      - stderr: \`stderr.log\`

      ## Environment

      - Node: v22.0.0
      - Platform: darwin

      "
    `);
  });
});
