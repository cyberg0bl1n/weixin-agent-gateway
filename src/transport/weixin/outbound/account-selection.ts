import type { OpenClawConfig } from "openclaw/plugin-sdk/core";

import { listWeixinAccountIds } from "../../../auth/accounts.js";
import { WEIXIN_CHANNEL_ID } from "../../../constants.js";
import { findAccountIdsByContextToken } from "../../../messaging/inbound.js";
import { logger } from "../../../util/logger.js";

export function resolveOutboundAccountId(cfg: OpenClawConfig, to: string): string {
  const allIds = listWeixinAccountIds(cfg);

  if (allIds.length === 0) {
    throw new Error(
      `weixin: no accounts registered — run \`openclaw channels login --channel ${WEIXIN_CHANNEL_ID}\``,
    );
  }

  if (allIds.length === 1) {
    logger.info(`resolveOutboundAccountId: single account, using ${allIds[0]}`);
    return allIds[0];
  }

  const matched = findAccountIdsByContextToken(allIds, to);
  if (matched.length === 1) {
    logger.info(`resolveOutboundAccountId: matched accountId=${matched[0]} for to=${to}`);
    return matched[0];
  }

  if (matched.length > 1) {
    logger.warn(
      `resolveOutboundAccountId: ambiguous — ${matched.length} accounts matched for to=${to}: ${matched.join(", ")}`,
    );
    throw new Error(
      `weixin: ambiguous account for to=${to} ` +
      `(${matched.length} accounts have active sessions with this recipient: ${matched.join(", ")}). ` +
      `Specify accountId in the delivery config to disambiguate.`,
    );
  }

  throw new Error(
    `weixin: cannot determine which account to use for to=${to} ` +
    `(${allIds.length} accounts registered, none has an active session with this recipient). ` +
    `Specify accountId in the delivery config, or ensure the recipient has recently messaged the bot.`,
  );
}
