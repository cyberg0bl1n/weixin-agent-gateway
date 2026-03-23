import { AcpSubprocessLightweightClient } from "../lightweight/acp-subprocess-client.js";

export class KimiAcpClient extends AcpSubprocessLightweightClient {
  constructor() {
    super({
      backendId: "kimi",
      backendLabel: "Kimi CLI",
      defaultCommand: "kimi",
      defaultArgs: ["acp"],
      commandEnvVarNames: ["WEIXIN_KIMI_ACP_BIN", "KIMI_ACP_BIN"],
      argsEnvVarNames: ["WEIXIN_KIMI_ACP_ARGS", "KIMI_ACP_ARGS"],
      cwdEnvVarNames: ["WEIXIN_KIMI_ACP_CWD", "KIMI_ACP_CWD"],
      permissionModeEnvVarNames: ["WEIXIN_KIMI_ACP_PERMISSION_MODE", "KIMI_ACP_PERMISSION_MODE"],
      missingCommandHint: "Install Kimi CLI or set WEIXIN_KIMI_ACP_BIN.",
      authRequiredHint: "Kimi ACP requires authentication. Run `kimi` manually in the target workdir and complete `/login` first.",
      mediaOutDirName: "kimi-acp-out",
      cancelledMessage: "Kimi CLI 已取消当前操作。",
    });
  }
}
