import { readFile, writeFile } from "node:fs/promises";
const [version, displayVersion] = process.argv.slice(2);
if (
  !/^\d+\.\d+\.\d+(?:-[a-z][a-z0-9.-]*)?$/.test(version ?? "") ||
  !/^[a-z]+ v\d+\.\d+(?:\.\d+)?$/.test(displayVersion ?? "")
) {
  throw new Error(
    'Usage: node scripts/release-version.mjs 0.0.2-bate.0 "bate v0.02"',
  );
}
const root = new URL("../", import.meta.url);
const pkgUrl = new URL("package.json", root);
const lockUrl = new URL("package-lock.json", root);
const pkg = JSON.parse(await readFile(pkgUrl, "utf8"));
const lock = JSON.parse(await readFile(lockUrl, "utf8"));
pkg.version = version;
pkg.displayVersion = displayVersion;
lock.version = version;
lock.packages[""].version = version;
await writeFile(pkgUrl, JSON.stringify(pkg, null, 2) + "\n");
await writeFile(lockUrl, JSON.stringify(lock, null, 2) + "\n");
console.log(`${pkg.name}: ${displayVersion} (${version})`);
