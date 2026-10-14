# BaizeFig · 白泽

**通万物、识万象。**

本地优先的可编辑设计工具。以 Figma Design 的工具功能、文件支持、交互逻辑和快捷键逐项对齐为长期目标，同时保留用户自带 AI 模型和外部 MCP 操作能力。

当前是 **v0.1 开发起点**，已经具备可运行的编辑闭环，**尚未完成 Figma 1:1 复刻**。[功能矩阵](docs/FIGMA_PARITY.md) 明确记录已有、部分实现与未实现的能力。没有复制 Figma 源码或使用 Figma 品牌资源。

## 运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:4318。生产构建使用 `npm run build`，静态文件输出至 `dist`，仓库包含 Netlify 配置。

## 已有能力

- 本地文件列表、多页面、IndexedDB 自动保存、原生 `.baizefig` JSON 文件导入导出。
- 画布平移缩放、框选、多选、移动、八向尺寸调整、数值属性编辑、方向键微调。
- Frame、矩形、圆形、直线、多边形、星形、文本、手绘折线、图片。
- 嵌套图层、分组/取消分组、画板化、对齐、前后排列、锁定、显隐、复制、粘贴、Alt 拖拽复制。
- 撤销重做、横纵向基础自动布局、填充、描边、圆角、透明度和基础文字排版。
- PNG/JPEG/WebP/GIF 图片导入；SVG 作为栅格素材导入；PNG/JPG/SVG 和内嵌 SVG 的 HTML 导出。
- 本地组件定义与实例快照、颜色变量与填充绑定、点击跳转原型预览、操作搜索与快捷键帮助。
- 用户配置 OpenAI-compatible API / Ollama：输出结构化命令，预览命令后作为一个可撤销事务应用。
- 本地 stdio MCP Bridge：文档/选区读取、命令批处理、PNG 截图与 SVG 导出，配对令牌与默认只读授权。

## 文件兼容边界

`.fig`、`.sketch` 和 PDF 导入尚未实现，界面会明确拒绝，不会将这些文件改名为自定义格式冒充兼容。SVG 当前作为图片导入，不还原为可编辑矢量节点。HTML 导出是 SVG 包装，不是 React 或语义化 DOM 代码生成。GIF 导入和截图/导出的动画表现不保证一致。

## MCP

在支持本地 stdio MCP 的客户端中配置：

```json
{
  "mcpServers": {
    "baizefig": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/BaiseFig/bridge/server.mjs"]
    }
  }
}
```

启动后从客户端的服务器日志读取配对令牌，在编辑器 **Connect AI** 中填入。Bridge 默认仅监听 `127.0.0.1:4319`，允许编辑器来源 `http://127.0.0.1:4318` 和 `http://localhost:4318`。其他可信编辑器来源可通过 `BAIZEFIG_ORIGINS` 显式配置。读取令牌不会自动允许写入，修改还需在编辑器勾选写入权限。

提供 `get_document`、`get_selection`、`get_screenshot`、`export_svg`、`apply_commands`。目标是当前配对的活动文档；同一时间只允许一个浏览器连接。切换设计文件时自动断开 Bridge 并撤销写入权限；新文档需要重新配对和授权。

远程 ChatGPT 的 HTTPS MCP 入口、P2P 协同、Yjs 合并、信令和 TURN 服务尚未实现。本地 stdio 支持不等于已经验证每个 ChatGPT 客户端都可连接。

## AI 引擎

在 **Ask Baize** 中填写 API 基地址（例如 `http://localhost:11434/v1`）、模型名称和可选密钥。当前文档、选区和指令会发送到你配置的端点；该端点必须允许浏览器跨域请求。API Key 只在内存中保存。离开页面后需重新配置。

命令输出先在文档副本中完整校验，再供用户应用。生成期间如果文档改变，旧提案不能应用。当前不具备视觉自动迭代、自动资源生成或真实模型效果评估；不要把命令校验等同于设计质量保证。

## 验证

```sh
npm test
npm run build
```

仓库另提供 `npm run test:ui` 的 Playwright 测试定义（需自行安装 Playwright Chromium）和 `node scripts/mcp-smoke.mjs` 的交互式 MCP 冒烟验证。实际执行记录见 [VERIFICATION.md](docs/VERIFICATION.md)。

实现代码与功能矩阵是后续对齐工作的基线。项目授权许可证待仓库所有者决定，当前没有擅自指定开源许可证。

界面已按用户提供的最新 Figma 截图调整为左侧独立功能栏、文件/页面/图层区、右侧属性区及底部浮动绘图工具栏。原始参考截图只留在用户本地，未纳入仓库。
