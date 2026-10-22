## English

Apple Silicon installation fix for v0.0.1b1.

- Replace the skipped signing step with a complete local ad-hoc signature for the app, helpers, and embedded frameworks. No Apple Developer account, certificate, or notarization is required.
- Verify bundle signatures strictly before generating the installers, failing the build if verification fails.
- Keep offline editing, local MCP management, local designs, and GitHub update prompts.

Download the `mac-arm64.dmg`, quit BaizeFig, and replace the app in Applications. v0.0.1b1 remains available as a historical release; install b2 manually if b1 cannot open.

This app is not Developer ID signed or notarized. macOS may still require manual approval. If it reports “damaged,” verify the installed app with `codesign --verify --deep --strict --verbose=2 /Applications/BaizeFig.app`; only if verification succeeds and the download is from this repository, remove this app's download quarantine flag with `xattr -dr com.apple.quarantine /Applications/BaizeFig.app`. No system-wide security settings need to change.

## 简体中文

修复 v0.0.1b1 在 Apple Silicon Mac 上安装后可能提示“已损坏”的问题。

- 从完全跳过签名改为完整的本地临时签名（ad-hoc），覆盖应用、Helper 和内嵌框架，无需 Apple 开发者账号、证书或公证。
- 生成安装包前严格验证签名，失败则终止打包。
- 保留离线编辑、本机 MCP 管理、本地作品和 GitHub 更新提示。

下载 `mac-arm64.dmg`，退出 BaizeFig 后替换「应用程序」中的旧版。b1 作为历史版本保留；如果 b1 无法打开，请手动安装 b2。

此版本没有 Apple 开发者认证或公证，macOS 仍可能要求手动确认。若仍提示“已损坏”，先运行 `codesign --verify --deep --strict --verbose=2 /Applications/BaizeFig.app`；仅在校验通过、且确认为本仓库下载的应用后，运行 `xattr -dr com.apple.quarantine /Applications/BaizeFig.app` 清除此应用的下载隔离标记，无需关闭系统整体安全检查。
