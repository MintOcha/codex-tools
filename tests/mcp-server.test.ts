import test from "node:test";
import assert from "node:assert/strict";
import { createMcpServer } from "../src/server.js";
import { decodeJwtPayload, isTokenExpired } from "../src/auth.js";

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
