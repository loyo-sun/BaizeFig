<div align="center">
  <h1>BaizeFig · 白泽</h1>
  <p>本地优先的设计画布，连接你选择的 AI 工具。</p>
  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>
  <p><a href="https://baizefig.netlify.app/">在线体验</a> · <a href="https://github.com/loyo-sun/BaizeFig/releases">下载 Mac 版</a> · <a href="https://github.com/loyo-sun/BaizeFig/issues">反馈问题</a></p>
</div>

## 为什么做白泽

我试用过一些宣称支持 MCP 和 Agent 的设计软件，却发现实际接入仍有不少限制：想连接的工具、想读取或修改的内容，并不总是开放，很多操作还得依赖软件自己的集成方式。

我想要一个可以自己选择模型和客户端、自己部署编辑器，并让智能体通过明确、可查看的工具接口操作画布的设计工具。因此，我开始做 BaizeFig。它还在成长，希望让 AI 参与设计这件事更容易接入，也更容易由使用者掌控。

## 产品特点

- **本地优先**：自动保存、多文件管理、回收站、命名版本，以及可继续编辑的 `.baizefig` 备份；桌面版可离线编辑。
- **完整的日常设计工作区**：图形、文字、图片、图层、对齐吸附、标尺、渐变、效果、蒙版与布尔运算。
- **可编辑的矢量和文字**：钢笔、铅笔、贝塞尔节点、路径处理、富文本与字体替换。
- **可复用的设计体系**：组件与实例、变量、本地组件库，以及自动布局。
- **交互原型**：页面跳转、覆盖层、滚动和组件交互。
- **导入与交付**：导入 `.fig` 和 SVG，导出 PNG、JPG、SVG、HTML、PDF 或原生设计备份。
- **连接自己的 AI**：在 Ask Baize 中配置兼容模型服务，或通过本机、远程 MCP 接入外部客户端。读取前需要配对，编辑与导出分别授权；应用到画布的修改支持撤销。
- **选择自己的运行方式**：自行部署网页编辑器、下载桌面版、部署自己的 MCP 服务，或连接 LoyoCloud。

BaizeFig 仍在持续开发。Figma 文件属于兼容性导入，不能无损还原全部特性，也不能写回 `.fig`；PDF 以图像保留外观。部分 Figma 高级能力尚未实现，详见[功能支持范围](docs/FIGMA_PARITY.md)。

## 快速使用

### 在线体验

