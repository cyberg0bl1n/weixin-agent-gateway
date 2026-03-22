# weixin-agent-gateway-cli

## Usage

```bash
npx -y @bytepioneer-ai/weixin-agent-gateway-cli install
```

This installer will:

- verify `openclaw` is available
- install or update the Weixin plugin package
- enable the plugin in OpenClaw config
- run QR login
- install `agentapi` if it is missing
- print the default backend-switch flow
