# 微信多后端接入插件

> 本项目目前仍处于早期版本，体验上可能还有一些问题。后续会持续迭代和优化，提供更顺畅的微信接入 Codex、Claude Code、Opencode、GitHub Copilot、Auggie、Cursor CLI 等能力。
> 本项目由AgentAPI方案转入ACP，连接Agent会更加稳定

>

这是一个基于腾讯微信插件演进而来的项目，本项目的OpenClaw接入方案与腾讯官方保持一致。

当前项目仍然以 **OpenClaw 微信插件** 形态运行，但已经开始支持“一个微信入口，对接多个后端”：

- `openclaw`
- `codex`
- `claude`

其他 backend id 仍然保留在路由和命令入口里，但当前还未接入实现。

### 样例展示

| 样例 1 | 样例 2 |
| --- | --- |
| <img src="docs/img/1.jpg" alt="样例 1" width="260" /> | <img src="docs/img/2.jpg" alt="样例 2" width="260" /> |


## 当前状态

目前它还不是一个完全脱离 OpenClaw 的独立服务，但在切换后端时已经不再依赖 OpenClaw，也不会消耗 OpenClaw Token。

后续将逐步实现脱离 OpenClaw 的独立运行，并继续完善 OpenClaw、Codex 与 Claude Code 的接入体验，再逐步补齐其他 ACP backend。

当前运行方式：

```text
微信
  -> weixin-agent-gateway 插件
  -> 路由层
  -> openclaw / codex / claude
```



## 开发计划

- [ ] 支持独立运行；当 OpenClaw 未启动或异常退出时，可借助其他编程工具拉起 OpenClaw
- [ ] 补充更多 Codex / Claude Code 原生命令，提供更顺滑的接入体验
- [ ] 新建会话
- [ ] 支持更多编程工具后端
- [ ] 连续输出的形式显示思考过程

### 一键安装

```bash
npx -y @bytepioneer-ai/weixin-agent-gateway install
```

安装器会自动：

- 安装或更新本插件
- 尝试禁用官方 `openclaw-weixin` 插件
- 启用本插件
- 触发微信扫码登录
- 尝试安装 Codex ACP wrapper（如果本机未安装）
- 尝试安装 Claude ACP wrapper（如果本机未安装）

如果一键安装里只有 Codex / Claude ACP wrapper 安装失败：

- 前面的插件安装、启用、微信登录通常已经完成，不需要从头重装插件
- 修复网络后，可以重新执行一次：

```bash
npx -y @bytepioneer-ai/weixin-agent-gateway install
```

- 如果只是 Codex / Claude ACP wrapper 安装失败，也可以直接按下面“手动安装 ACP wrapper”的步骤补装
- 补装完成后执行：

```bash
openclaw gateway restart
```

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

#### 5. 可选：手动安装 ACP wrapper

只有在你要使用 `/codex` 或 `/claude` 且安装器自动安装失败时，才需要这一步。

Codex:

```bash
npm install -g @zed-industries/codex-acp
```

Claude:

```bash
npm install -g @zed-industries/claude-agent-acp
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
/backend codex
/backend claude
```

## 鸣谢

- `@tencent-weixin/openclaw-weixin`，本项目由此改编而来。
- [`@zed-industries/codex-acp`](https://github.com/zed-industries/codex-acp)，本项目当前通过它接入 Codex。
- [`Agent Client Protocol`](https://agentclientprotocol.com/) 与 [`@zed-industries/claude-agent-acp`](https://www.npmjs.com/package/@zed-industries/claude-agent-acp)，本项目当前通过它们接入 Claude Code。
