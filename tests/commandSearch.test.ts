import { describe, it, expect } from "vitest";
import { matchesCommand } from "../src/commandSearch";
describe("command search", () => {
  it.each(["保存", "save", "SAVE", "baocun", "bao cun", "bǎocún", "bc"])(
    "matches Save with %s",
    (query) => {
      expect(matchesCommand("Save", query)).toBe(true);
    },
  );
  it.each([
    "偏好设置",
    "preferences",
    "pianhaoshezhi",
    "phsz",
    "pian hao she zhi",
    "PIANHAO",
  ])("matches preferences with %s in an English interface", (query) => {
    expect(matchesCommand("Preferences", query, "Preferences")).toBe(true);
  });
  it("keeps both language labels searchable in a Chinese interface", () => {
    expect(matchesCommand("Preferences", "preferences", "偏好设置")).toBe(true);
  });
  it.each(["chongzuo", "cz"])(
    "handles the pronunciation of 重做 with %s",
    (query) => {
      expect(matchesCommand("Redo", query)).toBe(true);
    },
  );
  it("accepts blank input and rejects unrelated commands", () => {
    expect(matchesCommand("Save", "  ")).toBe(true);
    expect(matchesCommand("Save", "pianhaoshezhi")).toBe(false);
  });
  it("handles punctuation, mixed text, and command labels without translations", () => {
    expect(matchesCommand("Import", "dao-ru")).toBe(true);
    expect(matchesCommand("Preferences", "偏好 shezhi")).toBe(true);
    expect(matchesCommand("Custom command", "custom")).toBe(true);
  });
});

it("handles rename as a word rather than isolated characters", () => {
  expect(matchesCommand("Rename layer", "chongmingmingtuceng")).toBe(true);
  expect(matchesCommand("Rename layer", "cmmtc")).toBe(true);
});
