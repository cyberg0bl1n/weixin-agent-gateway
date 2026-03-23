#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "@bytepioneer-ai/weixin-agent-gateway";
const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PLUGIN_SPEC = process.env.WEIXIN_GATEWAY_PLUGIN_SPEC?.trim() || PACKAGE_NAME;
const CHANNEL_ID = process.env.WEIXIN_GATEWAY_CHANNEL_ID?.trim() || "weixin-agent-gateway";
const PLUGIN_ENTRY_ID = process.env.WEIXIN_GATEWAY_PLUGIN_ID?.trim() || "weixin-agent-gateway";
const OFFICIAL_PLUGIN_ENTRY_ID = "openclaw-weixin";
const ENABLE_OFFICIAL_PLUGIN_CMD = "openclaw config set plugins.entries.openclaw-weixin.enabled true";
const CODEX_ACP_NPM_PACKAGE = "@zed-industries/codex-acp";
const CLAUDE_ACP_NPM_PACKAGE = "@zed-industries/claude-agent-acp";
const LIGHTWEIGHT_BACKEND_CLI_CHECKS = [
  {
    id: "qoder",
    label: "Qoder CLI",
    binName: "qodercli",
    envVarName: "WEIXIN_QODER_ACP_BIN",
    loginHint: "先执行 qodercli，并在会话里完成 /login，或设置 QODER_PERSONAL_ACCESS_TOKEN。",
  },
  {
    id: "qwen",
    label: "Qwen Code",
    binName: "qwen",
    envVarName: "WEIXIN_QWEN_ACP_BIN",
    loginHint: "先执行 qwen 完成登录。",
  },
  {
    id: "kimi",
    label: "Kimi CLI",
    binName: "kimi",
    envVarName: "WEIXIN_KIMI_ACP_BIN",
    loginHint: "先执行 kimi，并在会话里完成 /login。",
  },
  {
    id: "opencode",
    label: "OpenCode",
    binName: "opencode",
    envVarName: "WEIXIN_OPENCODE_ACP_BIN",
    loginHint: "先执行 opencode auth login，或手动启动一次 opencode 完成初始化。",
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    binName: "copilot",
    envVarName: "WEIXIN_COPILOT_ACP_BIN",
    loginHint: "先执行 copilot login，或配置 GH_TOKEN/GITHUB_TOKEN。",
  },
  {
    id: "auggie",
    label: "Auggie",
    binName: "auggie",
    envVarName: "WEIXIN_AUGGIE_ACP_BIN",
    loginHint: "先执行 auggie login。",
  },
  {
    id: "cursor",
    label: "Cursor CLI",
    binName: "cursor-agent",
    envVarName: "WEIXIN_CURSOR_ACP_BIN",
    loginHint: "先执行 cursor-agent login，或设置 CURSOR_API_KEY。",
  },
];

function log(msg) {
  console.log(`\x1b[36m[weixin-agent-gateway]\x1b[0m ${msg}`);
}

