import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk";

import {
  WEIXIN_PLUGIN_ID,
  WEIXIN_PLUGIN_NAME,
} from "./src/constants.js";
import { weixinPlugin } from "./src/channel.js";
import { WeixinConfigSchema } from "./src/config/config-schema.js";
import { registerWeixinCli } from "./src/log-upload.js";
import { setWeixinRuntime } from "./src/runtime.js";

const plugin = {
  id: WEIXIN_PLUGIN_ID,
  name: WEIXIN_PLUGIN_NAME,
  description: "Weixin channel (getUpdates long-poll + sendMessage)",
  configSchema: buildChannelConfigSchema(WeixinConfigSchema),
  register(api: OpenClawPluginApi) {
    if (!api?.runtime) {
      throw new Error("[weixin] api.runtime is not available in register()");
    }
    setWeixinRuntime(api.runtime);

    api.registerChannel({ plugin: weixinPlugin });
    api.registerCli(({ program, config }) => registerWeixinCli({ program, config }), {
      commands: [WEIXIN_PLUGIN_ID],
    });
  },
};

export default plugin;
