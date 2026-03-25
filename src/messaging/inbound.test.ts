import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("weixin inbound context-token state", () => {
  let stateDir = "";
  let inbound: typeof import("./inbound.js");

  beforeAll(async () => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "weixin-inbound-test-"));
    process.env.OPENCLAW_STATE_DIR = stateDir;
    vi.resetModules();
    inbound = await import("./inbound.js");
  }, 60_000);

  beforeEach(() => {
    fs.rmSync(path.join(stateDir, "openclaw-weixin"), { recursive: true, force: true });
    inbound.clearContextTokensForAccount("acct-a");
    inbound.clearContextTokensForAccount("acct-b");
  });

  afterAll(() => {
    delete process.env.OPENCLAW_STATE_DIR;
    vi.resetModules();
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  it("persists and restores account-scoped context tokens", async () => {
    inbound.setContextToken("acct-a", "peer@im.wechat", "ctx-1");

    const persistedPath = path.join(
      stateDir,
      "openclaw-weixin",
      "accounts",
      "acct-a.context-tokens.json",
    );
    expect(JSON.parse(fs.readFileSync(persistedPath, "utf-8"))).toEqual({
      "peer@im.wechat": "ctx-1",
    });

    vi.resetModules();
    const restoredInbound = await import("./inbound.js");
    expect(restoredInbound.getContextToken("acct-a", "peer@im.wechat")).toBeUndefined();

    restoredInbound.restoreContextTokens("acct-a");

    expect(restoredInbound.getContextToken("acct-a", "peer@im.wechat")).toBe("ctx-1");
    expect(
      restoredInbound.findAccountIdsByContextToken(["acct-a", "acct-b"], "peer@im.wechat"),
    ).toEqual(["acct-a"]);
  }, 20_000);

  it("clears in-memory and persisted token state for an account", async () => {
    inbound.setContextToken("acct-a", "peer@im.wechat", "ctx-1");
    inbound.setContextToken("acct-b", "peer@im.wechat", "ctx-2");

    const persistedPath = path.join(
      stateDir,
      "openclaw-weixin",
      "accounts",
      "acct-a.context-tokens.json",
    );
    expect(fs.existsSync(persistedPath)).toBe(true);

    inbound.clearContextTokensForAccount("acct-a");

    expect(inbound.getContextToken("acct-a", "peer@im.wechat")).toBeUndefined();
    expect(inbound.getContextToken("acct-b", "peer@im.wechat")).toBe("ctx-2");
    expect(fs.existsSync(persistedPath)).toBe(false);
  }, 20_000);
});
