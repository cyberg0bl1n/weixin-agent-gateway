import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";

import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  ndJsonStream,
  type ContentBlock,
  type PermissionOption,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionId,
  type SessionNotification,
} from "@agentclientprotocol/sdk";

import { getExtensionFromMime, getMimeFromFilename } from "../../media/mime.js";
import { logger } from "../../util/logger.js";
import type {
  WeixinLightweightBackendProgress,
  WeixinLightweightBackendInput,
  WeixinLightweightBackendOutput,
} from "../contracts.js";

type ClaudePermissionMode = "auto" | "cancel";

type ClaudeAcpConnectionState = {
  connection: ClientSideConnection;
  process: ChildProcessWithoutNullStreams;
};

type ClaudeAcpImageData = {
  base64: string;
  mimeType: string;
};

const DEFAULT_CLAUDE_ACP_COMMAND = "claude-agent-acp";
const DEFAULT_EMPTY_PROMPT_TEXT = "The user sent an empty message.";
const CLAUDE_ACP_MEDIA_OUT_DIR = path.join(os.tmpdir(), "weixin-agent-gateway", "media", "claude-acp-out");

function isWindows(): boolean {
  return process.platform === "win32";
}

function resolveCommandPath(command: string): string | undefined {
  if (!command.trim()) return undefined;
  if (path.isAbsolute(command) || command.includes(path.sep)) {
    return fs.existsSync(command) ? command : undefined;
  }
  const checker = isWindows() ? "where" : "which";
  const result = spawnSync(checker, [command], {
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  });
  if (result.status !== 0) return undefined;
  return result.stdout
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .find(Boolean);
}

function resolveClaudeAcpCommand(): string {
  const raw = process.env.WEIXIN_CLAUDE_ACP_BIN?.trim()
    || process.env.CLAUDE_ACP_BIN?.trim()
    || DEFAULT_CLAUDE_ACP_COMMAND;
  return resolveCommandPath(raw) ?? raw;
}

function assertClaudeAcpCommandAvailable(command: string): void {
  if (resolveCommandPath(command)) return;
  throw new Error(
    `Claude ACP startup failed: executable "${command}" was not found. Install @zed-industries/claude-agent-acp or set WEIXIN_CLAUDE_ACP_BIN.`,
  );
}

function resolveClaudeAcpCwd(): string {
  const cwd = process.env.WEIXIN_CLAUDE_ACP_CWD?.trim()
    || process.env.CLAUDE_ACP_CWD?.trim()
    || process.cwd();
  if (!fs.existsSync(cwd)) {
    throw new Error(`Claude ACP startup failed: working directory "${cwd}" does not exist.`);
  }
  return cwd;
}

function resolveClaudePermissionMode(): ClaudePermissionMode {
  const raw = process.env.WEIXIN_CLAUDE_ACP_PERMISSION_MODE?.trim()
    || process.env.CLAUDE_ACP_PERMISSION_MODE?.trim()
    || "auto";
  return raw.toLowerCase() === "cancel" ? "cancel" : "auto";
}

function selectPermissionOption(options: PermissionOption[]): PermissionOption | undefined {
  const preferredKinds: PermissionOption["kind"][] = ["allow_once", "allow_always"];
  for (const kind of preferredKinds) {
    const option = options.find((candidate) => candidate.kind === kind);
    if (option) return option;
  }
  return options[0];
}

function normalizeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function wrapClaudeAcpError(err: unknown): Error {
  const message = normalizeErrorMessage(err);
  const lower = message.toLowerCase();
  if (lower.includes("auth_required") || lower.includes("authenticate")) {
    return new Error(
      "Claude ACP requires authentication. Run `claude` manually in the target workdir and complete login/trust first.",
    );
  }
  if (lower.includes("enoent") || lower.includes("spawn")) {
    return new Error(
      `Claude ACP startup failed. Ensure "${resolveClaudeAcpCommand()}" is installed and available in PATH.`,
    );
  }
  return err instanceof Error ? err : new Error(message);
}

