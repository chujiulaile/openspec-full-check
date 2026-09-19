#!/usr/bin/env node

import { runCli } from "../src/installer.mjs";

runCli(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
