# 自部署 MCP 与客户端连接

BaizeFig 编辑器仍是静态网站，MCP 是同一项目附带的 Node.js 服务进程。外部 AI 客户端调用 MCP，服务通过已配对浏览器执行现有设计命令。浏览器必须保持打开；没有云端文档托管、多人服务或离线后台渲染。

## 从画布连接 WorkBuddy、ChatGPT 或豆包工作

在 BaizeFig 右侧点击「MCP 连接」，选择客户端。界面把本机连接与在线服务分开，手动令牌方式保留在「手动配对与高级设置」。

| 客户端 | 已实现的接入入口 | 尚需的外部条件 |
| --- | --- | --- |
| WorkBuddy | 本地配置助手、自动配对、远程 OAuth 地址及配置说明 | 安装 WorkBuddy，重启 MCP；正式连接器市场上架另需平台审核 |
| ChatGPT 桌面端 | 通过官方 Codex CLI 配置共享 MCP、自动配对 | 使用支持本地 MCP 的桌面版本；CLI 不可用时使用远程方式 |
| ChatGPT 网页版 | HTTPS 地址、OAuth 与画布内确认 | 自部署可公开访问的服务，以及账号开放的自定义 MCP 入口 |
| 豆包工作 | 专属远程入口、OAuth 地址与接入说明导出 | 官方开放平台目前内测；须账号具有相应入口/开发权限，未声称官方插件已上架或完成该产品实测 |

这些入口共享 BaizeFig 的标准 MCP 工具。第三方账号权限、平台发布和远程域名不会由静态编辑器自动创建。

### 本机连接：首次配置一次，以后自动配对

Mac 可在向导中下载配置助手 ZIP，解压后运行 `.command`，选择已安装依赖的 BaizeFig 项目文件夹。助手需要 Node.js 20.19+，会尝试系统及已知本机运行时；它不会静默下载运行时。若系统阻止运行，请检查脚本内容并遵循系统的正常操作流程。

其他系统，或希望先预览更改的用户，可在仓库运行：

```sh
npm run mcp:connect -- --client workbuddy --origin https://baizefig.netlify.app --dry-run
npm run mcp:connect -- --client workbuddy --origin https://baizefig.netlify.app
# ChatGPT 桌面端：将 workbuddy 换为 chatgpt。
```

WorkBuddy 助手合并 `~/.workbuddy/mcp.json` 的 baizefig 项，保留其他服务及字段，创建私有备份，再原子替换；无效 JSON 或符号链接文件会拒绝修改。ChatGPT 助手使用已安装的官方 `codex mcp add`，不自行解析或覆盖 TOML；已有配置先备份。备份命名为 `.baizefig-时间戳.bak`，可手动恢复。不要同时在多个客户端启动同一端口的桥。

助手只为所选编辑器来源设置 `BAIZEFIG_AUTO_PAIR=1`，适用于回环监听的 stdio 服务，不向远程 HTTP 开放。重启客户端中的 BaizeFig MCP，然后在画布点击「自动连接画布」。无需查日志或复制令牌；编辑与导出仍须单独勾选。自动配对信任本机进程和配置的精确编辑器 Origin，因此仅用于你信任的编辑器站点。

### 在线连接：生成配置、复制地址、画布确认

1. 在向导选择「在线 MCP」，填写自有 HTTPS 服务域名或 `/mcp` 地址。目前向导要求服务位于根路径，路径前缀部署请使用高级手动配置。
2. 点击「生成服务配置」，下载 `.env.baizefig`。文件含私有配对凭据，请勿提交仓库或发送给他人。页面在内存中保留相同凭据，不把它写入浏览器 URL、localStorage 或连接说明。
3. 在服务器用 `node --env-file=.env.baizefig bridge/server.mjs --http` 启动服务，配置 HTTPS 代理，包括 `/mcp`、`/bridge`、`/.well-known/`、`/oauth/`；参见 `deploy/nginx.conf`。
4. 返回画布点击「连接画布到服务」。若刷新后丢失配对凭据，可在高级设置中输入部署文件中的值，无需读取服务日志。
5. 点击「复制 MCP 地址」，在客户端的自定义 MCP 入口添加，认证选择 OAuth。WorkBuddy 可使用导出的配置；ChatGPT 和豆包工作的下载文件是字段说明，**不是官方可直接导入的插件清单**。
6. 客户端打开授权页面后，回到 BaizeFig，核对客户端声明名称及返回地址，仅允许自己主动发起的请求。批准后授权页自动返回客户端。