function normalizeProgressText(text: string): string | undefined {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  return normalized || undefined;
}

function countCodeFences(text: string): number {
  return (text.match(/```/g) ?? []).length;
}

function extractReadyMessageSegments(buffer: string): {
  rest: string;
  segments: string[];
} {
  if (!buffer.trim()) {
    return {
      rest: "",
      segments: [],
    };
  }
  if (countCodeFences(buffer) % 2 === 1) {
    return {
      rest: buffer,
      segments: [],
    };
  }

  const segments: string[] = [];
  const boundaryPattern = /\n{2,}|[。！？!?]|(?:\.(?=\s|$))/g;
  let lastIndex = 0;
  let match = boundaryPattern.exec(buffer);
  while (match) {
    const raw = buffer.slice(lastIndex, boundaryPattern.lastIndex);
    const normalized = normalizeProgressText(raw);
    if (normalized) {
      segments.push(normalized);
    }
    lastIndex = boundaryPattern.lastIndex;
    match = boundaryPattern.exec(buffer);
  }

  return {
    rest: buffer.slice(lastIndex),
    segments,
  };
}

function formatPlanProgress(update: Extract<SessionNotification["update"], { sessionUpdate: "plan" }>): string | undefined {
  const activeEntry = update.entries.find((entry) => entry.status === "in_progress")
    ?? update.entries.find((entry) => entry.status === "pending");
  return normalizeProgressText(activeEntry?.content ?? "");
}

async function buildPromptBlocks(input: WeixinLightweightBackendInput): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [];
  const text = input.text.trim();
  if (text) {
    blocks.push({ type: "text", text });
  }

  for (const imagePath of input.imagePaths) {
    const data = await fsp.readFile(imagePath);
    blocks.push({
      type: "image",
      data: data.toString("base64"),
      mimeType: getMimeFromFilename(imagePath),
    });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", text: DEFAULT_EMPTY_PROMPT_TEXT });
  }

  return blocks;
}

class ClaudeAcpResponseCollector {
  private imageData: ClaudeAcpImageData | undefined;
  private lastPlanText: string | undefined;
  private lastProgressText: string | undefined;
  private messageBuffer = "";
  private progressTask = Promise.resolve();

  constructor(
    private readonly emitProgress?: WeixinLightweightBackendInput["emitProgress"],
  ) {}

  private queueProgress(progress: WeixinLightweightBackendProgress): void {
    if (!this.emitProgress) return;
    const text = normalizeProgressText(progress.text);
    if (!text) return;
    if (this.lastProgressText === text) return;
    this.lastProgressText = text;
    this.progressTask = this.progressTask
      .catch(() => {})
      .then(async () => {
        try {
          await this.emitProgress?.({
            ...progress,
            text,
          });
        } catch (err) {
          logger.warn(`claude-acp progress emit failed kind=${progress.kind} err=${normalizeErrorMessage(err)}`);
        }
      });
  }

  private handleMessageChunk(text: string): void {
    if (!this.emitProgress) {
      this.messageBuffer += text;
      return;
    }
    this.messageBuffer += text;
    const { segments, rest } = extractReadyMessageSegments(this.messageBuffer);
    this.messageBuffer = rest;
    for (const segment of segments) {
      this.queueProgress({
        kind: "message",
        text: segment,
      });
    }
  }

  private handlePlan(update: Extract<SessionNotification["update"], { sessionUpdate: "plan" }>): void {
    const planText = formatPlanProgress(update);
    if (!planText || planText === this.lastPlanText) return;
    this.lastPlanText = planText;
    this.queueProgress({
      kind: "plan",
      text: planText,
    });
  }

  private handleToolCall(
    update: Extract<SessionNotification["update"], { sessionUpdate: "tool_call" }>,
  ): void {
    void update;
  }

  private handleToolCallUpdate(
    update: Extract<SessionNotification["update"], { sessionUpdate: "tool_call_update" }>,
  ): void {
    void update;
  }

  handleUpdate(notification: SessionNotification): void {
    const { update } = notification;
    switch (update.sessionUpdate) {
      case "agent_message_chunk":
        if (update.content.type === "text") {
          this.handleMessageChunk(update.content.text);
          return;
        }
        if (update.content.type === "image") {
          this.imageData = {
            base64: update.content.data,
            mimeType: update.content.mimeType,
          };
        }
        return;
      case "plan":
        this.handlePlan(update);
        return;
      case "tool_call":
        this.handleToolCall(update);
        return;
      case "tool_call_update":
        this.handleToolCallUpdate(update);
        return;
    }
  }

  async toOutput(stopReason?: string): Promise<WeixinLightweightBackendOutput | void> {
    await this.progressTask.catch(() => {});
    const text = normalizeProgressText(this.messageBuffer);
    const output: WeixinLightweightBackendOutput = {};

    if (text) {
      output.text = text;
    } else if (stopReason === "cancelled") {
      output.text = "Claude Code 已取消当前操作。";
    }

    if (this.imageData) {
      await fsp.mkdir(CLAUDE_ACP_MEDIA_OUT_DIR, { recursive: true });
      const filePath = path.join(
        CLAUDE_ACP_MEDIA_OUT_DIR,
        `${crypto.randomUUID()}${getExtensionFromMime(this.imageData.mimeType)}`,
      );
      await fsp.writeFile(filePath, Buffer.from(this.imageData.base64, "base64"));
      output.mediaUrl = filePath;
    }

    if (!output.text && !output.mediaUrl && !output.mediaUrls?.length) {
      return;
    }
    return output;
  }
}

function createProcessLogger(proc: ChildProcessWithoutNullStreams): void {
  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (chunk) => {
    const message = String(chunk).trim();
    if (message) {
      logger.debug(`claude-acp stderr: ${message}`);
    }
  });
}

function createClaudeAcpClient(
  client: ClaudeAcpClient,
): (connection: ClientSideConnection) => {
  requestPermission: (params: RequestPermissionRequest) => Promise<RequestPermissionResponse>;
  sessionUpdate: (params: SessionNotification) => Promise<void>;
} {
  return () => ({
    async requestPermission(params) {
      const mode = resolveClaudePermissionMode();
      const preferred = selectPermissionOption(params.options);
      const title = params.toolCall.title ?? params.toolCall.toolCallId;
      logger.info(
        `claude-acp permission: session=${params.sessionId} tool=${title} mode=${mode} options=${params.options.map((option) => option.kind).join(",")}`,
      );
      if (mode === "cancel" || !preferred) {
        return {
          outcome: {
            outcome: "cancelled",
          },
        };
      }
      return {
        outcome: {
          outcome: "selected",
          optionId: preferred.optionId,
        },
      };
    },
    async sessionUpdate(params) {
      client.handleSessionUpdate(params);
    },
  });
}

export class ClaudeAcpClient {
  private connectionState: ClaudeAcpConnectionState | undefined;
  private startupTask: Promise<ClaudeAcpConnectionState> | undefined;
  private readonly sessions = new Map<string, SessionId>();
  private readonly collectors = new Map<SessionId, ClaudeAcpResponseCollector>();
  private readonly conversationTasks = new Map<string, Promise<unknown>>();

  private resetState(): void {
    this.connectionState = undefined;
    this.sessions.clear();
    this.collectors.clear();
  }

  private attachConnectionLifecycle(state: ClaudeAcpConnectionState): void {
    state.process.on("exit", (code, signal) => {
      logger.warn(`claude-acp: subprocess exited code=${code ?? "null"} signal=${signal ?? "null"}`);
      this.resetState();
    });
    state.connection.closed
      .catch((err) => {
        logger.warn(`claude-acp: connection closed with error err=${normalizeErrorMessage(err)}`);
      })
      .finally(() => {
        if (this.connectionState === state) {
          this.resetState();
        }
      });
  }

  private async ensureReady(): Promise<ClaudeAcpConnectionState> {
    if (this.connectionState && !this.connectionState.connection.signal.aborted) {
      return this.connectionState;
    }
    if (!this.startupTask) {
      this.startupTask = (async () => {
        const command = resolveClaudeAcpCommand();
        const cwd = resolveClaudeAcpCwd();
        assertClaudeAcpCommandAvailable(command);

        logger.info(`claude-acp: initializing command=${command} cwd=${cwd}`);
        const proc = spawn(command, [], {
          cwd,
          env: process.env,
          shell: isWindows(),
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
        createProcessLogger(proc);

        const writable = Writable.toWeb(proc.stdin) as WritableStream<Uint8Array>;
        const readable = Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>;
        const stream = ndJsonStream(writable, readable);
        const connection = new ClientSideConnection(createClaudeAcpClient(this), stream);
        const state: ClaudeAcpConnectionState = {
          connection,
          process: proc,
        };

        const initialized = await connection.initialize({
          protocolVersion: PROTOCOL_VERSION,
          clientInfo: {
            name: "weixin-agent-gateway",
            version: "1.0.2",
          },
          clientCapabilities: {},
        });

        this.attachConnectionLifecycle(state);
        this.connectionState = state;
        if (initialized.authMethods?.length) {
          logger.info(
            `claude-acp: agent advertised auth methods=${initialized.authMethods.map((method) => method.id).join(",")}`,
          );
        }
        logger.info("claude-acp: initialized");
        return state;
      })()
        .catch((err) => {
          this.resetState();
          throw wrapClaudeAcpError(err);
        })
        .finally(() => {
          this.startupTask = undefined;
        });
    }
    return this.startupTask;
  }

  handleSessionUpdate(notification: SessionNotification): void {
    const collector = this.collectors.get(notification.sessionId);
    if (!collector) return;
    collector.handleUpdate(notification);
  }

  private async getOrCreateSession(
    conversationKey: string,
    connection: ClientSideConnection,
  ): Promise<SessionId> {
    const existing = this.sessions.get(conversationKey);
    if (existing) return existing;

    const cwd = resolveClaudeAcpCwd();
    const response = await connection.newSession({
      cwd,
      mcpServers: [],
    });
    this.sessions.set(conversationKey, response.sessionId);
    logger.info(`claude-acp: created session conversation=${conversationKey} session=${response.sessionId}`);
    return response.sessionId;
  }

  private async enqueueConversation<T>(conversationKey: string, task: () => Promise<T>): Promise<T> {
    const previous = this.conversationTasks.get(conversationKey) ?? Promise.resolve();
    const current = previous
      .catch(() => {})
      .then(task);
    this.conversationTasks.set(conversationKey, current);
    try {
      return await current;
    } finally {
      if (this.conversationTasks.get(conversationKey) === current) {
        this.conversationTasks.delete(conversationKey);
      }
    }
  }

  async runLightweightConversation(
    input: WeixinLightweightBackendInput,
  ): Promise<WeixinLightweightBackendOutput | void> {
    const conversationKey = `${input.accountId}:${input.peerId}`;
    return this.enqueueConversation(conversationKey, async () => {
      const state = await this.ensureReady();
      const sessionId = await this.getOrCreateSession(conversationKey, state.connection);
      const blocks = await buildPromptBlocks(input);
      const collector = new ClaudeAcpResponseCollector(input.emitProgress);
      this.collectors.set(sessionId, collector);
      try {
        const response = await state.connection.prompt({
          sessionId,
          prompt: blocks,
        });
        return collector.toOutput(response.stopReason);
      } catch (err) {
        throw wrapClaudeAcpError(err);
      } finally {
        this.collectors.delete(sessionId);
      }
    });
  }

  dispose(): void {
    const state = this.connectionState;
    this.resetState();
    try {
      state?.process.kill();
    } catch {
      // Best effort cleanup only.
    }
  }
}
