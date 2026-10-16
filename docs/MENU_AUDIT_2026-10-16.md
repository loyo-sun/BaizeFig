# Figma 主菜单补录与映射（2026-10-16）

范围：用户 11 张菜单截图及本人当前可访问的 Figma Design 主菜单。通过浏览器实际展开读取；未执行修改设计、发布组件库、账户或付费操作。空选区灰态只记录上下文，不等于功能不存在。截图 04/05 的 Object 重复项合并。此审计关闭的是 #29 的补录工作，不代表全部菜单功能完成或覆盖未来 Figma 版本。

原截图可见项的逐项工作包继续见 FIGMA_MENU_BACKLOG.md；本表补全此前未展开和被滚动遮挡的内容，按当前 src/App.tsx 命令、菜单和 src/shortcuts.ts 判断差异。

| 实际菜单 | 补录内容 | BaizeFig 实现与差异归属 |
|---|---|---|
| File / New | FigJam、Slides、Make、Buzz、Site、Import from Sketch | 当前仅 New design file；其他产品不属于基础画布，后置；Sketch 导入待办 #3/#34 |
| Edit / Copy as | text、CSS、CSS (all layers)、SVG、animated SVG、PNG | CSS/SVG/PNG 已接入；text、全层 CSS、animated SVG 待核对实现 #9/#34 |
| Edit / Select all with | same properties/fill/stroke/effect/text properties/font/instance/variant | 当前为按 text/frame/image 类型选择，不能视为等价；缺口 #9 |
| View / Outlines | Show outlines、Include hidden layers、Include object bounds | 当前 Layer/Mask/Frame outlines，缺精确开关语义 #10 |
| View / Panels | Open layers panel、Libraries、Open design panel、Open prototype panel、Toggle variables | 当前子菜单仅通用设置和快捷键；面板切换入口差异 #10 |
| View 滚动底部 | Previous/Next page、Zoom to previous/next frame、Find previous/next frame | 页面切换已有；画板导航完整语义 #11。Figma 显示 Shift+N/N、Home/End |
| Object / More layout options | Suggest auto layout、Remove all auto layout、Lock/Unlock aspect ratio、Resize to fit、Set width/height to hug contents、Set width/height to fill container | 属性面板有部分尺寸能力；当前菜单仅 Layout rules/Remove auto layout，菜单命令及批量语义 #13/#44 |
| Object / Slots | Convert to slot、Convert to frame、Wrap in new slot、Reset slot | 当前 Manage slots 占位不能视为等价；#34/#44 |
| Object / Main component | Go to main component、Push changes to main component、Restore main component | 当前仅 Go to main component；推送与恢复 #34/#44 |
| Object / Boolean groups | Union、Subtract、Intersect、Exclude | 四种已有；本次补 Alt+Shift+U/S/I/E，单层可建立布尔组，#16 |
| Text / Alignment | 左、中、右、两端对齐；顶、中、底 | 六向已有，两端对齐菜单缺口 #44 |
| Text / Adjust | 增减 indentation/font size/font weight/line height/letter spacing | 字号/字距已有，缩进/字重/行高命令差异 #44 |
| Text / Case | Original case、Uppercase、Lowercase | 当前有大小写及 Title Case；原始大小写恢复语义待补 #44 |
| Text / Text direction | Left to right、Right to left | 已有双向及额外 Automatic direction；精确排版仍 #34 |
| Text / Spell check | Check spelling、English Canada/UK/US、Russian | 当前借助浏览器拼写检查，英/中选项；语言表非等价 #44 |
| Preferences / Theme | Light、Dark、System theme | 完整偏好和持久化验收 #26 |
| Libraries | Manage libraries：搜索、This file、Updates、Teams、UI kits、Publish this file、已添加库及移除入口 | 本地组件不等同远端库管理；#34/#44，网络库后置 |
| AI balance | 用量卡片与周期/限额说明 | 外部 AI 服务，按用户要求后置 #28；不复制账户实际余额 |
| Help and account | Help page、Keyboard shortcuts、Support forum、Video tutorials、Release notes、Open font settings、Legal summary、Account settings、Log out | 本地快捷键已有，其余产品化适配 #28；不伪造账号退出 |

## 布尔上下文实测

无选区：Flatten、Outline stroke 和四种 Boolean groups 均禁用。
单个 Vector path：上述六项均可用。Figma 菜单显示 Flatten Option+Shift+F、Outline stroke Option+Command+O，布尔 Option+Shift+U/S/I/E。
BaizeFig 此前仅允许两层以上进行布尔；本次修正单层布尔并保持蒙版至少两层。平台键位映射由统一注册表验证；Windows/Linux 原生键盘输入不由 Mac 浏览器审计代替。

## 选择交互交付

52372eb：普通和矢量编辑中的空白点击取消选择；悬停预选与点击共用群组层级规则；单击保持群组，双击进入内部，Cmd/Ctrl 支持深选。17 项回归通过，构建通过；浏览器验证空白取消和分层选择。

## 未关闭范围

#41 的原生拖动中途 Alt/Shift/Space 按下与松开组合仍需支持该输入的验收。已完成的组件事件测试不等于真实平台手势全部通过。

## 本轮验证结果

- 全套自动回归：72 个文件通过、366 项通过；6 个文件/10 项按现有条件跳过，不计作通过。
- 生产构建通过；保留既有打包体积提示。
- 浏览器：单个 Path 分别触发 Option+Shift+U/S/I/E，均产生对应 Boolean group；撤销恢复源图层。空选区快捷键无操作。
- #16 子菜单和当前 Mac 浏览器键位已核对；Windows/Linux 原生平台及所有上下文等价性仍未完整实测，因此不关闭其总项。
