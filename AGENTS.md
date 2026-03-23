# AGENTS

## 项目背景

这个项目最初是腾讯微信渠道对 OpenClaw 的接入插件。

原始定位是：

- 通过扫码登录获取微信 bot 凭证
- 通过 `ilink` 网关长轮询收取微信消息
- 通过微信 CDN 上传下载媒体
- 将入站消息直接接入 OpenClaw 的回复链路

因此，原项目天然是：

```text
Weixin -> openclaw-weixin plugin -> OpenClaw
```

## 当前改造目标

当前仓库仍然首先是一个可工作的 OpenClaw 微信插件。

在此基础上，我们正在做的事情是：

- 保留微信接入能力
- 保留 OpenClaw 作为已实现 backend
- 已接入 `codex`
- 已接入 `claude code`
- 继续为 `opencode` 等其他 backend 预留接入点
- 逐步把后端选择从“只有 OpenClaw”演进为“可切换多 backend”

目标方向是：

```text
Weixin
  -> transport
  -> router
  -> openclaw / codex / claude
```

## 当前产品目标

当前最重要的产品目标不是“彻底重写架构”，而是：

- 保留现有微信接入能力
- 保持 OpenClaw 作为可用 backend
- 为未来新增轻量 backend 留出稳定接入点

这里的“轻量 backend”指：

- 不需要 OpenClaw 的 route / session / dispatcher
- 只需要文本输入
- 可选图片输入
- 返回文本输出
- 可选返回图片或文件

当前实际状态已经更新为：

- `claude code` 已经接入实现
- `codex` 已经接入实现
- `opencode` 等其他 backend 仍然只是按这个目标预留接口和命令入口

## 当前设计原则

### 1. 不为了抽象而抽象

可以接受 OpenClaw backend 内部继续依赖 OpenClaw runtime。

不要求所有文件都完全零耦合。

真正要避免的是：

- 轻量 backend 必须理解 OpenClaw 内部机制
- 微信 transport 被 OpenClaw 专有逻辑绑死

### 2. 稳定优先

这个项目原本是一个可工作的 OpenClaw 微信插件。

改造时优先保证：

- 现有微信能力不被拆坏
- OpenClaw backend 仍可用
- 不因为过度拆分导致原有安装/运行语义失效

### 3. 分层以“是否阻碍新增 backend”为判断标准

如果某段代码会让未来的 `codex` / `claude` 接入必须理解 OpenClaw 内部实现，则应该继续拆。

如果某段代码只在 `openclaw` backend 内部使用，则允许保留耦合。

## 当前架构认知

当前仓库大致分成这几层：

- `src/api` / `src/cdn` / `src/media` / `src/storage`
  微信公共接入能力

- `src/transport/weixin`
  微信 transport 层

- `src/router`
  会话级 backend 选择与路由

- `src/backends/openclaw`
  OpenClaw backend 的专有实现

- `src/backends/contracts.ts`
  backend 公共接口

- `src/backends/registry.ts`
  backend 注册表

- `src/messaging/process-message.ts`
  当前仍是混合编排层，是后续最容易继续演进的主入口

## 当前真实状态

截至当前代码状态：

- OpenClaw backend 已实现并可用
- `lightweight` backend 模式已经定义
- `codex` 已实现并可用，当前通过 ACP 直接接入 Codex
- `claude` 已实现并可用，当前通过 ACP 直接接入 Claude Code
- `opencode`、`copilot`、`auggie`、`cursor` 当前仍只保留 backend id 与命令入口
- `src/router` 和 `src/backends` 的拆分已经落地
- 但主链路仍然默认围绕 OpenClaw runtime 运转

换句话说：

- 现在不是“多 backend 全部可用”
- 而是“OpenClaw 可用，Codex 可用，Claude 可用，其他 backend 可以开始接入”

## 当前明确结论

现在的代码已经达到了一个可接受的中间态：

- 已经可以继续实现其他 backend
- 不需要再为 `codex` / `claude code` 大规模重构 OpenClaw 内核
- 后续新增 backend 应优先走 `lightweight` 模式
- 当前真正可工作的 backend 是 `openclaw`、`codex` 和 `claude`

## 当前 ACP 结论

当前仓库已经明确切换到 ACP 方向：

- `claude` backend 当前通过 ACP 直接连接 Claude Code
- `codex` backend 当前通过 ACP 直接连接 Codex
- AgentAPI 实现已经从仓库中移除
- 后续新增 `codex` / `opencode` / `copilot` / `auggie` / `cursor` 时，也应优先按 direct ACP 接入

当前不再建议：

- 新增基于 AgentAPI 的 backend
- 恢复 AgentAPI 安装或自动拉起逻辑

## 新 backend 的实现原则

新增 `opencode` / `copilot` / `auggie` / `cursor` 时：

- 优先实现 `mode: "lightweight"` adapter
- 输入只消费文本和图片路径
- 输出只返回文本和可选媒体路径 / URL
- 不要复用 OpenClaw 的 route / session / reply-dispatcher
- 优先通过 ACP 直接连接对应 CLI / agent

其中当前已落地的是：

- `codex`
  - direct ACP
  - 通过 `codex-acp` 连接 Codex
- `claude`
  - direct ACP
  - 通过 `claude-agent-acp` 连接 Claude Code

当前仍未落地的是：

- `opencode`
- `copilot`
- `auggie`
- `cursor`

换句话说：

- `openclaw` 是复杂 backend
- `codex` 是已实现的 ACP 轻量 backend
- `claude` 是已实现的 ACP 轻量 backend
- `opencode` / `copilot` / `auggie` / `cursor` 是待实现的 ACP 轻量 backend

## 开发时应避免的事情

- 不要为了“绝对纯净”继续大拆所有 OpenClaw 相关逻辑
- 不要在轻量 backend 中引入 OpenClaw runtime 依赖
- 不要破坏现有 `weixin-agent-gateway` 插件入口和安装形态，除非明确决定放弃 OpenClaw 插件兼容
- 不要随意删除现有微信 transport 逻辑

## 当前最重要的工程目的

当前仓库的首要目的不是做完美框架，而是：

1. 保住微信接入能力
2. 保住 OpenClaw backend
3. 让新增轻量 backend 的实现成本足够低

只要这三点成立，架构就是成功的。
