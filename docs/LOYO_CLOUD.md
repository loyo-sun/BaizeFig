# 连接 LoyoCloud 公用 MCP

1. 打开 https://baizefig.netlify.app/，在左侧选择「云」。
2. 选择登录有效期（1、7、30 或 90 天，默认 30 天），点击「登录 LoyoCloud」，在弹出的云服务窗口注册或登录账号，再确认连接 BaizeFig。
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

编辑器登录与自动连接意愿保存在当前浏览器的网站存储中。有效期内刷新、重开页面或重启浏览器后，编辑器通过 `/api/v1/editor/session` 校验服务端会话，再恢复当前画布连接；沿用 AI 客户端已有授权。会话为固定到期时间，恢复不会续期。到期、服务端撤销或主动退出后清除本地会话。主动断开画布会记住不自动连接，登录仍保留；退出会在同来源的其他标签页同步。暂时断网或服务不可用会保留凭据并重试，不弹出授权窗口。清除网站数据也会清除登录状态。公测暂不提供邮箱找回密码，请保存密码。文档内容会经过云端并发送给你授权的 AI 客户端，云端不提供文件保存或离线设计。

自主部署入口仍可使用，不需要 LoyoCloud 账号；详见 [MCP 部署说明](MCP.md)。自行部署 LoyoCloud 时，在构建编辑器前设置 `VITE_LOYOCLOUD_URL`，并在服务端允许该编辑器的精确 Origin。

## 部署兼容

本功能需要同步更新 BaizeFig 与 LoyoCloud 服务端。服务端支持登录确认参数 `session_days`（1/7/30/90，默认 30），将期限绑定到一次性连接码；交换得到的编辑器令牌按该期限保存在数据库中。`GET /api/v1/editor/session` 使用 Bearer 编辑器令牌及精确 Origin，返回用户、MCP 地址和绝对到期时间；过期或撤销返回 401，来源不符返回 401/403。它不创建新授权、不延长会话，也不改变 AI 客户端的 OAuth 刷新令牌期限。
