# Figma Design 功能对齐矩阵

目标：逐项达到工具功能、文件兼容、交互逻辑和快捷键的 1:1 对齐。下表是首轮基线，不声称穷尽 Figma 的全部版本、计划及产品差异。Design 为主要对标对象；FigJam、Slides、Sites、Make 等其他产品不自动计入当前实现。

状态：**已有** = 有可执行实现；**部分** = 只覆盖列出的子集；**未实现** = 没有可用实现。已有不代表已完成逐项 Figma 等价性验收。

## 文件、项目与格式

| 能力 | 状态 | 当前边界 / 后续验收 |
|---|---|---|
| 本地设计文件列表、创建、命名 | 已有 | IndexedDB 保存，非云端团队文件浏览器 |
| 多页面、页面创建/重命名/删除 | 已有 | 至少保留一页；未实现拖拽页排序 |
| 自动保存与重载恢复 | 已有 | 站点数据清理会丢失，需导出备份 |
| 原生可恢复设计格式 | 已有 | `.baizefig` / BaizeFig JSON v1 |
| Figma `.fig` 导入/导出 | 未实现 | 需真实样本及还原验证，不能改后缀冒充支持 |
| Sketch `.sketch` 导入 | 未实现 | 需几何、文字、样式、组件转换 |
| PNG、JPEG、WebP、GIF 导入 | 部分 | 作为图片节点；GIF 动画跨导出链路不保证保留 |
| SVG 导入 | 部分 | 栅格化作为图片；不是可编辑矢量 |
| PDF、视频和其他格式导入 | 未实现 | 明确显示不支持或拒绝 |
| PNG/JPG/SVG 导出及 1x/2x/3x | 已有 | 共享场景渲染；最大 4000 万像素 |
| PDF 导出 | 未实现 | 需文字和矢量保真验证 |
| HTML、React 代码导出 | 部分 | HTML 为内嵌 SVG 包装；React/语义化 DOM 未实现 |
| 文件版本历史、分支与合并 | 未实现 | 仅会话内撤销历史 |
| 团队、项目、权限、发布资源库 | 未实现 | 当前为本地文件，不模拟云端团队权限 |
| 离线 PWA、桌面安装、系统文件关联 | 未实现 | 应用已加载后的本地编辑不等同于完整离线分发 |

## 画布、选择与变换

| 能力 | 状态 | 当前边界 / 后续验收 |
|---|---|---|
| 画布平移、滚轮平移、鼠标中心缩放 | 已有 | Space/Hand、Ctrl/Cmd+滚轮，缩放 5%—800% |
| 适配画布、适配选区、100% | 已有 | 快捷键与缩放按钮 |
| 单选、多选、完全包含框选、全选 | 已有 | 框选根节点；交叉框选及深选语义仍需对齐 |
| 图层选择、深层节点选择 | 部分 | 双击与 Ctrl/Cmd 点击；不是完整 Figma 选择层级语义 |
| 拖动、Shift 限轴、Alt 拖拽复制 | 已有 | 未旋转对象坐标基础；嵌套旋转需改造 |
| 八方向缩放、Shift 保持比例 | 部分 | 单对象未旋转状态；多对象变换/旋转后缩放待实现 |
| 旋转 | 部分 | 属性数字输入可渲染；画布旋转手柄和完整矩阵未实现 |
| Scale 工具、Flip、独立变换原点 | 未实现 | 需同步文字、描边和子节点变换 |
| 像素网格、图层轮廓 | 部分 | 简单网格/轮廓开关，未实现完整像素预览 |
| 标尺、参考线、布局网格、智能吸附 | 未实现 | 不能将整数取整当作智能对齐 |
| 测距、间距提示、智能分布 | 未实现 | 需几何与交互验收 |
| 对齐六个方向、层级前后排列 | 已有 | 支持不同父节点下的平移坐标 |
| 等间距分布、Tidy up | 未实现 | 与 Auto layout 区分 |

## 图层、绘图与样式

| 能力 | 状态 | 当前边界 / 后续验收 |
|---|---|---|
| Frame、Rectangle、Ellipse、Line | 已有 | Frame 预设、嵌套和边界裁剪 |
| Polygon、Star | 部分 | 固定三角形和五角星，参数化边数/内径待实现 |
| Pen 与 Pencil | 部分 | 当前为拖拽采样折线；点式钢笔、控制柄、闭合和 Bézier 未实现 |
| Vector networks、节点编辑、曲线平滑 | 未实现 | 核心绘图内核工作项 |
| Union/Subtract/Intersect/Exclude、Flatten | 未实现 | 需布尔运算内核与高精度样本 |
| 画板/分组/取消分组与父子层级 | 部分 | 平移父子坐标可用；图层树拖放重父级及旋转保真待实现 |
| Section、Slice、Mask、剪切蒙版 | 未实现 | Frame clipping 不能代替 Mask |
| 隐藏、锁定、重命名、复制粘贴 | 已有 | 文档内部和跨本应用剪贴板；不兼容 Figma 二进制剪贴板 |
| 撤销、重做 | 已有 | 100 个完整快照；非持久化版本库和多人撤销 |
| 单色填充、描边宽度、圆角、透明度 | 已有 | 仅 hex 单色，统一圆角，基础描边 |
| 多重填充/描边、渐变、图片裁切模式 | 未实现 | 需序列化和渲染一致性 |
| 阴影、模糊、背景模糊、Blend modes | 未实现 | 需跨 SVG/Canvas 导出验证 |
| 独立圆角、弧线、Dash、Cap、Join | 未实现 | 参数化图形与描边扩展 |
| 样式、Design tokens、变量集合/模式 | 部分 | 本地颜色变量可创建、改名、修改、删除和绑定填充；多集合/模式、别名及其他变量类型未实现 |

