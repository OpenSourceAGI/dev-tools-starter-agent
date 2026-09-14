#!/usr/bin/env node
// Thin wrapper: the implementation is `runCli` in src/cli.ts, which returns an
// exit code instead of calling process.exit so it can be tested directly.
import { runCli } from "../dist/index.js";

process.exitCode = await runCli(process.argv.slice(2));
