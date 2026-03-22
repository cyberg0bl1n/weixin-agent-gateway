import {
  DEFAULT_WEIXIN_BACKEND_ID,
  type WeixinBackendAdapter,
  type ResolvedWeixinBackend,
  isImplementedWeixinBackendId,
} from "../backends/contracts.js";
import { getWeixinBackendAdapter } from "../backends/registry.js";
import { getBackendSelection } from "./backend-selection.js";
import { logger } from "../util/logger.js";

export function resolveWeixinBackend(params: {
  accountId: string;
  peerId: string;
}): ResolvedWeixinBackend {
  const storedSelection = getBackendSelection(params.accountId, params.peerId);
  const requestedBackendId = storedSelection?.backendId ?? DEFAULT_WEIXIN_BACKEND_ID;
  if (isImplementedWeixinBackendId(requestedBackendId)) {
    return {
      requestedBackendId,
      backendId: requestedBackendId,
      source: storedSelection ? "stored" : "default",
    };
  }
  return {
    requestedBackendId,
    backendId: DEFAULT_WEIXIN_BACKEND_ID,
    source: "fallback",
    warning: `backend "${requestedBackendId}" is not implemented yet; falling back to "${DEFAULT_WEIXIN_BACKEND_ID}"`,
  };
}

export function resolveWeixinBackendAdapter(params: {
  resolvedBackend: ResolvedWeixinBackend;
  accountId: string;
}): WeixinBackendAdapter {
  const { resolvedBackend, accountId } = params;
  if (resolvedBackend.warning) {
    logger.warn(
      `[router] account=${accountId} requested=${resolvedBackend.requestedBackendId} fallback=${resolvedBackend.backendId}: ${resolvedBackend.warning}`,
    );
  }
  return getWeixinBackendAdapter(resolvedBackend.backendId);
}
