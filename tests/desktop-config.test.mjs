import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { updateClientConfig, readJson } from "../desktop/config.mjs";

test("client install preserves other MCPs and uninstall removes only the owned entry", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "baizefig-config-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "mcp.json");
  const original = {
    preference: true,
    mcpServers: { other: { command: "other" } },
  };
  await writeFile(path, JSON.stringify(original));
  const entry = {
    command: "/app/Electron",
    args: ["/app/stdio.mjs"],
    env: { ELECTRON_RUN_AS_NODE: "1" },
  };
  await updateClientConfig(path, entry);
  assert.deepEqual(await readJson(path), {
    ...original,
    mcpServers: { ...original.mcpServers, baizefig: entry },
  });
  assert.equal(
    (await readdir(dir)).filter((x) => x.endsWith(".bak")).length,
    1,
  );
  await updateClientConfig(path, undefined, entry);
  assert.deepEqual(await readJson(path), original);
});

test("invalid, conflicting and symlink client configurations remain untouched", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "baizefig-config-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "mcp.json");
  for (const text of [
    "{broken",
    "[]",
    '{"mcpServers":[]}',
    '{"mcpServers":{"baizefig":{"command":"user-owned"}}}',
  ]) {
    await writeFile(path, text);
    await assert.rejects(() => updateClientConfig(path, { command: "ours" }));
    await assert.rejects(() =>
      updateClientConfig(path, undefined, { command: "ours" }),
    );
    assert.equal(await readFile(path, "utf8"), text);
  }
  if (process.platform !== "win32") {
    const link = join(dir, "link.json");
    await symlink(path, link);
    await assert.rejects(
      () => updateClientConfig(link, { command: "ours" }),
      /符号链接/,
    );
  }
});
