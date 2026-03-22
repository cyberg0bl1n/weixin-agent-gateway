import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_WEIXIN_BACKEND_ID,
  type WeixinBackendId,
  isWeixinBackendId,
} from "../backends/contracts.js";
import { WEIXIN_STATE_NAMESPACE } from "../constants.js";
import { resolveStateDir } from "../storage/state-dir.js";

type BackendSelectionRecord = {
  backendId: WeixinBackendId;
  updatedAt: string;
};

type BackendSelectionFile = {
  version: number;
  selections: Record<string, BackendSelectionRecord>;
};

export type BackendSelectionState = BackendSelectionRecord & {
  accountId: string;
  peerId: string;
};

const BACKEND_SELECTION_FILE_VERSION = 1;

function resolveBackendSelectionDir(): string {
  return path.join(resolveStateDir(), WEIXIN_STATE_NAMESPACE);
}

function resolveBackendSelectionPath(): string {
  return path.join(resolveBackendSelectionDir(), "backend-selection.json");
}

function makeSelectionKey(accountId: string, peerId: string): string {
  return `${accountId}:${peerId}`;
}

function readBackendSelectionFile(): BackendSelectionFile {
  const filePath = resolveBackendSelectionPath();
  try {
    if (!fs.existsSync(filePath)) {
      return { version: BACKEND_SELECTION_FILE_VERSION, selections: {} };
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<BackendSelectionFile>;
    const selections = parsed.selections ?? {};
    const normalized: Record<string, BackendSelectionRecord> = {};
    for (const [key, value] of Object.entries(selections)) {
      if (!value || typeof value !== "object") continue;
      const backendId = (value as { backendId?: string }).backendId;
      if (!backendId || !isWeixinBackendId(backendId)) continue;
      normalized[key] = {
        backendId,
        updatedAt:
          typeof (value as { updatedAt?: string }).updatedAt === "string"
            ? (value as { updatedAt: string }).updatedAt
            : new Date(0).toISOString(),
      };
    }
    return { version: BACKEND_SELECTION_FILE_VERSION, selections: normalized };
  } catch {
    return { version: BACKEND_SELECTION_FILE_VERSION, selections: {} };
  }
}

function writeBackendSelectionFile(data: BackendSelectionFile): void {
  const dir = resolveBackendSelectionDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolveBackendSelectionPath(), JSON.stringify(data, null, 2), "utf-8");
}

export function getBackendSelection(
  accountId: string,
  peerId: string,
): BackendSelectionState | undefined {
  const file = readBackendSelectionFile();
  const record = file.selections[makeSelectionKey(accountId, peerId)];
  if (!record) return undefined;
  return { accountId, peerId, ...record };
}

export function getSelectedBackendId(accountId: string, peerId: string): WeixinBackendId {
  return getBackendSelection(accountId, peerId)?.backendId ?? DEFAULT_WEIXIN_BACKEND_ID;
}

export function setBackendSelection(
  accountId: string,
  peerId: string,
  backendId: WeixinBackendId,
): BackendSelectionState {
  const file = readBackendSelectionFile();
  const next: BackendSelectionRecord = {
    backendId,
    updatedAt: new Date().toISOString(),
  };
  file.selections[makeSelectionKey(accountId, peerId)] = next;
  writeBackendSelectionFile(file);
  return { accountId, peerId, ...next };
}

export function clearBackendSelection(accountId: string, peerId: string): boolean {
  const file = readBackendSelectionFile();
  const key = makeSelectionKey(accountId, peerId);
  if (!file.selections[key]) return false;
  delete file.selections[key];
  writeBackendSelectionFile(file);
  return true;
}
