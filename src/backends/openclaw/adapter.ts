import type { PluginRuntime } from "openclaw/plugin-sdk";

import type { WeixinBackendAdapter, WeixinBackendDispatchContext } from "../contracts.js";

import { logger } from "../../util/logger.js";

type OpenClawBackendDispatchContext = {
  config: import("openclaw/plugin-sdk/core").OpenClawConfig;
  channelRuntime: PluginRuntime["channel"];
  agentId?: string | null;
  finalized: unknown;
  dispatcher: unknown;
  replyOptions: unknown;
};

function castOpenClawDispatchContext(ctx: WeixinBackendDispatchContext): OpenClawBackendDispatchContext {
  return ctx.backendContext as OpenClawBackendDispatchContext;
}

function castDispatcher(
  dispatcher: unknown,
): Parameters<PluginRuntime["channel"]["reply"]["withReplyDispatcher"]>[0]["dispatcher"] {
  return dispatcher as Parameters<PluginRuntime["channel"]["reply"]["withReplyDispatcher"]>[0]["dispatcher"];
}

function castDispatchArgs(ctx: OpenClawBackendDispatchContext): {
  ctx: Parameters<PluginRuntime["channel"]["reply"]["dispatchReplyFromConfig"]>[0]["ctx"];
  dispatcher: Parameters<PluginRuntime["channel"]["reply"]["dispatchReplyFromConfig"]>[0]["dispatcher"];
  replyOptions: Parameters<PluginRuntime["channel"]["reply"]["dispatchReplyFromConfig"]>[0]["replyOptions"];
} {
  return {
    ctx: ctx.finalized as Parameters<PluginRuntime["channel"]["reply"]["dispatchReplyFromConfig"]>[0]["ctx"],
    dispatcher:
      ctx.dispatcher as Parameters<PluginRuntime["channel"]["reply"]["dispatchReplyFromConfig"]>[0]["dispatcher"],
    replyOptions:
      ctx.replyOptions as Parameters<PluginRuntime["channel"]["reply"]["dispatchReplyFromConfig"]>[0]["replyOptions"],
  };
}

export const openclawBackendAdapter: WeixinBackendAdapter = {
  id: "openclaw",
  mode: "openclaw",
  async dispatch(ctx) {
    const backendCtx = castOpenClawDispatchContext(ctx);
    logger.debug(`backend=openclaw dispatch: starting agentId=${backendCtx.agentId ?? "(none)"}`);
    const dispatcher = castDispatcher(backendCtx.dispatcher);
    const dispatchArgs = castDispatchArgs(backendCtx);
    try {
      await backendCtx.channelRuntime.reply.withReplyDispatcher({
        dispatcher,
        run: () =>
          backendCtx.channelRuntime.reply.dispatchReplyFromConfig({
            ctx: dispatchArgs.ctx,
            cfg: backendCtx.config,
            dispatcher: dispatchArgs.dispatcher,
            replyOptions: dispatchArgs.replyOptions,
          }),
      });
      logger.debug(`backend=openclaw dispatch: done agentId=${backendCtx.agentId ?? "(none)"}`);
    } catch (err) {
      logger.error(`backend=openclaw dispatch: error agentId=${backendCtx.agentId ?? "(none)"} err=${String(err)}`);
      throw err;
    }
  },
};