OAuth 服务实现资源/授权服务器发现、公共客户端动态注册（DCR）、S256 PKCE、一次性授权码、1 小时访问令牌、30 天轮换刷新令牌及 issuer 响应。令牌绑定当前 editorId/documentId；无法用来访问另一画布。拒绝、断开或切换文档会终止或撤销授权。仅支持 `baizefig:design` scope，细分写入和导出能力仍在画布授权。

这是单实例、单配对编辑器的自部署授权服务，不是多租户平台。注册、授权与令牌保存在内存，重启后需重新添加/授权客户端；同一实例最多 200 个注册、20 个待确认流程、100 个授权码、500 个访问及刷新令牌，过期记录按请求清理。授权码 2 分钟、确认请求 5 分钟有效。不支持 CIMD、外部身份供应商登录和 OAuth 客户端密钥模式；此轮不包含正式平台上架或账号级实测。

参考：[WorkBuddy 连接器规范](https://open.workbuddy.cn/docs/connector)、[ChatGPT MCP 配置](https://learn.chatgpt.com/docs/extend/mcp)、[豆包开放平台](https://open.doubao.com/)。

## 1. 安装与启动

需要 Node.js 20.19+ 或 22.12+。必须部署整个项目及运行依赖，仅部署 `dist/` 不会得到 MCP 服务。

```sh
npm ci
npm run build
cp .env.example .env
```

分别运行两次以下命令，将结果填入 `.env` 的 `BAIZEFIG_ACCESS_TOKEN` 与 `BAIZEFIG_PAIRING_TOKEN`，不要使用示例占位内容：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

设置 `BAIZEFIG_ORIGINS` 为静态编辑器的真实来源（协议、域名、端口，无路径和末尾斜线），`BAIZEFIG_HOSTS` 为反向代理转发给 Node 的 Host 域名（无协议、端口）。使用回环监听和 HTTPS 反向代理。然后启动：

```sh
node --env-file=.env bridge/server.mjs --http
```

也可由进程管理器注入这些环境变量，运行 `npm run mcp:http`。这个脚本本身不加载 `.env`。服务不依赖工作目录以外的本机文件权限，不提供任意文件或脚本执行接口。

- `BAIZEFIG_HOST`：默认 `127.0.0.1`。容器内可改成 `0.0.0.0`，并显式限制允许的 Host。
- `BAIZEFIG_PORT`：默认 `4319`。
- `BAIZEFIG_ACCESS_TOKEN`：HTTP 客户端访问令牌，至少 32 字符。
- `BAIZEFIG_PAIRING_TOKEN`：浏览器配对令牌，至少 24 字符；不配置时启动生成，输出到服务日志。
- `BAIZEFIG_ORIGINS`：逗号分隔的精确编辑器来源，不支持 `*`。
- `BAIZEFIG_HOSTS`：逗号分隔的允许 Host，抵御 DNS 重绑定。反向代理必须正确转发 Host。

传统手动配对模式的日志包含配对令牌，限制服务日志访问；自动配对和 OAuth 模式不输出它。访问令牌不会输出；两种令牌用途不同，应分别生成。轮换令牌后重启服务，旧连接失效。

本机开发可使用 `npm run dev`，环境来源改为 `http://127.0.0.1:4318`，Host 允许 `127.0.0.1,localhost`。仅回环地址允许明文 HTTP。

## 2. 静态站点与 HTTPS 反向代理

将构建出的 `dist/` 交给静态服务器，Node 服务仍监听回环地址。示例见 [`deploy/nginx.conf`](../deploy/nginx.conf) 与 [`deploy/baizefig-mcp.service`](../deploy/baizefig-mcp.service)，替换域名、证书、路径、Node 路径和服务用户后使用。这些配置需在实际服务器安装 Nginx/证书后验证，仓库集成测试不包含真实 TLS 证书签发。

公开路由：

| 路由 | 功能 |
| --- | --- |
| `/` | 静态编辑器 |
| `/mcp` | 经 Bearer 认证的 Streamable HTTP MCP，POST |
| `/bridge` | 浏览器 WebSocket；先检查 Origin/Host，再通过首帧配对 |
| `/healthz` | Node 本机健康检查，不含文档或令牌 |

浏览器配对凭据通过 WebSocket 首帧发送，不放在 URL。反向代理必须保留 WebSocket Upgrade 与 Origin，并转发 Authorization。若前缀是 `/ai/mcp`，浏览器会使用 `/ai/bridge`；代理需去掉 `/ai` 后转发到 Node 对应路由。

## 3. 配置 AI 客户端并配对浏览器

在支持远程 Streamable HTTP 和自定义 Authorization Header 的客户端中设置：

```json
{
  "mcpServers": {
    "baizefig": {
      "url": "https://design.example.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_ACCESS_TOKEN" }
    }
  }
}
```

这是通用配置示意，不同客户端的字段可能不同。此配置对应静态 Bearer 模式；不能设置 Header 的客户端应使用上文新增的 OAuth 模式。不要把配对令牌当作访问令牌，也不要把真实令牌写进公开仓库。

打开 BaizeFig 的 MCP 连接窗口：

1. 填写 `https://design.example.com/mcp` 与配对令牌，连接浏览器。
2. 配对后即允许客户端读取当前文档，包括文字和素材数据。
3. 如需 AI 编辑，勾选“允许 MCP 修改当前打开的文档”。
4. 如需截图和 SVG，另勾选“允许 MCP 截图和导出 SVG”。
5. 在 AI 工具中提出设计需求。画布会实时更新，修改支持撤销和本地自动保存。

同一实例仅配对一个编辑器。另一个浏览器不会顶替已有连接，需先断开旧编辑器。断开、页面关闭或切换文件后撤销编辑与导出授权，重新配对后需重新勾选。没有自动重连与自动重放写入。

## 4. 工具与调用契约

| 工具 | 说明 |
| --- | --- |
| `get_capabilities` | 协议版本、限制与当前配对状态 |
| `get_document` | 首次发现目标；分页、页面/ID/字段筛选 |
| `get_selection` | 指定目标的当前选区 |
| `get_screenshot` | 当前选区或活动页 PNG（需导出权限） |
| `export_svg` | 当前选区或活动页 SVG（需导出权限） |
| `preview_commands` | 校验批次并返回新增/修改/删除 ID，不提交 |
| `apply_commands` | 原子提交一个可撤销批次 |
| `get_request_status` | 按幂等键查询本编辑器生命周期内的提交回执 |

`get_document` 返回 `documentId`、`editorId`、`revision`、`pages`、`nodes`、`total` 和 `nextOffset`。默认最多 100 个节点，可设 `limit`（最多 500）、`offset`、`pageId`、`ids`、`fields`。后续分页携带 `expectedRevision`，文档变化则重新读取。结果是局部设计视图，不能当作完整 `.baizefig` 备份。

除首次发现外，请携带明确目标。选区、截图和 SVG 必须传 `documentId` 与 `editorId`。写入及预览还必须传 `expectedRevision`、`idempotencyKey` 与 `commands`：

```json
{
  "documentId": "READ_FROM_GET_DOCUMENT",
  "editorId": "READ_FROM_GET_DOCUMENT",
  "expectedRevision": "READ_FROM_GET_DOCUMENT",
  "idempotencyKey": "unique-request-001",
  "commands": [{
    "type": "create",
    "nodes": [{
      "id": "login-frame", "pageId": "READ_FROM_PAGES", "type": "frame",
      "name": "Login", "width": 390, "height": 844, "fill": "#FFFFFF"
    }]
  }]
}
```

支持 `create/update/delete/group/ungroup/duplicate/order/align/layout/reparent`，每批 1–100 条。创建节点可只指定 id/pageId/type 和所需基本属性，编辑器填充默认值。更新仅支持 Schema 声明的基本几何、颜色、文字、布局与多边形点；高级组件、变量、路径网络、富文本等属性不在本版写入契约中。不能通过 patch 修改 id、pageId、parentId 或节点类型；重父级使用 `reparent`。未知字段、无效数值、缺失目标或锁定目标会拒绝整批操作。

先 `preview_commands` 可检查 ID 差异；预览不是渲染预览，也不授予权限。提交前本地文档发生变化则返回 `REVISION_CONFLICT`，需要重新读取并审查修改，不能自动改用新 revision 强行覆盖。

同一个幂等键重试必须使用完全相同的版本与命令。成功提交后再次调用返回原始回执，不再提交；同键不同参数返回 `IDEMPOTENCY_CONFLICT`。回执最多保存 500 次写入，达到上限拒绝新写入而不悄悄淘汰旧回执。回执留存在浏览器内存，断线重配仍可查询；页面刷新后清除且 `editorId` 改变。**刷新后无法根据旧回执证明提交是否完成，不能盲目重放。**

超时可能发生在提交后、响应前。先按相同目标和 key 调用 `get_request_status`；同一 editorId 生命周期内，可使用完全相同请求安全重试。撤销不会删除提交回执，重试不会把已撤销修改重新应用。

## 5. 限制与错误

请求体最多 1 MiB，浏览器返回体最多 8 MiB，每实例最多 32 个等待中的编辑器请求，默认 30 秒超时。大文档请筛选字段和分页；大截图请缩小选区。HTTP 只提供无协议会话的请求响应，不提供旧 HTTP+SSE 端点；浏览器配对是应用状态，不是 MCP 会话。

此版本锁文件中的官方 SDK 为 1.32.1，当前支持的最新协议为 `2025-11-25`，另支持 SDK 声明的较早版本；以 `get_capabilities.protocolVersions` 为准。未宣称支持 `2026-07-28` 协议。

工具执行错误使用 MCP `isError`，正文为 `{code,message}`；Schema 错误由 SDK 拒绝。常见 code：`NOT_PAIRED`、`TARGET_CHANGED`、`PERMISSION_DENIED`、`REVISION_CONFLICT`、`IDEMPOTENCY_CONFLICT`、`NOT_FOUND`、`LOCKED`、`EDITOR_BUSY`、`RESULT_TOO_LARGE`、`TIMEOUT`。HTTP 认证错误返回 401，Origin/Host 拒绝返回 403。

## 6. 本地 stdio 和验证

原有入口仍可用：

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

浏览器填 `http://127.0.0.1:4319/mcp` 和该进程日志中的配对令牌。stdio 模式不会开放 HTTP MCP；这个地址在编辑器中仅用于推导本机 `/bridge` WebSocket 地址。升级后旧的无目标写入调用需要迁移到新契约。

```sh
npm test
npm run test:mcp
npm run test:mcp:ui
npm run build
```

`test:mcp` 验证 SDK HTTP、stdio、认证、Origin/Host、配对、路由、OAuth、配置助手和断线；`test:mcp:ui` 使用已安装的 Google Chrome 隔离测试环境，以官方 SDK 客户端和独立 JSON-RPC 测试客户端（2025-06-18）完成真实浏览器中的设计、调整、截图、撤销、重配和切换文档。它们是两种测试客户端实现，不等于已经实测任意第三方 AI 产品。交互式验证用 `node scripts/mcp-smoke.mjs`；测试既有远程部署时设置 `BAIZEFIG_MCP_URL` 与 `BAIZEFIG_ACCESS_TOKEN`。
