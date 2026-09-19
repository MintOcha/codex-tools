import { getOrLoadAuthToken } from "./auth.js";

const DEFAULT_BASE_URL = "https://litellm.v-rail.org/v1";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export interface CodexSearchItem {
  title: string;
  url: string;
  snippet: string;
}

export interface CodexCommandResult {
  output?: string;
  results?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export function normalizeRefId(refId: string): string {
  const trimmed = refId.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
export class CodexClient {
  private customBaseUrl?: string;

  constructor(baseUrl?: string) {
    if (baseUrl || process.env.CODEX_BASE_URL) {
      this.customBaseUrl = (baseUrl || process.env.CODEX_BASE_URL)!.replace(/\/+$/, "");
    }
  }
  readonly sessionId: string = crypto.randomUUID();
  private urlToViewRef: Map<string, string> = new Map();

  recordViewRef(refId: string, output: string): void {
    const match = output.match(/cite(turn\d+view\d+)/);
    if (match) {
      const viewRef = match[1];
      this.urlToViewRef.set(refId, viewRef);
      this.urlToViewRef.set(viewRef, viewRef);
    }
  }

  resolveViewRef(refId: string): string {
    return this.urlToViewRef.get(refId) || refId;
  }

  async executeCommand(
    commandName: string,
    commandPayload: unknown[]
  ): Promise<CodexCommandResult> {
    const { token, accountId, baseUrl } = await getOrLoadAuthToken();
    const effectiveBase = this.customBaseUrl || baseUrl || DEFAULT_BASE_URL;
    const endpoint = `${effectiveBase.replace(/\/+$/, "")}/alpha/search`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "User-Agent": DEFAULT_USER_AGENT,
      "Content-Type": "application/json",
    };
    if (accountId) {
      headers["chatgpt-account-id"] = accountId;
    }

    const body = {
      id: this.sessionId,
      model: process.env.CODEX_MODEL || "",
      commands: {
        [commandName]: commandPayload,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Codex API request failed (HTTP ${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as CodexCommandResult;
    return data;
  }

  async search(query: string, maxResults = 10): Promise<CodexSearchItem[]> {
    const data = await this.executeCommand("search_query", [{ q: query }]);
    const rawResults = Array.isArray(data.results) ? data.results : [];
    const items: CodexSearchItem[] = [];

    for (const r of rawResults) {
      if (!r || typeof r !== "object") continue;
      const title = typeof r.title === "string" ? r.title : "";
      const url = typeof r.url === "string" ? r.url : "";
      const snippet = typeof r.snippet === "string" ? r.snippet : "";
      if (url || title) {
        items.push({ title, url, snippet });
      }
    }

    return items.slice(0, maxResults);
  }

  async fetchPage(url: string, lineno?: number): Promise<string> {
    const normalizedUrl = normalizeRefId(url);
    const payload: Record<string, unknown> = { ref_id: normalizedUrl };
    if (typeof lineno === "number") {
      payload.lineno = lineno;
    }
    const data = await this.executeCommand("open", [payload]);
    return typeof data.output === "string" ? data.output : "";
  }
}
