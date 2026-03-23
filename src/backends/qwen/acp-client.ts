import { AcpSubprocessLightweightClient } from "../lightweight/acp-subprocess-client.js";

export class QwenAcpClient extends AcpSubprocessLightweightClient {
  constructor() {
    super({
      backendId: "qwen",
      backendLabel: "Qwen Code",
      defaultCommand: "qwen",
      defaultArgs: ["--acp"],
      commandEnvVarNames: ["WEIXIN_QWEN_ACP_BIN", "QWEN_ACP_BIN"],
      argsEnvVarNames: ["WEIXIN_QWEN_ACP_ARGS", "QWEN_ACP_ARGS"],
      cwdEnvVarNames: ["WEIXIN_QWEN_ACP_CWD", "QWEN_ACP_CWD"],
      permissionModeEnvVarNames: ["WEIXIN_QWEN_ACP_PERMISSION_MODE", "QWEN_ACP_PERMISSION_MODE"],
      missingCommandHint: "Install Qwen Code CLI or set WEIXIN_QWEN_ACP_BIN.",
      authRequiredHint: "Qwen Code ACP requires authentication. Run `qwen` manually in the target workdir and complete sign-in first.",
      mediaOutDirName: "qwen-acp-out",
      cancelledMessage: "Qwen Code 已取消当前操作。",
    });
  }
}
