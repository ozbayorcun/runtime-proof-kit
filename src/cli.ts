#!/usr/bin/env node
import { isCheckSuiteOptions, parseArgs, usage, UsageError } from "./args.js";
import { runCheck, runCheckSuite } from "./check.js";
import { parseInitArgs, runInit } from "./init.js";

async function main(): Promise<void> {
  try {
    if (process.argv[2] === "init") {
      if (process.argv[3] === "--help" || process.argv[3] === "-h") {
        console.log(usage);
        return;
      }

      const result = await runInit(parseInitArgs(process.argv.slice(3)));
      console.log(`Config: ${result.configPath}`);
      if (result.workflowPath) {
        console.log(`Workflow: ${result.workflowPath}`);
      }
      return;
    }

    const options = await parseArgs(process.argv.slice(2));
    if (isCheckSuiteOptions(options)) {
      const result = await runCheckSuite(options);
      const icon = result.status === "passed" ? "PASS" : "FAIL";
      console.log(`${icon} ${result.name}`);
      console.log(`Proof: ${options.outDir}/${result.name}/${result.artifacts.proof}`);
      console.log(`Summary: ${options.outDir}/${result.name}/${result.artifacts.summary}`);
      process.exitCode = result.status === "passed" ? 0 : 1;
      return;
    }

    const result = await runCheck(options);
    const icon = result.status === "passed" ? "PASS" : "FAIL";
    console.log(`${icon} ${result.name}`);
    console.log(`Proof: ${options.outDir}/${result.name}/${result.artifacts.proof}`);
    console.log(`Summary: ${options.outDir}/${result.name}/${result.artifacts.summary}`);
    process.exitCode = result.status === "passed" ? 0 : 1;
  } catch (error) {
    if (error instanceof UsageError) {
      console.log(usage);
      return;
    }

    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    console.error(usage);
    process.exitCode = 1;
  }
}

await main();
