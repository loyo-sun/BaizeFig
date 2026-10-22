import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
if (!/^v\d+\.\d+\.\d+(?:[ab]\d+)?$/.test(pkg.displayVersion))
  throw Error("Invalid public release version");
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL("node_modules/electron-builder/cli.js", root)),
    "--mac",
    "--arm64",
    "--publish",
    "never",
    ...process.argv.slice(2),
  ],
  {
    cwd: fileURLToPath(root),
    stdio: "inherit",
    env: {
      ...process.env,
      BAIZEFIG_RELEASE_VERSION: pkg.displayVersion,
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
