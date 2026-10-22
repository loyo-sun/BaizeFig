<div align="center">
  <img src="public/baize.svg" width="72" alt="BaizeFig 白泽" />
  <h1>BaizeFig · 白泽</h1>
  <p>A local-first design canvas you can connect to your own AI tools.<br>本地优先的设计画布，连接你选择的 AI 工具。</p>
  <p>English & 简体中文 · 中英文对照</p>
  <p><a href="https://baizefig.netlify.app/">Try in your browser / 在线体验</a> · <a href="https://github.com/loyo-sun/BaizeFig/releases">Download for Mac / 下载 Mac 版</a> · <a href="https://github.com/loyo-sun/BaizeFig/issues">Feedback / 反馈问题</a></p>
</div>

## Why I built this / 为什么做白泽

I started BaizeFig after trying design software that advertised MCP and agent support, yet still limited what I could connect, read, or change. The interfaces I wanted to use were not always available, and too much depended on the product's own integrations.

我试用过一些宣称支持 MCP 和 Agent 的设计软件，却发现实际接入仍有不少限制：想连接的工具、想读取或修改的内容，并不总是开放，很多操作还得依赖软件自己的集成方式。

I wanted a design tool where I could choose the model and client, deploy the editor myself, and let an agent work on the canvas through an explicit, inspectable set of tools. That is why I built BaizeFig. It is still growing; the aim is to make AI-assisted design easier to access and control.

我想要一个可以自己选择模型和客户端、自己部署编辑器，并让智能体通过明确、可查看的工具接口操作画布的设计工具。因此，我开始做 BaizeFig。它还在成长，希望让 AI 参与设计这件事更容易接入，也更容易由使用者掌控。

## What comes next / 后续计划

After v0.0.1, BaizeFig will receive only small updates, while I focus more on a project management app that uses software to coordinate projects, people, and agents to get work done.

v0.0.1 发布后，白泽只会进行小幅迭代，我会将更多精力投入项目管理应用，希望通过软件协调项目、人和 Agent，共同完成工作。

## What it does / 产品特点

- **Local-first editing:** autosave, multiple files, a recycle bin, named versions, and editable `.baizefig` backups. The desktop editor works offline.<br>
  **本地优先**：自动保存、多文件管理、回收站、命名版本，以及可继续编辑的 `.baizefig` 备份；桌面版可离线编辑。
- **A working design canvas:** shapes, text, images, layers, alignment, snapping, rulers, gradients, effects, masks, and Boolean operations.<br>
  **完整的日常设计工作区**：图形、文字、图片、图层、对齐吸附、标尺、渐变、效果、蒙版与布尔运算。
- **Editable vectors and typography:** pen and pencil tools, Bézier nodes, path operations, rich text, and font replacement.<br>
  **可编辑的矢量和文字**：钢笔、铅笔、贝塞尔节点、路径处理、富文本与字体替换。
- **Reusable design systems:** components, instances, variables, local component libraries, and auto layout.<br>
  **可复用的设计体系**：组件与实例、变量、本地组件库，以及自动布局。
- **Interactive prototypes:** page navigation, overlays, scrolling, and component interactions.<br>
  **交互原型**：页面跳转、覆盖层、滚动和组件交互。
- **Import and delivery:** import `.fig` and SVG; export PNG, JPG, SVG, HTML, PDF, or a native design backup.<br>
  **导入与交付**：导入 `.fig` 和 SVG，导出 PNG、JPG、SVG、HTML、PDF 或原生设计备份。
- **Your AI tools:** use a compatible model endpoint in Ask Baize, or connect an external client through local or remote MCP. Reading requires pairing; editing and export have separate permissions. Applied edits support undo.<br>
  **连接自己的 AI**：在 Ask Baize 中配置兼容模型服务，或通过本机、远程 MCP 接入外部客户端。读取前需要配对，编辑与导出分别授权；应用到画布的修改支持撤销。
- **Your deployment:** host the web editor, use the desktop app, run your own MCP service, or connect through LoyoCloud.<br>
  **选择自己的运行方式**：自行部署网页编辑器、下载桌面版、部署自己的 MCP 服务，或连接 LoyoCloud。

BaizeFig is under active development. Figma import is partial compatibility, not lossless conversion, and cannot write back `.fig` files. PDF export preserves the visual appearance as images. Some advanced Figma features remain unsupported; see the [support matrix](docs/FIGMA_PARITY.md).

BaizeFig 仍在持续开发。Figma 文件属于兼容性导入，不能无损还原全部特性，也不能写回 `.fig`；PDF 以图像保留外观。部分 Figma 高级能力尚未实现，详见[功能支持范围](docs/FIGMA_PARITY.md)。

## Quick start / 快速使用

### Use the browser version / 在线体验

