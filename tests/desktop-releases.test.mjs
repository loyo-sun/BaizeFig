import { test } from "node:test";
import assert from "node:assert/strict";
import { findMacUpdate, normalizeVersion } from "../desktop/releases.mjs";
const release = (version, options = {}) => ({
  tag_name: `v${version}`,
  draft: false,
  prerelease: version.includes("-"),
  assets: [
    {
      name: `BaizeFig-v${version}-mac-arm64.dmg`,
      browser_download_url: `https://github.com/loyo-sun/BaizeFig/releases/download/v${version}/BaizeFig-v${version}-mac-arm64.dmg`,
    },
  ],
  ...options,
});
test("unsigned Mac updates pick the newest usable Apple Silicon release", () => {
  const releases = [
    release("0.0.3-beta.0"),
    release("0.0.2-beta.0"),
    release("0.0.4-beta.0", { draft: true }),
    release("0.0.5-beta.0", { assets: [] }),
  ];
  assert.equal(findMacUpdate(releases, "0.0.1-bate.0").version, "0.0.3-beta.0");
  assert.equal(findMacUpdate(releases, "0.0.3-beta.0"), null);
  assert.equal(
    findMacUpdate([release("1.1.0-beta.0"), release("1.0.1")], "1.0.0").version,
    "1.0.1",
  );
  assert.equal(findMacUpdate([release("1.1.0-beta.0")], "1.0.0"), null);
});
test("update prompts never open a foreign or malformed download URL", () => {
  for (const url of [
    "https://evil.example/app.dmg",
    "https://github.com/another/project/releases/download/v1/file.dmg",
    "javascript:alert(1)",
    "bad-url",
  ]) {
    const newer = release("1.0.1");
    newer.assets[0].browser_download_url = url;
    assert.equal(findMacUpdate([newer], "1.0.0"), null);
  }
  assert.throws(() => findMacUpdate({}, "1.0.0"));
});
test("public b1 tags map to Electron SemVer and preserve public download filenames", () => {
  assert.equal(normalizeVersion("v0.0.1b1"), "0.0.1-beta.1");
  const next = release("0.0.1b2");
  const result = findMacUpdate([next], "0.0.1-beta.1");
  assert.equal(result.label, "v0.0.1b2");
  assert.equal(result.version, "0.0.1-beta.2");
  assert.match(result.url, /BaizeFig-v0\.0\.1b2-mac-arm64\.dmg$/);
  assert.equal(findMacUpdate([release("0.0.1b1")], "0.0.1-beta.1"), null);
});
