import test from "node:test";
import assert from "node:assert/strict";
import { createMcpServer } from "../src/server.js";
import { decodeJwtPayload, isTokenExpired } from "../src/auth.js";
import { CodexClient, normalizeRefId } from "../src/codex-client.js";

test("decodeJwtPayload returns null for invalid tokens", () => {
  assert.equal(decodeJwtPayload("not-a-token"), null);
  assert.equal(decodeJwtPayload("a.b"), null);
});

test("isTokenExpired detects expired timestamp", () => {
  const expiredPayload = Buffer.from(JSON.stringify({ exp: 1000 })).toString("base64");
  const token = `header.${expiredPayload}.signature`;
  assert.equal(isTokenExpired(token), true);
});

test("createMcpServer initializes server with correct name and tools", () => {
  const server = createMcpServer();
  assert.ok(server);
});

test("normalizeRefId prepends https to domain paths and preserves full urls", () => {
  assert.equal(normalizeRefId("github.com/microsoft/typescript"), "https://github.com/microsoft/typescript");
  assert.equal(normalizeRefId("https://github.com/microsoft/typescript"), "https://github.com/microsoft/typescript");
  assert.equal(normalizeRefId("www.example.com"), "https://www.example.com");
  assert.equal(normalizeRefId("ref_123"), "ref_123");
});

test("CodexClient generates and retains stable sessionId", () => {
  const client = new CodexClient();
  assert.ok(client.sessionId);
  assert.equal(typeof client.sessionId, "string");
  assert.equal(client.sessionId.length, 36);
});

test("CodexClient records and resolves view refs", () => {
  const client = new CodexClient();
  const mockOutput = "Python - Wikipedia (https://en.wikipedia.org/wiki/Python)\n\ue200cite\ue202turn1view0\ue201 Crawled today";
  client.recordViewRef("https://en.wikipedia.org/wiki/Python", mockOutput);
  assert.equal(client.resolveViewRef("https://en.wikipedia.org/wiki/Python"), "turn1view0");
  assert.equal(client.resolveViewRef("turn1view0"), "turn1view0");
  assert.equal(client.resolveViewRef("unknown_ref"), "unknown_ref");
});
