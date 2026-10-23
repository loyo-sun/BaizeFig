import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, truncate, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createFileOpenQueue } from "../desktop/open-files.mjs";

test("Finder requests survive startup, preserve order and report unreadable/oversize files", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "baizefig-open-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let notifications = 0;
  const queue = createFileOpenQueue(() => notifications++);
  const first = join(dir, "中文 空格.baizefig");
  const second = join(dir, "second.BAIZEFIG");
  await writeFile(first, '{"name":"first"}');
  await writeFile(second, '{"name":"second"}');
  queue.enqueue("--flag");
  queue.enqueue(join(dir, "other.txt"));
  queue.enqueue(first);
  queue.enqueue(first);
  queue.enqueue(second);
  assert.equal(notifications, 3);
  assert.deepEqual(await queue.next(), {
    name: "中文 空格.baizefig",
    content: '{"name":"first"}',
  });
  assert.equal((await queue.next()).name, "second.BAIZEFIG");
  assert.equal(await queue.next(), null);
  queue.enqueue(first); // Can reopen the same file after delivery.
  assert.equal((await queue.next()).name, "中文 空格.baizefig");
  queue.enqueue(join(dir, "missing.baizefig"));
  assert.match((await queue.next()).error, /无法打开文件/);
  await truncate(first, 51 * 1024 * 1024);
  queue.enqueue(first);
  assert.match((await queue.next()).error, /50 MB/);
});
