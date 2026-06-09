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

export type CheckSuiteOptions = {
  name: string;
  command?: string;
  outDir: string;
  checks: CheckOptions[];
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
    summary: string;
    screenshot?: string;
    console?: string;
    network?: string;
    stdout?: string;
    stderr?: string;
  };
  environment: {
    node: string;
    platform: string;
  };
};

export type ProofSuiteResult = {
  name: string;
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: Array<{
    name: string;
    status: "passed" | "failed";
    url: string;
    artifacts: ProofResult["artifacts"];
  }>;
  artifacts: {
    proof: string;
    summary: string;
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
> & {
  checks?: Array<
    Partial<
      Pick<
        CheckOptions,
        "url" | "command" | "expectText" | "failOnConsoleError" | "name" | "timeoutMs" | "viewport"
      >
    >
  >;
};
