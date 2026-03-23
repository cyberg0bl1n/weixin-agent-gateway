import { AcpSubprocessLightweightClient } from "../lightweight/acp-subprocess-client.js";

export class CodexAcpClient extends AcpSubprocessLightweightClient {
  constructor() {
    super({
      backendId: "codex",
      backendLabel: "Codex",
      defaultCommand: "codex-acp",
      commandEnvVarNames: ["WEIXIN_CODEX_ACP_BIN", "CODEX_ACP_BIN"],
      cwdEnvVarNames: ["WEIXIN_CODEX_ACP_CWD", "CODEX_ACP_CWD"],
      permissionModeEnvVarNames: ["WEIXIN_CODEX_ACP_PERMISSION_MODE", "CODEX_ACP_PERMISSION_MODE"],
      missingCommandHint: "Install @zed-industries/codex-acp or set WEIXIN_CODEX_ACP_BIN.",
      authRequiredHint: "Codex ACP requires authentication. Run `codex` manually in the target workdir and complete sign-in first.",
      mediaOutDirName: "codex-acp-out",
      cancelledMessage: "Codex 已取消当前操作。",
    });
  }
}
