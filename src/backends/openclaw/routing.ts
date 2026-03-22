import type { OpenClawConfig, PluginRuntime } from "openclaw/plugin-sdk";

import { WEIXIN_CHANNEL_ID } from "../../constants.js";

export type OpenClawResolvedRoute = ReturnType<PluginRuntime["channel"]["routing"]["resolveAgentRoute"]>;

export function resolveOpenClawAgentRoute(params: {
  channelRuntime: PluginRuntime["channel"];
  config: OpenClawConfig;
  accountId: string;
  peerId: string;
}): OpenClawResolvedRoute {
  return params.channelRuntime.routing.resolveAgentRoute({
    cfg: params.config,
    channel: WEIXIN_CHANNEL_ID,
    accountId: params.accountId,
    peer: { kind: "direct", id: params.peerId },
  });
}
