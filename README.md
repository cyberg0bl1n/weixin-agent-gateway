# 微信多后端接入插件

这是一个基于腾讯微信通道实现演进而来的项目。

当前项目仍然以 **OpenClaw 微信插件** 形态运行，但已经开始支持“一个微信入口，对接多个后端”：

- `openclaw`
- `codex`
- `claude`



## 当前状态

目前它还不是完全脱离 OpenClaw 的独立服务，但切换后端并不依赖OpenClaw，不会消耗Token。

后续将实现不依赖OpenClaw的运行、在微信上接入OpenClaw、Codex、Claude Code 、OpenCode 等。

当前运行方式：

```text
微信
  -> weixin-agent-gateway 插件
  -> 路由层
  -> openclaw / codex / claude
```

## 安装前提

你需要先准备以下环境：

### 1. OpenClaw

需要本机已经安装 OpenClaw，并且 `openclaw` 命令可用。

### 2. AgentAPI

如果你要使用：

- `/codex`
- `/claude`

则需要在本机或可访问的机器上启动对应的 AgentAPI 服务。

### 3. 已登录的底层 agent

如果你要使用 Codex / Claude Code，需要保证：

- Codex 已经在目标机器上登录
- Claude Code 已经在目标机器上登录

AgentAPI 只是远程控制层，不负责登录。

## 安装插件

### 一键安装

```bash
npx -y @bytepioneer-ai/weixin-agent-gateway-cli install
```

安装器会自动：

- 安装或更新本插件
- 尝试禁用官方 `openclaw-weixin` 插件
- 启用本插件
- 触发微信扫码登录
- 下载 AgentAPI（如果本机未安装）

### 手动安装

#### 1. 安装插件

```bash
openclaw plugins install "@bytepioneer-ai/weixin-agent-gateway"
```

#### 2. 启用插件

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled false
openclaw config set plugins.entries.weixin-agent-gateway.enabled true
```

#### 3. 微信扫码登录

```bash
openclaw channels login --channel weixin-agent-gateway
```

扫码成功后，登录凭证会保存在本地。

#### 4. 重启 OpenClaw Gateway

```bash
openclaw gateway restart
```

## 启动 AgentAPI

如果你只用 OpenClaw backend，可以跳过本节。

如果你要用 `codex` / `claude`，需要分别启动对应的 AgentAPI。

### 启动 Codex AgentAPI

```bash
agentapi server --type=codex -- codex
```

### 启动 Claude Code AgentAPI

```bash
agentapi server -- claude
```

通常建议分别起两个端口，例如：

- Codex: `http://127.0.0.1:3284`
- Claude: `http://127.0.0.1:3285`

## 配置 AgentAPI 地址

当前项目通过环境变量读取 AgentAPI 地址。

### Codex

读取以下任一环境变量：

- `WEIXIN_CODEX_AGENTAPI_URL`
- `CODEX_AGENTAPI_URL`

示例：

```powershell
$env:WEIXIN_CODEX_AGENTAPI_URL="http://127.0.0.1:3284"
```

### Claude Code

读取以下任一环境变量：

- `WEIXIN_CLAUDE_AGENTAPI_URL`
- `CLAUDE_AGENTAPI_URL`

示例：

```powershell
$env:WEIXIN_CLAUDE_AGENTAPI_URL="http://127.0.0.1:3285"
```

## 使用方法

### 切换后端

在微信里发送：

```text
/openclaw
/codex
/claude
```

也可以查看当前后端：

```text
/backend
```

### 当前实现说明

- `/openclaw`
  走 OpenClaw 原有复杂链路
- `/codex`
  走 AgentAPI lightweight backend
- `/claude`
  走 AgentAPI lightweight backend

## 轻量后端能力范围

当前 `codex` / `claude` 后端按 lightweight 模式实现，能力范围是：

- 文本输入
- 图片输入
- 文本输出
- 可选媒体输出

它们 **不复用** OpenClaw 的：

- route
- session
- dispatcher
- command authorization

## 图片输入说明

微信图片会先下载到本地，再作为本地文件路径交给 lightweight backend。

当前对 AgentAPI 的处理方式是：

1. 将图片上传到 AgentAPI
2. 获取远端 `filePath`
3. 把 `filePath` 拼进发送给 agent 的 prompt

## 当前限制

### 1. 项目仍然依赖 OpenClaw 插件运行

当前项目还不是完全独立的微信网关服务。

也就是说：

- OpenClaw 不启动时
- 当前插件整体不会独立运行

### 2. Codex / Claude 输出可能包含过程信息

当前 `codex` / `claude` 通过 AgentAPI 获取结果。  
AgentAPI 会对 TUI 输出做一层清理，但不保证只留下最终答案。

因此你仍可能看到：

- `• Ran ...`
- 命令输出块
- 状态信息

### 3. AgentAPI 地址必须正确配置

如果：

- `WEIXIN_CODEX_AGENTAPI_URL`
- `WEIXIN_CLAUDE_AGENTAPI_URL`

没有配置，或者配置的地址上没有服务监听，就会连接失败。

## 常见问题

### 1. `/claude` 切换成功，但回复失败

常见原因：

- Claude AgentAPI 没启动
- Claude AgentAPI 端口配置错误

请检查：

```bash
curl http://127.0.0.1:3285/status
```

### 2. `/codex` 或 `/claude` 输出很乱

这是因为当前拿到的是 AgentAPI 清理后的 TUI 消息，而不是纯语义答案。

后续可以继续增加输出清洗逻辑。

### 3. 如何查看当前后端

在微信里发送：

```text
/backend
```

## 目录说明

当前代码结构里，和多后端相关的主要目录有：

- `src/backends`
  后端实现
- `src/backends/openclaw`
  OpenClaw backend
- `src/backends/lightweight`
  轻量 backend 共用能力
- `src/backends/codex`
  Codex backend
- `src/backends/claude`
  Claude backend
- `src/router`
  会话级 backend 路由
- `src/transport/weixin`
  微信 transport 相关能力

## 相关文档

- 架构设计：
  [docs/weixin-multi-backend-architecture.zh_CN.md](/d:/work/code/openclaw-weixin/docs/weixin-multi-backend-architecture.zh_CN.md)

- 代码分层清单：
  [docs/code-layer-classification.zh_CN.md](/d:/work/code/openclaw-weixin/docs/code-layer-classification.zh_CN.md)

- 后端接入说明：
  [src/backends/README.zh_CN.md](/d:/work/code/openclaw-weixin/src/backends/README.zh_CN.md)
