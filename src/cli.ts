#!/usr/bin/env node
import { parseArgs, usage, UsageError } from "./args.js";
import { runCheck } from "./check.js";

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await runCheck(options);
    const icon = result.status === "passed" ? "PASS" : "FAIL";
    console.log(`${icon} ${result.name}`);
    console.log(`Proof: ${options.outDir}/${result.name}/proof.json`);
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
