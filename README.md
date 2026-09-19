# @mintocha/codex-tools

[![npm version](https://img.shields.io/npm/v/@mintocha/codex-tools.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@mintocha/codex-tools)
[![npm license](https://img.shields.io/npm/l/@mintocha/codex-tools.svg?style=flat-square)](https://github.com/MintOcha/codex-tools/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol%201.6-purple?style=flat-square)](https://modelcontextprotocol.io/)

A high-performance **Model Context Protocol (MCP)** server providing real-time live web search, readable page extraction, market data, weather forecasts, sports schedules, and alpha browser tools powered by the reversed Codex / ChatGPT backend.

Designed to be instantly runnable with `npx` in **Claude Desktop**, **Cursor**, **Windsurf**, **Oh My Pi (OMP)**, **Zed**, **Cline**, and any standard MCP client.

---

## Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [CLI Usage](#-cli-usage)
  - [Available Commands](#available-commands)
  - [Global Installation](#global-installation)
  - [Testing via Stdio Pipe](#testing-over-stdio)
- [MCP Client Configurations](#-mcp-client-configurations)
  - [Claude Desktop](#claude-desktop)
  - [Cursor](#cursor)
  - [Windsurf](#windsurf)
  - [Oh My Pi (OMP)](#oh-my-pi-omp)
  - [Zed](#zed)
  - [VS Code / Cline](#vs-code--cline)
- [Authentication & Credential Discovery](#-authentication--credential-discovery)
- [Available Tools & Capabilities](#-available-tools--capabilities)
- [Architecture & Protocol](#-architecture--protocol)
- [Development & Testing](#-development--testing)
- [License](#-license)

---

## 🚀 Features

- **Live Web Search (`web-search`)**: Live internet search engine delivering curated snippets, URLs, and citations directly to LLMs.
- **Native Page Fetch (`fetch`)**: Extracts clean, readable text and markdown from web pages without raw HTML boilerplate.
- **Deep Page Inspection (`open-page`, `click-link`, `find-in-page`)**: Read pages line-by-line, follow reference links, and run regex/pattern searches.
- **Live Market & Financial Data (`finance`)**: Quotes for stocks, cryptocurrencies, ETFs, and indices with price changes and market stats.
- **Weather Forecasts (`weather`)**: 7-day weather forecasts and current conditions worldwide.
- **Sports Schedules & Standings (`sports`)**: Match schedules and league standings across NBA, EPL, NFL, MLB, NHL, and more.
- **Global World Time (`world-time`)**: Instant time lookup by UTC offset.
- **PDF Screenshots (`screenshot-pdf`)**: High-resolution rendered visual screenshots of individual PDF pages.
- **Image Search (`image-search`)**: Image search engine with domain and recency filtering.
- **Zero-Configuration Token Management**: Automatically discovers and refreshes OAuth tokens from `~/.codex/auth.json`, OMP configuration, or environment variables.

---

## 📦 Quick Start

### Interactive Login (Device Code Flow)

If you have a ChatGPT/Codex account and want seamless zero-config access:

```bash
npx @mintocha/codex-tools login
```

This initiates an OAuth device code flow, presents a verification URL (`https://auth.openai.com/codex/device`) and a one-time code, and securely stores the refreshed credentials in `~/.codex/auth.json` with restricted permissions (`0600`). Expired access tokens are refreshed automatically in the background on subsequent runs.

### Direct stdio Execution

Launch the MCP server directly over standard input/output:

```bash
npx -y @mintocha/codex-tools
```

---

## 💻 CLI Usage

`@mintocha/codex-tools` can be run via `npx` or installed globally as a command-line binary.

### Command Reference

| Command | Description | Example |
|---|---|---|
| `search <query>` | Live web search with formatted citations | `npx @mintocha/codex-tools search "TypeScript 5.8" --max 5` |
| `fetch <url>` | Extracts clean markdown/text from a URL | `npx @mintocha/codex-tools fetch "https://nodejs.org"` |
| `finance <ticker>` | Real-time stock, crypto, ETF quotes | `npx @mintocha/codex-tools finance NVDA equity` |
| `weather <location>` | Weather forecasts and current conditions | `npx @mintocha/codex-tools weather "Tokyo" --days 3` |
| `sports <league>` | Schedules and league standings | `npx @mintocha/codex-tools sports nba standings` |
| `time <utc_offset>` | Current time by UTC offset | `npx @mintocha/codex-tools time "+08:00"` |
| `image-search <query>` | Image search with optional recency | `npx @mintocha/codex-tools image-search "aurora borealis"` |
| `login` | Interactive OAuth device-code login | `npx @mintocha/codex-tools login` |
| `server` *(or no args)* | Starts the MCP server on `stdio` | `npx -y @mintocha/codex-tools` |
| `--help`, `-h` | Prints usage overview and examples | `npx @mintocha/codex-tools --help` |

### Direct CLI Examples

#### 1. Live Web Search
```bash
npx @mintocha/codex-tools search "OpenAI Codex" --max 3
```
Add `--json` for machine-readable JSON output:
```bash
npx @mintocha/codex-tools search "OpenAI Codex" --max 1 --json
```

#### 2. Clean Webpage Content Extraction
```bash
npx @mintocha/codex-tools fetch "https://example.com"
```

#### 3. Real-Time Finance Quotes
```bash
npx @mintocha/codex-tools finance AAPL
npx @mintocha/codex-tools finance BTC crypto
```

#### 4. Weather Forecasts
```bash
npx @mintocha/codex-tools weather "San Francisco" --days 5
```

#### 5. Sports Standings & Schedules
```bash
npx @mintocha/codex-tools sports nba standings
npx @mintocha/codex-tools sports epl schedule --team "Arsenal"
```

#### 6. World Time by Offset
```bash
npx @mintocha/codex-tools time "+08:00"
```
### Global Installation

If you prefer to run `codex-tools` directly without `npx`:

```bash
# Install globally
npm install -g @mintocha/codex-tools

# Run directly
codex-tools login
codex-tools
```

### Device Code Authentication Walkthrough

When running `login`, the CLI prompts:

```text
Initiating Codex device authorization...

========================================================
1. Open this URL in your browser: https://auth.openai.com/codex/device
2. Enter one-time code:          ABCD-EFGH
========================================================

Waiting for approval in browser (press Ctrl+C to cancel)...
Token refreshed and stored in ~/.codex/auth.json
```

### Testing over stdio

To verify the server and list available tools from your shell, send an MCP JSON-RPC `initialize` frame directly:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"tester","version":"1.0.0"}}}' | npx -y @mintocha/codex-tools
```

Expected response:

```json
{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"codex-tools","version":"1.0.0"}},"jsonrpc":"2.0","id":1}
```

---

## 🛠 MCP Client Configurations

### Claude Desktop

Add `@mintocha/codex-tools` to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

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

*Note: If using API key authentication instead of `npx @mintocha/codex-tools login`, supply `env`:*

```json
{
  "mcpServers": {
    "codex-tools": {
      "command": "npx",
      "args": ["-y", "@mintocha/codex-tools"],
      "env": {
        "CODEX_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`Settings` -> `Features` -> `MCP` -> `Add New MCP Server`):

- **Name**: `codex-tools`
- **Type**: `command`
- **Command**: `npx -y @mintocha/codex-tools`

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

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

Add to `~/.omp/agent/mcp.toml`:

```toml
[mcpServers.codex-tools]
command = "npx"
args = ["-y", "@mintocha/codex-tools"]
```

### Zed

Add to your `settings.json`:

```json
{
  "context_servers": {
    "codex-tools": {
      "command": {
        "path": "npx",
        "args": ["-y", "@mintocha/codex-tools"]
      }
    }
  }
}
```

### VS Code / Cline

Add to your `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "codex-tools": {
      "command": "npx",
      "args": ["-y", "@mintocha/codex-tools"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

---

## 🔑 Authentication & Credential Discovery

`@mintocha/codex-tools` resolves credentials using a prioritized waterfall:

| Priority | Source | Description |
|---|---|---|
| **1** | `CODEX_API_KEY` / `OPENAI_API_KEY` | Environment variable (Bearer token or OpenAI-compatible key) |
| **2** | `~/.omp/agent/web.toml` | Reads `api_keys` and custom `base_url` if running in an Oh My Pi environment |
| **3** | `~/.codex/auth.json` | Created by `npx @mintocha/codex-tools login` or OpenAI Codex CLI. Automatically auto-refreshes tokens before expiration |

### Custom Endpoint (`CODEX_BASE_URL`)

To route requests through a custom proxy, LiteLLM router, or gateway:

```bash
export CODEX_BASE_URL="https://your-custom-proxy.internal/v1"
```

---

## 🧰 Available Tools & Capabilities

| Tool | Description | Parameters |
|---|---|---|
| `web-search` | Live internet search for queries, figures, news, and citations | `query` (string, required)<br>`max_results` (number, 1–25, default: 10) |
| `fetch` | Fetch clean readable markdown content for URLs | `urls` (string array, required) |
| `open-page` | Open page and position viewport at line | `ref_id` (string, required)<br>`lineno` (number, optional) |
| `click-link` | Follow a numbered reference link from an opened page | `ref_id` (string, required)<br>`link_id` (number, required) |
| `find-in-page` | Search text or regex patterns in an opened page | `ref_id` (string, required)<br>`pattern` (string, required) |
| `screenshot-pdf` | Render visual screenshot of a PDF page | `ref_id` (string, required)<br>`pageno` (number, required, 0-indexed) |
| `image-search` | Query image search engine with optional domain/recency filters | `query` (string, required)<br>`recency_days` (number, optional)<br>`domains` (string array, optional) |
| `finance` | Financial quotes for stocks, crypto, ETFs, and indices | `ticker` (string, required)<br>`asset_type` (`equity` \| `fund` \| `crypto` \| `index`) |
| `weather` | Weather forecast and current conditions | `location` (string, required)<br>`start_date` (string, optional)<br>`duration_days` (number, optional) |
| `sports` | Sports schedules and league standings | `league` (string, required)<br>`fn` (`schedule` \| `standings`)<br>`team` (string, optional) |
| `world-time` | Accurate time lookup by UTC offset | `utc_offset` (string, e.g. `+08:00`, `-05:00`) |

---

## 🏗 Architecture & Protocol

```
+-------------------------------------------------------+
|                 MCP Host Client                       |
|   (Claude Desktop / Cursor / OMP / Windsurf / Zed)    |
+-------------------------------------------------------+
                           |
                     stdio / JSON-RPC
                           |
+-------------------------------------------------------+
|               @mintocha/codex-tools                   |
|  - McpServer (@modelcontextprotocol/sdk)              |
|  - Token Manager & Refresh Loop (~/.codex/auth.json)  |
|  - Resilient Codex Backend Client                     |
+-------------------------------------------------------+
                           |
                     HTTPS / TLS
                           |
+-------------------------------------------------------+
|             Codex / OpenAI Backend APIs               |
+-------------------------------------------------------+
```

---

## 💻 Development & Testing

```bash
# Clone repository
git clone https://github.com/MintOcha/codex-tools.git
cd codex-tools

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run automated tests
npm test
```

---

## 📄 License

MIT © [MintOcha](https://github.com/MintOcha)
