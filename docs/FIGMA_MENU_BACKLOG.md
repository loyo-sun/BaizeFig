# Figma 菜单差异待办

总跟踪：[#30](https://github.com/loyo-sun/BaizeFig/issues/30)。已交付基线：[#1](https://github.com/loyo-sun/BaizeFig/issues/1)（已完成）。

按用户最新要求，直接维护 GitHub Issues 的状态与验收记录，不再等待 Projects 授权。

根据用户于 2026-10-14 提供的 11 张菜单截图，对照 BaizeFig v0.1（c7bee25）整理。原始截图不上传仓库。灰态表示参考截图的上下文禁用，不代表本产品是否实现；状态以代码与验证记录为准。Object 的两张滚动截图已合并去重。

28 个工作包包含已有能力的菜单接入、部分能力补齐、缺失功能开发和待核对项，初始整理时均为待办；当前 #14、#16、#18、#20 已开始并实现部分能力，其他范围按各条验收记录继续追踪。截图可见快捷键仅作为 Mac 参考，平台差异需要验证。

## BZ-MENU-01 · 主菜单体系与上下文状态

GitHub：[#2](https://github.com/loyo-sun/BaizeFig/issues/2)

状态：Todo（待办）

来源：截图 01–11

当前基线：已有 Actions 搜索与局部右键菜单；尚无截图中的完整多级主菜单。

- [ ] 接入 Back to files、Actions 以及 File/Edit/View/Object/Text/Arrange/Vector/Plugins/Widgets/Preferences/Libraries 等入口。
- [ ] 实现悬停展开、返回、键盘导航、Esc 关闭、可滚动菜单、子菜单边界定位。
- [ ] 根据选区、节点类型、剪贴板、历史和文档权限计算禁用态、勾选态与快捷键提示。

验收：

- 截图中可见的菜单入口均可追踪到命令或明确的未实现状态。
- 鼠标、键盘、空选区及有选区状态均有回归样例；禁用项不误执行。


## BZ-MENU-02 · File：文件创建、复制与素材放置

GitHub：[#3](https://github.com/loyo-sun/BaizeFig/issues/3)

状态：Todo（待办）

来源：截图 01

当前基线：已有新建文件、本地文件列表、图片导入；缺少等价的菜单组织及部分语义。

- [ ] 对齐 New Design；核对 New 子菜单内产品/文件类型（截图未展开）。
- [ ] 实现文件级 Duplicate，区别于现有的节点 Duplicate。
- [ ] 对齐 Place image 的放置预览、定位、替换流程及截图 ⇧⌘K 绑定。
- [ ] 将已有 Save local copy 与导出能力接入对应菜单并核对可用状态。

验收：

- 复制文件生成独立文档身份，原文件与副本互不覆盖。
- 放置多张素材、取消放置、撤销与重做均可用。

依赖：BZ-MENU-01

## BZ-MENU-03 · File：版本历史与设计分支

GitHub：[#4](https://github.com/loyo-sun/BaizeFig/issues/4)

状态：Todo（待办）

来源：截图 01

当前基线：目前只有会话内撤销快照，没有持久版本历史或设计分支。

- [ ] Save to version history、Show version history。
- [ ] Create branch：定义设计文档分支、比较、恢复及合并方式。
- [ ] 区分设计分支与 Git 代码分支；明确本地优先下历史保存与协作归属。

验收：

- 保存版本后重载仍可浏览并恢复；恢复可撤销或可回到恢复前状态。
- 分支修改不污染主文档，合并冲突与素材引用有验证样本。

依赖：BZ-MENU-02

## BZ-MENU-04 · File：统一 Export 与画板 PDF 导出

GitHub：[#5](https://github.com/loyo-sun/BaizeFig/issues/5)

状态：Todo（待办）

来源：截图 01

当前基线：已有 PNG/JPG/SVG 与内嵌 SVG 的 HTML 导出；没有 PDF。

- [ ] 对齐 Export 对话框、选区/页面/多画板范围和截图 ⇧⌘E 绑定。
- [ ] Export frames to PDF：多画板分页、顺序、尺寸、文字/矢量/图片与字体处理。
- [ ] 保留已有导出但补齐错误、尺寸、比例和透明背景反馈。

验收：

- 同一设计导出后尺寸及可见范围正确；多画板 PDF 页序稳定。
- 使用包含裁剪、旋转、中文字体与图片的样本验收保真。

依赖：BZ-MENU-01

## BZ-MENU-05 · Edit：高级剪贴板与粘贴替换

GitHub：[#6](https://github.com/loyo-sun/BaizeFig/issues/6)

状态：Todo（待办）

来源：截图 02

当前基线：已有内部节点复制/剪切/普通粘贴/副本；不等价于所有截图粘贴命令。

- [ ] 核对并实现 Copy as 子菜单（截图未展开，具体格式待核对）。
- [ ] Paste over selection 与 Paste to replace，保留合理的位置、层级和引用语义。
- [ ] 校准 Duplicate、Delete、Undo/Redo 菜单状态与键位，复用现有引擎。

验收：

- 复制包含嵌套节点、组件、图片与原型引用时不产生 ID 冲突。
- 覆盖/替换与普通粘贴有独立可执行用例，整次操作可撤销。

依赖：BZ-MENU-01

## BZ-MENU-06 · Edit：查找、遍历匹配与替换

GitHub：[#7](https://github.com/loyo-sun/BaizeFig/issues/7)

状态：Todo（待办）

来源：截图 02

当前基线：现有图层名过滤和 Actions 搜索不等于文档 Find/Replace。

- [ ] Find、Find next、Find previous、Find and replace。
- [ ] 定义图层名称与文本内容的搜索范围、大小写、页面范围、选中与定位。
- [ ] 逐条保留截图快捷键作核对依据，尤其 Find next/previous，未验证前不宣称平台通用。

验收：

- 可跨页面按稳定顺序遍历并定位匹配项。
- 替换单项/全部可作为事务撤销，未匹配节点不变。

依赖：BZ-MENU-01

## BZ-MENU-07 · Edit：默认属性、属性复制与取色器

GitHub：[#8](https://github.com/loyo-sun/BaizeFig/issues/8)

状态：Todo（待办）

来源：截图 02

当前基线：有属性面板和颜色输入；没有属性剪贴板、默认属性方案或画布取色器。

- [ ] Set default properties：按工具/节点类型保存默认值。
- [ ] Copy properties、Paste properties，区分可迁移样式与节点身份/几何。
- [ ] Pick color：画布和适用浏览器范围取色，提供不支持时的明确反馈。

验收：

- 粘贴样式不覆盖节点 ID、父子关系或无关内容。
- 默认属性重载可恢复；取色结果及透明度可验证。

依赖：BZ-MENU-01

## BZ-MENU-08 · Edit：匹配选择、反选与条件选择

GitHub：[#9](https://github.com/loyo-sun/BaizeFig/issues/9)

状态：Todo（待办）

来源：截图 02

当前基线：已有根节点全选、多选和框选；缺少匹配选择与反选等完整语义。

- [ ] Select matching layers、Select inverse、Select none 的明确命令。
- [ ] 核对 Select all with 子菜单及其匹配字段（截图未展开）。
- [ ] 定义隐藏/锁定/嵌套节点、组件实例和跨页面的选择范围；校准已有 Select all。

验收：

- 在多种节点、层级与锁定状态下选择集合符合范围规则。
- 空选区和全选反选边界正确，选择操作不写入设计内容。

依赖：BZ-MENU-01

## BZ-MENU-09 · View：显示辅助、面板与内存诊断

GitHub：[#10](https://github.com/loyo-sun/BaizeFig/issues/10)

状态：Todo（待办）

来源：截图 03

当前基线：有简易网格、轮廓、尺寸标签与整体显隐；缺少大部分独立 View 命令。

- [ ] Pixel grid、Layout guides、Rulers、Show slices、Comments、Annotations。
- [ ] 核对 Outlines 子菜单；实现 Pixel preview、Mask outlines、Frame outlines。
- [ ] Memory usage、Additional labels、Minimize left navigation bar、Minimize UI、Show/Hide UI。
- [ ] Multiplayer cursors、Switch to Draw、Switch to Dev Mode 与 Panels 子菜单；协作与 Dev Mode 需独立能力支撑。
- [ ] 截图底部有滚动箭头，继续核对未显示的 View 项目。

验收：

- 每个显示开关独立生效，不与布局网格、图层轮廓或画布内容混淆。
- 面板可恢复，像素预览不改变导出数据，内存诊断展示真实测量。

依赖：BZ-MENU-01

## BZ-MENU-10 · View：缩放命令与导航历史

GitHub：[#11](https://github.com/loyo-sun/BaizeFig/issues/11)

状态：Todo（待办）

来源：截图 03

当前基线：已有缩放、适配和 100%；快捷键及导航历史未完全对齐。

- [ ] 校准 Zoom in/out、Zoom to 100%、Zoom to fit、Zoom to selection。
- [ ] 实现 Previous page、Next page、Zoom to previous frame。
- [ ] 维护视口/画板导航历史并处理已删除目标、页面切换和空页面。

验收：

- 缩放中心、选区适配、100% 和页面导航符合基准样例。
- 快捷键不被普通绘图键或文本输入错误触发。

依赖：BZ-MENU-01

## BZ-MENU-11 · 全菜单快捷键与平台差异校准

GitHub：[#12](https://github.com/loyo-sun/BaizeFig/issues/12)

状态：Todo（待办）

来源：截图 01–11

当前基线：目前绑定表存在与截图不同的键位，不能标记为完整兼容。

- [ ] 以截图为 Mac 基准核对每条可见快捷键，维护 Windows/Linux 和键盘布局对应表。
- [ ] 重点核对 Ungroup：截图 ⌘⌫ vs 当前 ⌘⇧G；层级顺序：截图置顶 ]、上移 ⌘]、下移 ⌘[、置底 [，与当前语义不同。
- [ ] 核对 Pixel grid ⇧'、Layout guides ⇧G、100% ⌘0 vs 当前 ⇧0，以及当前 ⇧O 与旧版轮廓键兼容设置。
- [ ] 核对截图 Wrap in new section ⌘S 与当前本地保存 ⌘S 冲突；对齐 Place image、Export、文本与排列键位。
- [ ] 捕获绘图、输入、对话框、原型和浏览器保留键场景；提供可持久化的键盘布局设置。

验收：

- 菜单提示、帮助文档和实际命令来自同一份快捷键注册表。
- 冲突项经平台回归样例验证后才能标记已对齐；不凭截图灰态推断未实现。

依赖：BZ-MENU-01

## BZ-MENU-12 · Object：Section、转换、缩略图与 Mask

GitHub：[#13](https://github.com/loyo-sun/BaizeFig/issues/13)

状态：Todo（待办）

来源：截图 04

当前基线：已有 Frame selection/Group/Ungroup 和 Frame clipping；没有 Section、Mask 或文件缩略图体系。

- [ ] Wrap in new section、Convert to section、Convert to frame。
- [ ] Restore default thumbnail：定义自定义文件缩略图及恢复机制。
- [ ] Use as mask，区分蒙版节点语义与已有画板裁剪。
- [ ] 为已有 Frame/Group/Ungroup 接入上下文菜单并校准快捷键。

验收：

- 容器转换保持世界坐标与层级，不丢失资源/交互引用。
- 蒙版对渲染、命中检测和导出结果一致，支持撤销。

依赖：BZ-MENU-01

## BZ-MENU-13 · Object：完整布局选项与组件实例

GitHub：[#14](https://github.com/loyo-sun/BaizeFig/issues/14)

状态：In Progress（进行中）

来源：截图 04–05

当前基线：有基础横纵 Auto layout、组件创建和实例快照；没有联动覆盖及 Slots。

- [ ] Add auto layout 与 More layout options 子菜单完整核对，补齐缺失布局规则。
- [ ] Slots 子菜单、Reset instance、Detach instance、Main component 子菜单。
- [ ] 保留 Create component，补齐主组件关联、实例覆盖、重置/分离、跳转主组件与变体等基础模型。

验收：

- 主组件修改、实例覆盖、重置与分离各有持久化/撤销样例。
- 未展开子菜单先标待核对，不能把快照复制当作完整实例。

依赖：BZ-MENU-01

本轮更新：主组件联动、覆盖/重置/分离/交换、Fill/Wrap/Grid 与约束已接入；Slots、完整变体属性和菜单等价性仍待完成。代码已同步 `ca51fee`，其余检查项保持开放。

## BZ-MENU-14 · Object：层级排列、翻转与旋转

GitHub：[#15](https://github.com/loyo-sun/BaizeFig/issues/15)

状态：Done（2026-10-16 审计补录，#15 已关闭）

来源：截图 04–05

当前：层级排列、翻转、90°/180°旋转及嵌套仿射变换已交付。证据见 0107efc、4cb94f2、472ef4c 与 docs/VERIFICATION.md。

- [x] Bring to front、Bring forward、Send backward、Send to back 的命令/快捷键校准。
- [x] Flip horizontal、Flip vertical、Rotate 180°、Rotate 90° left/right。
- [x] 对齐多选、嵌套旋转、镜像后的文本/路径/子节点坐标与尺寸手柄。

验收：

- 嵌套旋转或镜像后拖动、缩放、命中、选框与导出一致。
- 顺序变更保持子树完整，不跨父节点意外重排。

依赖：BZ-MENU-11

审计复跑六组34项测试通过，无功能代码修改。原生跨平台键盘验收仍独立跟踪 #12。

## BZ-MENU-15 · Object：Flatten、描边轮廓与布尔组

GitHub：[#16](https://github.com/loyo-sun/BaizeFig/issues/16)

状态：In Progress（进行中）

来源：截图 05

当前基线：没有矢量布尔内核、Flatten 或 Outline stroke。

- [ ] Flatten、Outline stroke、Boolean groups。
- [ ] Boolean groups 的子命令截图未展开，需后续核对；布尔内核包含/相交/挖除等具体支持范围另行验收。
- [ ] 保证组合、转换、非破坏编辑、容差与导出引用规则。

验收：

- 复杂重叠路径、带孔路径、变换路径和描边转换有几何基准样本。
- 所有转换可撤销，并可保存、重载及导出还原。

依赖：BZ-MENU-19

本轮更新：四种布尔、Flatten 独立路径、Outline stroke 真实轮廓及区域填充已验收，见 #38。未知 Boolean groups 子菜单等价性保留核对；不把未知范围标为完成。

## BZ-MENU-16 · Object：图层、填充描边与交互清理命令

GitHub：[#17](https://github.com/loyo-sun/BaizeFig/issues/17)

状态：Todo（待办）

来源：截图 05

当前基线：已有显隐、锁定、折叠和基础填充/描边修改；缺少完整批处理命令与键位。

- [ ] Show/Hide selection、Lock/Unlock selection、Hide other layers、Collapse layers。
- [ ] Remove fill、Remove stroke、Swap fill and stroke。
- [ ] Remove interactions、Delete contents：保留容器并删除其内容，区别于删除容器。

验收：

- 多选和嵌套层级下命令范围可预测，锁定保护一致。
- 删除内容或交互后引用不悬空，撤销完整恢复。

依赖：BZ-MENU-01

## BZ-MENU-17 · Text：富文本样式、链接与列表

GitHub：[#18](https://github.com/loyo-sun/BaizeFig/issues/18)

状态：In Progress（进行中）

来源：截图 06

当前基线：有整节点字体、字号、字重、行高和对齐；没有文本范围级编辑。

- [ ] Bold、Italic、Underline、Strikethrough。
- [ ] Create link、Bulleted list、Numbered list。
- [ ] 实现画布内光标、文本选区、多段样式、链接和列表的数据与交互模型。

验收：

- 同一文本节点可包含不同样式段，中文/多行编辑、剪贴板与撤销正确。
- 渲染、序列化、重载与导出保留样式及链接。

依赖：BZ-MENU-01

本轮更新：画布内光标、选区、输入/删除、多行、撤销和基础混排保留已接入，见 #37；范围级样式命令、链接、列表仍待完成。代码已同步 `ca51fee`，其余检查项保持开放。

## BZ-MENU-18 · Text：对齐、调整、大小写、方向与拼写检查

GitHub：[#19](https://github.com/loyo-sun/BaizeFig/issues/19)

状态：Todo（待办）

来源：截图 06

当前基线：已有整节点左/中/右对齐，其他文本子菜单未完整实现。

- [ ] 逐一核对 Alignment、Adjust、Case、Text direction、Spell check 子菜单（截图未展开）。
- [ ] 对齐已有能力的菜单入口与键位；实现后续核实的文字尺寸/间距、大小写与方向操作。
- [ ] 定义拼写检查语言、浏览器/本地引擎和隐私边界。

验收：

- 子菜单范围有可追溯依据后逐项验收，不把候选项当成截图已确认项。
- 文字转换不影响无关范围，RTL/LTR 与中文混排有样本。

依赖：BZ-MENU-17

## BZ-MENU-19 · Vector：路径连接、修复、拆分与偏移

GitHub：[#20](https://github.com/loyo-sun/BaizeFig/issues/20)

状态：Done（已完成）

来源：截图 08

当前进展：节点、控制柄、区域模型以及选择/多选、拆分、连接、删除修复已接入，见 #38；工具入口仍可采样，独立节点模式支持点式连线。路径简化及容差输入已完成；Offset 的正负距离、连接样式、尺寸重基及空结果保护已完成；独立 Smooth join 及 Cmd/Ctrl+Shift+J 已完成。Split vector 的图层拆分已完成，保留孔洞及整体合成；根菜单由 #2、跨版本/全部退化几何由 #34 继续跟踪。

- [x] Join selection、Smooth join selection、Delete and heal selection。
- [x] Split vector、Simplify vector、Offset vector。
- [x] 建立节点/控制柄/曲线/闭合路径模型，以及节点选择和容差设置。

验收：

- 对开放/闭合/多子路径执行操作后几何正确，无自交或精度失控。
- 节点级编辑与命令事务、撤销和 SVG 往返一致。

依赖：BZ-MENU-01

## BZ-MENU-20 · Arrange：像素取整、整理、打包与分布

GitHub：[#21](https://github.com/loyo-sun/BaizeFig/issues/21)

状态：Todo（待办）

来源：截图 07

当前基线：已有六方向对齐，未有独立 Round to pixel 或分布工具；拖动整数化不等价。

- [ ] Round to pixel 与已有六个 Align 命令的菜单/快捷键对齐。
- [ ] Tidy up、Pack horizontal、Pack vertical。
- [ ] Distribute horizontal/vertical spacing。
- [ ] Distribute left/horizontal centers/right/top/vertical centers/bottom。

验收：

- 多选节点等间距/边缘/中心分布正确，并处理小于三项、锁定项与跨父级坐标。
- 整理/打包不意外改变文本、图片或组件引用，可整体撤销。

依赖：BZ-MENU-14

## BZ-MENU-21 · Plugins：插件管理、运行与最近使用

GitHub：[#22](https://github.com/loyo-sun/BaizeFig/issues/22)

状态：Todo（待办）

来源：截图 09

当前基线：未实现插件系统；MCP Bridge 不是插件兼容层。

- [ ] Manage plugins、Run last plugin。
- [ ] 设计插件发现、安装/启用/禁用、权限、沙箱、版本与运行中断。
- [ ] 评估兼容 Figma 插件 API 的范围，区分原生 BaizeFig 插件与导入兼容。

验收：

- 示例插件可在受限权限下读取/修改文档，修改经过命令引擎。
- 最近运行记录、故障隔离与用户撤销可验证。

依赖：BZ-MENU-01

## BZ-MENU-22 · Widgets：管理、画布对象与选择

GitHub：[#23](https://github.com/loyo-sun/BaizeFig/issues/23)

状态：Todo（待办）

来源：截图 10

当前基线：未实现 Widgets。

- [ ] Manage widgets、Select all widgets。
- [ ] 定义 Widget 对象、渲染/事件/持久状态、资源与插件隔离边界。
- [ ] 评估多人 Widget 状态同步，未有协作时先限定本地行为。

验收：

- 示例 Widget 可管理、插入、选择、保存和移除；普通设计节点不被误选。
- Widget 的权限、故障和脚本不绕过编辑器安全边界。

依赖：BZ-MENU-21

## BZ-MENU-23 · Preferences：几何、对象与像素吸附

GitHub：[#24](https://github.com/loyo-sun/BaizeFig/issues/24)

状态：Todo（待办）

来源：截图 11

当前基线：没有智能吸附系统；现有拖动取整不是等价偏好。

- [ ] Snap to geometry、Snap to objects、Snap to pixel grid。
- [ ] 配置独立保存，拖动/缩放/矢量编辑共用吸附服务。
- [ ] 对齐像素网格快捷键，并定义缩放下的屏幕容差与临时禁用规则。

验收：

- 不同缩放和嵌套变换下吸附位置正确，显示候选和对齐反馈。
- 三个开关可以独立验证，不改变未吸附时的坐标精度。

依赖：BZ-MENU-14

## BZ-MENU-24 · Preferences：工具、图层与画布交互偏好

GitHub：[#25](https://github.com/loyo-sun/BaizeFig/issues/25)

状态：Todo（待办）

来源：截图 11

当前基线：当前有固定的复制改名和尺寸显示等行为，但无对应偏好配置。

- [ ] Keep tool selected after use、Highlight layers on hover、Rename duplicated layers、Show dimensions on objects。
- [ ] Hide canvas UI during changes、Use smart quotes/symbols、Flip objects while resizing。
- [ ] Keyboard zooms into selection、Invert zoom direction、Ctrl+click opens right click menus。
- [ ] Use number keys for opacity、Use old shortcuts for outlines、Use ⌘⌥↑/↓ to rotate layers。
- [ ] Use scroll wheel zoom、Right-click and drag to pan。

验收：

- 每个开关均有默认值、持久化与开启/关闭行为样本。
- Ctrl 点击深选、右键菜单、右键平移与快捷键互不冲突，输入框不误改透明度。

依赖：BZ-MENU-11

## BZ-MENU-25 · Preferences：AI 提示、主题、色彩与无障碍

GitHub：[#26](https://github.com/loyo-sun/BaizeFig/issues/26)

状态：Todo（待办）

来源：截图 11

当前基线：未实现大部分高级偏好；已有 AI 配置不代表 Agent 画布状态体系。

- [ ] Play audio notifications in AI chat、Show Agents on canvas、Open links in desktop app。
- [ ] Theme 子菜单、Color profile、Keyboard layout、Accessibility settings。
- [ ] Permissions and helpers、Nudge amount：明确本地辅助程序权限与可配置微调步长。

验收：

- 主题/键盘/微调配置重载可恢复，界面对比度与键盘焦点经过验证。
- 音频与 Agent 状态由真实任务驱动；色彩配置有渲染/导出测试，不虚构效果。

依赖：BZ-MENU-24

## BZ-MENU-26 · Libraries：共享组件库与资源更新

GitHub：[#27](https://github.com/loyo-sun/BaizeFig/issues/27)

状态：Todo（待办）

来源：主菜单截图 01–11；Libraries 未展开

当前基线：只有当前文档本地组件快照，无共享库。

- [ ] 核对 Libraries 实际入口、权限和子界面。
- [ ] 实现资源库启用/禁用、引用、版本、发布/更新与缺失依赖处理。
- [ ] 确定本地优先下库分发/导入方式，保持用户数据可独立导出。

验收：

- 示例库可被多个文档引用，更新与实例覆盖不互相污染。
- 离线或丢失库时有可恢复策略，不假设中心化账号必需。

依赖：BZ-MENU-13

## BZ-MENU-27 · 桌面、AI 用量及帮助账号入口的适配

GitHub：[#28](https://github.com/loyo-sun/BaizeFig/issues/28)

状态：Todo（待办）

来源：主菜单截图 01–11；相关子菜单未展开

当前基线：没有桌面应用；已有快捷键帮助和自带模型配置，未有完整 Help/Account 或用量体系。

- [ ] Open in desktop app：确定可选桌面壳/协议关联/本地 Bridge 的真实跳转方案。
- [ ] AI balance：按 BaizeFig 自带模型方案评估真实用量、预算、费用提示；不能照搬或伪造 Figma 额度。
- [ ] Help and account：核对未展开项，整合帮助、快捷键、反馈和实际可用的身份/授权设置。

验收：

- 不存在的桌面安装或账号能力明确告知，不显示伪成功。
- 用量只显示实际可测数据，不能把预算估计当作服务商账单。

依赖：BZ-MENU-25

## BZ-MENU-28 · 菜单截图覆盖审计与未展开子菜单补录

GitHub：[#29](https://github.com/loyo-sun/BaizeFig/issues/29)

状态：Done（审计与补录完成；功能差异仍由各工作包跟踪）

来源：截图 01–11

2026-10-16 已通过浏览器展开核对，完整补录及差异归属见 [菜单审计](MENU_AUDIT_2026-10-16.md)。

- [x] 逐个核对 File/New、Edit/Copy as、Edit/Select all with。
- [x] 核对 View/Outlines、Panels、底部未显示的滚动菜单。
- [x] 核对 Object/More layout options、Slots、Main component、Boolean groups。
- [x] 核对 Text/Alignment、Adjust、Case、Text direction、Spell check。
- [x] 核对 Preferences/Theme，以及 Libraries、AI balance、Help and account 的内容。
- [x] 记录截图中灰态是上下文禁用；不据此认定 BaizeFig 缺失，继续用实际代码判定。

验收：

- 所有截图可见项都能映射到已有实现或待办；04/05 重叠 Object 项去重。
- 未展开项保持待核对，完整 Figma 对齐分母不冒称已穷尽。

依赖：BZ-MENU-01

## 已交付基线与总体状态

- v0.1 本地编辑开发起点：Done；证据为 c7bee25、16 项单元测试、生产构建及浏览器/MCP 联调。
- 完整 Figma 功能对齐：In Progress；未实现项仍在上述待办及 FIGMA_PARITY.md 中。
- 本清单只记录这批截图差异，不能取代 .fig/.sketch 格式、P2P 等既有需求。
