import { createTypingCallbacks } from "openclaw/plugin-sdk";
import type { OpenClawConfig, PluginRuntime } from "openclaw/plugin-sdk";

export function createOpenClawTypingCallbacks(
  params: Parameters<typeof createTypingCallbacks>[0],
): ReturnType<typeof createTypingCallbacks> {
  return createTypingCallbacks(params);
}

export function createOpenClawReplyDispatcher(params: {
  channelRuntime: PluginRuntime["channel"];
  config: OpenClawConfig;
  agentId?: string | null;
  typingCallbacks: Parameters<PluginRuntime["channel"]["reply"]["createReplyDispatcherWithTyping"]>[0]["typingCallbacks"];
  deliver: Parameters<PluginRuntime["channel"]["reply"]["createReplyDispatcherWithTyping"]>[0]["deliver"];
  onError: Parameters<PluginRuntime["channel"]["reply"]["createReplyDispatcherWithTyping"]>[0]["onError"];
}): ReturnType<PluginRuntime["channel"]["reply"]["createReplyDispatcherWithTyping"]> {
  const humanDelay = params.channelRuntime.reply.resolveHumanDelayConfig(params.config, params.agentId);
  return params.channelRuntime.reply.createReplyDispatcherWithTyping({
    humanDelay,
    typingCallbacks: params.typingCallbacks,
    deliver: params.deliver,
    onError: params.onError,
  });
}

