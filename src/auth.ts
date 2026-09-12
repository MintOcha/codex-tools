import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const DEVICE_USERCODE_URL = "https://auth.openai.com/api/accounts/deviceauth/usercode";
const DEVICE_TOKEN_URL = "https://auth.openai.com/api/accounts/deviceauth/token";
const TOKEN_URL = "https://auth.openai.com/oauth/token";

export interface CodexAuthTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  account_id?: string;
}

export interface CodexAuthFile {
  auth_mode?: string;
  OPENAI_API_KEY?: string;
  tokens?: CodexAuthTokens;
  last_refresh?: string;
}

interface JwtAuthClaim {
  chatgpt_account_id?: string;
}

interface DecodedJwt {
  exp?: number;
  "https://api.openai.com/auth"?: JwtAuthClaim;
  [key: string]: unknown;
}

interface TokenResponsePayload {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  account_id?: string;
}

interface DeviceUserCodeResponse {
  user_code: string;
  device_auth_id: string;
  verification_uri?: string;
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

export function decodeJwtPayload(token: string): DecodedJwt | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as DecodedJwt;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - skewSeconds <= now;
}

export async function refreshAccessToken(refreshToken: string): Promise<CodexAuthTokens> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "codex-search-mcp/1.0.0",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed (HTTP ${res.status}): ${errText}`);
  }

  const data = (await res.json()) as TokenResponsePayload;
  const payload = data.id_token ? decodeJwtPayload(data.id_token) : decodeJwtPayload(data.access_token);
  const accountId = payload?.["https://api.openai.com/auth"]?.chatgpt_account_id ?? data.account_id;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    id_token: data.id_token,
    account_id: accountId,
  };
}

export async function getOrLoadAuthToken(): Promise<{ token: string; accountId?: string; baseUrl?: string }> {
  // 1. Check environment variables
  const envKey = process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY;
  if (envKey && envKey.trim()) {
    return { token: envKey.trim() };
  }

  // 2. Check ~/.omp/agent/web.toml
  const webTomlPath = path.join(os.homedir(), ".omp", "agent", "web.toml");
  if (fs.existsSync(webTomlPath)) {
    try {
      const raw = fs.readFileSync(webTomlPath, "utf-8");
      const keyMatch = raw.match(/api_keys\s*=\s*\[\s*"([^"]+)"/);
      const urlMatch = raw.match(/base_url\s*=\s*"([^"]+)"/);
      if (keyMatch && keyMatch[1]) {
        return {
          token: keyMatch[1],
          baseUrl: urlMatch?.[1] || undefined,
        };
      }
    } catch {}
  }

  // 3. Check ~/.codex/auth.json
  const authPath = path.join(os.homedir(), ".codex", "auth.json");
  if (fs.existsSync(authPath)) {
    try {
      const raw = fs.readFileSync(authPath, "utf-8");
      const authData = JSON.parse(raw) as CodexAuthFile;

      if (authData.tokens?.access_token) {
        let tokens = authData.tokens;
        if (isTokenExpired(tokens.access_token) && tokens.refresh_token) {
          try {
            process.stderr.write("[codex-search-mcp] Access token expired, refreshing...\n");
            const refreshed = await refreshAccessToken(tokens.refresh_token);
            tokens = { ...tokens, ...refreshed };
            authData.tokens = tokens;
            authData.last_refresh = new Date().toISOString();
            fs.writeFileSync(authPath, JSON.stringify(authData, null, 2), { mode: 0o600 });
            process.stderr.write("[codex-search-mcp] Token refreshed successfully.\n");
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write(`[codex-search-mcp] Auto-refresh failed: ${msg}\n`);
          }
        }
        return {
          token: tokens.access_token,
          accountId: tokens.account_id,
        };
      }

      if (authData.OPENAI_API_KEY && authData.OPENAI_API_KEY.trim()) {
        return { token: authData.OPENAI_API_KEY.trim() };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[codex-search-mcp] Failed to read ${authPath}: ${msg}\n`);
    }
  }
  throw new Error(
    "No Codex authentication found.\n" +
      "Please either:\n" +
      "  1. Set CODEX_API_KEY or OPENAI_API_KEY in your environment, or\n" +
      "  2. Run 'npx codex-search-mcp login' to authenticate with your ChatGPT/Codex account."
  );
}

export async function loginWithDeviceAuth(): Promise<void> {
  console.log("Initiating Codex device authorization...");

  const userCodeRes = await fetch(DEVICE_USERCODE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "codex-search-mcp/1.0.0",
    },
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });

  if (!userCodeRes.ok) {
    const text = await userCodeRes.text();
    throw new Error(`Device code request failed (${userCodeRes.status}): ${text}`);
  }

  const { user_code, device_auth_id, verification_uri } =
    (await userCodeRes.json()) as DeviceUserCodeResponse;
  const targetUrl = verification_uri || "https://auth.openai.com/codex/device";

  console.log("\n========================================================");
  console.log(`1. Open this URL in your browser: \x1b[36m${targetUrl}\x1b[0m`);
  console.log(`2. Enter one-time code:          \x1b[32m\x1b[1m${user_code}\x1b[0m`);
  console.log("========================================================\n");
  console.log("Waiting for approval in browser (press Ctrl+C to cancel)...");

  const pollInterval = 5000;
  const maxAttempts = 60; // 5 minutes

  for (let i = 0; i < maxAttempts; i++) {
    await delay(pollInterval);

    const pollRes = await fetch(DEVICE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "codex-search-mcp/1.0.0",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_auth_id,
        user_code,
      }),
    });

    if (pollRes.ok) {
      const data = (await pollRes.json()) as TokenResponsePayload;
      const payload = data.id_token ? decodeJwtPayload(data.id_token) : decodeJwtPayload(data.access_token);
      const accountId = payload?.["https://api.openai.com/auth"]?.chatgpt_account_id ?? data.account_id;

      const authDir = path.join(os.homedir(), ".codex");
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
      }

      const authPath = path.join(authDir, "auth.json");
      let authData: CodexAuthFile = {};
      if (fs.existsSync(authPath)) {
        try {
          authData = JSON.parse(fs.readFileSync(authPath, "utf-8")) as CodexAuthFile;
        } catch {}
      }

      authData.auth_mode = "chatgpt";
      authData.tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        id_token: data.id_token,
        account_id: accountId,
      };
      authData.last_refresh = new Date().toISOString();

      fs.writeFileSync(authPath, JSON.stringify(authData, null, 2), { mode: 0o600 });
      console.log("\x1b[32m✔ Successfully authenticated!\x1b[0m Credentials saved to ~/.codex/auth.json\n");
      return;
    }

    if (pollRes.status === 400 || pollRes.status === 404) {
      // Pending user approval, continue polling
      continue;
    }

    const err = await pollRes.text();
    throw new Error(`Device token polling failed (${pollRes.status}): ${err}`);
  }

  throw new Error("Authorization timed out. Please try again.");
}
