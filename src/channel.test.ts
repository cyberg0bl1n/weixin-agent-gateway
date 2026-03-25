import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessageMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
}));

vi.mock("./api/api.js", async () => {
  const actual = await vi.importActual<typeof import("./api/api.js")>("./api/api.js");
  return {
    ...actual,
    sendMessage: sendMessageMock,
  };
});

describe("weixin channel transport parity", () => {
  let stateDir = "";
  let accounts: typeof import("./auth/accounts.js");
  let inbound: typeof import("./messaging/inbound.js");
  let accountSelection: typeof import("./transport/weixin/outbound/account-selection.js");
  let channel: typeof import("./channel.js");

  beforeAll(async () => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "weixin-channel-test-"));
    process.env.OPENCLAW_STATE_DIR = stateDir;
    vi.resetModules();
    accounts = await import("./auth/accounts.js");
    inbound = await import("./messaging/inbound.js");
    accountSelection = await import("./transport/weixin/outbound/account-selection.js");
    channel = await import("./channel.js");
  }, 60_000);

  beforeEach(() => {
    fs.rmSync(path.join(stateDir, "openclaw-weixin"), { recursive: true, force: true });
    inbound.clearContextTokensForAccount("acct-a");
    inbound.clearContextTokensForAccount("acct-b");
    inbound.clearContextTokensForAccount("acct-current");
    inbound.clearContextTokensForAccount("acct-stale");
    sendMessageMock.mockReset();
    sendMessageMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    delete process.env.OPENCLAW_STATE_DIR;
    vi.resetModules();
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  it("auto-selects the only indexed account when accountId is omitted", async () => {
    accounts.registerWeixinAccountId("acct-a");

    expect(accountSelection.resolveOutboundAccountId({ channels: {} } as never, "peer@im.wechat")).toBe(
      "acct-a",
    );
  }, 20_000);

  it("auto-selects the uniquely matched account using persisted context-token state", async () => {
    accounts.registerWeixinAccountId("acct-a");
    accounts.registerWeixinAccountId("acct-b");
    inbound.setContextToken("acct-b", "peer@im.wechat", "ctx-b");

    expect(accountSelection.resolveOutboundAccountId({ channels: {} } as never, "peer@im.wechat")).toBe(
      "acct-b",
    );
  }, 20_000);

  it("rejects ambiguous account matches", async () => {
    accounts.registerWeixinAccountId("acct-a");
    accounts.registerWeixinAccountId("acct-b");
    inbound.setContextToken("acct-a", "peer@im.wechat", "ctx-a");
    inbound.setContextToken("acct-b", "peer@im.wechat", "ctx-b");

    expect(() =>
      accountSelection.resolveOutboundAccountId({ channels: {} } as never, "peer@im.wechat"),
    ).toThrow(/ambiguous account/i);
  }, 20_000);

  it("rejects missing matches when multiple accounts exist", async () => {
    accounts.registerWeixinAccountId("acct-a");
    accounts.registerWeixinAccountId("acct-b");

    expect(() =>
      accountSelection.resolveOutboundAccountId({ channels: {} } as never, "peer@im.wechat"),
    ).toThrow(/cannot determine which account to use/i);
  }, 20_000);

  it("advertises official block-streaming defaults for OpenClaw replies", async () => {
    expect(channel.weixinPlugin.capabilities.blockStreaming).toBe(true);
    expect(channel.weixinPlugin.streaming?.blockStreamingCoalesceDefaults).toEqual({
      minChars: 200,
      idleMs: 3000,
    });
  }, 20_000);

  it("allows outbound text without a persisted context token", async () => {
    accounts.saveWeixinAccount("acct-a", {
      token: "bot-token",
      baseUrl: "https://example.com",
      userId: "bot-user",
    });

    const result = await channel.weixinPlugin.outbound.sendText({
      cfg: { channels: {} } as never,
      to: "peer@im.wechat",
      text: "hello",
      accountId: "acct-a",
    });

    expect(result).toEqual({
      channel: "weixin-agent-gateway",
      messageId: expect.any(String),
    });
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0]).toMatchObject({
      baseUrl: "https://example.com",
      body: {
        msg: {
          to_user_id: "peer@im.wechat",
          context_token: undefined,
        },
      },
    });
  }, 20_000);
});