打开 [baizefig.netlify.app](https://baizefig.netlify.app/)，即可开始绘制、导入设计或导出 `.baizefig` 备份。作品保存在当前浏览器的网站存储中，清理该存储可能移除作品。

### 一键部署自己的编辑器

[一键部署到 Netlify](https://app.netlify.com/start/deploy?repository=https://github.com/loyo-sun/BaizeFig)
[一键部署到 Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Floyo-sun%2FBaizeFig)

点击按钮，连接对应托管平台的账号并部署。仓库已提供两个平台的构建配置。**一键部署的是网页编辑器，不会同时部署常驻 MCP 服务，也不提供云端作品存储。** 如需远程 MCP，可连接 LoyoCloud，或另行[部署 MCP 服务](docs/MCP.md)。账号要求与使用额度以托管平台为准。

### 下载 Mac 本地版

从 [GitHub Releases](https://github.com/loyo-sun/BaizeFig/releases) 下载 **Apple Silicon／arm64 DMG**，打开后将 BaizeFig 拖入「应用程序」。此版本不使用 Apple 签名与公证；如果 macOS 阻止打开，核对下载来源后，可在「系统设置 → 隐私与安全性」中选择「仍要打开」，无需关闭系统整体安全保护。

应用自带离线编辑和本机 MCP 运行环境。在「桌面 → 本机 MCP 管理」中安装、启动服务并复制客户端配置，再回到画布的 MCP 连接窗口，点击「连接桌面本机 MCP」。同一管理窗口支持停止和卸载服务，不需要另外安装 Node.js。

应用会在启动时及运行期间定时检查 GitHub Releases，发现新版后提示下载；退出后手动替换应用即可，本地作品保留在应用数据目录。浏览器与桌面版的数据彼此独立，请从浏览器导出后再导入桌面版。详见[桌面版指南](docs/DESKTOP.md)。

### 招募 Intel Mac 与 Windows 实机测试用户

Electron 代码支持 **Intel Mac 和 Windows**，但我手边没有这两类电脑，无法完成真机测试。目前公开下载**仅提供 Apple Silicon 版**。开发期间已生成过 Intel Mac 安装包，但尚未在 Intel Mac 真机运行；Windows 也不作为已经验证的发行版本。

如果你有 Intel Mac 或 Windows 电脑，欢迎[提交实机测试 Issue](https://github.com/loyo-sun/BaizeFig/issues/new?title=Desktop%20testing%3A%20Intel%20Mac%20or%20Windows)，注明系统版本、CPU 架构、构建结果，以及编辑与重开文件、导入导出、字体、本机 MCP 安装连接和卸载的实际表现。后续平台发布会参考社区测试结果。

## 一键部署、本地版和云服务有什么区别？

| 对比项 | 一键部署网页编辑器 | 本地桌面版 | LoyoCloud 云服务 | 自部署 MCP 服务 |
| --- | --- | --- | --- | --- |
| 实际运行内容 | 在自己的 Netlify／Vercel 站点运行编辑器 | 在电脑运行编辑器与可选本机 MCP | 账号、授权与远程 MCP 路由 | 自己维护的 Node MCP 桥接和授权服务 |
| 作品保存位置 | 当前浏览器的网站存储 | 应用本地数据目录 | 作品仍在所连接的编辑器中，不提供云端文件存储 | 作品仍在所配对的编辑器中 |
| 离线能力 | 不保证作为完整离线安装使用 | 可离线编辑；离线 AI 还需要本地模型和客户端 | 需要联网 | 远程访问需要网络连接 |
| MCP 接入 | 另连本机或远程服务 | 内置本机 MCP，可安装、停止和卸载 | 公用 HTTPS MCP 与 OAuth 授权 | 自己的 HTTPS 地址，支持 OAuth 或令牌认证 |
| 账号与准备 | 部署需要托管平台账号 | 本地编辑和 MCP 无需云账号 | 需要 LoyoCloud 账号及客户端授权 | 需要服务器、运行环境、HTTPS 和配置 |
| 是否保持画布打开 | MCP 操作时需要 | MCP 操作时需要 | 需要所连接的编辑器保持打开 | 需要所配对的编辑器保持打开 |
| 谁负责维护 | 自己维护站点 | 自己安装应用更新 | 服务运营方维护后端 | 自己维护后端 |
| 适合谁 | 希望用自己的网址访问编辑器 | 需要离线工作、本机 AI 工具 | 希望接入远程 AI 客户端，又不想自己运行 MCP 服务器 | 希望掌控远程 MCP 基础设施 |

这些方式可以组合使用。自行部署的网页编辑器既能连接 LoyoCloud，也能连接自己的 MCP；桌面版的本机 MCP 无需云账号。LoyoCloud 会将授权的设计内容转发给 AI 客户端，不保存作品文件，也不能在画布关闭后继续渲染。详见 [LoyoCloud 接入说明](docs/LOYO_CLOUD.md)。

## 本地开发与参与贡献

使用 Node.js **22.12+**：

```sh
npm ci
npm run dev
```

打开 `http://127.0.0.1:4318`。运行 `npm run build` 构建网页，运行 `npm run desktop:mac` 构建未签名的 Apple Silicon 安装包。只开发网页时，可使用 `BAIZEFIG_SKIP_DESKTOP_DOWNLOAD=1 npm ci` 跳过 Electron 下载。

[开发指南](docs/DEVELOPMENT.md) · [桌面封装](docs/DESKTOP.md) · [MCP 部署](docs/MCP.md) · [架构说明](docs/ARCHITECTURE.md) · [快捷键](docs/SHORTCUTS.md) · [性能记录](docs/PERFORMANCE.md)

请保留导入的原始文件，并定期导出重要作品。使用 AI 时，完成请求所需的设计内容会发送给你选择的模型服务或客户端。
