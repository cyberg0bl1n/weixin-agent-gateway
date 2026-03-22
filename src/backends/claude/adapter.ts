import type { WeixinBackendAdapter } from "../contracts.js";
import { AgentApiClient } from "../lightweight/agentapi-client.js";
import { DEFAULT_CLAUDE_AGENTAPI_URL } from "../lightweight/agentapi-launcher.js";

function resolveClaudeAgentApiUrl(): string {
  return process.env.WEIXIN_CLAUDE_AGENTAPI_URL?.trim() || process.env.CLAUDE_AGENTAPI_URL?.trim() || DEFAULT_CLAUDE_AGENTAPI_URL;
}

export const claudeBackendAdapter: WeixinBackendAdapter = {
  id: "claude",
  mode: "lightweight",
  async reply(input) {
    const baseUrl = resolveClaudeAgentApiUrl();
    const client = new AgentApiClient({
      label: "claude-agentapi",
      baseUrl,
      autoStart: {
        backendId: "claude",
      },
    });
    return client.runLightweightConversation(input);
  },
};
