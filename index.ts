#!/usr/bin/env bun
import { main } from "./src/cli.ts";

const exitCode: number = await main();
process.exit(exitCode);
