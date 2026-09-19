#!/usr/bin/env node

import { loginWithDeviceAuth } from "./auth.js";
import { CodexClient } from "./codex-client.js";
import { runServer } from "./server.js";

function printHelp(): void {
  console.log(`
@mintocha/codex-tools - Live web search & alpha browser tools via Codex backend

Usage:
  npx @mintocha/codex-tools [command] [options]

Commands:
  server                                 Start the MCP server over stdio (default)
  login                                  Interactive OAuth device-code login (saves to ~/.codex/auth.json)
  search, web-search <query> [--max <n>] Search live web for queries, news, and citations
  fetch <url> [--line <n>]               Extract clean readable content from a webpage URL
  finance <ticker> [type]                Get financial quotes (type: equity, fund, crypto, index)
  weather <location> [--days <n>]        Get weather forecasts for a city/location
  sports <league> [type] [--team <name>] Sports schedules & standings (e.g. nba, epl, nfl)
  time, world-time <offset>              Lookup time by UTC offset (e.g. "+08:00", "-05:00")
  image-search <query> [--days <n>]      Query images with optional recency filter

Options:
  --json                                 Output results in raw JSON format
  --help, -h                             Show this help message

Authentication:
  - Auto-detected from ~/.codex/auth.json (run 'npx @mintocha/codex-tools login')
  - Or via CODEX_API_KEY / OPENAI_API_KEY environment variables
  - Optional custom gateway endpoint: CODEX_BASE_URL (defaults to https://litellm.v-rail.org/v1)

Examples:
  npx @mintocha/codex-tools search "TypeScript 5.8 features"
  npx @mintocha/codex-tools fetch "https://nodejs.org"
  npx @mintocha/codex-tools finance NVDA
  npx @mintocha/codex-tools weather "Tokyo"
  npx @mintocha/codex-tools sports nba standings
  npx @mintocha/codex-tools time "+08:00"
`);
}

async function handleSearch(args: string[]): Promise<void> {
  const isJson = process.argv.includes("--json");
  const maxIdx = process.argv.indexOf("--max");
  const maxResults = maxIdx !== -1 && process.argv[maxIdx + 1] ? parseInt(process.argv[maxIdx + 1], 10) : 10;
  const queryWords = args.slice(1).filter((a, i, arr) => a !== "--json" && a !== "--max" && (i === 0 || arr[i - 1] !== "--max"));
  const query = queryWords.join(" ").trim();

  if (!query) {
    console.error("\x1b[31mError:\x1b[0m Please provide a search query.\nExample: npx @mintocha/codex-tools search 'TypeScript 5.8'");
    process.exit(1);
  }

  const client = new CodexClient();
  const results = await client.search(query, maxResults);

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log("No results found.");
    return;
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`\x1b[1m${i + 1}. ${r.title}\x1b[0m`);
    console.log(`   \x1b[36m${r.url}\x1b[0m`);
    if (r.snippet) {
      console.log(`   ${r.snippet}`);
    }
    console.log("");
  }
}

async function handleFetch(args: string[]): Promise<void> {
  const lineIdx = process.argv.indexOf("--line");
  const lineno = lineIdx !== -1 && process.argv[lineIdx + 1] ? parseInt(process.argv[lineIdx + 1], 10) : undefined;
  const url = args.slice(1).find((a) => !a.startsWith("-") && a !== process.argv[lineIdx + 1]);

  if (!url) {
    console.error("\x1b[31mError:\x1b[0m Please provide a URL to fetch.\nExample: npx @mintocha/codex-tools fetch https://example.com");
    process.exit(1);
  }

  const client = new CodexClient();
  const content = await client.fetchPage(url, lineno);
  console.log(content);
}

async function handleFinance(args: string[]): Promise<void> {
  const ticker = args[1];
  if (!ticker || ticker.startsWith("-")) {
    console.error("\x1b[31mError:\x1b[0m Please provide a ticker symbol.\nExample: npx @mintocha/codex-tools finance NVDA");
    process.exit(1);
  }

  const assetType = (args[2] && !args[2].startsWith("-") ? args[2] : "equity") as "equity" | "fund" | "crypto" | "index";
  const client = new CodexClient();
  const res = await client.executeCommand("finance", [{ ticker, type: assetType }]);
  console.log(typeof res.output === "string" ? res.output : JSON.stringify(res, null, 2));
}

