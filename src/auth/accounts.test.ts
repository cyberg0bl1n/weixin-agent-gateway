import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("weixin account cleanup", () => {
  let stateDir = "";
  let accounts: typeof import("./accounts.js");
  let inbound: typeof import("../messaging/inbound.js");
  let pairing: typeof import("./pairing.js");

  beforeAll(async () => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "weixin-accounts-test-"));
    process.env.OPENCLAW_STATE_DIR = stateDir;
    vi.resetModules();
    accounts = await import("./accounts.js");
    inbound = await import("../messaging/inbound.js");
    pairing = await import("./pairing.js");
  }, 60_000);

  beforeEach(() => {
    fs.rmSync(path.join(stateDir, "openclaw-weixin"), { recursive: true, force: true });
    fs.rmSync(path.join(stateDir, "credentials"), { recursive: true, force: true });
    inbound.clearContextTokensForAccount("acct-current");
    inbound.clearContextTokensForAccount("acct-stale");
  });

  afterAll(() => {
    delete process.env.OPENCLAW_STATE_DIR;
    vi.resetModules();
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  it("prunes stale accounts and clears transport-owned sidecar files", async () => {
    accounts.registerWeixinAccountId("acct-current");
    accounts.registerWeixinAccountId("acct-stale");
    accounts.saveWeixinAccount("acct-current", {
      token: "current-token",
      baseUrl: "https://example.com",
      userId: "same-user",
    });
    accounts.saveWeixinAccount("acct-stale", {
      token: "stale-token",
      baseUrl: "https://example.com",
      userId: "same-user",
    });

    inbound.setContextToken("acct-stale", "peer@im.wechat", "ctx-stale");
    fs.writeFileSync(
      path.join(stateDir, "openclaw-weixin", "accounts", "acct-stale.sync.json"),
      JSON.stringify({ get_updates_buf: "buf" }),
      "utf-8",
    );
    fs.mkdirSync(path.dirname(pairing.resolveFrameworkAllowFromPath("acct-stale")), { recursive: true });
    fs.writeFileSync(
      pairing.resolveFrameworkAllowFromPath("acct-stale"),
      JSON.stringify({ version: 1, allowFrom: ["peer@im.wechat"] }),
      "utf-8",
    );

    accounts.clearStaleAccountsForUserId(
      "acct-current",
      "same-user",
      inbound.clearContextTokensForAccount,
    );

    expect(accounts.listIndexedWeixinAccountIds()).toEqual(["acct-current"]);
    expect(accounts.loadWeixinAccount("acct-stale")).toBeNull();
    expect(inbound.getContextToken("acct-stale", "peer@im.wechat")).toBeUndefined();
    expect(
      fs.existsSync(path.join(stateDir, "openclaw-weixin", "accounts", "acct-stale.sync.json")),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(stateDir, "openclaw-weixin", "accounts", "acct-stale.context-tokens.json"),
      ),
    ).toBe(false);
    expect(fs.existsSync(pairing.resolveFrameworkAllowFromPath("acct-stale"))).toBe(false);
  }, 20_000);
});
