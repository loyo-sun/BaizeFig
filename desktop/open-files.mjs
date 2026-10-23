import { open } from "node:fs/promises";
import { basename, isAbsolute } from "node:path";

export function createFileOpenQueue(notify) {
  const pending = [];
  return {
    enqueue(path) {
      if (
        typeof path !== "string" ||
        !isAbsolute(path) ||
        !/\.baizefig$/i.test(path)
      )
        return;
      if (!pending.includes(path)) pending.push(path);
      notify();
    },
    async next() {
      const path = pending.shift();
      if (!path) return null;
      let file;
      try {
        file = await open(path, "r");
        const stat = await file.stat();
        if (!stat.isFile()) throw Error("请选择 BaizeFig 文件");
        if (stat.size > 50 * 1024 * 1024) throw Error("文件不能超过 50 MB");
        return { name: basename(path), content: await file.readFile("utf8") };
      } catch (error) {
        return {
          name: basename(path),
          error: `无法打开文件：${error.message}`,
        };
      } finally {
        await file?.close();
      }
    },
  };
}
