import type { WeixinBackendAdapter } from "../contracts.js";
import { QwenAcpClient } from "./acp-client.js";

const qwenAcpClient = new QwenAcpClient();

export const qwenBackendAdapter: WeixinBackendAdapter = {
  id: "qwen",
  mode: "lightweight",
  async reply(input) {
    return qwenAcpClient.runLightweightConversation(input);
  },
};
