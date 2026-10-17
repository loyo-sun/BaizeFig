import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  lstatSync,
  copyFileSync,
  chmodSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

function backup(path) {
  if (!existsSync(path)) return;
  if (lstatSync(path).isSymbolicLink())
    throw Error("Refusing to replace a symlink configuration file");
  const target = path + ".baizefig-" + Date.now() + ".bak";
  copyFileSync(path, target, 1);
  chmodSync(target, 0o600);
}
export function installClient({
  client,
  origin = "https://baizefig.netlify.app",
  home = homedir(),
  repo = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  node = process.execPath,
  dryRun = false,
  run = spawnSync,
  cli,
  configurationHome,
} = {}) {
  const url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.origin !== origin ||
    url.username ||
    url.password ||
    (url.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  )
    throw Error(
      "Provide an exact HTTPS editor origin (HTTP only for localhost)",
    );
  const env = { BAIZEFIG_ORIGINS: origin, BAIZEFIG_AUTO_PAIR: "1" };
  const entry = { command: node, args: [join(repo, "bridge/server.mjs")], env };
  if (client === "workbuddy") {
    const path = join(home, ".workbuddy", "mcp.json");
    let config = {};
    if (existsSync(path)) {
      if (lstatSync(path).isSymbolicLink())
        throw Error("Refusing to replace a symlink configuration file");
      config = JSON.parse(readFileSync(path, "utf8"));
      if (
        !config ||
        typeof config !== "object" ||
        Array.isArray(config) ||
        (config.mcpServers &&
          (typeof config.mcpServers !== "object" ||
            Array.isArray(config.mcpServers)))
      )
        throw Error("Invalid existing MCP configuration; left unchanged");
    }
    const next = {
      ...config,
      mcpServers: { ...config.mcpServers, baizefig: entry },
    };
    if (!dryRun) {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      backup(path);
      const temp = path + "." + process.pid + ".tmp";
      try {
        writeFileSync(temp, JSON.stringify(next, null, 2) + "\n", {
          mode: 0o600,
          flag: "wx",
        });
        renameSync(temp, path);
      } finally {
        if (existsSync(temp)) unlinkSync(temp);
      }
    }
    return {
      client,
      path,
      dryRun,
      nextStep:
        "Restart WorkBuddy's BaizeFig MCP, then click Connect automatically in the BaizeFig canvas.",
    };
  }
  if (client === "chatgpt") {
    const command =
      cli ??
      [
        "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
        "/Applications/Codex.app/Contents/Resources/codex",
        "/Applications/ChatGPT.app/Contents/Resources/codex",
      ].find(existsSync) ??
      "codex";
    const args = [
      "mcp",
      "add",
      "baizefig",
      ...Object.entries(env).flatMap(([key, value]) => [
        "--env",
        `${key}=${value}`,
      ]),
      "--",
      node,
      join(repo, "bridge/server.mjs"),
    ];
    if (!dryRun) {
      const configHome =
        configurationHome ?? process.env.CODEX_HOME ?? join(home, ".codex");
      backup(join(configHome, "config.toml"));
      const result = run(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (result.error || result.status !== 0)
        throw Error(
          "ChatGPT/Codex CLI setup failed. Install a desktop version with local MCP support or use the remote OAuth connection. Existing configuration backup is preserved.",
        );
    }
    return {
      client,
      dryRun,
      nextStep:
        "Restart the ChatGPT desktop MCP connection, then click Connect automatically in BaizeFig.",
      command,
      args,
    };
  }
  throw Error(
    "Choose workbuddy or chatgpt for local setup. Doubao Work uses the remote connection guide; public plugin availability depends on its developer platform.",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2),
      value = (name) => args[args.indexOf(name) + 1];
    const result = installClient({
      client: value("--client"),
      origin: args.includes("--origin") ? value("--origin") : undefined,
      dryRun: args.includes("--dry-run"),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
