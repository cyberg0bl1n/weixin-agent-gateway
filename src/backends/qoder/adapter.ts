import type { WeixinBackendAdapter } from "../contracts.js";
import { QoderAcpClient } from "./acp-client.js";

const qoderAcpClient = new QoderAcpClient();

export const qoderBackendAdapter: WeixinBackendAdapter = {
  id: "qoder",
  mode: "lightweight",
  async reply(input) {
    return qoderAcpClient.runLightweightConversation(input);
  },
};
