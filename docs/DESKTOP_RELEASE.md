## English

BaizeFig now has an Apple Silicon Mac desktop app: a local-first design canvas with offline editing and built-in local MCP.

- Offline editing, autosave, and save-before-quit protection.
- Install, start, stop, or uninstall local MCP; no separate Node.js installation.
- Pair the open canvas and grant editing/export permissions separately.
- Automatic GitHub release checks and a download prompt. Quit and replace the app manually to update; local designs remain in the data directory.
- English default README, Chinese translation, Netlify/Vercel deployment buttons, and a deployment/service comparison.

**Download:** use the `mac-arm64.dmg` for M-series Macs; the ZIP contains the same app. This release is unsigned and not notarized. If macOS blocks it, review the download source and use System Settings → Privacy & Security → Open Anyway.

Intel Mac and Windows share the cross-platform codebase, but are not included in this release because no real-device testing is available. Testers are welcome through GitHub Issues.

## 简体中文

BaizeFig 推出 Apple Silicon Mac 桌面版，支持本地优先设计、离线编辑与内置本机 MCP。

- 离线编辑、自动保存，以及退出前等待保存完成。
- 本机 MCP 安装、启动、停止与卸载，无需单独安装 Node.js。
- 配对当前画布，编辑和导出分别授权。
- 自动检查 GitHub 新版本并提示下载，退出后手动替换应用，本地作品保留。
- 英文默认 README、中文版本、一键部署按钮与运行方式对比表。

**下载：** M 系列 Mac 请选择 `mac-arm64.dmg`，ZIP 提供相同应用。本版本不使用 Apple 签名与公证；如被系统阻止，核对来源后可在「系统设置 → 隐私与安全性」选择「仍要打开」。

Intel Mac 和 Windows 使用同一跨平台代码基础，但因缺少真机验证，不包含在此次发行中。欢迎通过 GitHub Issues 参与实际测试。