## 文字、布局与组件

| 能力 | 状态 | 当前边界 / 后续验收 |
|---|---|---|
| 文本创建、内容编辑、多行 | 部分 | 属性面板/双击对话框编辑；非画布内光标编辑 |
| 字体、字号、字重、行高与对齐 | 部分 | 浏览器可用字体；无字体安装服务/缺字管理 |
| 混排、字距、链接、OpenType、RTL | 未实现 | 需文字测量和富文本引擎 |
| 横向/纵向 Auto layout | 部分 | Gap/Padding + 容器内容适配 |
| Hug/Fill/Fixed、Wrap、Grid Auto layout | 未实现 | 当前不能视为完整自动布局 |
| Constraints、绝对定位、响应式断点 | 未实现 | 需完整布局引擎 |
| 组件创建、资源面板、实例创建 | 部分 | 实例为快照副本，不具备主组件联动 |
| 实例覆盖/重置、Detach、Swap | 未实现 | 需定义主组件和覆盖数据模型 |
| Component sets、Variants、Properties | 未实现 | 未实现变量、布尔/文本/插槽组件属性 |
| 团队库、共享样式、发布更新 | 未实现 | 需分发及版本控制策略 |

## 原型、开发交付与协作

| 能力 | 状态 | 当前边界 / 后续验收 |
|---|---|---|
| Present、Frame 点击跳转 | 部分 | 当前页面内 On click → Navigate；Esc 退出 |
| 交互连接线、热区可视化 | 未实现 | 目前通过目标下拉设置 |
| Hover/Drag/Delay/Key 触发器 | 未实现 | 需事件状态机 |
| Smart animate、Transitions、Overlays | 未实现 | 需差异匹配和动画时序 |
| 滚动、固定位置、设备壳、Flow 起点 | 未实现 | 需独立原型运行时 |
| 原型变量、条件、表达式和交互组件 | 未实现 | 需运行时隔离状态 |
| Dev Mode、Inspect、代码片段、标注 | 未实现 | 当前导出不等于完整开发交付 |
| 评论、光标、在线状态、邀请与权限 | 未实现 | 无假“Share”按钮或虚构在线用户 |
| 分享者主机 P2P、Yjs、断线合并 | 未实现 | 已保留架构方向，尚无运行实现 |
| 插件、Widget、插件沙箱 | 未实现 | MCP 不是 Figma 插件兼容层 |

## AI 与 MCP（BaizeFig 自有扩展）

| 能力 | 状态 | 当前边界 / 后续验收 |
|---|---|---|
| 自定义 AI API/模型/提示词/密钥 | 部分 | OpenAI-compatible 调用；Key 不持久化，真实模型未验收 |
| 结构化 AI 命令预览与原子应用 | 已有 | 校验失败不提交，文档变化使旧提案失效 |
| AI 截图驱动自动迭代、模型路由 | 未实现 | 当前手动生成提案，没有伪装成已生成的演示结果 |
| 本地 MCP stdio + 浏览器 Bridge | 已有 | SDK、回环地址、随机令牌、Origin 验证 |
| MCP 文档/选区/截图/导出/批量命令 | 已有 | 已做真实客户端—Bridge—浏览器联调 |
| 远程 HTTPS MCP 与目标客户端兼容 | 未实现 | 需单独验证目标 ChatGPT 等客户端能力 |

## 下一批实施顺序

1. 修正完整仿射坐标、深选、重父级、旋转/缩放和布局语义，建立交互样例。
2. 实现矢量路径、布尔运算、样式与文本内核，建立 SVG 可编辑往返样本。
3. 完善自动布局、约束、组件/实例/变体与变量。
4. 并行于功能内核建设格式样本库和解析器；不能把 `.fig` 兼容推迟后再宣称 1:1。
5. 原型运行时、开发交付、插件与协作按独立验收矩阵推进。

## 参考依据

本次查阅 Figma 官方帮助作为功能范围与行为参考，实施仍需逐条实测，避免只按快捷键名称判断等价。

- [Guide to imports in Figma Design](https://help.figma.com/hc/en-us/articles/360040027794-Guide-to-imports-in-Figma-Design)
- [Frames in Figma Design](https://help.figma.com/hc/en-us/articles/360041539473-Frames-in-Figma-Design)
- [Guide to auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma)
- [Copy and paste objects](https://help.figma.com/hc/en-us/articles/4409078832791-Copy-and-paste-objects)
- [Adjust your zoom and view options](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options)
- [Play your prototypes](https://help.figma.com/hc/en-us/articles/360040318013-Play-your-prototypes)
- [Select keyboard layout](https://help.figma.com/hc/en-us/articles/5665442977431-Select-keyboard-layout)

没有完整版本/平台/键盘布局基准时，不对所有快捷键、文件或交互作兼容承诺。
