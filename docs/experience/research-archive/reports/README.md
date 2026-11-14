# Penpot 本地研究环境

- 访问地址：http://localhost:9001
- 版本：Penpot 2.18.3（Apple Silicon 原生 arm64 镜像）
- 启动：在研究目录运行 `./scripts/control.sh start`
- 停止：`./scripts/control.sh stop`（保留文件与数据库）
- 状态：`./scripts/control.sh status`
- 研究账号：根目录 `.local-account.json`，仅本机可读。可在登录页另行注册自己的本地账号。
- 虚拟机：Colima 专用 profile `penpot`，3 CPU、4 GiB 内存，按需启动。
- 数据位置：用户目录 `.colima` 下的专用 profile／磁盘；容器 named volumes 保存文件和数据库。
- BaizeFig 产品不依赖此环境，本次未引入 Penpot 源码或产品资源。
- 本机代理用于首次镜像下载。镜像已导入后，重启不需要重复下载。
- 原始截图、测量值、录屏与样本：`evidence/`；研究脚本：`scripts/`。

- 本地备份：`./scripts/backup.sh`，数据库与素材备份存放在 `backups/`，不包含在对外证据包。
- 镜像锁：`reports/images.lock.json`；启动时检查全部 8 个镜像 ID，禁止隐式拉取其他版本。
- 研究证据包：`reports/Penpot-BaizeFig-evidence.zip`，已排除账号密码、登录令牌与浏览器状态文件。

## 已交付文档

- 调研报告：https://app.notion.com/p/3ff41f73948881a7bf9de0f1efbaa4a8
- 独立改造计划：https://app.notion.com/p/3ff41f73948881b8be88ff6266f03768
- 本轮仅完成部署、调研与计划，未进行产品改造。
