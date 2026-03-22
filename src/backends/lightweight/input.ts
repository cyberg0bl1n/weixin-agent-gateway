import type { WeixinMessage } from "../../api/types.js";
import type { WeixinInboundMediaOpts, WeixinMsgContext } from "../../messaging/inbound.js";

import type { WeixinLightweightBackendInput } from "../contracts.js";

export function buildWeixinLightweightBackendInput(params: {
  full: WeixinMessage;
  ctx: WeixinMsgContext;
  mediaOpts: WeixinInboundMediaOpts;
  accountId: string;
}): WeixinLightweightBackendInput {
  const imagePaths: string[] = [];
  if (params.mediaOpts.decryptedPicPath) {
    imagePaths.push(params.mediaOpts.decryptedPicPath);
  }
  return {
    accountId: params.accountId,
    peerId: params.ctx.To,
    senderId: params.full.from_user_id ?? params.ctx.From,
    text: params.ctx.Body ?? "",
    imagePaths,
    contextToken: params.ctx.context_token,
    messageId: params.full.message_id,
    timestamp: params.full.create_time_ms,
  };
}

