# BaizeFig 开发与接入指南

产品介绍见 [README](../README.md)，功能边界见 [功能矩阵](FIGMA_PARITY.md)。

## 运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:4318。生产构建使用 `npm run build`，静态文件输出至 `dist`，仓库包含 Netlify 配置。


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

仓库另提供 `npm run test:ui` 的 Playwright 测试定义（需自行安装 Playwright Chromium）和 `node scripts/mcp-smoke.mjs` 的交互式 MCP 冒烟验证。实际执行记录见 [VERIFICATION.md](VERIFICATION.md)。

