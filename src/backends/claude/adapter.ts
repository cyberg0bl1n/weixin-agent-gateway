import type { WeixinBackendAdapter } from "../contracts.js";
import { AgentApiClient } from "../lightweight/agentapi-client.js";

function resolveClaudeAgentApiUrl(): string | undefined {
  return process.env.WEIXIN_CLAUDE_AGENTAPI_URL?.trim() || process.env.CLAUDE_AGENTAPI_URL?.trim();
}

export const claudeBackendAdapter: WeixinBackendAdapter = {
  id: "claude",
  mode: "lightweight",
  async reply(input) {
    const baseUrl = resolveClaudeAgentApiUrl();
    if (!baseUrl) {
      return {
        text: "Claude Code 后端未配置。请设置环境变量 WEIXIN_CLAUDE_AGENTAPI_URL。",
      };
    }
    const client = new AgentApiClient({
      label: "claude-agentapi",
      baseUrl,
    });
    return client.runLightweightConversation(input);
  },
};

