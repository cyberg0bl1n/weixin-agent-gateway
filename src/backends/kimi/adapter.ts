import type { WeixinBackendAdapter } from "../contracts.js";
import { KimiAcpClient } from "./acp-client.js";

const kimiAcpClient = new KimiAcpClient();

export const kimiBackendAdapter: WeixinBackendAdapter = {
  id: "kimi",
  mode: "lightweight",
  async reply(input) {
    return kimiAcpClient.runLightweightConversation(input);
  },
};
