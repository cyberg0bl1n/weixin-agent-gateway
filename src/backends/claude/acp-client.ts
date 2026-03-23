import { AcpSubprocessLightweightClient } from "../lightweight/acp-subprocess-client.js";

export class ClaudeAcpClient extends AcpSubprocessLightweightClient {
  constructor() {
    super({
      backendId: "claude",
      backendLabel: "Claude Code",
      defaultCommand: "claude-agent-acp",
      commandEnvVarNames: ["WEIXIN_CLAUDE_ACP_BIN", "CLAUDE_ACP_BIN"],
      cwdEnvVarNames: ["WEIXIN_CLAUDE_ACP_CWD", "CLAUDE_ACP_CWD"],
      permissionModeEnvVarNames: ["WEIXIN_CLAUDE_ACP_PERMISSION_MODE", "CLAUDE_ACP_PERMISSION_MODE"],
      missingCommandHint: "Install @zed-industries/claude-agent-acp or set WEIXIN_CLAUDE_ACP_BIN.",
      authRequiredHint: "Claude ACP requires authentication. Run `claude` manually in the target workdir and complete login/trust first.",
      mediaOutDirName: "claude-acp-out",
      cancelledMessage: "Claude Code 已取消当前操作。",
    });
  }
}
