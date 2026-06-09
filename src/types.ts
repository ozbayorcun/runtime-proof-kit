export type CheckOptions = {
  url: string;
  command?: string;
  expectText?: string;
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
    screenshot?: string;
    stdout?: string;
    stderr?: string;
  };
  environment: {
    node: string;
    platform: string;
  };
};
