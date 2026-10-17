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

支持本地 stdio 和阶段一自部署 Streamable HTTP 接入。静态编辑器与 MCP 服务保留在同一项目中，分别运行；浏览器需要保持打开。

完整部署步骤、认证配对、客户端配置、工具契约、错误与验证见 [自部署 MCP 指南](MCP.md)。HTTPS 代理和进程管理示例在 `deploy/`。

阶段二多用户在线服务、OAuth 登录、云端文档托管和无人值守渲染尚未实现。

## AI 引擎

在 **Ask Baize** 中填写 API 基地址（例如 `http://localhost:11434/v1`）、模型名称和可选密钥。当前文档、选区和指令会发送到你配置的端点；该端点必须允许浏览器跨域请求。API Key 只在内存中保存。离开页面后需重新配置。

命令输出先在文档副本中完整校验，再供用户应用。生成期间如果文档改变，旧提案不能应用。当前不具备视觉自动迭代、自动资源生成或真实模型效果评估；不要把命令校验等同于设计质量保证。


## 验证

```sh
npm test
npm run build
```

仓库另提供 `npm run test:ui` 的 Playwright 测试定义（需自行安装 Playwright Chromium）和 `node scripts/mcp-smoke.mjs` 的交互式 MCP 冒烟验证。实际执行记录见 [VERIFICATION.md](VERIFICATION.md)。

