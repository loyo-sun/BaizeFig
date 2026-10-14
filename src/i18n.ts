export type Language = "zh-CN" | "en";
export const DEFAULT_LANGUAGE: Language = "zh-CN";
export const LANGUAGE_STORAGE_KEY = "baizefig.ui.language";
export type TranslationValues = Record<string, string | number>;

export const zhCN: Record<string, string> = {
  "Split vector into layers": "拆分矢量图层",
  "Select at least one vector layer": "请至少选择一个矢量图层",
  "Smooth join selection": "平滑连接",
  "Select two open endpoints for smooth joining":
    "请选择两个开放端点进行平滑连接",
  "Move overlapping endpoints apart before smooth joining":
    "请先移开重合端点，再进行平滑连接",
  "Cannot infer a tangent from zero-length segments":
    "零长度线段无法推导平滑切线",

  "Offset vector": "偏移路径",
  "Offset distance": "偏移距离",
  "Offset joins": "偏移连接",
  "Miter joins": "尖角连接",
  "Round joins": "圆角连接",
  "Square joins": "方角连接",
  "Invalid offset settings": "偏移参数无效",
  "Outline branched open paths before offsetting":
    "请先将带分支的开放路径描边转为轮廓，再进行偏移",
  "Offset removes all geometry. Choose a smaller distance.":
    "偏移后图形为空，请减小偏移距离。",

  "Simplify vector": "简化路径",
  "Simplify tolerance": "简化容差",
  "Tolerance must be between 0.001 and 100": "容差应在 0.001 到 100 之间",
  "Image mode": "图片模式",
  "Fill image": "填充",
  "Fit image": "适应",
  "Crop image": "裁剪",
  "Tile image": "平铺",
  "Image crop transform": "图片裁剪变换",
  "Image tile scale": "图片平铺比例",
  "Set layer opacity to 100% before flattening":
    "拼合前请将图层不透明度设为 100%",
  "Split vector": "断开节点",
  "Region fills": "区域填充",
  "Fill type {number}": "填充类型 {number}",
  "Fill opacity {number}": "填充不透明度 {number}",
  "Move fill up": "填充上移",
  "Remove fill": "移除填充",
  "Gradient stop color {number}": "渐变色标 {number}",
  "Gradient stop position {number}": "色标位置 {number}",
  "Add stop": "添加色标",
  "Paint transform": "填充变换",
  "Choose image": "选择图片",
  "Add fill": "添加填充",
  Solid: "纯色",
  "Linear gradient": "线性渐变",
  "Radial gradient": "径向渐变",

  "Edit vector": "编辑矢量",
  Flatten: "拼合路径",
  "Outline stroke": "描边转轮廓",
  Corner: "尖角",
  Smooth: "平滑",
  "Handle mode": "控制柄模式",
  "Free handles": "自由控制柄",
  "Aligned handles": "对齐控制柄",
  "Mirrored handles": "镜像控制柄",
  "Join nodes": "连接节点",
  "Draw connections": "绘制连线",
  "Delete and heal": "删除并修复",
  Region: "区域",
  "Region color": "区域颜色",
  "Winding rule": "填充规则",
  Nonzero: "非零环绕",
  "Even odd": "奇偶",
  "Vector segment {number}": "矢量线段 {number}",
  "Vector node {number}": "矢量节点 {number}",
  "Control handle {number}": "控制柄 {number}",
  "Double-click a segment to add a node. Alt-drag a handle to break symmetry.":
    "双击线段添加节点；按住 Alt 拖动控制柄可打破对称。",
  "No stroke to outline": "没有可转换的描边",
  "Select two unconnected nodes": "请选择两个尚未直接连接的节点",
  "Select layers with the same parent": "请选择同一父级下的图层",
  "This layer cannot be converted to paths": "此图层暂不支持转换路径",
  "Flatten requires vector layers without masks, images or effects":
    "拼合路径需要不含蒙版、图片或效果的矢量图层",
  "Unlock layers before editing vectors": "请先解锁图层再编辑矢量",
  "No editable vector nodes": "没有可编辑的矢量节点",
  "Select at least one layer": "请至少选择一个图层",

  "Edit text on canvas": "画布内编辑文字",
  "Double-click text on the canvas to edit content.":
    "双击画布中的文字即可编辑内容。",
  Union: "合并",
  Subtract: "减去",
  Intersect: "相交",
  Exclude: "排除",
  "Use as mask": "用作蒙版",
  "Select at least two layers": "请至少选择两个图层",
  "Detach instance before changing its layer structure":
    "请先分离实例，再修改其图层结构。",
  "Value for {name}": "{name} 的值",
  "Bind variable {name}": "绑定变量 {name}",
  "Bind property": "绑定属性",
  "Layer mode": "图层模式",
  "Layer mode for {name}": "{name} 的图层模式",
  Inherit: "继承",
  width: "宽度",
  height: "高度",
  x: "X",
  y: "Y",
  rotation: "旋转",
  opacity: "不透明度",
  radius: "圆角",
  strokeWidth: "描边宽度",
  fontSize: "字号",
  fontFamily: "字体",
  text: "文本",
  visible: "可见性",
  gap: "间距",

  "Some advanced prototype actions or transitions could not be restored.":
    "部分高级原型动作或过渡尚未还原。",
  "Color, number, string and boolean variables retain modes and resolvable aliases.":
    "颜色、数字、文本和布尔变量会保留模式及可解析别名。",
  "Some advanced variable types are not supported.":
    "部分高级变量类型暂不支持。",
  "Some variable aliases could not be resolved.":
    "部分变量别名无法解析，已保留原始值。",
  "Some variable property bindings could not be restored.":
    "部分变量属性绑定尚未还原。",
  "Some fill types are not supported.": "部分填充类型暂不支持。",
  "Swap component": "交换组件",
  Grid: "网格",
  "Some blend modes are not supported.":
    "部分混合模式暂不支持，已保留其余可用内容。",
  "Some effect types are not supported.": "部分效果类型暂不支持。",
  "Hidden internal pages were excluded.": "已排除文件中的隐藏内部页面。",
  "Under research": "正在研究中",
  "Import Figma (.fig)": "导入 Figma（.fig）",
  "Figma import result": "Figma 导入结果",
  "Imported {pages} pages, {layers} editable layers and {images} image fills.":
    "已导入 {pages} 个页面、{layers} 个可编辑图层和 {images} 处图片填充。",
  "This is a compatibility import, not a lossless Figma conversion. Keep the original .fig file.":
    "当前为兼容性导入，尚不能无损还原全部 Figma 功能，请保留原始 .fig 文件。",
  "Compatibility notes": "兼容性说明",
  "Continue editing": "继续编辑",
  "Importing Figma file…": "正在导入 Figma 文件…",
  "Decoding layers and embedded images locally.":
    "正在本地解码图层及内嵌图片。",
  "Figma file imported": "Figma 文件已导入",
  "Invalid or unsupported Figma file": "Figma 文件无效或格式暂不支持",
  "Figma file exceeds import limits": "Figma 文件超过导入处理限制",
  "No supported pages in Figma file": "Figma 文件中没有可导入的页面",
  "Figma import timed out": "Figma 导入超时，请尝试较小的文件",
  "Figma instances were imported as editable snapshots.":
    "组件实例已转换为可编辑快照，不保留与主组件的联动。",
  "Some unsupported layers were skipped.": "部分不支持的图层已跳过。",
  "Vector networks are represented by bounds; vector paths are not restored.":
    "矢量网络暂以边界矩形表示，尚未还原真实路径。",
  "Polygon and star parameters may differ.":
    "多边形和星形的形状参数可能与原文件不同。",
  "Effects and non-normal blending are not restored.":
    "尚未还原效果和特殊混合模式。",
  "Multiple fills and gradients may be simplified.":
    "多重填充和渐变可能被简化。",
  "Some image resources are missing or unsupported.":
    "部分图片资源缺失或格式不受支持。",
  "Image fills use center crop; custom crop transforms are not restored.":
    "图片填充采用居中裁切，尚未还原自定义裁切变换。",
  "Rotated, reflected or scaled transforms may differ.":
    "旋转、镜像或缩放变换可能与原文件不同。",
  "Auto layout uses the saved positions; layout rules are not restored.":
    "自动布局使用原文件保存的位置，尚未还原布局规则。",
  "Prototype interactions are not restored.": "尚未还原原型交互。",
  "Masks are not restored.": "尚未还原蒙版。",
  "Text uses available fonts; mixed styles and exact line wrapping may differ.":
    "文本使用本机可用字体，混合样式和精确换行可能存在差异。",
  "Some component definitions are unavailable.":
    "部分组件定义不可用，无法展开完整内容。",
  "Variable bindings use saved values; variables and modes are not restored.":
    "变量使用原文件保存的值，尚未还原变量绑定和模式。",
  "Mode for {name}": "{name} 的模式",
  "Cyclic variable alias": "变量别名存在循环引用",
  "Missing variable alias": "变量别名引用缺失",
  "Invalid variable mode": "变量模式无效",
  "Invalid variable values": "变量模式值无效",
  "Invalid imported layout": "导入布局数据无效",
  "Invalid imported design data": "导入设计数据无效",
  "Invalid vector geometry": "矢量几何数据无效",
  "Invalid image transform": "图片变换无效",
  "Invalid text layout": "文字排版数据无效",
  "Color collections, modes and resolvable aliases are supported. Number, string and boolean variables are not yet available.":
    "支持颜色变量集合、模式与可解析的别名；数字、字符串和布尔变量尚未支持。",
  "Some vector geometry could not be decoded and uses bounds.":
    "部分矢量几何无法解码，暂以边界表示。",
  "Wrapping, baseline alignment and fill sizing need further layout support.":
    "换行布局、基线对齐及填充尺寸等复杂布局仍需完善。",
  "Saved text line positions are restored; fonts, mixed styles and reflow may differ.":
    "已恢复保存的文字行位置；字体、混合样式及修改后的重排仍可能有差异。",
  "Advanced prototype triggers, transitions and component state changes are not restored.":
    "高级原型触发器、过渡和组件状态切换尚未恢复。",
  "Some variable aliases or non-color variables could not be restored.":
    "部分变量别名或非颜色变量未能恢复。",
  "Color variable modes and resolvable aliases are restored; non-color variables remain unsupported.":
    "已恢复颜色变量模式及可解析别名，非颜色变量尚未支持。",
  "Hidden page component definitions are retained in the document library.":
    "隐藏页面中的组件定义已保留在文档组件库中。",
  "Component definitions and source links are retained; live instance synchronization is not yet supported.":
    "已保留组件定义和来源关联；实例仍为快照，尚未支持主组件修改后自动联动。",
  "Invalid component library": "组件库数据无效",
  Files: "文件",
  Trash: "回收站",
  Restore: "恢复",
  "File moved to trash": "文件已移至回收站",
  "File restored": "文件已恢复",
  "File is in trash": "文件已在回收站",
  "Restore {name}": "恢复 {name}",
  "Delete file {name}": "删除文件 {name}",
  "Trash is empty": "回收站为空",
  "Deleted files stay in this browser trash and can be restored. Original files on your computer are unchanged.":
    "删除的文件保留在当前浏览器回收站，可随时恢复。电脑上的原始文件不会被删除。",
  "Instances follow their main component while preserving local overrides.":
    "实例会跟随主组件更新，并保留局部覆盖。",
  "Edit main component": "编辑主组件",
  "Reset instance overrides": "重置实例覆盖",
  "Detach instance": "分离实例",
  "Missing main component": "主组件不可用",
  "Select a component instance": "请选择组件实例",
  "Cyclic component reference": "组件存在循环引用",
  "Invalid component instance": "组件实例数据无效",
  "Component instances preserve saved overrides and can synchronize with the main component.":
    "组件实例保留已保存的覆盖，并可与主组件联动更新。",
  "General settings": "通用设置",
  Language: "语言",
  "Interface language": "界面语言",
  "Choose the language used throughout BaizeFig. Changes take effect immediately.":
    "选择 BaizeFig 的界面语言，切换后立即生效。",
  "Language is saved on this browser and does not change design content, layer names or files.":
    "语言偏好保存在当前浏览器中，不会修改设计内容、图层名称或文件。",
  "Your language preference could not be saved. It will apply for this session only.":
    "语言偏好未能保存，本次使用仍可切换，重新打开后可能恢复默认语言。",
  Done: "完成",
  "Workspace tools": "工作区工具",
  "BaizeFig local files": "BaizeFig 本地文件",
  File: "文件",
  Agents: "智能体",
  Assets: "资源",
  Tools: "工具",
  Variables: "变量",
  "Editor settings and actions": "编辑器设置与操作",
  "Document name": "文件名称",
  "File menu": "文件菜单",
  "Hide panels": "隐藏面板",
  "Show panels": "显示面板",
  Drafts: "草稿",
  Local: "本地",
  Pages: "页面",
  Page: "页面",
  "Page name": "页面名称",
  "Page {number}": "页面 {number}",
  "Search layers": "搜索图层",
  "Add page": "添加页面",
  "Delete current page": "删除当前页面",
  Layers: "图层",
  "Import assets": "导入资源",
  "Filter layers": "筛选图层",
  "Search layers…": "搜索图层…",
  "Your next idea starts here.": "从这里开始构思。",
  "Choose a tool and draw on the canvas.": "选择工具，在画布上开始绘制。",
  "白泽 · 通万物、识万象": "白泽 · 通万物、识万象",
  "Keyboard shortcuts": "快捷键",
  "Local files": "本地文件",
  "LOCAL FIRST": "本地优先",
  "Your canvas. Your possibilities.": "你的画布，无限可能。",
  "Design canvas": "设计画布",
  "Zoom out": "缩小",
  "Zoom to fit": "适应画布",
  "Zoom in": "放大",
  "Fit canvas · Shift 1": "适应画布 · Shift 1",
  "AI design engine": "AI 设计引擎",
  "Keyboard shortcuts and help": "快捷键与帮助",
  "Local workspace files": "本地工作区文件",
  Present: "演示",
  "Present · Shift Space": "演示 · Shift Space",
  Share: "分享",
  Design: "设计",
  Prototype: "原型",
  "Zoom menu": "缩放菜单",
  "Zoom to selection": "适应选区",
  "Page background": "页面背景",
  Styles: "样式",
  "Manage variables": "管理变量",
  "Local color variables": "本地颜色变量",
  "Create a local variable": "创建本地变量",
  Interactions: "交互",
  "On click → Navigate to frame": "点击 → 跳转至画板",
  "Prototype destination": "原型目标画板",
  "On click action": "点击动作",
  "Click to add points · Drag for curves · Click first point to close · Enter / Esc to finish":
    "点击落点 · 拖拽绘制曲线 · 点击起点闭合 · Enter / Esc 完成",
  "Drag to draw freely · Release to finish · Space to pan":
    "按住拖动自由绘制 · 松开完成 · 空格平移画布",
  "Interaction trigger": "交互触发方式",
  "Interaction action": "交互动作",
  "Trigger click": "点击",
  "Trigger hover": "悬停",
  "Trigger leave": "离开",
  "Trigger press": "按下",
  "Trigger release": "松开",
  "Trigger delay": "延时",
  "Change component state": "切换组件状态",
  "Component state": "组件状态",
  "Scroll animation uses a standard easing curve; custom easing is not restored.":
    "滚动动画使用标准缓动曲线，尚未还原自定义缓动。",
  "Navigate to frame": "跳转至画板",
  "Scroll to target": "滚动到目标",
  "Scroll animation": "滚动动画",
  "Scroll duration (ms)": "滚动时长（毫秒）",
  "Scroll offset": "滚动偏移",
  "Overflow scrolling": "溢出滚动",
  "Both directions": "双向",
  Horizontal: "横向",
  Vertical: "纵向",
  Animate: "动画",
  Instant: "即时",
  "Preview supports navigation, overlays and scroll-to actions. Advanced conditions and smart animation are tracked in the feature matrix.":
    "预览支持跳转、覆盖层和滚动到目标。高级条件与智能动画继续在功能清单中跟踪。",
  None: "无",
  "Present prototype": "演示原型",
  "This version supports click navigation. Advanced triggers, transitions and smart animation are tracked in the feature matrix.":
    "当前版本支持点击跳转。高级触发器、过渡和智能动画仍在功能待办中。",
  "Toggle visibility": "切换可见性",
  "Toggle lock": "切换锁定状态",
  "Layer name": "图层名称",
  "Auto layout": "自动布局",
  "Add auto layout · Shift A": "添加自动布局 · Shift A",
  "Add auto layout": "添加自动布局",
  Typography: "文字排版",
  "Font family": "字体",
  "Text alignment": "文本对齐",
  "Text content": "文本内容",
  Fill: "填充",
  "Reset fill": "切换填充",
  "Fill color": "填充颜色",
  Stroke: "描边",
  "Toggle stroke": "切换描边",
  "Stroke color": "描边颜色",
  Component: "组件",
  "Create instance copy": "创建实例副本",
  "Create component": "创建组件",
  "Instance is a snapshot copy in v0.1. Live overrides are planned.":
    "v0.1 的实例为快照副本，主组件联动与覆盖仍在开发中。",
  Export: "导出",
  "Export scale": "导出倍率",
  "Export format": "导出格式",
  "All changes stay on your device.": "所有更改保存在你的设备上。",
  Copy: "复制",
  Paste: "粘贴",
  Delete: "删除",
  "Close dialog": "关闭对话框",
  "Share this design": "分享此设计",
  "Share a portable copy of this design. Anyone with the file can open it in BaizeFig.":
    "分享可携带的设计副本，获得文件的人可以在 BaizeFig 中打开。",
  "Download design file": "下载设计文件",
  "Editable .baizefig copy, with assets included":
    "可编辑的 .baizefig 副本，包含素材",
  "Export an image": "导出图片",
  "PNG, JPG or SVG from the Export panel": "在导出面板中选择 PNG、JPG 或 SVG",
  "Live collaboration and shareable room links are still in development. Sharing a file does not create a live collaboration session.":
    "实时协作和房间链接仍在开发中。分享文件不会创建实时协作会话。",
  "Local color variables. Bind a fill to reuse the same color across this document.":
    "将填充绑定到本地颜色变量，在文档中复用同一种颜色。",
  Apply: "应用",
  "Create color variable": "创建颜色变量",
  "Single collection, single mode. Number, string, boolean variables, aliases and modes are not yet available.":
    "当前仅支持单集合、单模式。数字、字符串、布尔变量、别名和多模式尚未实现。",
  "Components & assets": "组件与资源",
  "Components in this file. Instances are snapshot copies in v0.1.":
    "当前文件中的组件。v0.1 的实例为快照副本。",
  "Select layers and create a component with ⌥ ⌘ K / Ctrl Alt K.":
    "选中图层，按 ⌥ ⌘ K / Ctrl Alt K 创建组件。",
  "Import image or SVG": "导入图片或 SVG",
  "Familiar keys. A canvas of your own. ⌘ on Mac, Ctrl on Windows/Linux.":
    "Mac 使用 ⌘，Windows / Linux 使用 Ctrl。用熟悉的快捷键操作你的画布。",
  "Search actions…": "搜索操作…",
  "Search actions": "搜索操作",
  Actions: "操作",
  "Stored in this browser. Export a local copy to keep a backup.":
    "文件保存在当前浏览器中，建议导出本地副本进行备份。",
  "Your local workspace": "本地工作区",
  "New design file": "新建设计文件",
  Import: "导入",
  "Apply changes": "应用更改",
  "Edit text": "编辑文本",
  "Rename layer": "重命名图层",
  "Create with Baize": "与白泽一起设计",
  "Bring your own model. Generate editable layers, then refine them by hand.":
    "配置你自己的模型，生成可编辑图层，再手动完善设计。",
  "OpenAI-compatible API base URL": "兼容 OpenAI 协议的 API 基础地址",
  "AI API URL": "AI API 地址",
  Model: "模型",
  "AI model": "AI 模型",
  "Your model name": "输入模型名称",
  "API key · session only": "API 密钥 · 仅当前会话",
  "AI API key": "AI API 密钥",
  "Design guidelines": "设计规范",
  "Your component, color and typography rules": "输入组件、颜色和排版规范",
  "What would you like to design?": "你想设计什么？",
  "Design prompt": "设计需求",
  "Create a minimal dashboard with navigation, search and a table…":
    "创建一个简洁的后台界面，包含导航、搜索和数据表格…",
  "Generating sends this document and selection to your configured endpoint. Browser access requires CORS support. Keys remain in memory and are never saved in the design file.":
    "生成时会将当前文档和选区发送到你配置的接口。接口需要支持浏览器跨域请求（CORS）。密钥仅保存在内存中，不会写入设计文件。",
  "Apply as one undoable change": "作为一次可撤销的更改应用",
  Cancel: "取消",
  "Generating…": "生成中…",
  "Generate proposal": "生成修改提案",
  "Connect external AI": "连接外部 AI",
  "Let an MCP client read and edit this open design through the local bridge.":
    "让 MCP 客户端通过本地桥接读取和编辑当前设计。",
  "In this project, start": "在当前项目中启动",
  "as a stdio MCP server in your client.":
    "，在客户端中将其配置为 stdio MCP 服务器。",
  "Copy the pairing token from the bridge output into the field below.":
    "将桥接服务输出的配对令牌复制到下方输入框。",
  "Connect this browser. Enable writes only when you want the client to edit.":
    "连接当前浏览器。仅在允许客户端修改设计时开启写入权限。",
  "Pairing token": "配对令牌",
  "Bridge pairing token": "桥接配对令牌",
  "Allow MCP to modify the currently open document":
    "允许 MCP 修改当前打开的文档",
  "Connect bridge": "连接桥接服务",
  Disconnect: "断开连接",
  "Local bridge only. Remote ChatGPT HTTPS access and P2P sharing are not implemented in this version.":
    "当前仅支持本地桥接。远程 ChatGPT HTTPS 接入和 P2P 分享尚未实现。",
  "Close preview": "关闭预览",
  "Prototype preview": "原型预览",
  "Click linked elements to navigate · Esc to close":
    "点击带链接的元素跳转 · 按 Esc 关闭",
  Move: "移动",
  Frame: "画板",
  Rectangle: "矩形",
  Ellipse: "椭圆",
  Line: "直线",
  Text: "文本",
  "Pen / polyline": "钢笔 / 折线",
  "Pen (polyline)": "钢笔（折线）",
  Pencil: "铅笔",
  Hand: "抓手",
  Star: "星形",
  Polygon: "多边形",
  Path: "路径",
  Image: "图片",
  Group: "组",
  Instance: "实例",
  Undo: "撤销",
  Redo: "重做",
  Edit: "编辑",
  View: "视图",
  Help: "帮助",
  Shortcuts: "快捷键",
  "Copy / Cut / Paste": "复制 / 剪切 / 粘贴",
  Duplicate: "创建副本",
  "Group / Ungroup": "编组 / 取消编组",
  "Frame selection": "为选区创建画板",
  "Remove auto layout": "移除自动布局",
  "Select all": "全选",
  "Nudge / large nudge": "微调 / 大步微调",
  "Forward / backward": "上移 / 下移",
  "Front / back": "置顶 / 置底",
  "Zoom in / out": "放大 / 缩小",
  "Actual size": "实际大小",
  "Pixel grid": "像素网格",
  "Layer outlines": "图层轮廓",
  "Show / hide UI": "显示 / 隐藏界面",
  "Save local copy": "保存本地副本",
  "Open / import": "打开 / 导入",
  "H / hold Space": "H / 按住 Space",
  "⌘ / Ctrl D / Alt drag": "⌘ / Ctrl D / Alt 拖拽",
  "Arrow / Shift Arrow": "方向键 / Shift 方向键",
  "Open file browser": "打开文件列表",
  "Import file or image": "导入文件或图片",
  "Duplicate selection": "复制选区",
  "Group selection": "编组选区",
  "Ungroup selection": "取消编组",
  "MCP connection": "MCP 连接",
  "Desktop frame · 1440 × 900": "桌面画板 · 1440 × 900",
  "iPhone frame · 393 × 852": "iPhone 画板 · 393 × 852",
  "Tablet frame · 834 × 1194": "平板画板 · 834 × 1194",
  Untitled: "未命名",
  "Loading…": "加载中…",
  "Saving…": "保存中…",
  "Saved locally": "已保存到本地",
  "Save failed": "保存失败",
  Connected: "已连接",
  Disconnected: "未连接",
  "Connecting…": "连接中…",
  Connect: "连接",
  "1 connection": "1 个连接",
  left: "左对齐",
  center: "居中",
  right: "右对齐",
  top: "顶端对齐",
  middle: "垂直居中",
  bottom: "底端对齐",
  Free: "自由布局",
  "→ Horizontal": "→ 横向",
  "↓ Vertical": "↓ 纵向",
  W: "宽",
  H: "高",
  Size: "字号",
  Weight: "字重",
  "Line height": "行高",
  Gap: "间距",
  Pad: "内边距",
  Width: "宽度",
  Height: "高度",
  Rotation: "旋转",
  "Corner radius": "圆角",
  Opacity: "不透明度",
  "Stroke width": "描边宽度",
  "{count} selected": "已选中 {count} 项",
  "Export {name}": "导出 {name}",
  page: "页面",
  selection: "选区",
  "{pages} page · {layers} layers": "{pages} 个页面 · {layers} 个图层",
  "{count} proposed operations": "{count} 项修改提案",
  "Toggle {name}": "展开或折叠 {name}",
  "Hide {name}": "隐藏 {name}",
  "Show {name}": "显示 {name}",
  "Unlock {name}": "解锁 {name}",
  "Lock {name}": "锁定 {name}",
  "Resize {direction}": "调整尺寸：{direction}",
  "Align {axis}": "{axis}",
  "Color {name}": "颜色：{name}",
  "Name {name}": "名称：{name}",
  "Delete variable {name}": "删除变量 {name}",
  "Color {number}": "颜色 {number}",
  "{name} instance": "{name} 实例",
  "V to select · Space to pan · ⌘ / Ctrl + scroll to zoom":
    "V 选择 · Space 平移 · ⌘ / Ctrl + 滚轮缩放",
  "{tool} · Click and drag to draw · Shift to constrain":
    "{tool} · 点击并拖拽绘制 · Shift 约束比例",
  "Unable to restore saved document. Your stored files are unchanged.":
    "无法恢复已保存的文档，原有文件未被修改。",
  "Local storage unavailable. Export a .baizefig backup.":
    "本地存储不可用，请导出 .baizefig 文件备份。",
  "Local copy exported": "本地副本已导出",
  Copied: "已复制",
  "Create a frame to start a prototype": "请先创建画板，再开始原型演示",
  "Files must be smaller than 50 MB": "文件大小必须小于 50 MB",
  "Document imported": "文档已导入",
  "Unsupported file type": "不支持的文件类型",
  "Image dimensions exceed 40 megapixels": "图片尺寸超过 4000 万像素",
  "SVG contains unsupported resources": "SVG 包含不支持的资源",
  "Assets imported": "资源已导入",
  "Assets imported · SVG imported as image": "资源已导入 · SVG 已作为图片导入",
  "Export complete": "导出完成",
  "Keep at least one page": "至少需要保留一个页面",
  "Enter a model and design request": "请输入模型名称和设计需求",
  "Document changed. Generate a new proposal before applying.":
    "文档已发生变化，请重新生成提案后再应用。",
  "AI changes applied · Undo available": "AI 修改已应用 · 可撤销",
  "Bridge connection failed. Start npm run bridge and check the pairing token.":
    "桥接连接失败，请启动 npm run bridge 并检查配对令牌。",
  "Choose PNG in Export, then export the current page or selection.":
    "请在导出面板选择 PNG，再导出当前页面或选区。",
  "Variable applied to selection": "变量已应用到选区",
  "{format} import is not implemented yet. Use .baizefig, JSON, SVG or images.":
    "尚未支持 {format} 导入，请使用 .baizefig、JSON、SVG 或图片。",
  "Cyclic node tree": "图层层级存在循环引用",
  "Cannot group across pages": "不能跨页面编组",
  "Select an unlocked frame or group": "请选择未锁定的画板或组",
  "Invalid BaizeFig document or unsupported version":
    "BaizeFig 文档无效或版本不受支持",
  "Invalid background": "页面背景无效",
  "Invalid pages": "页面数据无效",
  "Invalid or duplicate node": "节点无效或 ID 重复",
  "Invalid node dimensions": "节点尺寸或透明度无效",
  "Invalid node flags": "节点属性无效",
  "Only hex colors are supported": "目前仅支持十六进制颜色",
  "Invalid image data": "图片数据无效",
  "Invalid layout": "布局设置无效",
  "Invalid layout spacing": "布局间距无效",
  "Invalid path": "路径数据无效",
  "Invalid parent": "父节点无效",
  "Invalid prototype target": "原型目标无效",
  "Invalid color variables": "颜色变量无效",
  "Invalid color variable reference": "颜色变量引用无效",
  "Invalid numeric property: {field}": "数值属性无效：{field}",
  "Invalid {field}": "属性无效：{field}",
  "Invalid API URL": "API 地址无效",
  "Model request failed ({status})": "模型请求失败（{status}）",
  "Model returned no content": "模型未返回内容",
  "Invalid AI command batch": "AI 命令批次无效",
  "Unsupported AI command": "不支持的 AI 命令",
  "Export is too large. Reduce selection or scale.":
    "导出尺寸过大，请缩小选区或降低倍率。",
  "Export failed": "导出失败",
  "The operation was aborted.": "操作已取消。",
  "signal is aborted without reason": "操作已取消。",
};

