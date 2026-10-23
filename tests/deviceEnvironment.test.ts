import { it, expect } from "vitest";
import {
  detectDeviceLanguage,
  detectShortcutPlatform,
} from "../src/deviceEnvironment";
it.each(["zh", "zh-CN", "zh-TW", "zh-HK", "zh-Hant", "ZH_cn"])(
  "uses Chinese for %s",
  (language) => expect(detectDeviceLanguage({ language })).toBe("zh-CN"),
);
it.each(["en-US", "fr-FR", "ja-JP", "", "unknown"])(
  "uses English for %s",
  (language) => expect(detectDeviceLanguage({ language })).toBe("en"),
);
it("uses the first preferred device language, not any installed language", () => {
  expect(
    detectDeviceLanguage({ languages: ["en-US", "zh-CN"], language: "zh-CN" }),
  ).toBe("en");
  expect(detectDeviceLanguage({ languages: ["zh-HK", "en-US"] })).toBe("zh-CN");
  expect(detectDeviceLanguage({})).toBe("en");
});
it.each(["MacIntel", "MacPPC", "Macintosh"])(
  "detects legacy Mac platform %s",
  (platform) => expect(detectShortcutPlatform({ platform })).toBe("mac"),
);
it.each([
  "Win32",
  "Windows",
  "Linux x86_64",
  "Android",
  "iPhone",
  "iPad",
  "unknown",
  "",
])("uses Ctrl for %s", (platform) =>
  expect(detectShortcutPlatform({ platform })).toBe("other"),
);
it("prioritizes modern platform detection, supports fallback and excludes iPad desktop mode", () => {
  expect(
    detectShortcutPlatform({
      userAgentData: { platform: "macOS" },
      platform: "unknown",
    }),
  ).toBe("mac");
  expect(
    detectShortcutPlatform({
      userAgentData: { platform: "Windows" },
      platform: "MacIntel",
    }),
  ).toBe("other");
  expect(
    detectShortcutPlatform({ platform: "MacIntel", maxTouchPoints: 5 }),
  ).toBe("other");
  expect(
    detectShortcutPlatform({ userAgent: "Mozilla Macintosh Mac OS X" }),
  ).toBe("mac");
  expect(
    detectShortcutPlatform({
      userAgent: "iPad Mac OS X",
      platform: "MacIntel",
    }),
  ).toBe("other");
  expect(detectShortcutPlatform({})).toBe("other");
});
