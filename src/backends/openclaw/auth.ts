import {
  resolveDirectDmAuthorizationOutcome,
  resolveSenderCommandAuthorizationWithRuntime,
} from "openclaw/plugin-sdk";
import type { OpenClawConfig, PluginRuntime } from "openclaw/plugin-sdk";

import { loadWeixinAccount } from "../../auth/accounts.js";
import { readFrameworkAllowFromList } from "../../auth/pairing.js";

export type OpenClawAuthorizationResult = {
  senderAllowedForCommands: boolean;
  commandAuthorized: boolean;
  directDmOutcome: ReturnType<typeof resolveDirectDmAuthorizationOutcome>;
};

export async function resolveOpenClawAuthorization(params: {
  config: OpenClawConfig;
  accountId: string;
  rawBody: string;
  senderId: string;
  channelRuntime: PluginRuntime["channel"];
}): Promise<OpenClawAuthorizationResult> {
  const { senderAllowedForCommands, commandAuthorized } =
    await resolveSenderCommandAuthorizationWithRuntime({
      cfg: params.config,
      rawBody: params.rawBody,
      isGroup: false,
      dmPolicy: "pairing",
      configuredAllowFrom: [],
      configuredGroupAllowFrom: [],
      senderId: params.senderId,
      isSenderAllowed: (id: string, list: string[]) => list.length === 0 || list.includes(id),
      readAllowFromStore: async () => {
        const fromStore = readFrameworkAllowFromList(params.accountId);
        if (fromStore.length > 0) return fromStore;
        const uid = loadWeixinAccount(params.accountId)?.userId?.trim();
        return uid ? [uid] : [];
      },
      runtime: params.channelRuntime.commands,
    });

  const directDmOutcome = resolveDirectDmAuthorizationOutcome({
    isGroup: false,
    dmPolicy: "pairing",
    senderAllowedForCommands,
  });

  return {
    senderAllowedForCommands,
    commandAuthorized,
    directDmOutcome,
  };
}

