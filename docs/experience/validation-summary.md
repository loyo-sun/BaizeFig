# 核心体验验收记录 · 2026-10-21

本轮范围：W1–W6 核心改造，W8 分项验收，W7 仅服务方案。严格全像素一致未通过，未将品牌与独立图标差异遮盖。

| 验收 | 结果 |
| --- | --- |
| 生产构建 | 通过；保留大包体及 fflate 静态/动态引用提示 |
| 全量单元与外部样本 | 95 文件，451 通过，1 跳过，139.39秒 |
| 核心浏览器 | 47 通过，包含三种窗口、中英文、深浅主题、原生中文输入法 |
| MCP 浏览器 | 6 通过，含云入口、实时编辑、授权撤销与自动配对 |
| MCP 传输/授权/安装配置 | 9 通过 |
| Penpot关闭后复验 | 7 通过：保存重开备份、PNG/SVG、颜色、Inspect/字体、矢量、原型导航、令牌主题编辑/删除/撤销 |
| 逐像素主样本 | 全图差异1.325764%，重复截图0差异，**严格一致未通过** |
| 发布 | 未部署、推送或创建PR；本地预览4318保留 |

首轮并行验收时，字形缓存单元检查超过原15秒门槛；450通过/1超时/1跳过。停止其他重验任务后，完整串行重跑451通过/1跳过，未修改门槛或跳过该失败项。首次MCP传输在沙盒无法监听端口，以正常本地权限重跑9通过。最终日志在 validation/。

唯一跳过：完整1337根外部.fig逐一转换长跑本次未重跑。已运行两个本地外部样本、20页矩阵/最大子树/全部矢量网络与缓存字形。未将用户设计内容加入证据包。Unicode17官方 BidiCharacterTest 与 BidiTest 的已有段落方向检查均通过；范围是段落方向，不是声称实现完整Unicode双向排版算法。

## 视觉结果

| 区域 | 原始差异 |
| --- | --- |
| full | 1.325764% |
| left | 1.702059% |
| right | 2.672642% |
| common_canvas | 0.095223% |
| toolbar | 6.748366% |
| geometry | 1.294975% |

主样本1440×1000/DPR1/英文/浅色/100%，同位置同尺寸同填充，原始截图直接比较，无掩膜/移位/阈值放宽。原基线全图20.3063%，首批5.2623%；此比例不是完成率。品牌、工具图标、标尺/尺寸标签、部分弹层与节点工具条仍有差异；其他状态未逐一建立等像素基准，Windows/Linux/其他浏览器未实机验收。matrix/中的12张图验证布局、颜色与边界；workflow-evidence.png 是实际操作截图拼图，并非Penpot逐像素对照。

## 1000层生产构建配对观察

| 指标 | 基线 | 当前 |
| --- | --- | --- |
| 打开至可用 | 1325ms | 1254ms |
| 导入同一1000层文件 | 347ms | 259ms |
| 事件到下一帧P95 | 33.4ms | 27.8ms |
| 显式回收后JS堆 | 17.87MiB | 14.82MiB |
| 回收前JS堆 | 21.62MiB | 36.19MiB |
| 外部HTTP来源 | 0 | 0 |

两版使用相同合成文件、隔离Chrome上下文与生产构建，串行测量；相同CDP回收步骤后再取保留堆。首轮未控制回收时机的记录保存在performance-browser-uncollected.json，不能只挑有利数字。单次观察不作统计显著结论；P95不是硬件输入延迟，JS堆不是进程/GPU内存。未观察到本样本持续内存增加；不代替长期压力测试。

总JS gzip729495→751140字节，CSS gzip13200→19296字节；字体资源增加97832字节，来源为独立Work Sans，许可证已随public/licenses/WorkSans-OFL.txt分发。增加的是静态前端资源，无新增Penpot服务依赖。详见package-size.json。

## 复现

- 构建：npm run build。
- 核心浏览器：npx playwright test --config playwright.experience.config.ts tests/ui/drawing-experience.spec.ts tests/ui/zoom-experience.spec.ts tests/ui/editor.spec.ts tests/ui/language.spec.ts tests/ui/experience-completion.spec.ts tests/ui/experience-workflows.spec.ts tests/ui/experience-matrix.spec.ts。
- MCP：npm run test:mcp 与 npx playwright test --config playwright.mcp.config.ts。
- 单元：npm test -- --maxWorkers=1；有权限的本地样本分别通过FIG_SAMPLE_PATH、FIG_COMPAT_SAMPLE_PATH、FIG_MATRIX_SAMPLE_PATH、FIG_VECTOR_SAMPLE_PATH、FIG_GLYPH_SAMPLE_PATH提供；Unicode17文件通过BIDI_TEST_PATH/BIDI_CLASS_TEST_PATH提供。未提供的外部样本会显式跳过，不可照抄本次通过数。
- 视觉：node docs/experience/scripts/capture.cjs；python3 docs/experience/scripts/compare.py。预览4318及原参考图片路径需保持可读。
- 性能：使用随文附带的1000层合成原生文件fixtures/performance-1000.baizefig，以基线/当前生产预览为参数执行scripts/performance.cjs；临时基线与生产测量服务器验收后关闭，需自行按所记录提交和当前源码重新构建。

Penpot已停止全部专用容器与虚拟机，保留数据；localhost:9001当前不可登录。恢复用Penpot研究环境/scripts/control.sh start，不是启动BaizeFig的前置步骤。