function warn(msg) {
  console.warn(`\x1b[33m[weixin-agent-gateway]\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`\x1b[31m[weixin-agent-gateway]\x1b[0m ${msg}`);
}

function isWindows() {
  return process.platform === "win32";
}

function run(cmd, { silent = true, cwd } = {}) {
  const stdio = silent ? ["pipe", "pipe", "pipe"] : "inherit";
  const result = spawnSync(cmd, { shell: true, stdio, cwd });
  if (result.status !== 0) {
    const err = new Error(`Command failed with exit code ${result.status}: ${cmd}`);
    err.stderr = silent ? (result.stderr || "").toString() : "";
    throw err;
  }
  return silent ? (result.stdout || "").toString().trim() : "";
}

function commandExists(bin) {
  const checker = isWindows() ? `where ${bin}` : `command -v ${bin}`;
  try {
    return Boolean(run(checker));
  } catch {
    return false;
  }
}

function printManualAcpInstallHelp({ label, packageName, envVarName, binName }) {
  console.log();
  warn(`自动安装 ${label} ACP wrapper 失败。`);
  console.log("你可以手动安装：");
  console.log(`  npm install -g ${packageName}`);
  console.log();
  console.log("安装完成后，可重新执行：");
  console.log("  openclaw gateway restart");
  console.log("或在启动前显式指定：");
  if (isWindows()) {
    console.log(`  $env:${envVarName}="${binName}"`);
  } else {
    console.log(`  export ${envVarName}="${binName}"`);
  }
  console.log();
}

async function ensureAcpWrapperInstalled({ label, packageName, binName, envVarName }) {
  if (commandExists(binName)) {
    log(`已检测到 ${binName}`);
    return { installed: false, targetPath: binName };
  }

  if (!commandExists("npm")) {
    warn(`未检测到 npm，无法自动安装 ${binName}。`);
    printManualAcpInstallHelp({ label, packageName, envVarName, binName });
    return {
      installed: false,
      targetPath: binName,
      manualInstallRequired: true,
    };
  }

  log(`未检测到 ${binName}，开始执行 npm install -g ${packageName} ...`);
  try {
    run(`npm install -g ${packageName}`, { silent: false });
  } catch {
    printManualAcpInstallHelp({ label, packageName, envVarName, binName });
    return {
      installed: false,
      targetPath: binName,
      manualInstallRequired: true,
    };
  }

  if (!commandExists(binName)) {
    warn(`${binName} 已安装，但当前 PATH 中可能还没有对应的 npm 全局 bin 目录。`);
    printManualAcpInstallHelp({ label, packageName, envVarName, binName });
    return {
      installed: true,
      targetPath: binName,
      manualInstallRequired: true,
    };
  }

  log(`${binName} 已安装`);
  return { installed: true, targetPath: binName };
}

async function ensureClaudeAcpInstalled() {
  return ensureAcpWrapperInstalled({
    label: "Claude",
    packageName: CLAUDE_ACP_NPM_PACKAGE,
    binName: "claude-agent-acp",
    envVarName: "WEIXIN_CLAUDE_ACP_BIN",
  });
}

async function ensureCodexAcpInstalled() {
  return ensureAcpWrapperInstalled({
    label: "Codex",
    packageName: CODEX_ACP_NPM_PACKAGE,
    binName: "codex-acp",
    envVarName: "WEIXIN_CODEX_ACP_BIN",
  });
}

function inspectCliAvailability({ label, binName, envVarName, loginHint }) {
  const configuredPath = process.env[envVarName]?.trim();
  const resolvedBin = configuredPath || binName;
  const available = commandExists(resolvedBin);
  return {
    label,
    binName,
    envVarName,
    resolvedBin,
    available,
    loginHint,
    configuredPath,
  };
}

function ensureOpenClawInstalled() {
  if (!commandExists("openclaw")) {
    error("未找到 openclaw，请先安装 OpenClaw。");
    console.log("  npm install -g openclaw");
    console.log("  详见 https://docs.openclaw.ai/install");
    process.exit(1);
  }
  log("已找到本地安装的 openclaw");
}

function installPlugin(pluginSpec, { localSource = false } = {}) {
  log(`正在安装插件${localSource ? "（本地源码）" : ""}...`);
  try {
    const installOut = localSource
      ? run("openclaw plugins install -l .", { cwd: pluginSpec })
      : run(`openclaw plugins install "${pluginSpec}"`);
    if (installOut) log(installOut);
  } catch (installErr) {
    if (installErr.stderr && installErr.stderr.includes("already exists")) {
      if (localSource) {
        warn("检测到插件已存在，正在尝试更新现有插件。");
        warn("如果当前安装来源不是本地源码，更新后仍可能继续指向旧来源；必要时请先手动卸载旧插件，再重新执行 install-local。");
      } else {
        log("检测到本地已安装，尝试更新插件...");
      }
      try {
        const updateOut = run(`openclaw plugins update "${PLUGIN_ENTRY_ID}"`);
        if (updateOut) log(updateOut);
      } catch (updateErr) {
        error("插件更新失败，请手动执行：");
        if (updateErr.stderr) console.error(updateErr.stderr);
        if (localSource) {
          console.log(`  cd "${pluginSpec}"`);
          console.log("  openclaw plugins install -l .");
        } else {
          console.log(`  openclaw plugins update "${PLUGIN_ENTRY_ID}"`);
        }
        process.exit(1);
      }
    } else {
      error("插件安装失败，请手动执行：");
      if (installErr.stderr) console.error(installErr.stderr);
      if (localSource) {
        console.log(`  cd "${pluginSpec}"`);
        console.log("  openclaw plugins install -l .");
      } else {
        console.log(`  openclaw plugins install "${pluginSpec}"`);
      }
      process.exit(1);
    }
  }
}

function resolveLocalPluginSpec(rawPath) {
  if (!rawPath?.trim()) return PACKAGE_ROOT;
  return path.resolve(process.cwd(), rawPath.trim());
}

function enablePlugin() {
  log("正在启用插件...");
  try {
    run(`openclaw config set plugins.entries.${PLUGIN_ENTRY_ID}.enabled true`, { silent: false });
  } catch (err) {
    warn("自动启用插件失败，请手动执行：");
    console.log(`  openclaw config set plugins.entries.${PLUGIN_ENTRY_ID}.enabled true`);
    if (err.stderr) console.error(err.stderr);
  }
}

function disableOfficialPlugin() {
  log("检测并禁用官方 openclaw-weixin 插件...");
  try {
    run(`openclaw config set plugins.entries.${OFFICIAL_PLUGIN_ENTRY_ID}.enabled false`, {
      silent: false,
    });
    warn("由于本插件与官方 openclaw-weixin 存在冲突，已尝试禁用官方插件。");
    console.log(
      `本插件的微信连接逻辑与官方保持一致。后续如需重新启用官方插件，可执行：\n  ${ENABLE_OFFICIAL_PLUGIN_CMD}`,
    );
    console.log(
      `如需仅启用本插件，可执行：\n  openclaw config set plugins.entries.${PLUGIN_ENTRY_ID}.enabled true`,
    );
    console.log(
      `如需使用本插件重新登录微信，可执行：\n  openclaw channels login --channel ${CHANNEL_ID}`,
    );
  } catch (err) {
    warn("自动禁用官方插件失败，请手动执行：");
    console.log(`  openclaw config set plugins.entries.${OFFICIAL_PLUGIN_ENTRY_ID}.enabled false`);
    if (err.stderr) console.error(err.stderr);
  }
}

function loginWeixin() {
  log("开始微信扫码登录...");
  try {
    run(`openclaw channels login --channel ${CHANNEL_ID}`, { silent: false });
  } catch {
    console.log();
    warn("首次连接未完成，可稍后手动重试：");
    console.log(`  openclaw channels login --channel ${CHANNEL_ID}`);
  }
}

function restartGateway() {
  log("正在重启 OpenClaw Gateway...");
  try {
    run("openclaw gateway restart", { silent: false });
  } catch {
    warn("Gateway 重启失败，可手动执行：");
    console.log("  openclaw gateway restart");
  }
}

function printCliAvailabilityStatus(cliStatuses) {
  console.log("2. 其他已接入 lightweight backend 的本地 CLI 检查");
  cliStatuses.forEach((status) => {
    const state = status.available ? "已检测到" : "未检测到";
    console.log(`   - ${status.label}: ${state} (${status.resolvedBin})`);
    if (!status.available) {
      console.log(`     请先安装对应 CLI，或设置 ${status.envVarName}。`);
    }
    console.log(`     ${status.loginHint}`);
  });
  console.log();
}

function printNextSteps(codexAcpInfo, claudeAcpInfo, cliStatuses) {
  console.log();
  log("安装完成。下一步建议：");
  console.log();
  if (codexAcpInfo?.installed) {
    console.log(`Codex ACP wrapper 已安装到: ${codexAcpInfo.targetPath}`);
    console.log();
  }
  if (codexAcpInfo?.manualInstallRequired) {
    console.log("Codex ACP wrapper 尚未自动安装完成。");
    console.log(`可手动执行: npm install -g ${CODEX_ACP_NPM_PACKAGE}`);
    console.log();
  }
  if (claudeAcpInfo?.installed) {
    console.log(`Claude ACP wrapper 已安装到: ${claudeAcpInfo.targetPath}`);
    console.log();
  }
  if (claudeAcpInfo?.manualInstallRequired) {
    console.log("Claude ACP wrapper 尚未自动安装完成。");
    console.log(`可手动执行: npm install -g ${CLAUDE_ACP_NPM_PACKAGE}`);
    console.log();
  }
  console.log("1. 直接在微信里切换后端");
  console.log("   /codex");
  console.log("   /claude");
  console.log("   /qoder");
  console.log("   /qwen");
  console.log("   /kimi");
  console.log("   /opencode");
  console.log("   /copilot");
  console.log("   /auggie");
  console.log("   /cursor");
  console.log("   /openclaw");
  console.log();
  console.log("   Codex 现在走 direct ACP：需要本机 `codex` 与 `codex-acp` 可用，并先在目标工作目录手动执行一次 `codex` 完成登录。");
  console.log("   Claude Code 现在走 direct ACP：需要本机 `claude` 与 `claude-agent-acp` 可用，并先在目标工作目录手动执行一次 `claude` 完成 trust。");
  console.log();
  printCliAvailabilityStatus(cliStatuses);
  console.log("3. 只有在你需要显式指定 ACP 命令或工作目录时，才设置环境变量");
  if (isWindows()) {
     console.log(`   $env:WEIXIN_CODEX_ACP_BIN="codex-acp"`);
     console.log('   $env:WEIXIN_CODEX_ACP_CWD="D:\\your\\project"');
     console.log(`   $env:WEIXIN_CLAUDE_ACP_BIN="claude-agent-acp"`);
     console.log('   $env:WEIXIN_CLAUDE_ACP_CWD="D:\\your\\project"');
     console.log(`   $env:WEIXIN_QODER_ACP_BIN="qodercli"`);
     console.log(`   $env:WEIXIN_QWEN_ACP_BIN="qwen"`);
     console.log(`   $env:WEIXIN_KIMI_ACP_BIN="kimi"`);
     console.log(`   $env:WEIXIN_OPENCODE_ACP_BIN="opencode"`);
     console.log(`   $env:WEIXIN_COPILOT_ACP_BIN="copilot"`);
     console.log(`   $env:WEIXIN_AUGGIE_ACP_BIN="auggie"`);
     console.log(`   $env:WEIXIN_CURSOR_ACP_BIN="cursor-agent"`);
  } else {
     console.log(`   export WEIXIN_CODEX_ACP_BIN="codex-acp"`);
     console.log('   export WEIXIN_CODEX_ACP_CWD="/path/to/project"');
     console.log(`   export WEIXIN_CLAUDE_ACP_BIN="claude-agent-acp"`);
     console.log('   export WEIXIN_CLAUDE_ACP_CWD="/path/to/project"');
     console.log(`   export WEIXIN_QODER_ACP_BIN="qodercli"`);
     console.log(`   export WEIXIN_QWEN_ACP_BIN="qwen"`);
     console.log(`   export WEIXIN_KIMI_ACP_BIN="kimi"`);
     console.log(`   export WEIXIN_OPENCODE_ACP_BIN="opencode"`);
     console.log(`   export WEIXIN_COPILOT_ACP_BIN="copilot"`);
     console.log(`   export WEIXIN_AUGGIE_ACP_BIN="auggie"`);
     console.log(`   export WEIXIN_CURSOR_ACP_BIN="cursor-agent"`);
  }
  console.log();
}

async function install({
  pluginSpec = DEFAULT_PLUGIN_SPEC,
  localSource = false,
} = {}) {
  ensureOpenClawInstalled();
  installPlugin(pluginSpec, { localSource });
  disableOfficialPlugin();
  enablePlugin();
  loginWeixin();
  const codexAcpInfo = await ensureCodexAcpInstalled();
  const claudeAcpInfo = await ensureClaudeAcpInstalled();
  const cliStatuses = LIGHTWEIGHT_BACKEND_CLI_CHECKS.map(inspectCliAvailability);
  restartGateway();
  printNextSteps(codexAcpInfo, claudeAcpInfo, cliStatuses);
}

function help() {
  console.log(`
用法: npx -y ${PACKAGE_NAME} <命令>

命令:
  install                 安装发布版插件、启用插件、扫码登录，安装 Codex / Claude ACP wrapper，并检查其他 backend CLI
  install-local [path]    安装本地源码目录；默认使用当前仓库目录
  help                    显示帮助信息
`);
}

const command = process.argv[2];
const commandArg = process.argv[3];

switch (command) {
  case "install":
    await install();
    break;
  case "install-local":
    await install({
      pluginSpec: resolveLocalPluginSpec(commandArg),
      localSource: true,
    });
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    if (command) {
      error(`未知命令: ${command}`);
    }
    help();
    process.exit(command ? 1 : 0);
}