Open [baizefig.netlify.app](https://baizefig.netlify.app/). Start drawing, import an existing design, or export a `.baizefig` backup. Files are stored in this browser's site storage; clearing that storage can remove them.

打开 [baizefig.netlify.app](https://baizefig.netlify.app/)，即可开始绘制、导入设计或导出 `.baizefig` 备份。作品保存在当前浏览器的网站存储中，清理该存储可能移除作品。

### Deploy your own editor / 一键部署自己的编辑器

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/loyo-sun/BaizeFig)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Floyo-sun%2FBaizeFig)

Choose a button, connect your hosting account, and deploy. The repository includes the build settings for both platforms. **These buttons deploy the web editor, not a persistent MCP server or cloud document storage.** To add remote MCP, connect LoyoCloud or deploy the [MCP service](docs/MCP.md) separately. Your hosting provider's account requirements and usage limits apply.

点击按钮，连接对应托管平台的账号并部署。仓库已提供两个平台的构建配置。**一键部署的是网页编辑器，不会同时部署常驻 MCP 服务，也不提供云端作品存储。** 如需远程 MCP，可连接 LoyoCloud，或另行[部署 MCP 服务](docs/MCP.md)。账号要求与使用额度以托管平台为准。

### Download the Mac app / 下载 Mac 本地版

