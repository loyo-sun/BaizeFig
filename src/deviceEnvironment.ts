export type DeviceEnvironment = {
  language?: string;
  languages?: readonly string[];
  platform?: string;
  userAgent?: string;
  maxTouchPoints?: number;
  userAgentData?: { platform?: string };
};
function deviceNavigator(): DeviceEnvironment {
  try {
    return globalThis.navigator || {};
  } catch {
    return {};
  }
}
export function detectDeviceLanguage(
  device: DeviceEnvironment = deviceNavigator(),
): "zh-CN" | "en" {
  const primary =
    device.languages?.find((value) => value.trim()) || device.language || "";
  return /^zh(?:[-_]|$)/i.test(primary.trim()) ? "zh-CN" : "en";
}
export function detectShortcutPlatform(
  device: DeviceEnvironment = deviceNavigator(),
): "mac" | "other" {
  if (
    /iPad|iPhone|iPod/i.test(
      (device.platform || "") + " " + (device.userAgent || ""),
    )
  )
    return "other";
  if (device.userAgentData?.platform)
    return /^mac(?:os)?$/i.test(device.userAgentData.platform.trim())
      ? "mac"
      : "other";
  if (/Mac/i.test(device.platform || ""))
    return (device.maxTouchPoints || 0) > 1 ? "other" : "mac";
  if (/Win|Linux|Android|CrOS/i.test(device.platform || "")) return "other";
  return /Macintosh|Mac OS X/i.test(device.userAgent || "") ? "mac" : "other";
}
