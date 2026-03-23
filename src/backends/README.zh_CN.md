# 后端接入说明

## 1. 当前状态

当前仓库只保留两类已实现 backend：

- `openclaw`
  复杂 backend，继续走 OpenClaw 自己的 route / session / dispatcher
- `codex`
  轻量 backend，直接通过 ACP 连接 Codex
- `claude`
  轻量 backend，直接通过 ACP 连接 Claude Code

其他 backend id 仍然保留在系统中：

- `opencode`
- `copilot`
- `auggie`
- `cursor`

但这些后端当前还没有接入实现，选择后会回退或提示“尚未接入”。

## 2. 当前主链路

当前消息处理主入口在：

- [../messaging/process-message.ts](/d:/Code/test/clawd/weixin-agent-gateway/src/messaging/process-message.ts)

主流程：

1. 微信入站消息进入 `processOneMessage(...)`
2. 解析文本和媒体
3. 根据会话状态选择 backend
4. 如果 backend 是 `codex` 或 `claude`
   - 构建轻量输入对象
   - 调用 `backendAdapter.reply(input)`
   - 将返回结果统一发回微信
5. 如果 backend 是 `openclaw`
   - 走 OpenClaw 专有链路

## 3. Codex / Claude lightweight 输入

轻量 backend 输入结构定义在：

- [contracts.ts](/d:/Code/test/clawd/weixin-agent-gateway/src/backends/contracts.ts)

当前 `codex` / `claude` backend 主要消费这些字段：

- `text`
  用户发来的文本
- `imagePaths`
  已下载到本地的图片路径
- `peerId`
  当前微信会话 ID
- `senderId`
  当前发送者微信 ID
- `emitProgress`
  轻量 backend 可选使用的进度回调；Codex / Claude ACP 会用它发送分段气泡

## 4. Codex / Claude lightweight 输出

Codex / Claude backend 返回结构：

```ts
export type WeixinLightweightBackendOutput = {
  text?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
};
```

发送动作仍然不由 backend 自己完成，统一由微信发送层处理。

## 5. ACP 实现位置

当前 direct ACP 入口在：

- [codex/adapter.ts](/d:/Code/test/clawd/weixin-agent-gateway/src/backends/codex/adapter.ts)
- [codex/acp-client.ts](/d:/Code/test/clawd/weixin-agent-gateway/src/backends/codex/acp-client.ts)
- [claude/adapter.ts](/d:/Code/test/clawd/weixin-agent-gateway/src/backends/claude/adapter.ts)
- [claude/acp-client.ts](/d:/Code/test/clawd/weixin-agent-gateway/src/backends/claude/acp-client.ts)
- [lightweight/acp-subprocess-client.ts](/d:/Code/test/clawd/weixin-agent-gateway/src/backends/lightweight/acp-subprocess-client.ts)

其中：

- `codex`
  - 通过 `codex-acp` 连接 Codex
- `claude`
  - 通过 `claude-agent-acp` 连接 Claude Code

共同特点：

- 直接拉起对应 ACP wrapper
- 不再依赖 AgentAPI
- 按 `accountId:peerId` 复用 ACP session
- 支持文本输入
- 支持图片输入
- 支持文本输出和单图输出
- 支持把 Agent 自己产出的描述性进度拆成多个微信气泡

## 6. 新增 backend 的建议

后续如果要接入 `opencode` / `copilot` / `auggie` / `cursor`：

- 优先走 direct ACP
- 不要重新引入 AgentAPI
- 保持 `lightweight` 模式
- 输入只消费文本和图片路径
- 输出只返回文本和可选媒体路径

## 7. 明确结论

当前这份代码基线已经不再包含 AgentAPI 实现。

如果后续要新增 backend，应当基于：

- `openclaw` 复杂 backend 模式
- `codex` / `claude` direct ACP 轻量 backend 模式

继续演进。
