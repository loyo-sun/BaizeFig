import { expect, it } from "vitest";
import {
  sliceTextFragment,
  insertTextFragment,
  validateTextFragment,
  type TextFragment,
} from "../src/textClipboard";
const source: TextFragment = {
  text: "白泽\nBaizeFig",
  runs: [
    { start: 0, end: 2, fontWeight: 700 },
    { start: 3, end: 11, href: "https://example.com", underline: true },
  ],
  paragraphs: [
    { start: 0, list: "number", level: 0 },
    { start: 3, list: "number", level: 0 },
  ],
};
it("copies only selected text, style offsets and semantic lists, then pastes without losing surrounding styles", () => {
  const fragment = sliceTextFragment(source, 3, 11);
  expect(fragment.text).toBe("BaizeFig");
  expect(fragment.runs[0]).toMatchObject({
    start: 0,
    end: 8,
    href: "https://example.com",
  });
  expect(fragment.paragraphs[0].start).toBe(0);
  const before: TextFragment = {
    text: "甲\n乙",
    runs: [{ start: 0, end: 1, fill: "#ff0000" }],
    paragraphs: [],
  };
  const result = insertTextFragment(before, fragment, 2, 3);
  expect(result.text).toBe("甲\nBaizeFig");
  expect(result.runs[0]).toMatchObject({ fill: "#ff0000" });
  expect(result.paragraphs).toEqual([{ start: 2, list: "number", level: 0 }]);
  validateTextFragment(result);
  expect(source.text).toBe("白泽\nBaizeFig");
});
it("rejects executable links and malformed paragraphs in rich clipboard data", () => {
  expect(() =>
    validateTextFragment({
      ...source,
      runs: [{ start: 0, end: 2, href: "javascript:alert(1)" }],
    }),
  ).toThrow();
  expect(() =>
    validateTextFragment({
      ...source,
      paragraphs: [{ start: 1, list: "number", level: 0 }],
    }),
  ).toThrow();
  expect(() =>
    validateTextFragment({ text: "x", runs: {}, paragraphs: [] }),
  ).toThrow();
});
