import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
// Server-only installs may omit desktop development dependencies.
const installer = fileURLToPath(
  new URL("../node_modules/electron/install.js", import.meta.url),
);
if (
  process.env.BAIZEFIG_SKIP_DESKTOP_DOWNLOAD !== "1" &&
  existsSync(installer)
) {
  const result = spawnSync(process.execPath, [installer], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
