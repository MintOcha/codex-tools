import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CodexClient } from "./codex-client.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "codex-tools",
    version: "1.1.0",
  });

  const client = new CodexClient();

  // 1. web-search
  server.tool(
    "web-search",
    "REQUIRED live-web search for current or externally verifiable information, including benchmark scores, specifications, prices, news, documentation, and comparisons. Return source URLs, snippets, and clean results.",
    {
      query: z.string().describe("Search query to execute"),
      max_results: z.number().int().min(1).max(25).default(10).describe("Maximum number of results to return"),
    },
    async ({ query, max_results }) => {
      try {
        const results = await client.search(query, max_results);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text", text: `Web search error: ${msg}` }],
        };
      }
    }
  );

  // 2. fetch
  server.tool(
    "fetch",
    "Fetch readable page content for given URLs using Codex native page extraction.",
    {
      urls: z.array(z.string().url()).describe("List of URLs to fetch readable content from"),
    },
    async ({ urls }) => {
      try {
        const fetched: Array<{ url: string; content: string }> = [];
        for (const url of urls) {
          const content = await client.fetchPage(url);
          fetched.push({ url, content });
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(fetched, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text", text: `Fetch error: ${msg}` }],
        };
      }
    }
  );

  // 3. open-page
  server.tool(
    "open-page",
    "Open the page indicated by ref_id or URL and position viewport at line lineno.",
    {
      ref_id: z.string().describe("URL or page reference ID"),
      lineno: z.number().int().optional().describe("Line number to position viewport at"),
    },
    async ({ ref_id, lineno }) => {
      try {
        const payload: Record<string, unknown> = { ref_id };
        if (typeof lineno === "number") payload.lineno = lineno;
        const res = await client.executeCommand("open", [payload]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Open page error: ${msg}` }] };
      }
    }
  );

  // 4. click-link
  server.tool(
    "click-link",
    "Open the link link_id (numbered reference link) from previously opened page ref_id.",
    {
      ref_id: z.string().describe("Previously opened page ref_id or URL"),
      link_id: z.number().int().describe("Numeric link id found in page content"),
    },
    async ({ ref_id, link_id }) => {
      try {
        const res = await client.executeCommand("click", [{ ref_id, id: link_id }]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Click link error: ${msg}` }] };
      }
    }
  );

  // 5. find-in-page
  server.tool(
    "find-in-page",
    "Find text pattern in page indicated by ref_id or URL.",
    {
      ref_id: z.string().describe("URL or page reference ID"),
      pattern: z.string().describe("Regex or text pattern to locate"),
    },
    async ({ ref_id, pattern }) => {
      try {
        const res = await client.executeCommand("find", [{ ref_id, pattern }]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Find in page error: ${msg}` }] };
      }
    }
  );

  // 6. screenshot-pdf
  server.tool(
    "screenshot-pdf",
    "Take a screenshot of page pageno (0-indexed) indicated by ref_id or URL (works on PDFs).",
    {
      ref_id: z.string().describe("PDF URL or reference ID"),
      pageno: z.number().int().min(0).describe("0-indexed page number"),
    },
    async ({ ref_id, pageno }) => {
      try {
        const res = await client.executeCommand("screenshot", [{ ref_id, pageno }]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Screenshot error: ${msg}` }] };
      }
    }
  );

  // 7. image-search
  server.tool(
    "image-search",
    "Query image search engine for a given query.",
    {
      query: z.string().describe("Image search query"),
      recency_days: z.number().int().optional().describe("Filter by recency in days"),
      domains: z.array(z.string()).optional().describe("Filter results to specific domains"),
    },
    async ({ query, recency_days, domains }) => {
      try {
        const payload: Record<string, unknown> = { q: query };
        if (typeof recency_days === "number") payload.recency = recency_days;
        if (Array.isArray(domains)) payload.domains = domains;
        const res = await client.executeCommand("image_query", [payload]);
        return {
          content: [{ type: "text", text: JSON.stringify(res.results ?? [], null, 2) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Image search error: ${msg}` }] };
      }
    }
  );

  // 8. finance
  server.tool(
    "finance",
    "Look up financial quotes for a given ticker (type: equity, fund, crypto, index).",
    {
      ticker: z.string().describe("Ticker symbol (e.g. NVDA, AAPL, BTC)"),
      asset_type: z.enum(["equity", "fund", "crypto", "index"]).default("equity").describe("Asset category"),
      market: z.string().optional().describe("Optional market exchange"),
    },
    async ({ ticker, asset_type, market }) => {
      try {
        const payload: Record<string, unknown> = { ticker, type: asset_type };
        if (market) payload.market = market;
        const res = await client.executeCommand("finance", [payload]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Finance error: ${msg}` }] };
      }
    }
  );

  // 9. weather
  server.tool(
    "weather",
    "Look up weather forecast for location (e.g. 'City, Country').",
    {
      location: z.string().describe("Location name, city, or coordinates"),
      start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      duration_days: z.number().int().optional().describe("Duration in days"),
    },
    async ({ location, start_date, duration_days }) => {
      try {
        const payload: Record<string, unknown> = { location };
        if (start_date) payload.start = start_date;
        if (duration_days) payload.duration = duration_days;
        const res = await client.executeCommand("weather", [payload]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Weather error: ${msg}` }] };
      }
    }
  );

  // 10. sports
  server.tool(
    "sports",
    "Look up sports schedules and standings (league: nba, wnba, nfl, nhl, mlb, epl, ncaamb, ncaawb, ipl; fn: schedule or standings).",
    {
      league: z.string().describe("League code (e.g. nba, epl, nfl)"),
      fn: z.enum(["schedule", "standings"]).default("schedule").describe("Query type: schedule or standings"),
      team: z.string().optional().describe("Optional team filter"),
    },
    async ({ league, fn, team }) => {
      try {
        const payload: Record<string, unknown> = { tool: "sports", fn, league };
        if (team) payload.team = team;
        const res = await client.executeCommand("sports", [payload]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Sports error: ${msg}` }] };
      }
    }
  );

  // 11. world-time
  server.tool(
    "world-time",
    "Get current time for UTC offset (e.g. '+08:00' or '-05:00').",
    {
      utc_offset: z.string().describe("UTC offset string (e.g. '+08:00' or '-05:00')"),
    },
    async ({ utc_offset }) => {
      try {
        const res = await client.executeCommand("time", [{ utc_offset }]);
        return {
          content: [{ type: "text", text: typeof res.output === "string" ? res.output : "" }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `World time error: ${msg}` }] };
      }
    }
  );

  return server;
}

export async function runServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[codex-tools] Server running on stdio\n");
}
