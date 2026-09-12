# codex-search-mcp

A **Model Context Protocol (MCP)** server providing real-time live web search, readable page extraction, market data, weather forecasts, sports schedules, and alpha browser tools powered by the reversed Codex / ChatGPT backend.

Designed to be instantly runnable with `npx` in **Claude Desktop**, **Cursor**, **Windsurf**, **Oh My Pi**, **Cline**, and any MCP client.

---

## 🚀 Features

- **Live Web Search (`web-search`)**: Real-time web search queries returning titles, snippets, source URLs, and citations.
- **Native Page Fetch (`fetch`)**: Extracts clean, readable text/markdown from web pages without raw HTML noise.
- **Deep Web Navigation (`open-page`, `click-link`, `find-in-page`)**: Inspect pages, follow numbered reference links, and search text patterns.
- **Live Market & Financial Data (`finance`)**: Real-time stock, crypto, ETF, and index quotes with intraday changes and market caps.
- **Weather Forecasts (`weather`)**: Accurate 7-day weather forecasts and current conditions for any global location.
- **Sports Schedules & Standings (`sports`)**: Schedules and standings across leagues (NBA, EPL, NFL, MLB, NHL, etc.).
- **Global World Time (`world-time`)**: Instant, accurate time lookup for any UTC offset.
- **PDF Screenshots (`screenshot-pdf`)**: Extract high-resolution visual screenshots of PDF pages by page index.
- **Image Search (`image-search`)**: Query image search engine with optional domain and recency filters.
- **Zero-Configuration Authentication**: Automatically detects and refreshes credentials from `~/.codex/auth.json`, environment variables, or interactive OAuth login.

---

## 📦 Quick Start

Run directly without installation:

```bash
npx -y codex-search-mcp
```

### Interactive Login (Optional)

If you have a ChatGPT/Codex subscription and want to authenticate automatically:

```bash
npx codex-search-mcp login
```

This starts the OAuth device code flow, shows a one-time verification URL and code, and securely stores the credentials in `~/.codex/auth.json` (auto-refreshed upon expiration).

---

## 🛠 MCP Client Configuration

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codex-search": {
      "command": "npx",
      "args": ["-y", "codex-search-mcp"],
      "env": {
        "CODEX_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

*(Note: If you have already authenticated with `npx codex-search-mcp login` or have `~/.codex/auth.json`, you can omit the `"env"` block!)*

### Cursor

Add to your Cursor MCP settings (`Settings` -> `Features` -> `MCP`):

- **Name**: `codex-search`
- **Type**: `command`
- **Command**: `npx -y codex-search-mcp`

### Oh My Pi (OMP)

Add to your `~/.omp/agent/mcp.toml`:

```toml
[mcpServers.codex-search]
command = "npx"
args = ["-y", "codex-search-mcp"]
```

---

## 🔑 Authentication Options

`codex-search-mcp` looks for authentication in the following order:

1. **Environment Variables**:
   - `CODEX_API_KEY`: API key for Codex or an OpenAI-compatible / LiteLLM proxy.
   - `OPENAI_API_KEY`: Standard OpenAI API key.
   - `CODEX_BASE_URL` (optional): Custom endpoint URL (e.g. `https://litellm.v-rail.org/v1`).
2. **Existing Codex Configuration (`~/.codex/auth.json`)**:
   - Automatically detects access and refresh tokens created by the Codex CLI or `npx codex-search-mcp login`.
   - Expired tokens are refreshed automatically in the background.

---

## 🧰 Available Tools

| Tool | Description | Arguments |
|---|---|---|
| `web-search` | Live internet search for queries, benchmark figures, and news | `query` (string, required), `max_results` (number, default: 10) |
| `fetch` | Fetch clean readable content from a list of URLs | `urls` (string array, required) |
| `open-page` | Open page and position viewport at specific line | `ref_id` (string, required), `lineno` (number, optional) |
| `click-link` | Follow a numbered reference link from an opened page | `ref_id` (string, required), `link_id` (number, required) |
| `find-in-page` | Search text or regex patterns in opened page | `ref_id` (string, required), `pattern` (string, required) |
| `screenshot-pdf`| Capture PDF page screenshot | `ref_id` (string, required), `pageno` (number, required) |
| `image-search` | Search image engine | `query` (string, required), `recency_days` (number), `domains` (string array) |
| `finance` | Financial quotes for stocks, crypto, ETFs, and indices | `ticker` (string, required), `asset_type` (`equity` \| `fund` \| `crypto` \| `index`) |
| `weather` | Weather forecast and current conditions | `location` (string, required), `start_date` (string), `duration_days` (number) |
| `sports` | Sports schedules and league standings | `league` (string, required), `fn` (`schedule` \| `standings`), `team` (string) |
| `world-time` | Accurate time lookup by UTC offset | `utc_offset` (string, e.g. `+08:00`, `-05:00`) |

---

## 💻 Development

```bash
git clone https://github.com/MintOcha/codex-search-mcp.git
cd codex-search-mcp
npm install
npm run build
npm test
```

---

## 📄 License

MIT © [MintOcha](https://github.com/MintOcha)
