# 连接 LoyoCloud 公用 MCP

1. 打开 https://baizefig.netlify.app/，在左侧选择「云」。
2. 点击「登录 LoyoCloud」，在弹出的云服务窗口注册或登录账号，再确认连接 BaizeFig。
3. 保持画布打开。在 AI 客户端添加远程 MCP 地址 `https://cloud.loyo.work/mcp/baizefig`，按客户端提示完成 OAuth。
4. 在授权页确认 BaizeFig 应用，按需选择编辑和导出权限。
5. 让 AI 先调用 `list_documents`，选择文档和编辑器，再读内容或创建设计。

同一地址适用于支持 Streamable HTTP 与 OAuth 的客户端。Codex 可执行：

```sh
codex mcp add baizefig --url https://cloud.loyo.work/mcp/baizefig
codex mcp login baizefig
```

WorkBuddy 在「专家·技能·连接器 → 连接器 → 自定义连接器」添加：

```json
{
  "mcpServers": {
    "baizefig": {
      "type": "streamableHttp",
      "url": "https://cloud.loyo.work/mcp/baizefig"
    }
  }
}
```

授权绑定账号、AI 客户端和 BaizeFig 应用。切换画布无需重新进行应用授权；关闭画布会使该执行目标离线。在 LoyoCloud 控制台可以独立撤销授权或断开画布。退出编辑器账号会移除其云连接，但不会替你撤销 AI 客户端授权。

编辑器令牌只保存在当前页面内存中，刷新页面后需要重新连接；云服务登录状态可复用。公测暂不提供邮箱找回密码，请保存密码。文档内容会经过云端并发送给你授权的 AI 客户端，云端不提供文件保存或离线设计。

自主部署入口仍可使用，不需要 LoyoCloud 账号；详见 [MCP 部署说明](MCP.md)。自行部署 LoyoCloud 时，在构建编辑器前设置 `VITE_LOYOCLOUD_URL`，并在服务端允许该编辑器的精确 Origin。
