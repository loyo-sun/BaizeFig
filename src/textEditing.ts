// Chromium keeps an extra newline after the caret on an empty final line.
// Preserve intentional pasted blank lines; remove only that caret placeholder.
export function canonicalEditableText(
  text: string,
  caretOffset?: number,
): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  return normalized.endsWith("\n\n") && caretOffset === normalized.length - 1
    ? normalized.slice(0, -1)
    : normalized;
}
