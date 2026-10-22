# BaizeFig 桌面版

[English overview](../README.md) · [中文介绍](../README.zh-CN.md)

公开发行仅提供 **Apple Silicon／arm64 Mac**。应用使用 Electron，界面、字体和本机 MCP 运行时随安装包提供。使用不需要 Apple 开发者账号或证书的本地临时签名（ad-hoc），不进行 Apple 公证。

## 安装与本地作品

从 [GitHub Releases](https://github.com/loyo-sun/BaizeFig/releases) 下载 arm64 DMG，打开后将 BaizeFig 拖入「应用程序」。如果系统阻止打开，核对下载来源后，在「系统设置 → 隐私与安全性」中选择「仍要打开」。不要关闭系统整体安全保护。

编辑、自动保存、导入导出可离线使用；关闭应用前会等待作品保存。作品保存在 `~/Library/Application Support/BaizeFig`，替换应用不会清空该目录。浏览器数据不会自动迁移，请先导出 `.baizefig` 再导入桌面版。

## 本机 MCP

1. 打开「桌面 → 本机 MCP 管理」，安装并启动服务。它只监听本机回环地址，使用随机端口和独立凭据。
2. 回到画布的 MCP 连接窗口，点击「连接桌面本机 MCP」。修改和截图导出仍需单独授权。
3. 在管理窗口复制配置，合并到 AI 客户端的 MCP 设置；也可选择已有的 `mcpServers` JSON 配置文件安装连接。修改前备份，不覆盖其他服务或冲突的 `baizefig` 配置。其他格式请通过客户端设置手动添加。
4. 重新加载 AI 客户端连接。应用自带运行时，不需单独安装 Node.js；画布须保持打开。
5. 「停止」保留安装与连接配置；「卸载」停止服务、清除凭据、移除登记过的客户端连接。内置程序随应用保留，可重新安装。手动复制到其他客户端的配置需自行移除。若配置已被修改，会提示处理冲突。

退出应用后服务停止；重新打开并连接画布后，可能需要客户端重新连接。移动应用位置后请更新客户端配置。卸载整个应用前，建议先卸载 MCP 以清理登记的连接。本机状态文件 `desktop-mcp.json` 含私有凭据，请勿分享。

本机 MCP 不要求互联网。完全离线 AI 需要本地模型和支持 MCP 的客户端；云端模型或远程服务需要联网。

## 更新与 GitHub 发布

本版本使用本地临时签名，不使用 Apple 开发者证书或公证。更新采用 **GitHub 版本检测与下载提示**，不执行依赖签名校验的系统自动安装：

- 启动和每 6 小时读取公开 Releases；也可通过「桌面 → 检查更新」手动检查。
- 只提示高于当前版本、已经公开且包含 Apple Silicon DMG 的发行。测试版可以接收后续测试版或稳定版；稳定版不提示测试版。
- 点击「下载新版」在浏览器下载 GitHub 安装包；退出应用后手动替换。作品数据保留。
- 离线或自动检查失败不打断编辑，手动检查失败会显示错误。

工作流 `.github/workflows/desktop-release.yml` 仅构建 arm64，无需任何 Apple 凭据。标签必须等于 package.json 的 `displayVersion`，内部打包版本使用等价的 SemVer 格式；例如 `v0.0.1b1`。标签构建在测试通过后公开发布 GitHub Release，上传 arm64 DMG 和 ZIP。GitHub Actions 自动提供 `GITHUB_TOKEN`。手动运行工作流只生成附件，不公开发布。

## 开发与验证

需要 Node.js 22.12+：

```sh
npm ci
npm run desktop:dev
npm run test:desktop
npm run test:desktop:ui
npm run desktop:mac
```

`desktop:mac` 只生成本地临时签名的 Apple Silicon 安装包，输出在 `desktop-release/`。只开发网页时可使用 `BAIZEFIG_SKIP_DESKTOP_DOWNLOAD=1 npm ci` 跳过 Electron 下载。

桌面测试使用隔离的临时用户目录，覆盖本机 stdio MCP、配对、写权限、断网标记下的回环连接、跨重启作品恢复、管理界面和启停卸载。可用 `BAIZEFIG_DESKTOP_EXECUTABLE` 指向打包后的可执行文件运行同一测试。版本选择与下载地址校验另有单元测试。

Intel Mac 曾完成打包但没有真机验证；Windows 使用同一跨平台代码基础，尚未做真机验收。二者均不在本次公开下载范围，欢迎[参与实机测试](https://github.com/loyo-sun/BaizeFig/issues/new?title=Desktop%20testing%3A%20Intel%20Mac%20or%20Windows)。

## v0.0.1b2 安装修复

v0.0.1b1 完全跳过打包签名，内嵌 Electron 框架残留不完整的签名，浏览器下载后可能显示“已损坏”。b2 改为完整的 ad-hoc 签名，并在生成安装包前强制执行 `codesign --verify --deep --strict`，失败则终止打包。该检查覆盖应用、Helper 和内嵌框架，但不等于获得 Apple 开发者认证。

ad-hoc 签名仍可能被下载后的 Gatekeeper 检查阻止。核对来源并严格校验通过后，可以仅清除此应用的下载隔离标记：`xattr -dr com.apple.quarantine /Applications/BaizeFig.app`。不关闭系统整体安全检查。b1 用户需手动安装 b2，不能依赖无法打开的旧应用检测更新。
