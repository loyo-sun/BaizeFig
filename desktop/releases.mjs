import semver from "semver";
export const releasesApi =
  "https://api.github.com/repos/loyo-sun/BaizeFig/releases?per_page=30";
export function normalizeVersion(value) {
  const standard = semver.valid(value);
  if (standard) return standard;
  const short = /^v?(\d+\.\d+\.\d+)([ab])(\d+)$/.exec(value ?? "");
  return short
    ? semver.valid(
        `${short[1]}-${short[2] === "a" ? "alpha" : "beta"}.${short[3]}`,
      )
    : null;
}
export function findMacUpdate(releases, currentVersion) {
  if (!Array.isArray(releases)) throw Error("GitHub 返回了无效的发行信息");
  const candidates = releases.flatMap((release) => {
    const version = normalizeVersion(release.tag_name);
    if (release.draft || !version || !semver.gt(version, currentVersion))
      return [];
    if (
      !semver.prerelease(currentVersion) &&
      (release.prerelease || semver.prerelease(version))
    )
      return [];
    const asset = release.assets?.find(
      (asset) => asset.name === `BaizeFig-${release.tag_name}-mac-arm64.dmg`,
    );
    if (!asset) return [];
    let url;
    try {
      url = new URL(asset.browser_download_url);
    } catch {
      return [];
    }
    if (
      url.origin !== "https://github.com" ||
      !url.pathname.startsWith("/loyo-sun/BaizeFig/releases/download/")
    )
      return [];
    return [{ version, label: release.tag_name, url: url.href }];
  });
  return (
    candidates.sort((a, b) => semver.rcompare(a.version, b.version))[0] ?? null
  );
}