async function handleWeather(args: string[]): Promise<void> {
  const daysIdx = process.argv.indexOf("--days");
  const duration = daysIdx !== -1 && process.argv[daysIdx + 1] ? parseInt(process.argv[daysIdx + 1], 10) : undefined;
  const locWords = args.slice(1).filter((a, i, arr) => a !== "--days" && (i === 0 || arr[i - 1] !== "--days"));
  const location = locWords.join(" ").trim();

  if (!location) {
    console.error("\x1b[31mError:\x1b[0m Please provide a location.\nExample: npx @mintocha/codex-tools weather 'Tokyo'");
    process.exit(1);
  }

  const client = new CodexClient();
  const payload: Record<string, unknown> = { location };
  if (duration) payload.duration = duration;
  const res = await client.executeCommand("weather", [payload]);
  console.log(typeof res.output === "string" ? res.output : JSON.stringify(res, null, 2));
}

async function handleSports(args: string[]): Promise<void> {
  const league = args[1];
  if (!league || league.startsWith("-")) {
    console.error("\x1b[31mError:\x1b[0m Please provide a league code (e.g. nba, epl, nfl).\nExample: npx @mintocha/codex-tools sports nba");
    process.exit(1);
  }

  const fn = args[2] === "standings" ? "standings" : "schedule";
  const teamIdx = process.argv.indexOf("--team");
  const team = teamIdx !== -1 ? process.argv[teamIdx + 1] : undefined;

  const client = new CodexClient();
  const payload: Record<string, unknown> = { tool: "sports", fn, league };
  if (team) payload.team = team;
  const res = await client.executeCommand("sports", [payload]);
  console.log(typeof res.output === "string" ? res.output : JSON.stringify(res, null, 2));
}

async function handleTime(args: string[]): Promise<void> {
  const offset = args[1];
  if (!offset) {
    console.error("\x1b[31mError:\x1b[0m Please provide a UTC offset string.\nExample: npx @mintocha/codex-tools time '+08:00'");
    process.exit(1);
  }

  const client = new CodexClient();
  const res = await client.executeCommand("time", [{ utc_offset: offset }]);
  console.log(typeof res.output === "string" ? res.output : JSON.stringify(res, null, 2));
}

async function handleImageSearch(args: string[]): Promise<void> {
  const daysIdx = process.argv.indexOf("--days");
  const recency = daysIdx !== -1 && process.argv[daysIdx + 1] ? parseInt(process.argv[daysIdx + 1], 10) : undefined;
  const queryWords = args.slice(1).filter((a, i, arr) => a !== "--json" && a !== "--days" && (i === 0 || arr[i - 1] !== "--days"));
  const query = queryWords.join(" ").trim();

  if (!query) {
    console.error("\x1b[31mError:\x1b[0m Please provide an image search query.\nExample: npx @mintocha/codex-tools image-search 'aurora borealis'");
    process.exit(1);
  }

  const client = new CodexClient();
  const payload: Record<string, unknown> = { q: query };
  if (recency) payload.recency = recency;
  const res = await client.executeCommand("image_query", [payload]);
  console.log(JSON.stringify(res.results ?? [], null, 2));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "server") {
    try {
      await runServer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[codex-tools] Fatal error: ${msg}\n`);
      process.exit(1);
    }
    return;
  }

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    process.exit(0);
  }

  if (command === "login") {
    try {
      await loginWithDeviceAuth();
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\x1b[31mError:\x1b[0m ${msg}`);
      process.exit(1);
    }
  }

  try {
    switch (command) {
      case "search":
      case "web-search":
        await handleSearch(args);
        break;
      case "fetch":
        await handleFetch(args);
        break;
      case "finance":
        await handleFinance(args);
        break;
      case "weather":
        await handleWeather(args);
        break;
      case "sports":
        await handleSports(args);
        break;
      case "time":
      case "world-time":
        await handleTime(args);
        break;
      case "image-search":
        await handleImageSearch(args);
        break;
      default:
        console.error(`\x1b[31mUnknown command:\x1b[0m ${command}\n`);
        printHelp();
        process.exit(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31mError:\x1b[0m ${msg}`);
    process.exit(1);
  }
}

main();
