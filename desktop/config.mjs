import {
  readFile,
  writeFile,
  rename,
  lstat,
  mkdir,
  copyFile,
  chmod,
  unlink,
} from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export async function readJson(path, fallback) {
  try {
    if ((await lstat(path)).isSymbolicLink())
      throw Error("不能修改符号链接配置文件");
    return JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}
export async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    await rename(temp, path);
  } finally {
    await unlink(temp).catch(() => {});
  }
}
export async function updateClientConfig(path, entry, expectedEntry) {
  const config = await readJson(path, {});
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    (config.mcpServers !== undefined &&
      (!config.mcpServers ||
        typeof config.mcpServers !== "object" ||
        Array.isArray(config.mcpServers)))
  ) {
    throw Error("请选择使用 mcpServers 字段的 JSON 配置文件；原文件未修改");
  }
  const existing = config.mcpServers?.baizefig;
  if (
    existing &&
    JSON.stringify(existing) !== JSON.stringify(expectedEntry) &&
    JSON.stringify(existing) !== JSON.stringify(entry)
  ) {
    throw Error("已有不同的 baizefig 配置，请先在客户端处理，原文件未修改");
  }
  if (!entry && !existing) return;
  try {
    const backup = `${path}.baizefig-${randomUUID()}.bak`;
    await copyFile(path, backup);
    await chmod(backup, 0o600);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  config.mcpServers ??= {};
  if (entry) config.mcpServers.baizefig = entry;
  else delete config.mcpServers.baizefig;
  await atomicJson(path, config);
}
