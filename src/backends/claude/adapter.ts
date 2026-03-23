import type { WeixinBackendAdapter } from "../contracts.js";
import { ClaudeAcpClient } from "./acp-client.js";

const claudeAcpClient = new ClaudeAcpClient();

export const claudeBackendAdapter: WeixinBackendAdapter = {
  id: "claude",
  mode: "lightweight",
  async reply(input) {
    return claudeAcpClient.runLightweightConversation(input);
  },
};
