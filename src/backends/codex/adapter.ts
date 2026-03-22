import type { WeixinBackendAdapter } from "../contracts.js";
import { AgentApiClient } from "../lightweight/agentapi-client.js";

function resolveCodexAgentApiUrl(): string | undefined {
  return process.env.WEIXIN_CODEX_AGENTAPI_URL?.trim() || process.env.CODEX_AGENTAPI_URL?.trim();
}

export const codexBackendAdapter: WeixinBackendAdapter = {
  id: "codex",
  mode: "lightweight",
  async reply(input) {
    const baseUrl = resolveCodexAgentApiUrl();
    if (!baseUrl) {
      return {
        text: "Codex 后端未配置。请设置环境变量 WEIXIN_CODEX_AGENTAPI_URL。",
      };
    }
    const client = new AgentApiClient({
      label: "codex-agentapi",
      baseUrl,
    });
    return client.runLightweightConversation(input);
  },
};

