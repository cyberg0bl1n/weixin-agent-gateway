import type { WeixinBackendAdapter } from "../contracts.js";
import { CodexAcpClient } from "./acp-client.js";

const codexAcpClient = new CodexAcpClient();

export const codexBackendAdapter: WeixinBackendAdapter = {
  id: "codex",
  mode: "lightweight",
  async reply(input) {
    return codexAcpClient.runLightweightConversation(input);
  },
};
