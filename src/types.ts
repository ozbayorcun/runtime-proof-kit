export type CheckOptions = {
  url: string;
  command?: string;
  expectText: string[];
  failOnConsoleError: boolean;
  name: string;
  outDir: string;
  timeoutMs: number;
  viewport: {
    width: number;
    height: number;
  };
};

export type ProofResult = {
  name: string;
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  url: string;
  checks: Array<{
    name: string;
    status: "passed" | "failed";
    message: string;
  }>;
  artifacts: {
    proof: string;
    screenshot?: string;
    stdout?: string;
    stderr?: string;
  };
  environment: {
    node: string;
    platform: string;
  };
};

export type ProofConfig = Partial<
  Pick<
    CheckOptions,
    "url" | "command" | "expectText" | "failOnConsoleError" | "name" | "outDir" | "timeoutMs" | "viewport"
  >
>;
