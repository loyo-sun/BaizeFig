// Chromium keeps an extra newline after the caret on an empty final line.
// Preserve intentional pasted blank lines; remove only that caret placeholder.
export function canonicalEditableText(
  text: string,
  caretOffset?: number,
): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  return normalized.endsWith("\n") && caretOffset === normalized.length - 1
    ? normalized.slice(0, -1)
    : normalized;
}

// Serialize editable DOM structurally: innerText inserts extra line breaks for
// empty styled blocks, while Range.toString omits block separators entirely.
export interface EditableNode {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: ArrayLike<EditableNode>;
}
export function editablePlainText(node: EditableNode): string {
  const children = Array.from(node.childNodes);
  let text = "";
  children.forEach((child, index) => {
    if (child.nodeType === 3) {
      text += (child.nodeValue ?? "").replace(/\r\n?/g, "\n");
      return;
    }
    if (child.nodeName === "BR") {
      if (index < children.length - 1) text += "\n";
      return;
    }
    if (["DIV", "P", "LI"].includes(child.nodeName) && index > 0) text += "\n";
    text += editablePlainText(child);
  });
  return text;
}
