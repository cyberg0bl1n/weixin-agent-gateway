import fs from "node:fs/promises";
import path from "node:path";

import type {
  WeixinLightweightBackendInput,
  WeixinLightweightBackendOutput,
} from "../contracts.js";

type AgentApiMessage = {
  id: number;
  role: "user" | "agent";
  content: string;
  time: string;
};

type AgentApiStatusResponse = {
  status: "running" | "stable";
  agent_type: string;
  transport: "acp" | "pty";
};

type AgentApiMessagesResponse = {
  messages?: AgentApiMessage[];
};

type AgentApiMessageResponse = {
  ok: boolean;
};

type AgentApiUploadResponse = {
  ok: boolean;
  filePath?: string;
  path?: string;
};

type AgentApiClientOptions = {
  label: string;
  baseUrl: string;
  requestTimeoutMs?: number;
  settleTimeoutMs?: number;
  pollIntervalMs?: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_SETTLE_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

function trimTrailingSlash(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function fetchJson<T>(params: {
  url: string;
  init?: RequestInit;
  timeoutMs?: number;
  label: string;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(params.url, { ...params.init, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${params.label}: HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
    }
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`${params.label}: request timeout`);
    }
    const cause = (err as { cause?: unknown }).cause;
    const causeMessage =
      cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string"
        ? ` (${cause.message})`
        : "";
    if (err instanceof Error) {
      throw new Error(`${params.label}: ${err.message}${causeMessage}`);
    }
    throw new Error(`${params.label}: ${String(err)}${causeMessage}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(input: WeixinLightweightBackendInput, uploadedPaths: string[]): string {
  const parts: string[] = [];
  const text = input.text.trim();
  if (text) {
    parts.push(text);
  }
  if (uploadedPaths.length > 0) {
    parts.push(
      [
        "Attached image file paths on the remote machine:",
        ...uploadedPaths.map((filePath) => `- ${filePath}`),
        "Please inspect these files directly when relevant.",
      ].join("\n"),
    );
  }
  if (parts.length === 0) {
    return "The user sent an empty message.";
  }
  return parts.join("\n\n");
}

export class AgentApiClient {
  private readonly label: string;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly settleTimeoutMs: number;
  private readonly pollIntervalMs: number;

  constructor(options: AgentApiClientOptions) {
    this.label = options.label;
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.settleTimeoutMs = options.settleTimeoutMs ?? DEFAULT_SETTLE_TIMEOUT_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  async getStatus(): Promise<AgentApiStatusResponse> {
    return fetchJson<AgentApiStatusResponse>({
      url: `${this.baseUrl}/status`,
      timeoutMs: this.requestTimeoutMs,
      label: `${this.label} GET /status`,
    });
  }

  async getMessages(): Promise<AgentApiMessage[]> {
    const body = await fetchJson<AgentApiMessagesResponse | AgentApiMessage[]>({
      url: `${this.baseUrl}/messages`,
      timeoutMs: this.requestTimeoutMs,
      label: `${this.label} GET /messages`,
    });
    if (Array.isArray(body)) {
      return body;
    }
    return Array.isArray(body.messages) ? body.messages : [];
  }

  async waitUntilStable(timeoutMs = this.settleTimeoutMs): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const status = await this.getStatus();
      if (status.status === "stable") return;
      await sleep(this.pollIntervalMs);
    }
    throw new Error(`${this.label}: agent did not reach stable state in time`);
  }

  async postMessage(content: string): Promise<void> {
    const body = await fetchJson<AgentApiMessageResponse>({
      url: `${this.baseUrl}/message`,
      timeoutMs: this.requestTimeoutMs,
      label: `${this.label} POST /message`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          type: "user",
        }),
      },
    });
    if (!body.ok) {
      throw new Error(`${this.label}: message was not accepted by agentapi`);
    }
  }

  async uploadFile(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const content = await fs.readFile(filePath);
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(content)], { type: "application/octet-stream" }), fileName);
    const body = await fetchJson<AgentApiUploadResponse>({
      url: `${this.baseUrl}/upload`,
      timeoutMs: this.requestTimeoutMs,
      label: `${this.label} POST /upload`,
      init: {
        method: "POST",
        body: formData,
      },
    });
    const uploadedPath = body.filePath ?? body.path;
    if (!body.ok || !uploadedPath) {
      throw new Error(`${this.label}: upload failed`);
    }
    return uploadedPath;
  }

  async runLightweightConversation(
    input: WeixinLightweightBackendInput,
  ): Promise<WeixinLightweightBackendOutput | void> {
    await this.waitUntilStable();
    const beforeMessages = await this.getMessages();
    const lastSeenId = beforeMessages.length > 0 ? beforeMessages[beforeMessages.length - 1].id : 0;

    const uploadedPaths: string[] = [];
    for (const imagePath of input.imagePaths) {
      uploadedPaths.push(await this.uploadFile(imagePath));
    }

    const prompt = buildPrompt(input, uploadedPaths);
    await this.postMessage(prompt);
    await this.waitUntilStable();

    const afterMessages = await this.getMessages();
    const newAgentMessages = afterMessages.filter((msg) => msg.id > lastSeenId && msg.role === "agent");
    const text = newAgentMessages.map((msg) => msg.content.trim()).filter(Boolean).join("\n\n").trim();
    if (!text) {
      return;
    }
    return { text };
  }
}
