import type { ImplementedWeixinBackendId, WeixinBackendAdapter } from "./contracts.js";
import { claudeBackendAdapter } from "./claude/adapter.js";
import { codexBackendAdapter } from "./codex/adapter.js";
import { openclawBackendAdapter } from "./openclaw/adapter.js";

const backendAdapters: Record<ImplementedWeixinBackendId, WeixinBackendAdapter> = {
  claude: claudeBackendAdapter,
  codex: codexBackendAdapter,
  openclaw: openclawBackendAdapter,
};

export function getWeixinBackendAdapter(id: ImplementedWeixinBackendId): WeixinBackendAdapter {
  return backendAdapters[id];
}

export function listImplementedWeixinBackendAdapters(): WeixinBackendAdapter[] {
  return Object.values(backendAdapters);
}