Download the **Apple Silicon / arm64 DMG** from [GitHub Releases](https://github.com/loyo-sun/BaizeFig/releases), open it, and drag BaizeFig into Applications. This release is unsigned and not notarized. If macOS blocks opening it, use **System Settings → Privacy & Security → Open Anyway** after reviewing the download source; do not disable system-wide security protections.

从 [GitHub Releases](https://github.com/loyo-sun/BaizeFig/releases) 下载 **Apple Silicon／arm64 DMG**，打开后将 BaizeFig 拖入「应用程序」。此版本不使用 Apple 签名与公证；如果 macOS 阻止打开，核对下载来源后，可在「系统设置 → 隐私与安全性」中选择「仍要打开」，无需关闭系统整体安全保护。

The app includes offline editing and a local MCP runtime. Open the local MCP manager from the desktop menu, install and start the service, and copy the client configuration. Then open the canvas MCP connection dialog and connect to the built-in desktop MCP service. Stop or uninstall the service from the same management window. Node.js does not need to be installed separately.

应用自带离线编辑和本机 MCP 运行环境。在「桌面 → 本机 MCP 管理」中安装、启动服务并复制客户端配置，再回到画布的 MCP 连接窗口，点击「连接桌面本机 MCP」。同一管理窗口支持停止和卸载服务，不需要另外安装 Node.js。

The app checks GitHub Releases on launch and periodically. New versions trigger a download prompt; replace the application manually after quitting it. Local designs remain in the app's data directory. Browser files are separate: export from the browser, then import into the app. See the [desktop guide](docs/DESKTOP.md).

应用会在启动时及运行期间定时检查 GitHub Releases，发现新版后提示下载；退出后手动替换应用即可，本地作品保留在应用数据目录。浏览器与桌面版的数据彼此独立，请从浏览器导出后再导入桌面版。详见[桌面版指南](docs/DESKTOP.md)。

### Intel Mac and Windows testers wanted / 招募 Intel Mac 与 Windows 实机测试用户

The Electron codebase supports **Intel Mac and Windows**, but I do not have those computers for real-device testing. The public desktop download currently includes **Apple Silicon only**. Intel Mac was packaged during development but has not been tested on a physical Intel Mac; Windows support is not a verified release claim.

Electron 代码支持 **Intel Mac 和 Windows**，但我手边没有这两类电脑，无法完成真机测试。目前公开下载**仅提供 Apple Silicon 版**。开发期间已生成过 Intel Mac 安装包，但尚未在 Intel Mac 真机运行；Windows 也不作为已经验证的发行版本。

If you have an Intel Mac or Windows PC, please [open a testing issue](https://github.com/loyo-sun/BaizeFig/issues/new?title=Desktop%20testing%3A%20Intel%20Mac%20or%20Windows). Include your OS version, CPU architecture, build result, and what you tried: editing and reopening files, imports/exports, fonts, and local MCP installation, connection, and removal. Community test results will guide future platform releases.

如果你有 Intel Mac 或 Windows 电脑，欢迎[提交实机测试 Issue](https://github.com/loyo-sun/BaizeFig/issues/new?title=Desktop%20testing%3A%20Intel%20Mac%20or%20Windows)，注明系统版本、CPU 架构、构建结果，以及编辑与重开文件、导入导出、字体、本机 MCP 安装连接和卸载的实际表现。后续平台发布会参考社区测试结果。

## Which version or service do I need? / 一键部署、本地版和云服务有什么区别？

| Comparison / 对比项 | One-click web deployment<br>一键部署网页编辑器 | Local desktop app<br>本地桌面版 | LoyoCloud service<br>LoyoCloud 云服务 | Self-hosted MCP service<br>自部署 MCP 服务 |
| --- | --- | --- | --- | --- |
| What runs<br>实际运行内容 | A web editor on your Netlify/Vercel site<br>在自己的 Netlify／Vercel 站点运行编辑器 | The editor and optional local MCP on your computer<br>在电脑运行编辑器与可选本机 MCP | Account, authorization, and remote MCP routing<br>账号、授权与远程 MCP 路由 | Your own Node MCP bridge and authorization service<br>自己维护的 Node MCP 桥接和授权服务 |
| Where designs live<br>作品保存位置 | Your browser's site storage<br>当前浏览器的网站存储 | The app's local data directory<br>应用本地数据目录 | Designs remain in the connected editor; not cloud file storage<br>作品仍在所连接的编辑器中，不提供云端文件存储 | Designs remain in the connected editor<br>作品仍在所配对的编辑器中 |
| Offline use<br>离线能力 | Not a guaranteed offline installation<br>不保证作为完整离线安装使用 | Editing works offline; offline AI also needs a local model/client<br>可离线编辑；离线 AI 还需要本地模型和客户端 | Requires internet<br>需要联网 | Remote access needs network connectivity<br>远程访问需要网络连接 |
| MCP availability<br>MCP 接入 | Connect a separate local/remote service<br>另连本机或远程服务 | Built-in local MCP can be installed, stopped, and removed<br>内置本机 MCP，可安装、停止和卸载 | Shared remote HTTPS MCP with OAuth<br>公用 HTTPS MCP 与 OAuth 授权 | Your HTTPS endpoint with OAuth or token authentication<br>自己的 HTTPS 地址，支持 OAuth 或令牌认证 |
| Account/setup<br>账号与准备 | A hosting account to deploy<br>部署需要托管平台账号 | No cloud account needed for local editing/MCP<br>本地编辑和 MCP 无需云账号 | LoyoCloud account and client authorization<br>需要 LoyoCloud 账号及客户端授权 | Your server, runtime, HTTPS, and configuration<br>需要服务器、运行环境、HTTPS 和配置 |
| Must the canvas stay open?<br>是否保持画布打开 | Yes, for MCP operations<br>MCP 操作时需要 | Yes, for MCP operations<br>MCP 操作时需要 | Yes, in the connected editor<br>需要所连接的编辑器保持打开 | Yes, in the paired editor<br>需要所配对的编辑器保持打开 |
| Who maintains it<br>谁负责维护 | You maintain your site<br>自己维护站点 | You install app updates<br>自己安装应用更新 | The service operator maintains the backend<br>服务运营方维护后端 | You maintain the backend<br>自己维护后端 |
| Best fit<br>适合谁 | Your own web address and browser access<br>希望用自己的网址访问编辑器 | Offline work and local AI tools<br>需要离线工作、本机 AI 工具 | Remote AI clients without running your own MCP server<br>希望接入远程 AI 客户端，又不想自己运行 MCP 服务器 | Control over the remote MCP infrastructure<br>希望掌控远程 MCP 基础设施 |

These options can be combined. A self-hosted web editor can connect to LoyoCloud or your own MCP service, and the desktop app can use local MCP without a cloud account. LoyoCloud routes authorized design content to the AI client; it does not save your design files or render closed canvases. See [LoyoCloud connection details](docs/LOYO_CLOUD.md).

这些方式可以组合使用。自行部署的网页编辑器既能连接 LoyoCloud，也能连接自己的 MCP；桌面版的本机 MCP 无需云账号。LoyoCloud 会将授权的设计内容转发给 AI 客户端，不保存作品文件，也不能在画布关闭后继续渲染。详见 [LoyoCloud 接入说明](docs/LOYO_CLOUD.md)。

## Develop and contribute / 本地开发与参与贡献

Use Node.js **22.12+**:

使用 Node.js **22.12+**：

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4318`. Use `npm run build` for a web build and `npm run desktop:mac` for an unsigned Apple Silicon desktop package. For web-only dependency installation, use `BAIZEFIG_SKIP_DESKTOP_DOWNLOAD=1 npm ci` to skip downloading Electron.

打开 `http://127.0.0.1:4318`。运行 `npm run build` 构建网页，运行 `npm run desktop:mac` 构建未签名的 Apple Silicon 安装包。只开发网页时，可使用 `BAIZEFIG_SKIP_DESKTOP_DOWNLOAD=1 npm ci` 跳过 Electron 下载。

[Development](docs/DEVELOPMENT.md) · [Desktop packaging](docs/DESKTOP.md) · [MCP deployment](docs/MCP.md) · [Architecture](docs/ARCHITECTURE.md) · [Keyboard shortcuts](docs/SHORTCUTS.md) · [Performance](docs/PERFORMANCE.md)

[开发指南](docs/DEVELOPMENT.md) · [桌面封装](docs/DESKTOP.md) · [MCP 部署](docs/MCP.md) · [架构说明](docs/ARCHITECTURE.md) · [快捷键](docs/SHORTCUTS.md) · [性能记录](docs/PERFORMANCE.md)

Please keep original imported files and export backups of important work. When using AI, the content required for your request is sent to the model endpoint or client you choose.

请保留导入的原始文件，并定期导出重要作品。使用 AI 时，完成请求所需的设计内容会发送给你选择的模型服务或客户端。
