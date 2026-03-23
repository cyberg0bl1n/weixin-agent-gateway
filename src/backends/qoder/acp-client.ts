import { AcpSubprocessLightweightClient } from "../lightweight/acp-subprocess-client.js";

export class QoderAcpClient extends AcpSubprocessLightweightClient {
  constructor() {
    super({
      backendId: "qoder",
      backendLabel: "Qoder CLI",
      defaultCommand: "qodercli",
      defaultArgs: ["--acp"],
      commandEnvVarNames: ["WEIXIN_QODER_ACP_BIN", "QODER_ACP_BIN"],
      argsEnvVarNames: ["WEIXIN_QODER_ACP_ARGS", "QODER_ACP_ARGS"],
      cwdEnvVarNames: ["WEIXIN_QODER_ACP_CWD", "QODER_ACP_CWD"],
      permissionModeEnvVarNames: ["WEIXIN_QODER_ACP_PERMISSION_MODE", "QODER_ACP_PERMISSION_MODE"],
      missingCommandHint: "Install Qoder CLI or set WEIXIN_QODER_ACP_BIN.",
      authRequiredHint: "Qoder ACP requires authentication. Run `qodercli` manually in the target workdir and complete `/login`, or set QODER_PERSONAL_ACCESS_TOKEN first.",
      mediaOutDirName: "qoder-acp-out",
      cancelledMessage: "Qoder CLI 已取消当前操作。",
    });
  }
}
