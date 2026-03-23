import type { ImplementedWeixinBackendId, WeixinBackendAdapter } from "./contracts.js";
import { auggieBackendAdapter } from "./auggie/adapter.js";
import { claudeBackendAdapter } from "./claude/adapter.js";
import { copilotBackendAdapter } from "./copilot/adapter.js";
import { codexBackendAdapter } from "./codex/adapter.js";
import { cursorBackendAdapter } from "./cursor/adapter.js";
import { kimiBackendAdapter } from "./kimi/adapter.js";
import { openclawBackendAdapter } from "./openclaw/adapter.js";
import { opencodeBackendAdapter } from "./opencode/adapter.js";
import { qoderBackendAdapter } from "./qoder/adapter.js";
import { qwenBackendAdapter } from "./qwen/adapter.js";

const backendAdapters: Record<ImplementedWeixinBackendId, WeixinBackendAdapter> = {
  auggie: auggieBackendAdapter,
  claude: claudeBackendAdapter,
  copilot: copilotBackendAdapter,
  codex: codexBackendAdapter,
  cursor: cursorBackendAdapter,
  kimi: kimiBackendAdapter,
  openclaw: openclawBackendAdapter,
  opencode: opencodeBackendAdapter,
  qoder: qoderBackendAdapter,
  qwen: qwenBackendAdapter,
};

export function getWeixinBackendAdapter(id: ImplementedWeixinBackendId): WeixinBackendAdapter {
  return backendAdapters[id];
}

export function listImplementedWeixinBackendAdapters(): WeixinBackendAdapter[] {
  return Object.values(backendAdapters);
}
