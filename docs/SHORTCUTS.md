# 快捷键

本表由 src/shortcuts.ts 自动生成，与菜单、搜索操作和帮助共用注册表。物理按键模式使用 QWERTY 位置；通用设置可切换按输入字符识别并持久保存。

| 操作 | macOS | Windows / Linux |
|---|---|---|
| Move | V | V |
| Scale | K | K |
| Frame | B | B |
| Rectangle | R | R |
| Ellipse | E | E |
| Line | L | L |
| Text | T | T |
| Hand | H | H |
| Pen / polyline | Shift + C | Shift + C |
| Arrow | Shift + L | Shift + L |
| Pencil | Shift + P | Shift + P |
| Actions | ⌘ + Shift + P | Ctrl + Shift + P |
| Undo | ⌘ + Z | Ctrl + Z |
| Redo | ⌘ + Shift + Z | Ctrl + Shift + Z |
| Copy | ⌘ + C | Ctrl + C |
| Cut | ⌘ + X | Ctrl + X |
| Paste | ⌘ + V | Ctrl + V |
| Paste over selection | ⌘ + Shift + V | Ctrl + Shift + V |
| Paste to replace | ⌘ + Shift + R | Ctrl + Shift + R |
| Duplicate selection | ⌘ + D | Ctrl + D |
| Delete | ⌫ | ⌫ |
| Group selection | ⌘ + G | Ctrl + G |
| Ungroup selection | ⌘ + ⌫ | Ctrl + ⌫ |
| Frame selection | ⌘ + ⌥ + G | Ctrl + Alt + G |
| Create component | ⌘ + K | Ctrl + K |
| Select all | ⌘ + A | Ctrl + A |
| Select inverse | ⌘ + Shift + A | Ctrl + Shift + A |
| Copy properties | ⌘ + ⌥ + C | Ctrl + Alt + C |
| Paste properties | ⌘ + ⌥ + V | Ctrl + Alt + V |
| Pick color | Ctrl + C | I |
| Save local copy | ⌘ + S | Ctrl + S |
| Import file or image | ⌘ + O | Ctrl + O |
| Place image | ⌘ + Shift + K | Ctrl + Shift + K |
| Export | ⌘ + Shift + E | Ctrl + Shift + E |
| Find and replace | ⌘ + F | Ctrl + F |
| Bring to front | ] | ] |
| Bring forward | ⌘ + ] | Ctrl + ] |
| Send backward | ⌘ + [ | Ctrl + [ |
| Send to back | [ | [ |
| Flip horizontal | Shift + H | Shift + H |
| Flip vertical | Shift + V | Shift + V |
| Add auto layout | Shift + A | Shift + A |
| Remove auto layout | ⌥ + Shift + A | Alt + Shift + A |
| Union | ⌥ + Shift + U | Alt + Shift + U |
| Subtract | ⌥ + Shift + S | Alt + Shift + S |
| Intersect | ⌥ + Shift + I | Alt + Shift + I |
| Exclude | ⌥ + Shift + E | Alt + Shift + E |
| Flatten | ⌥ + Shift + F | Alt + Shift + F |
| Outline stroke | ⌘ + ⌥ + O | Ctrl + Alt + O |
| Show/Hide selection | ⌘ + Shift + H | Ctrl + Shift + H |
| Lock/Unlock selection | ⌘ + Shift + L | Ctrl + Shift + L |
| Align left | ⌥ + A | Alt + A |
| Align horizontal centers | ⌥ + H | Alt + H |
| Align right | ⌥ + D | Alt + D |
| Align top | ⌥ + W | Alt + W |
| Align vertical centers | ⌥ + V | Alt + V |
| Align bottom | ⌥ + S | Alt + S |
| Tidy up | Ctrl + ⌥ + T | Ctrl + Alt + Shift + T |
| Distribute horizontal spacing | Ctrl + ⌥ + H | Ctrl + Alt + Shift + H |
| Distribute vertical spacing | Ctrl + ⌥ + V | Ctrl + Alt + Shift + V |
| Pixel grid | Shift + ' | Shift + ' |
| Layout guides | Shift + G | Shift + G |
| Rulers | Shift + R | Shift + R |
| Layer outlines | Shift + O | Shift + O |
| Snap to pixel grid | ⌘ + Shift + ' | Ctrl + Shift + ' |
| Zoom to 100% | ⌘ + 0 | Ctrl + 0 |
| Zoom to fit | Shift + 1 | Shift + 1 |
| Zoom to selection | Shift + 2 | Shift + 2 |
| Zoom in | ⌘ + = | Ctrl + = |
| Zoom out | ⌘ + - | Ctrl + - |
| Show/Hide UI | Tab | Tab |
| Present | Shift + Space | Shift + Space |
| Keyboard shortcuts | Shift + / | Shift + / |
| Edit vector | Enter | Enter |
| Bold | ⌘ + B | Ctrl + B |
| Italic | ⌘ + I | Ctrl + I |
| Underline | ⌘ + U | Ctrl + U |
| Strikethrough | ⌘ + Shift + X | Ctrl + Shift + X |
| Create link | ⌘ + Shift + U | Ctrl + Shift + U |
| Bulleted list | ⌘ + Shift + 8 | Ctrl + Shift + 8 |
| Numbered list | ⌘ + Shift + 7 | Ctrl + Shift + 7 |

## 兼容与范围

- 文本输入、节点编辑、裁切、弹窗各自处理编辑快捷键，画布命令不会抢占输入。菜单支持方向键、Home/End、首字母、Enter、Esc/Tab，子菜单靠边时翻转与滚动。
- 取消组合仍接受旧键 Cmd/Ctrl Shift G，Delete 同时接受 Backspace/Delete，Windows Ctrl Y 支持重做。
- Ctrl C 在 macOS 为取色；Windows/Linux 避免与复制冲突，取色为 I。Windows/Linux 的布局整理/间距分布增加 Shift，避免与 Ctrl Alt V 粘贴属性冲突。
- Cmd/Ctrl S 保留本地备份；截图中的“包裹为分区 Cmd S”尚未实现，不覆盖保存。Shift O 保留本产品轮廓切换。未实现项为明确灰态，不能执行；不声称所有 Figma 命令等价。
- 空格按住拖动临时抓手；方向键移动1px、Shift方向键10px；Alt拖动复制。双击文字编辑，Cmd/Ctrl Enter提交，Esc取消；节点控制柄等专用快捷键见编辑器提示。
- Copy as 支持 CSS/SVG/PNG；CSS 为基础属性交付，复杂路径、分层填充及效果请用 SVG。浏览器/系统保留快捷键和原生剪贴板授权仍由平台处理。

侧栏：Tab 同时收起或恢复左右栏；收起后靠近左右边缘浮动显示对应栏。输入框和文字编辑中的 Tab 保留原行为。
