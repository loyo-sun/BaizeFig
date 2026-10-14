# 架构与命令协议

## 当前实现

```text
画布 / 图层 / 属性 / 快捷键 ─┐
AI 结构化命令提案 ──────────┼→ execute(document, command)
已配对 MCP 客户端 ─────────┘       ↓ 校验、权限、事务
                          统一 BaizeFig Document
                           ↓             ↓
                      SVG/文本渲染     IndexedDB 自动保存
                           ↓             ↓
                      PNG/SVG 导出     .baizefig 备份恢复
```

React + TypeScript + Vite，SVG 场景渲染，IndexedDB 持久化。没有中心化文档服务器。渲染器、命令执行器、持久化、AI 和 MCP 分开组织。

源文件：`src/core.ts` 负责文档与命令；`src/Canvas.tsx` 负责场景与导出；`src/storage.ts` 负责存储；`src/ai.ts` 负责模型；`src/App.tsx` 负责编辑器交互；`bridge/server.mjs` 负责本地 MCP 与浏览器转接。

## 新增的兼容与交互模块

- `components.ts`：保留导入定义、实例展开、稳定路径、覆盖、重置、交换、分离及主组件变更传播。结构编辑要求先分离实例，避免修改被静默丢弃。
- `layout.ts`：Flex/Wrap/Grid、Fill 分配与尺寸边界、基线和父级尺寸约束；相关几何变化向嵌套布局传播。
- `textLayout.ts` / `textEditing.ts` / `CanvasTextEditor.tsx`：字体测量、字素换行、样式范围迁移与画布输入，处理组合输入和空行占位。
- `appearance.tsx` / `combine.ts`：多重填充、线性/径向渐变、效果、蒙版与保留子图层的布尔合成。SVG 定义按场景隔离。
- `typedVariables.ts`：数字/文本/布尔值、别名、逐节点模式继承和属性绑定；颜色变量及透明度继续由 `variables.ts` 管理。
- `prototype.ts` / `PrototypePlayer.tsx`：触发器、多动作、跨页导航、覆盖层、返回与淡入预览；未支持动作保留兼容性提示。
- `geometry.ts`：在世界/局部坐标间进行缩放计算，保持对角锚点。

## 数据模型

顶层：`format: "baizefig"`、`version: 1`、`id`、`name`、`pages`、`nodes`、`background`。

节点使用稳定 ID，`pageId` 标识页面，`parentId` 构成层级树。位置为父节点局部坐标。节点包含类型、尺寸、旋转、填充、描边、文字与素材等字段。Frame 的子节点按画板边界裁剪。只有 frame/group/component/instance 可以做父节点。

场景与导出共用渲染器。世界仿射矩阵用于包围盒、选区导出、分组、对齐、绘图和单对象缩放；旋转、斜切和镜像缩放保留对角锚点。完整 Scale/重父级与退化几何仍需扩展。画布内文字编辑使用跟随世界矩阵的 HTML 编辑层，提交后通过统一命令引擎重排并形成撤销事务；编辑层不会进入导出文件。

## 命令

命令返回新的文档副本与可选选区。旧文档保持不变；校验失败不提交。可通过 `get_document` 获取现有节点作为结构参考。创建节点应包含 `makeNode` 所定义的完整字段。

```json
{"type":"update","ids":["existing-node-id"],"patch":{"fill":"#2563eb","radius":8}}
```

```json
{"type":"layout","id":"existing-frame-id","direction":"horizontal","gap":12,"padding":16}
```

支持：`create`、`update`、`delete`、`group`、`ungroup`、`duplicate`、`order`、`align`、`layout`。读取 `core.ts` 的 `Command` 类型获得精确参数。

锁定节点及其锁定祖先保护节点变更。导入会校验版本、节点唯一性、页面关联、父节点类型、循环结构、数值和图片数据。删除清理子树与原型目标引用。AI/MCP 批量先在副本执行全部命令，再整体应用，作为一个撤销单元。

撤销历史保留最多 100 个完整文档快照，目前不是操作级增量历史；大型文档内存与性能需要后续基准和优化。拖拽预览仅在指针松开时形成历史，取消恢复拖拽前文档。

## 本地存储与恢复

IndexedDB 数据库 `baizefig` 已升级为版本 2，包含 documents、settings 和 trash。删除与最后打开文档更新在同一事务完成；保存会检查回收站，阻止过期自动保存恢复已删除文档。回收站恢复不影响电脑中的原始文件。保存采用 400ms 防抖，界面显示结果。浏览器存储不是永久备份，清理站点数据会删除设计；导出 `.baizefig` 文件才能在外部独立保存。当前没有文件系统实时写入和灾难恢复版本库，也尚无离线应用壳缓存或 PWA。

## AI / MCP 安全边界

AI 仅允许 create/update/delete/layout 命令，命令经统一执行器。用户需配置兼容 API；没有平台 Key，也没有服务商代理。生产模型的 CORS 与实际输出质量仍需专项验证。

MCP 使用官方 SDK stdio 传输。浏览器主动连接本机 WebSocket；服务器绑定回环地址，检查 Origin 和随机令牌。读取与写入权限分离，浏览器默认不允许写入；切换设计文件会断开连接并撤销写入授权。桥不具备任意本机文件读取工具。关闭服务会断开协同；此桥不是 P2P 服务或远程 HTTPS MCP。

## 后续架构工作

1. 建立完整仿射变换、路径/贝塞尔编辑与布尔运算内核。
2. 将快照历史改为可组合命令与增量事务，建立大型画布性能基准。
3. 增加字体测量、多段样式、复杂布局、约束、组件实例与变量系统。
4. 为格式导入器建立样本库和独立转换层，验证 `.fig` / `.sketch` 的真实还原能力。
5. 按节点/属性映射 CRDT，明确协同权限及主机离线行为后接入 Yjs/WebRTC。
6. 添加可替换信令、资源通道、重连恢复，再实现远程 MCP 认证与会话桥接。

后续能力不会因为文档中有规划就视为已经实现。
