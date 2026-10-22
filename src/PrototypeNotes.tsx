import { useLayoutEffect, useRef } from "react";
import "./prototypeNotes.css";

// Retain formatting only, including when a document comes from another source.
export function cleanNotes(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowed = new Set([
    "P",
    "DIV",
    "BR",
    "H1",
    "H2",
    "H3",
    "B",
    "STRONG",
    "UL",
    "OL",
    "LI",
  ]);
  function clean(parent: DocumentFragment | Element) {
    for (const child of Array.from(parent.children)) {
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(child.tagName)) {
        child.remove();
        continue;
      }
      clean(child);
      for (const attr of Array.from(child.attributes))
        child.removeAttribute(attr.name);
      if (!allowed.has(child.tagName)) child.replaceWith(...child.childNodes);
    }
  }
  clean(template.content);
  return template.innerHTML;
}

export function PrototypeNotes({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    if (cleanNotes(el.innerHTML) !== cleanNotes(value))
      el.innerHTML = cleanNotes(value);
  }, [value]);
  const save = () => onChange(cleanNotes(ref.current!.innerHTML));
  const command = (name: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(name, false, arg);
    save();
  };
  return (
    <>
      <div
        ref={ref}
        className="prototype-notes"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        onInput={() => {
          const selection = window.getSelection();
          if (selection?.isCollapsed && selection.anchorNode?.nodeType === 3) {
            const node = selection.anchorNode;
            const text = node.textContent ?? "";
            const offset = selection.anchorOffset;
            const prefix = text.slice(0, offset).replace(/\u00a0/g, " ");
            const block = node.parentElement?.closest("p,div,h1,h2,h3,li");
            if (block && block.textContent === text) {
              const heading = /^(#{1,3}) $/.exec(prefix);
              const list = /^([-*+] |1\. )$/.test(prefix);
              if (heading || list) {
                const range = document.createRange();
                range.setStart(node, 0);
                range.setEnd(node, offset);
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand("delete");
                document.execCommand(
                  heading
                    ? "formatBlock"
                    : prefix === "1. "
                      ? "insertOrderedList"
                      : "insertUnorderedList",
                  false,
                  heading ? `h${heading[1].length}` : undefined,
                );
              } else {
                const bold = /\*\*([^*]+)\*\*$/.exec(prefix);
                if (bold) {
                  const range = document.createRange();
                  range.setStart(node, offset - bold[0].length);
                  range.setEnd(node, offset);
                  const strong = document.createElement("strong");
                  strong.textContent = bold[1];
                  range.deleteContents();
                  range.insertNode(strong);
                  range.setStartAfter(strong);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            }
          }
          save();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            command("bold");
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand(
            "insertText",
            false,
            e.clipboardData.getData("text/plain"),
          );
          save();
        }}
      />
    </>
  );
}
