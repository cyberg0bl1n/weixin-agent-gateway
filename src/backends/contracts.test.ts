import { describe, expect, it } from "vitest";

import {
  IMPLEMENTED_WEIXIN_BACKEND_IDS,
  normalizeWeixinBackendId,
} from "./contracts.js";

describe("backend contracts", () => {
  it("includes qwen and kimi in implemented backend ids", () => {
    expect(IMPLEMENTED_WEIXIN_BACKEND_IDS).toContain("qoder");
    expect(IMPLEMENTED_WEIXIN_BACKEND_IDS).toContain("qwen");
    expect(IMPLEMENTED_WEIXIN_BACKEND_IDS).toContain("kimi");
  });

  it("normalizes qoder, qwen and kimi aliases", () => {
    expect(normalizeWeixinBackendId("qoder")).toBe("qoder");
    expect(normalizeWeixinBackendId("qoder-cli")).toBe("qoder");
    expect(normalizeWeixinBackendId("qwen")).toBe("qwen");
    expect(normalizeWeixinBackendId("qwen-code")).toBe("qwen");
    expect(normalizeWeixinBackendId("kimi")).toBe("kimi");
    expect(normalizeWeixinBackendId("kimi-cli")).toBe("kimi");
    expect(normalizeWeixinBackendId("kimi-code")).toBe("kimi");
  });
});
