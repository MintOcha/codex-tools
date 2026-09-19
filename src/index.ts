#!/usr/bin/env node

import { loginWithDeviceAuth } from "./auth.js";
import { runServer } from "./server.js";

async function main() {
  const arg = process.argv[2];

  if (arg === "login") {
    try {
      await loginWithDeviceAuth();
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\x1b[31mError:\x1b[0m ${msg}`);
      process.exit(1);
    }
  }

  if (arg === "--help" || arg === "-h") {
    console.log(`
@mintocha/codex-tools - Model Context Protocol (MCP) server for live web search and alpha tools via reversed Codex backend

Usage:
  npx @mintocha/codex-tools           Start the MCP server over stdio
  npx @mintocha/codex-tools login     Interactive device-code login (saves to ~/.codex/auth.json)
  npx @mintocha/codex-tools --help    Show this help message
Authentication:
  - Auto-detected from ~/.codex/auth.json (supports auto-refresh)
  - Or via CODEX_API_KEY / OPENAI_API_KEY environment variables
  - Optional custom endpoint: CODEX_BASE_URL (defaults to https://litellm.v-rail.org/v1)

Tools provided:
  - web-search      Live web search with citations and sources
  - fetch           Extract clean, readable page content
  - open-page       Open URL and position viewport
  - click-link      Click reference links
  - find-in-page    Text pattern search in pages
  - screenshot-pdf  PDF page screenshots
  - image-search    Image search engine queries
  - finance         Real-time stock, crypto, and market quotes
  - weather         Weather forecasts by location
  - sports          Sports schedules and league standings
  - world-time      Accurate time for any UTC offset
`);
    process.exit(0);
  }

  try {
    await runServer();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[codex-tools] Fatal error: ${msg}\n`);
    process.exit(1);
  }
}

main();
