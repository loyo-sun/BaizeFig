## English

BaizeFig v0.0.1b3 adds exclusive editing for LoyoCloud files.

- Open cloud files read-only, then choose Start editing to hold the file’s edit lock. Other windows and AI clients can view the file while it is locked.
- Save cloud edits automatically and finish pending saves before ending the editing session. Closing the document releases the lock; interrupted sessions expire within 90 seconds.
- AI clients use begin_edit, renew_edit and end_edit. Cloud writes require the current lock token and are saved before success is returned.
- Manage AI permissions and web/desktop connections in LoyoCloud’s authorization and application pages.

Download the Apple Silicon DMG or ZIP, quit BaizeFig, and replace the previous application. Existing local designs remain available. Cloud file editing requires the updated LoyoCloud service; standalone local files keep their existing editing behavior.

The app uses a verified local ad-hoc signature and is not Developer ID signed or notarized.

## 简体中文

BaizeFig v0.0.1b3 新增乐悦云文件独占编辑。

- 打开云文件默认只读，点击「开始编辑」后持有文件锁，其他窗口和 AI 可以查看。
- 编辑期间自动保存，「保存并结束编辑」会先完成保存再释放。关闭文档释放锁，异常会话最长 90 秒过期。
- AI 使用 begin_edit、renew_edit、end_edit；修改需要当前锁凭据，云端保存成功后才返回成功。
- 在乐悦云「授权管理」配置 AI 权限，在「应用管理」查看和管理网页、本地连接。

下载 Apple Silicon DMG 或 ZIP，退出白泽后替换旧版。已有本地作品保留。云文件编辑需要同步升级乐悦云服务；独立本地文件继续按原有方式编辑。

应用使用经过校验的本地临时签名，尚无 Apple 开发者认证或公证。
