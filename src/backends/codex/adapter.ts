import type { WeixinBackendAdapter } from "../contracts.js";
import { AgentApiClient } from "../lightweight/agentapi-client.js";
import { DEFAULT_CODEX_AGENTAPI_URL } from "../lightweight/agentapi-launcher.js";

function resolveCodexAgentApiUrl(): string {
  return process.env.WEIXIN_CODEX_AGENTAPI_URL?.trim() || process.env.CODEX_AGENTAPI_URL?.trim() || DEFAULT_CODEX_AGENTAPI_URL;
}

export const codexBackendAdapter: WeixinBackendAdapter = {
  id: "codex",
  mode: "lightweight",
  async reply(input) {
    const baseUrl = resolveCodexAgentApiUrl();
    const client = new AgentApiClient({
      label: "codex-agentapi",
      baseUrl,
      autoStart: {
        backendId: "codex",
      },
    });
    return client.runLightweightConversation(input);
  },
};