// These are UI messages assembled by the editor/core, not document text.
const messagePatterns: [RegExp, string, string[]][] = [
  [
    /^(.+) import is not implemented yet\. Use \.baizefig, JSON, SVG or images\.$/,
    "{format} import is not implemented yet. Use .baizefig, JSON, SVG or images.",
    ["format"],
  ],
  [
    /^Invalid numeric property: (.+)$/,
    "Invalid numeric property: {field}",
    ["field"],
  ],
  [
    /^Model request failed \((\d+)\)$/,
    "Model request failed ({status})",
    ["status"],
  ],
  [
    /^Invalid (name|text|fill|stroke|fontFamily)$/,
    "Invalid {field}",
    ["field"],
  ],
];
export function translate(
  language: Language,
  source: string,
  values: TranslationValues = {},
): string {
  let key = source,
    params = values;
  if (!zhCN[key])
    for (const [pattern, template, names] of messagePatterns) {
      const match = source.match(pattern);
      if (match) {
        key = template;
        params = {
          ...Object.fromEntries(
            names.map((name, index) => [name, match[index + 1]]),
          ),
          ...values,
        };
        break;
      }
    }
  const englishOverrides: Record<string, string> = {
    "白泽 · 通万物、识万象": "Baize · Understand all things. See every form.",
  };
  const text =
    language === "zh-CN"
      ? (zhCN[key] ?? source)
      : (englishOverrides[key] ?? key);
  return text.replace(/\{(\w+)\}/g, (token, name) =>
    params[name] === undefined ? token : String(params[name]),
  );
}
export function readLanguage(storage?: Pick<Storage, "getItem">): Language {
  try {
    const saved = (storage ?? globalThis.localStorage)?.getItem(
      LANGUAGE_STORAGE_KEY,
    );
    return saved === "en" ? "en" : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
export function writeLanguage(
  language: Language,
  storage?: Pick<Storage, "setItem">,
): boolean {
  try {
    (storage ?? globalThis.localStorage).setItem(
      LANGUAGE_STORAGE_KEY,
      language,
    );
    return true;
  } catch {
    return false;
  }
}
