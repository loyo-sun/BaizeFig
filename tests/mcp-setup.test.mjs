import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installClient } from "../scripts/connect-client.mjs";
test("WorkBuddy installer merges and backs up config, with dry-run and fail-closed invalid files", (t) => {
  const home = mkdtempSync(join(tmpdir(), "baizefig-setup-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const dir = join(home, ".workbuddy");
  mkdirSync(dir);
  const path = join(dir, "mcp.json"),
    original = {
      otherSetting: 42,
      mcpServers: { other: { command: "other" } },
    };
  writeFileSync(path, JSON.stringify(original));
  installClient({ client: "workbuddy", home, dryRun: true });
  assert.deepEqual(JSON.parse(readFileSync(path)), original);
  installClient({ client: "workbuddy", home });
  const config = JSON.parse(readFileSync(path));
  assert.deepEqual(config.mcpServers.other, original.mcpServers.other);
  assert.equal(config.otherSetting, 42);
  assert.equal(config.mcpServers.baizefig.env.BAIZEFIG_AUTO_PAIR, "1");
  assert.equal(statSync(path).mode & 0o777, 0o600);
  const backup = readdirSync(dir).find((f) => f.endsWith(".bak"));
  assert.deepEqual(JSON.parse(readFileSync(join(dir, backup))), original);
  writeFileSync(path, "malformed");
  assert.throws(() => installClient({ client: "workbuddy", home }));
  assert.equal(readFileSync(path, "utf8"), "malformed");
});
test("ChatGPT installer uses the official CLI without shell interpolation", () => {
  let invocation;
  installClient({
    client: "chatgpt",
    home: tmpdir(),
    configurationHome: join(tmpdir(), "baizefig-fake-config-does-not-exist"),
    cli: "fake-codex",
    run: (command, args) => {
      invocation = { command, args };
      return { status: 0 };
    },
  });
  assert.equal(invocation.command, "fake-codex");
  assert.deepEqual(invocation.args.slice(0, 3), ["mcp", "add", "baizefig"]);
  assert.ok(invocation.args.includes("BAIZEFIG_AUTO_PAIR=1"));
  assert.throws(() =>
    installClient({
      client: "workbuddy",
      origin: "https://example.com/path",
      dryRun: true,
    }),
  );
  assert.throws(() => installClient({ client: "doubao", dryRun: true }));
});
