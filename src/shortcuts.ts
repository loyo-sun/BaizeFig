export type KeyboardLayout = "physical" | "character";
export interface Shortcut {
  name: string;
  code: string;
  key?: string;
  mod?: boolean;
  alt?: boolean;
  shift?: boolean;
  aliases?: string[];
  native?: boolean;
}
const binding = (
  name: string,
  code: string,
  mods = "",
  key?: string,
): Shortcut => ({
  name,
  code,
  key,
  mod: mods.includes("M"),
  alt: mods.includes("A"),
  shift: mods.includes("S"),
});
export const shortcutRegistry: Shortcut[] = [
  ...[
    ["Move", "KeyV"],
    ["Scale", "KeyK"],
    ["Frame", "KeyF"],
    ["Rectangle", "KeyR"],
    ["Ellipse", "KeyO"],
    ["Line", "KeyL"],
    ["Pen / polyline", "KeyP"],
    ["Text", "KeyT"],
    ["Hand", "KeyH"],
  ].map(([n, c]) => ({
    ...binding(n, c),
    ...(n === "Frame" ? { aliases: ["KeyA"] } : {}),
  })),
  binding("Arrow", "KeyL", "S"),
  binding("Pencil", "KeyP", "S"),
  binding("Actions", "KeyK", "M"),
  binding("Undo", "KeyZ", "M"),
  binding("Redo", "KeyZ", "MS"),
  binding("Copy", "KeyC", "M"),
  binding("Cut", "KeyX", "M"),
  { ...binding("Paste", "KeyV", "M"), native: true },
  binding("Paste over selection", "KeyV", "MS"),
  binding("Paste to replace", "KeyR", "MS"),
  binding("Duplicate selection", "KeyD", "M"),
  binding("Delete", "Backspace"),
  binding("Group selection", "KeyG", "M"),
  binding("Ungroup selection", "Backspace", "M"),
  binding("Frame selection", "KeyG", "MA"),
  binding("Create component", "KeyK", "MA"),
  binding("Select all", "KeyA", "M"),
  binding("Select inverse", "KeyA", "MS"),
  binding("Copy properties", "KeyC", "MA"),
  binding("Paste properties", "KeyV", "MA"),
  binding("Pick color", "KeyC", "C"),
  binding("Save local copy", "KeyS", "M"),
  binding("Import file or image", "KeyO", "M"),
  binding("Place image", "KeyK", "MS"),
  binding("Export", "KeyE", "MS"),
  binding("Find and replace", "KeyF", "M"),
  binding("Bring to front", "BracketRight"),
  binding("Bring forward", "BracketRight", "M"),
  binding("Send backward", "BracketLeft", "M"),
  binding("Send to back", "BracketLeft"),
  binding("Flip horizontal", "KeyH", "S"),
  binding("Flip vertical", "KeyV", "S"),
  binding("Add auto layout", "KeyA", "S"),
  binding("Remove auto layout", "KeyA", "AS"),
  binding("Union", "KeyU", "AS"),
  binding("Subtract", "KeyS", "AS"),
  binding("Intersect", "KeyI", "AS"),
  binding("Exclude", "KeyE", "AS"),
  binding("Flatten", "KeyF", "AS"),
  binding("Outline stroke", "KeyO", "MA"),
  binding("Show/Hide selection", "KeyH", "MS"),
  binding("Lock/Unlock selection", "KeyL", "MS"),
  binding("Align left", "KeyA", "A"),
  binding("Align horizontal centers", "KeyH", "A"),
  binding("Align right", "KeyD", "A"),
  binding("Align top", "KeyW", "A"),
  binding("Align vertical centers", "KeyV", "A"),
  binding("Align bottom", "KeyS", "A"),
  binding("Tidy up", "KeyT", "AC"),
  binding("Distribute horizontal spacing", "KeyH", "AC"),
  binding("Distribute vertical spacing", "KeyV", "AC"),
  binding("Pixel grid", "Quote", "S"),
  binding("Layout guides", "KeyG", "S"),
  binding("Rulers", "KeyR", "S"),
  binding("Layer outlines", "KeyO", "S"),
  binding("Snap to pixel grid", "Quote", "MS"),
  binding("Zoom to 100%", "Digit0", "M"),
  binding("Zoom to fit", "Digit1", "S"),
  binding("Zoom to selection", "Digit2", "S"),
  binding("Zoom in", "Equal", "M"),
  binding("Zoom out", "Minus", "M"),
  binding("Show/Hide UI", "Backslash", "M"),
  binding("Present", "Space", "S"),
  binding("Keyboard shortcuts", "Slash", "S"),
  binding("Edit vector", "Enter"),
  binding("Bold", "KeyB", "M"),
  binding("Italic", "KeyI", "M"),
  binding("Underline", "KeyU", "M"),
  binding("Strikethrough", "KeyX", "MS"),
  binding("Create link", "KeyU", "MS"),
  binding("Bulleted list", "Digit8", "MS"),
  binding("Numbered list", "Digit7", "MS"),
];
export function platformShortcut(
  s: Shortcut,
  platform: "mac" | "other",
): Shortcut {
  if (
    platform === "other" &&
    [
      "Tidy up",
      "Distribute horizontal spacing",
      "Distribute vertical spacing",
    ].includes(s.name)
  )
    return { ...s, shift: true };
  return s;
}
// Ctrl for pick color / layout distribution is literal on every platform.
export function shortcutMatches(
  e: Pick<
    KeyboardEvent,
    "code" | "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
  >,
  s: Shortcut,
  layout: KeyboardLayout = "physical",
  platform: "mac" | "other" = "mac",
) {
  s = platformShortcut(s, platform);
  if (s.name === "Pick color" && platform === "other")
    return (
      (layout === "physical"
        ? e.code === "KeyI"
        : e.key.toLowerCase() === "i") &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    );
  const literalCtrl = [
    "Pick color",
    "Tidy up",
    "Distribute horizontal spacing",
    "Distribute vertical spacing",
  ].includes(s.name);
  const code =
    layout === "physical"
      ? [s.code, ...(s.aliases ?? [])].includes(e.code)
      : e.key.toLowerCase() ===
          (s.key ?? codeKey(s.code, s.shift)).toLowerCase() ||
        (layout === "character" &&
          (s.aliases ?? []).some(
            (alias) =>
              e.key.toLowerCase() === codeKey(alias, s.shift).toLowerCase(),
          ));
  return (
    code &&
    !!s.alt === e.altKey &&
    !!s.shift === e.shiftKey &&
    (literalCtrl
      ? e.ctrlKey && !e.metaKey
      : s.mod
        ? platform === "mac"
          ? e.metaKey && !e.ctrlKey
          : e.ctrlKey && !e.metaKey
        : !e.metaKey && !e.ctrlKey)
  );
}
function codeKey(code: string, shift = false) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit"))
    return shift
      ? ((
          {
            Digit1: "!",
            Digit2: "@",
            Digit7: "&",
            Digit8: "*",
            Digit0: ")",
          } as Record<string, string>
        )[code] ?? code.slice(5))
      : code.slice(5);
  return (
    (
      {
        BracketRight: "]",
        BracketLeft: "[",
        Quote: shift ? '"' : "'",
        Equal: shift ? "+" : "=",
        Minus: "-",
        Backslash: "\\",
        Slash: shift ? "?" : "/",
        Space: " ",
        Backspace: "Backspace",
        Enter: "Enter",
      } as Record<string, string>
    )[code] ?? code
  );
}
export function shortcutLabel(name: string, platform: "mac" | "other" = "mac") {
  const raw = shortcutRegistry.find((s) => s.name === name);
  const s = raw ? platformShortcut(raw, platform) : undefined;
  if (name === "Pick color" && platform === "other") return "I";
  if (!s) return "";
  const literal = [
    "Pick color",
    "Tidy up",
    "Distribute horizontal spacing",
    "Distribute vertical spacing",
  ].includes(name);
  return [
    s.mod ? (platform === "mac" ? "⌘" : "Ctrl") : "",
    literal ? "Ctrl" : "",
    s.alt ? (platform === "mac" ? "⌥" : "Alt") : "",
    s.shift ? "Shift" : "",
    s.code === "Space"
      ? "Space"
      : s.code === "Backspace"
        ? "⌫"
        : codeKey(s.code),
  ]
    .filter(Boolean)
    .join(" + ");
}
export function readKeyboardLayout(): KeyboardLayout {
  try {
    return localStorage.getItem("baizefig-keyboard-layout") === "character"
      ? "character"
      : "physical";
  } catch {
    return "physical";
  }
}
