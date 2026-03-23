#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const PACKAGE_NAME = "@bytepioneer-ai/weixin-agent-gateway";
const PLUGIN_SPEC = process.env.WEIXIN_GATEWAY_PLUGIN_SPEC?.trim() || PACKAGE_NAME;
const CHANNEL_ID = process.env.WEIXIN_GATEWAY_CHANNEL_ID?.trim() || "weixin-agent-gateway";
const PLUGIN_ENTRY_ID = process.env.WEIXIN_GATEWAY_PLUGIN_ID?.trim() || "weixin-agent-gateway";
const OFFICIAL_PLUGIN_ENTRY_ID = "openclaw-weixin";
const ENABLE_OFFICIAL_PLUGIN_CMD = "openclaw config set plugins.entries.openclaw-weixin.enabled true";
const CODEX_ACP_NPM_PACKAGE = "@zed-industries/codex-acp";
const CLAUDE_ACP_NPM_PACKAGE = "@zed-industries/claude-agent-acp";

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

function run(cmd, { silent = true } = {}) {
  const stdio = silent ? ["pipe", "pipe", "pipe"] : "inherit";
  const result = spawnSync(cmd, { shell: true, stdio });
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

function ensureOpenClawInstalled() {
  if (!commandExists("openclaw")) {
    error("未找到 openclaw，请先安装 OpenClaw。");
    console.log("  npm install -g openclaw");
    console.log("  详见 https://docs.openclaw.ai/install");
    process.exit(1);
  }
  log("已找到本地安装的 openclaw");
}

function installPlugin() {
  log("正在安装插件...");
  try {
    const installOut = run(`openclaw plugins install "${PLUGIN_SPEC}"`);
    if (installOut) log(installOut);
  } catch (installErr) {
    if (installErr.stderr && installErr.stderr.includes("already exists")) {
      log("检测到本地已安装，尝试更新插件...");
      try {
        const updateOut = run(`openclaw plugins update "${PLUGIN_ENTRY_ID}"`);
        if (updateOut) log(updateOut);
      } catch (updateErr) {
        error("插件更新失败，请手动执行：");
        if (updateErr.stderr) console.error(updateErr.stderr);
        console.log(`  openclaw plugins update "${PLUGIN_ENTRY_ID}"`);
        process.exit(1);
      }
    } else {
      error("插件安装失败，请手动执行：");
      if (installErr.stderr) console.error(installErr.stderr);
      console.log(`  openclaw plugins install "${PLUGIN_SPEC}"`);
      process.exit(1);
    }
  }
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

function printNextSteps(codexAcpInfo, claudeAcpInfo) {
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
  console.log("   /openclaw");
  console.log();
  console.log("   当前真正可用的非 OpenClaw 后端是 Codex 和 Claude Code。");
  console.log("   其他预留后端（opencode / copilot / auggie / cursor）当前尚未接入。");
  console.log("   Codex 现在走 direct ACP：需要本机 `codex` 与 `codex-acp` 可用，并先在目标工作目录手动执行一次 `codex` 完成登录。");
  console.log("   Claude Code 现在走 direct ACP：需要本机 `claude` 与 `claude-agent-acp` 可用，并先在目标工作目录手动执行一次 `claude` 完成 trust。");
  console.log();
  console.log("2. 只有在你需要显式指定 ACP 命令或工作目录时，才设置环境变量");
  if (isWindows()) {
    console.log(`   $env:WEIXIN_CODEX_ACP_BIN="codex-acp"`);
    console.log('   $env:WEIXIN_CODEX_ACP_CWD="D:\\your\\project"');
    console.log(`   $env:WEIXIN_CLAUDE_ACP_BIN="claude-agent-acp"`);
    console.log('   $env:WEIXIN_CLAUDE_ACP_CWD="D:\\your\\project"');
  } else {
    console.log(`   export WEIXIN_CODEX_ACP_BIN="codex-acp"`);
    console.log('   export WEIXIN_CODEX_ACP_CWD="/path/to/project"');
    console.log(`   export WEIXIN_CLAUDE_ACP_BIN="claude-agent-acp"`);
    console.log('   export WEIXIN_CLAUDE_ACP_CWD="/path/to/project"');
  }
  console.log();
}

async function install() {
  ensureOpenClawInstalled();
  installPlugin();
  disableOfficialPlugin();
  enablePlugin();
  loginWeixin();
  const codexAcpInfo = await ensureCodexAcpInstalled();
  const claudeAcpInfo = await ensureClaudeAcpInstalled();
  restartGateway();
  printNextSteps(codexAcpInfo, claudeAcpInfo);
}

function help() {
  console.log(`
用法: npx -y ${PACKAGE_NAME} <命令>

命令:
  install   安装插件、启用插件、扫码登录，并安装 Codex / Claude ACP wrapper
  help      显示帮助信息
`);
}

const command = process.argv[2];

switch (command) {
  case "install":
    await install();
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
