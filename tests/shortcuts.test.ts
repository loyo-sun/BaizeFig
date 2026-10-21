import { expect, it } from "vitest";
import {
  shortcutRegistry,
  shortcutMatches,
  shortcutLabel,
  platformShortcut,
} from "../src/shortcuts";
import { menuPosition } from "../src/CommandMenu";
const event = (code: string, mods = "") => ({
  code,
  key: code.startsWith("Key") ? code.slice(3).toLowerCase() : code,
  ctrlKey: mods.includes("C"),
  metaKey: mods.includes("M"),
  altKey: mods.includes("A"),
  shiftKey: mods.includes("S"),
});
it("canonical bindings are unique and labels agree with executable shortcuts on Mac and Ctrl platforms", () => {
  expect(new Set(shortcutRegistry.map((s) => s.name)).size).toBe(
    shortcutRegistry.length,
  );
  for (const s of shortcutRegistry) {
    const literal = !!s.ctrl;
    for (const platform of ["mac", "other"] as const) {
      const resolved = platformShortcut(s, platform);
      const e = event(
        s.name === "Pick color" && platform === "other" ? "KeyI" : s.code,
        (s.mod ? (platform === "mac" ? "M" : "C") : "") +
          (literal && !(s.name === "Pick color" && platform === "other")
            ? "C"
            : "") +
          (s.alt ? "A" : "") +
          (resolved.shift ? "S" : ""),
      );
      expect(
        shortcutRegistry
          .filter((other) => shortcutMatches(e, other, "physical", platform))
          .map((x) => x.name),
      ).toEqual([s.name]);
      expect(shortcutLabel(s.name, platform)).not.toBe("");
    }
  }
});
it("uses screenshot order semantics, ungroup, and zoom keys", () => {
  for (const [code, mods, name] of [
    ["BracketRight", "", "Bring to front"],
    ["BracketRight", "M", "Bring forward"],
    ["BracketLeft", "C", "Send backward"],
    ["BracketLeft", "", "Send to back"],
    ["Backspace", "M", "Ungroup selection"],
    ["Digit0", "C", "Zoom to 100%"],
    ["Quote", "S", "Pixel grid"],
    ["KeyG", "S", "Layout guides"],
  ])
    expect(
      shortcutRegistry.find((s) =>
        shortcutMatches(
          event(code, mods),
          s,
          "physical",
          mods.includes("C") ? "other" : "mac",
        ),
      )?.name,
    ).toBe(name);
});
it("supports character layouts, distinguishes command and literal Ctrl, and rejects extra modifiers", () => {
  const pen = shortcutRegistry.find((s) => s.name === "Pen / polyline")!;
  expect(
    shortcutMatches({ ...event("KeyQ", "S"), key: "C" }, pen, "character"),
  ).toBe(true);
  expect(
    shortcutMatches({ ...event("KeyQ", "S"), key: "C" }, pen, "physical"),
  ).toBe(false);
  const pick = shortcutRegistry.find((s) => s.name === "Pick color")!;
  expect(shortcutMatches(event("KeyC", "M"), pick)).toBe(false);
  expect(shortcutMatches(event("KeyC", "C"), pick)).toBe(true);
  expect(shortcutMatches(event("KeyP", "A"), pen)).toBe(false);
});
it("keeps root and flipped submenu inside viewport boundaries", () => {
  expect(
    menuPosition({ left: 990, right: 1000, top: 690, bottom: 700 }, 280, 500, {
      width: 1024,
      height: 720,
    }),
  ).toEqual({ left: 736, top: 212 });
  expect(
    menuPosition(
      { left: 800, right: 1000, top: 600, bottom: 634 },
      280,
      200,
      { width: 1024, height: 720 },
      true,
    ),
  ).toEqual({ left: 522, top: 512 });
});

it("matches audited Boolean menu shortcuts without requiring Command or Control", () => {
  for (const [code, name] of [
    ["KeyU", "Union"],
    ["KeyS", "Subtract"],
    ["KeyI", "Intersect"],
    ["KeyE", "Exclude"],
  ]) {
    for (const platform of ["mac", "other"] as const) {
      expect(
        shortcutRegistry
          .filter((s) =>
            shortcutMatches(event(code, "AS"), s, "physical", platform),
          )
          .map((s) => s.name),
      ).toEqual([name]);
    }
  }
});

it("uses literal Ctrl+Alt+N for new files on every platform", () => {
  const shortcut = shortcutRegistry.find((s) => s.name === "New design file")!;
  for (const platform of ["mac", "other"] as const) {
    expect(
      shortcutMatches(event("KeyN", "CA"), shortcut, "physical", platform),
    ).toBe(true);
    expect(
      shortcutMatches(event("KeyN", "MA"), shortcut, "physical", platform),
    ).toBe(false);
    expect(
      shortcutMatches(event("KeyN", "C"), shortcut, "physical", platform),
    ).toBe(false);
    expect(
      shortcutMatches(event("KeyN", "CAS"), shortcut, "physical", platform),
    ).toBe(false);
    expect(shortcutLabel(shortcut.name, platform)).toContain("Ctrl");
  }
});
