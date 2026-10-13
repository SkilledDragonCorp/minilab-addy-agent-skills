#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { formatGateMarkdown, runLifecycleGate } from "../src/lifecycle-gate/index.ts";

const args = process.argv.slice(2);
let skillPath: string | undefined;
let diffPath: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--skill") skillPath = args[++i];
  else if (args[i] === "--diff") diffPath = args[++i];
}

if (!skillPath || !diffPath) {
  console.error("Usage: bun run scripts/run-lifecycle-gate.ts --skill PATH --diff PATH");
  process.exit(1);
}

const skillMarkdown = readFileSync(skillPath, "utf8");
const unifiedDiff = readFileSync(diffPath, "utf8");
const result = runLifecycleGate(skillMarkdown, unifiedDiff);
console.log(formatGateMarkdown(result));
