# @mintocha/codex-tools

[![npm version](https://img.shields.io/npm/v/@mintocha/codex-tools.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@mintocha/codex-tools)
[![license](https://img.shields.io/npm/l/@mintocha/codex-tools.svg?style=flat-square)](https://github.com/MintOcha/codex-tools/blob/main/LICENSE)

An MCP server and command-line tool for web search, page extraction, finance quotes, weather forecasts, and sports scores, backed by OpenAI's reversed Codex web endpoints.

Runs directly as an MCP server via stdio for Claude Desktop, Cursor, Windsurf, and Oh My Pi, or as a standalone terminal CLI for ad-hoc queries.

## Quick start

### Log in once

If you use a ChatGPT or Codex subscription, authenticate via the device code flow:

```bash
npx @mintocha/codex-tools login
```

The CLI prints a verification link and a one-time code. Once approved in your browser, the OAuth tokens are saved to `~/.codex/auth.json` (chmod 600) and refreshed automatically before expiration.

### Run commands directly

```bash
# Web search
npx @mintocha/codex-tools search "TypeScript 5.8 release notes"

# Fetch readable webpage text
npx @mintocha/codex-tools fetch "https://nodejs.org"

# Market quotes
npx @mintocha/codex-tools finance NVDA
npx @mintocha/codex-tools finance BTC crypto

# Weather
npx @mintocha/codex-tools weather "Tokyo" --days 3

# Sports scores and schedules
npx @mintocha/codex-tools sports nba standings
npx @mintocha/codex-tools sports epl schedule --team "Arsenal"

# UTC time
npx @mintocha/codex-tools time "+08:00"
```

Append `--json` to any command for structured JSON output.

### Run as an MCP server

Start the stdio transport directly:

```bash
npx -y @mintocha/codex-tools
```

Or install globally to keep `codex-tools` on your PATH:

```bash
npm install -g @mintocha/codex-tools
codex-tools search "Postgres 17 changes"
```

## CLI reference

| Command | Description |
|---|---|
| `search <query> [--max <n>]` | Search the web and return titles, URLs, and snippets |
| `fetch <url> [--line <n>]` | Extract cleaned markdown/text from a webpage URL |
| `finance <ticker> [type]` | Look up quotes (`equity`, `fund`, `crypto`, `index`) |
| `weather <location> [--days <n>]` | Fetch current weather and multi-day forecasts |
| `sports <league> [type]` | Look up schedules or standings (`nba`, `epl`, `nfl`, `mlb`) |
| `time <utc_offset>` | Resolve current time for an offset like `+08:00` or `-05:00` |
| `image-search <query> [--days <n>]` | Search images with optional recency bounds |
| `login` | Interactive OAuth device flow saving to `~/.codex/auth.json` |
| `server` | Run the stdio MCP server (default when invoked without args) |
| `--help` | Show command list and options |

## MCP client configuration

Add `@mintocha/codex-tools` to your client configuration file. If you already ran `npx @mintocha/codex-tools login` or have an existing `~/.codex/auth.json`, you do not need to pass an API key in the environment.

### Claude Desktop

File locations:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codex-tools": {
      "command": "npx",
      "args": ["-y", "@mintocha/codex-tools"]
    }
  }
}
```

If authenticating with an API key instead of OAuth:

```json
{
  "mcpServers": {
    "codex-tools": {
      "command": "npx",
      "args": ["-y", "@mintocha/codex-tools"],
      "env": {
        "CODEX_API_KEY": "your_key_here"
      }
    }
  }
}
```

### Cursor

Under **Settings > Features > MCP > Add New MCP Server**:
- Name: `codex-tools`
- Type: `command`
- Command: `npx -y @mintocha/codex-tools`

### Windsurf

In `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "codex-tools": {
      "command": "npx",
      "args": ["-y", "@mintocha/codex-tools"]
    }
  }
}
```

### Oh My Pi (OMP)

In `~/.omp/agent/mcp.toml`:

```toml
[mcpServers.codex-tools]
command = "npx"
args = ["-y", "@mintocha/codex-tools"]
```

## Available tools

When connected as an MCP server, the following tools are exposed over JSON-RPC:

| Tool | Parameters | Output |
|---|---|---|
| `web-search` | `query` (string, required), `max_results` (integer, 1–25, default 10) | JSON list of `{ title, url, snippet }` objects |
| `fetch` | `urls` (string array, required) | Clean text/markdown for each requested URL |
| `open-page` | `ref_id` (string, required), `lineno` (integer, optional) | Page text positioned at the specified line |
| `click-link` | `ref_id` (string, required), `link_id` (integer, required) | Target page text from following a numbered reference link |
| `find-in-page` | `ref_id` (string, required), `pattern` (string, required) | Matched pattern occurrences and surrounding context |
| `image-search` | `query` (string, required), `recency_days` (integer), `domains` (string array) | JSON list of image search matches |
| `finance` | `ticker` (string, required), `asset_type` (`equity` \| `fund` \| `crypto` \| `index`) | Current market price, change, volume, and company details |
| `weather` | `location` (string, required), `start_date` (string), `duration_days` (integer) | Weather conditions and temperature forecast |
| `sports` | `league` (string, required), `fn` (`schedule` \| `standings`), `team` (string) | Scores, upcoming fixtures, or current table |
| `world-time` | `utc_offset` (string, required, e.g. `+08:00` or `-05:00`) | Current ISO and formatted time for the given offset |

## Authentication order

The client checks credential sources in this order:

1. `CODEX_API_KEY` or `OPENAI_API_KEY` environment variables.
2. `~/.omp/agent/web.toml` (extracts `api_keys` and `base_url` if present).
3. `~/.codex/auth.json` (created by `npx @mintocha/codex-tools login` or the Codex CLI; auto-refreshes expired access tokens).

To route requests through a custom proxy:

```bash
export CODEX_BASE_URL="https://litellm.v-rail.org/v1"
```

## Testing over stdio

You can test the server locally with an `initialize` JSON-RPC handshake:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"tester","version":"1.0.0"}}}' | npx -y @mintocha/codex-tools
```

Expected reply:

```json
{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"codex-tools","version":"1.1.0"}},"jsonrpc":"2.0","id":1}
```

## Development

```bash
git clone https://github.com/MintOcha/codex-tools.git
cd codex-tools
npm install
npm run build
npm test
```

## License

MIT
