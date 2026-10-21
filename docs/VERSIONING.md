# 版本管理

当前首个版本为 `bate v0.01`，保留产品指定的 bate 拼写。npm 标准版本为 `0.0.1-bate.0`。

`package.json` 是唯一版本来源：`version` 用于包、服务和 Git 标签，`displayVersion` 用于界面。前端和服务直接读取，不再单独硬编码。锁文件由发布命令同步。

后续发布示例：

```sh
npm run release:version -- 0.0.2-bate.0 "bate v0.02"
```

提交 package.json、package-lock.json 与本次变更，通过测试后，以标准版本创建 Git 标签（如 `v0.0.2-bate.0`），从同一提交生成发布包。两个项目分别维护版本，后续无需强制同版本发布。
