import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

import {
  WEIXIN_PLUGIN_ID,
  WEIXIN_PLUGIN_NAME,
} from "./src/constants.js";
import { weixinPlugin } from "./src/channel.js";
import { assertHostCompatibility } from "./src/compat.js";
import { WeixinConfigSchema } from "./src/config/config-schema.js";
import { registerWeixinCli } from "./src/log-upload.js";
import { setWeixinRuntime } from "./src/runtime.js";

const plugin = {
  id: WEIXIN_PLUGIN_ID,
  name: WEIXIN_PLUGIN_NAME,
  description: "Weixin channel (getUpdates long-poll + sendMessage)",
  configSchema: buildChannelConfigSchema(WeixinConfigSchema),
  register(api: OpenClawPluginApi) {
    assertHostCompatibility(api.runtime?.version);

    if (api.runtime) {
      setWeixinRuntime(api.runtime);
    }

    api.registerChannel({ plugin: weixinPlugin });

    const mode = (api as { registrationMode?: string }).registrationMode;
    if (mode && mode !== "full") {
      return;
    }

    api.registerCli(({ program, config }) => registerWeixinCli({ program, config }), {
      commands: [WEIXIN_PLUGIN_ID],
    });
  },
};

export default plugin;
