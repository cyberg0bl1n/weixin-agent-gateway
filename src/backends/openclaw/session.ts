import type { OpenClawConfig, PluginRuntime } from "openclaw/plugin-sdk";

import { WEIXIN_CHANNEL_ID } from "../../constants.js";
import type { WeixinMsgContext } from "../../messaging/inbound.js";

import type { OpenClawResolvedRoute } from "./routing.js";

export type FinalizedOpenClawInboundContext = ReturnType<
  PluginRuntime["channel"]["reply"]["finalizeInboundContext"]
>;

export function finalizeOpenClawInboundContext(params: {
  channelRuntime: PluginRuntime["channel"];
  config: OpenClawConfig;
  route: OpenClawResolvedRoute;
  ctx: WeixinMsgContext;
}): {
  finalized: FinalizedOpenClawInboundContext;
  storePath: string;
} {
  params.ctx.SessionKey = params.route.sessionKey;
  const storePath = params.channelRuntime.session.resolveStorePath(params.config.session?.store, {
    agentId: params.route.agentId,
  });
  const finalized = params.channelRuntime.reply.finalizeInboundContext(
    params.ctx as Parameters<PluginRuntime["channel"]["reply"]["finalizeInboundContext"]>[0],
  );
  return { finalized, storePath };
}

export async function recordOpenClawInboundSession(params: {
  channelRuntime: PluginRuntime["channel"];
  storePath: string;
  route: OpenClawResolvedRoute;
  finalized: FinalizedOpenClawInboundContext;
  accountId: string;
  to: string;
  errLog: (message: string) => void;
}): Promise<void> {
  await params.channelRuntime.session.recordInboundSession({
    storePath: params.storePath,
    sessionKey: params.route.sessionKey,
    ctx: params.finalized as Parameters<PluginRuntime["channel"]["session"]["recordInboundSession"]>[0]["ctx"],
    updateLastRoute: {
      sessionKey: params.route.mainSessionKey,
      channel: WEIXIN_CHANNEL_ID,
      to: params.to,
      accountId: params.accountId,
    },
    onRecordError: (err) => params.errLog(`recordInboundSession: ${String(err)}`),
  });
}
