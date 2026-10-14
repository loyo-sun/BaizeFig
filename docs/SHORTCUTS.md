# 当前已绑定的快捷键

Mac 的 ⌘ 对应 Windows/Linux 的 Ctrl，⌥ 对应 Alt。文本输入框优先处理文字，不触发绘图快捷键。浏览器/操作系统保留的快捷键仍可能拦截。

| 操作 | 快捷键 |
|---|---|
| Move / Frame | V / F 或 A |
| Rectangle / Ellipse / Line | R / O / L |
| Pen（折线基础）/ Pencil | P / Shift P |
| Text / Hand | T / H |
| 进入画布文字编辑 | 双击文字；新建文字后自动进入 |
| 提交 / 取消文字编辑 | ⌘/Ctrl + Enter / Esc；点击外部提交 |
| 文字选择、复制、输入、删除 | 编辑时交由原生文本光标处理 |
| 临时平移 | 按住 Space 拖动，或鼠标中键拖动 |
| 撤销 / 重做 | ⌘ Z / ⌘ Shift Z；也支持 Ctrl Y |
| 复制 / 剪切 / 粘贴 | ⌘ C / ⌘ X / ⌘ V |
| 复制副本 | ⌘ D；Alt 拖动 |
| 删除 | Backspace 或 Delete |
| Group / Ungroup | ⌘ G / ⌘ Shift G |
| Frame selection | ⌘ Alt G |
| Create component | ⌘ Alt K |
| Auto layout / Remove | Shift A / Alt Shift A |
| 全选根节点 | ⌘ A |
| 微调位置 / 大步微调 | 方向键 / Shift 方向键，1px / 10px |
| 向前 / 向后排列 | ] / [ |
| 置顶 / 置底 | ⌘ ] / ⌘ [ |
| 放大 / 缩小 | + 或 = / - |
| 鼠标中心缩放 | ⌘ 或 Ctrl + 滚轮 |
| 100% / 全画布适配 / 选区适配 | Shift 0 / Shift 1 / Shift 2 |
| 网格 / 轮廓 | Shift G / Shift O |
| 显隐编辑器面板 | ⌘ \\ |
| 导出本地设计备份 | ⌘ S |
| 打开导入选择器 | ⌘ O |
| 搜索操作 | ⌘ K |
| 快捷键帮助 | ? |
| 原型预览 | Shift Space |
| 取消拖动、关闭对话框或预览 | Esc |

快捷键表记录 BaizeFig 的当前绑定，不声称已完整复现 Figma 所有平台和键盘布局。完整对齐需维护按平台的可执行交互回归样例。

## 矢量编辑

- 双击图形，或选中后 Enter：进入节点编辑；Enter / Esc /「完成」：退出。
- Shift 点击节点或拖动空白区域：多选；Cmd/Ctrl+A：选中全部节点。
- 空格拖动、抓手或中键：在节点模式中平移画布。
- 拖动节点/控制柄：修改曲线；Alt 拖动控制柄：临时打破对齐/镜像。
- 双击线段：按点击位置细分贝塞尔；曲线形状保持。
- Delete / Backspace：删除节点；Shift+Delete / Shift+Backspace：「删除并修复」。
- Cmd/Ctrl+J：「连接节点」；工具栏还提供尖角、平滑、断开节点、绘制连线与区域填充。
- 方向键 / Shift+方向键：移动选中节点 1 / 10 个局部单位。
- Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z：节点级撤销重做。
- Alt+Shift+F：「拼合路径」；Alt+Cmd/Ctrl+O：「描边转轮廓」。右侧面板和 Actions 也提供入口。
