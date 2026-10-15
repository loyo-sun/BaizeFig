import fs from "node:fs/promises";
import ts from "typescript";
const source = await fs.readFile(
  new URL("../src/shortcuts.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { shortcutRegistry, shortcutLabel } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
const text = `# 快捷键\n\n本表由 src/shortcuts.ts 自动生成，与菜单、搜索操作和帮助共用注册表。物理按键模式使用 QWERTY 位置；通用设置可切换按输入字符识别并持久保存。\n\n| 操作 | macOS | Windows / Linux |\n|---|---|---|\n${shortcutRegistry.map((s) => `| ${s.name} | ${shortcutLabel(s.name, "mac")} | ${shortcutLabel(s.name, "other")} |`).join("\n")}\n\n## 兼容与范围\n\n- 文本输入、节点编辑、裁切、弹窗各自处理编辑快捷键，画布命令不会抢占输入。菜单支持方向键、Home/End、首字母、Enter、Esc/Tab，子菜单靠边时翻转与滚动。\n- 取消组合仍接受旧键 Cmd/Ctrl Shift G，Delete 同时接受 Backspace/Delete，Windows Ctrl Y 支持重做。\n- Ctrl C 在 macOS 为取色；Windows/Linux 避免与复制冲突，取色为 I。Windows/Linux 的布局整理/间距分布增加 Shift，避免与 Ctrl Alt V 粘贴属性冲突。\n- Cmd/Ctrl S 保留本地备份；截图中的“包裹为分区 Cmd S”尚未实现，不覆盖保存。Shift O 保留本产品轮廓切换。未实现项为明确灰态，不能执行；不声称所有 Figma 命令等价。\n- 空格按住拖动临时抓手；方向键移动1px、Shift方向键10px；Alt拖动复制。双击文字编辑，Cmd/Ctrl Enter提交，Esc取消；节点控制柄等专用快捷键见编辑器提示。\n- Copy as 支持 CSS/SVG/PNG；CSS 为基础属性交付，复杂路径、分层填充及效果请用 SVG。浏览器/系统保留快捷键和原生剪贴板授权仍由平台处理。\n`;
await fs.writeFile(new URL("../docs/SHORTCUTS.md", import.meta.url), text);
