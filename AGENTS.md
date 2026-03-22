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
- 预留 `codex`、`claude code` 等其他 backend 的接入点
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

`codex`、`claude code` 当前还没有接入实现，只是按这个目标预留了接口和命令入口。

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
- `codex`、`claude` 只存在 backend id、命令占位和轻量输入输出接口
- `src/router` 和 `src/backends` 的拆分已经落地
- 但主链路仍然默认围绕 OpenClaw runtime 运转

换句话说：

- 现在不是“多 backend 全部可用”
- 而是“OpenClaw 可用，其他 backend 可以开始接入”

## 当前明确结论

现在的代码已经达到了一个可接受的中间态：

- 已经可以继续实现其他 backend
- 不需要再为 `codex` / `claude code` 大规模重构 OpenClaw 内核
- 后续新增 backend 应优先走 `lightweight` 模式
- 当前真正可工作的 backend 只有 `openclaw`

## 新 backend 的实现原则

新增 `codex` / `claude` 时：

- 优先实现 `mode: "lightweight"` adapter
- 输入只消费文本和图片路径
- 输出只返回文本和可选媒体路径 / URL
- 不要复用 OpenClaw 的 route / session / reply-dispatcher
- 在接入完成前，`/codex`、`/claude` 仍只是占位命令

换句话说：

- `openclaw` 是复杂 backend
- `codex` / `claude` 是轻量 backend

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
