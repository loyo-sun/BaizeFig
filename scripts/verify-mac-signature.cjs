const { execFileSync } = require("node:child_process");
const { join } = require("node:path");
module.exports = async (context) => {
  if (context.electronPlatformName !== "darwin") return;
  const app = join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  // Local launch tests do not exercise the resource seal checked after download.
  // Reject incomplete bundle/framework signatures before producing installers.
  execFileSync(
    "codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", app],
    { stdio: "inherit" },
  );
};
