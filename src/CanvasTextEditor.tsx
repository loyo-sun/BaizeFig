import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { type Node, type Document, worldTransform } from "./core";
import { styleTextRange, safeTextLink, type TextStyle } from "./richText";
import { reflowText, remapTextRuns, type TextRun } from "./textLayout";
import { useI18n } from "./LanguageProvider";
import { canonicalEditableText } from "./textEditing";
export interface TextEditSession {
  id: string;
  documentId: string;
  caret?: { x: number; y: number };
  selectAll?: boolean;
}
export function CanvasTextEditor({
  doc,
  node,
  session,
  onCommit,
  onCancel,
}: {
  doc: Document;
  node: Node;
  session: TextEditSession;
  onCommit: (text: string, runs: TextRun[]) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n(),
    element = useRef<HTMLDivElement>(null),
    composing = useRef(false),
    activated = useRef(false),
    buffer = useRef(node.text),
    runs = useRef<TextRun[]>(
      structuredClone(node.textFlow?.runs ?? node.fidelity?.text?.spans ?? []),
    ),
    pendingBlur = useRef(false),
    finished = useRef(false),
    [draft, setDraft] = useState(node.text),
    [, refreshStyles] = useState(0);
  const read = () => {
    const el = element.current;
    if (!el) return buffer.current;
    const selection = window.getSelection();
    let caret: number | undefined;
    if (
      selection?.focusNode &&
      el.contains(selection.focusNode) &&
      selection.isCollapsed
    ) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.setEnd(selection.focusNode, selection.focusOffset);
      caret = range.toString().length;
    }
    const text = canonicalEditableText(el.innerText, caret);
    runs.current = remapTextRuns(buffer.current, text, runs.current);
    buffer.current = text;
    return text;
  };
  const finish = () => {
    if (finished.current) return;
    if (composing.current) {
      pendingBlur.current = true;
      return;
    }
    finished.current = true;
    read();
    onCommit(buffer.current, runs.current);
  };
  function renderText() {
    const el = element.current;
    if (!el) return;
    el.replaceChildren();
    const text = buffer.current,
      cuts = [
        ...new Set([
          0,
          text.length,
          ...runs.current.flatMap((r) => [r.start, r.end]),
        ]),
      ].sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const start = cuts[i],
        end = cuts[i + 1],
        style = runs.current.find((r) => r.start <= start && r.end >= end),
        span = document.createElement("span");
      span.textContent = text.slice(start, end);
      if (style)
        Object.assign(span.style, {
          fontFamily: style.fontFamily ?? "",
          fontSize: style.fontSize ? `${style.fontSize}px` : "",
          fontWeight: style.fontWeight ? String(style.fontWeight) : "",
          color: style.fill ?? "",
          fontStyle: style.italic ? "italic" : "normal",
          textDecoration: [
            style.underline ? "underline" : "",
            style.strikethrough ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" "),
        });
      el.append(span);
    }
  }
  function selectedRange() {
    const el = element.current,
      selection = window.getSelection();
    if (!el || !selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (
      !el.contains(range.startContainer) ||
      !el.contains(range.endContainer) ||
      range.collapsed
    )
      return null;
    // Measure rendered prefix fragments, including contenteditable paragraph breaks.
    const offset = (container: globalThis.Node, at: number) => {
      const prefix = document.createRange();
      prefix.selectNodeContents(el);
      prefix.setEnd(container, at);
      const host = document.createElement("div");
      host.style.cssText =
        "position:fixed;left:-100000px;white-space:pre-wrap;";
      host.append(prefix.cloneContents());
      let tail: HTMLElement = host;
      while (
        tail.lastChild instanceof HTMLElement &&
        tail.lastChild.tagName !== "BR"
      )
        tail = tail.lastChild;
      tail.append(document.createTextNode("\u2060"));
      document.body.append(host);
      const length = host.innerText.length - 1;
      host.remove();
      return Math.min(buffer.current.length, length);
    };
    return {
      start: offset(range.startContainer, range.startOffset),
      end: offset(range.endContainer, range.endOffset),
    };
  }
  function format(patch: TextStyle | ((style: TextStyle) => TextStyle)) {
    if (composing.current) return;
    read();
    const range = selectedRange();
    if (!range) return;
    const current =
      runs.current.find((r) => r.start <= range.start && r.end > range.start) ??
      {};
    runs.current = styleTextRange(
      buffer.current,
      runs.current,
      range.start,
      range.end,
      typeof patch === "function" ? patch(current) : patch,
    );
    renderText();
    setDraft(buffer.current);
    refreshStyles((v) => v + 1);
    const el = element.current!,
      walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let at = 0,
      leaf: globalThis.Node | null,
      newRange = document.createRange();
    while ((leaf = walker.nextNode())) {
      const length = leaf.textContent?.length ?? 0;
      if (range.start >= at && range.start <= at + length)
        newRange.setStart(leaf, range.start - at);
      if (range.end >= at && range.end <= at + length)
        newRange.setEnd(leaf, range.end - at);
      at += length;
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(newRange);
    el.focus({ preventScroll: true });
  }
  useLayoutEffect(() => {
    const el = element.current;
    if (!el) return;
    renderText();
    const frame = requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      activated.current = true;
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      if (!session.selectAll) {
        const target = document as globalThis.Document & {
          caretPositionFromPoint?: (
            x: number,
            y: number,
          ) => { offsetNode: globalThis.Node; offset: number } | null;
          caretRangeFromPoint?: (x: number, y: number) => Range | null;
        };
        const caret = session.caret,
          position = caret && target.caretPositionFromPoint?.(caret.x, caret.y),
          pointRange = caret && target.caretRangeFromPoint?.(caret.x, caret.y);
        if (position && el.contains(position.offsetNode)) {
          range.setStart(position.offsetNode, position.offset);
          range.collapse(true);
        } else if (pointRange && el.contains(pointRange.startContainer)) {
          range.setStart(pointRange.startContainer, pointRange.startOffset);
          range.collapse(true);
        } else range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const preview = structuredClone(node);
  preview.text = draft;
  preview.textFlow = {
    ...(preview.textFlow ?? {
      autoResize: "height",
      verticalAlign: "top",
      letterSpacing: 0,
    }),
    runs: runs.current,
  };
  reflowText(preview);
  const style: CSSProperties = {
    fontFamily: node.fontFamily,
    fontSize: node.fontSize,
    fontWeight: node.fontWeight,
    lineHeight: node.lineHeight,
    textAlign: node.textAlign,
    letterSpacing:
      node.textFlow?.letterSpacing ?? node.fidelity?.text?.letterSpacing ?? 0,
    color: node.fill === "none" ? "#202a24" : node.fill,
    whiteSpace: node.textFlow?.autoResize === "both" ? "pre" : "pre-wrap",
    minHeight: node.fontSize * node.lineHeight,
    width: Math.max(1, preview.width),
    opacity: node.opacity,
  };
  return (
    <g
      transform={`matrix(${worldTransform(doc, node).join(" ")})`}
      className="canvas-text-edit-layer"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <foreignObject
        x={0}
        y={0}
        width={Math.max(16, preview.width)}
        height={Math.max(
          preview.height,
          node.height,
          node.fontSize * node.lineHeight,
        )}
        overflow="visible"
      >
        <div
          className="text-range-toolbar"
          role="toolbar"
          aria-label={t("Text selection styles")}
          onPointerDown={(e) => e.preventDefault()}
        >
          <button
            title={t("Bold")}
            aria-label={t("Bold")}
            onClick={() =>
              format((s) => ({
                fontWeight:
                  (s.fontWeight ?? node.fontWeight) >= 600 ? 400 : 700,
              }))
            }
          >
            <b>B</b>
          </button>
          <button
            title={t("Italic")}
            aria-label={t("Italic")}
            onClick={() => format((s) => ({ italic: !s.italic }))}
          >
            <i>I</i>
          </button>
          <button
            title={t("Underline")}
            aria-label={t("Underline")}
            onClick={() => format((s) => ({ underline: !s.underline }))}
          >
            <u>U</u>
          </button>
          <button
            title={t("Strikethrough")}
            aria-label={t("Strikethrough")}
            onClick={() => format((s) => ({ strikethrough: !s.strikethrough }))}
          >
            <s>S</s>
          </button>
          <button
            title={t("Text selection color")}
            aria-label={t("Text selection color")}
            onClick={() => {
              const color = window.prompt(t("Text selection color"), node.fill);
              if (color && /^#[\da-f]{6}$/i.test(color))
                format({ fill: color });
            }}
          >
            A
          </button>
          <button
            title={t("Create link")}
            aria-label={t("Create link")}
            onClick={() => {
              const value = window.prompt(
                t("Link URL (empty to remove)"),
                "https://",
              );
              if (value === null) return;
              try {
                const href = safeTextLink(value);
                format({ href: href ?? "" });
              } catch (error) {
                window.alert(t((error as Error).message));
              }
            }}
          >
            ↗
          </button>
        </div>
        <div
          ref={element}
          className="canvas-text-editor"
          role="textbox"
          aria-label={t("Edit text on canvas")}
          aria-multiline="true"
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          spellCheck={false}
          style={style}
          onInput={() => setDraft(read())}
          onBlur={() => {
            if (activated.current) finish();
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
            setDraft(read());
            if (pendingBlur.current) finish();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.isComposing || composing.current) return;
            if (e.key === "Escape") {
              e.preventDefault();
              finished.current = true;
              onCancel();
            } else if (
              (e.metaKey || e.ctrlKey) &&
              ["b", "i", "u"].includes(e.key.toLowerCase())
            ) {
              e.preventDefault();
              const key = e.key.toLowerCase();
              if (key === "b")
                format((s) => ({
                  fontWeight:
                    (s.fontWeight ?? node.fontWeight) >= 600 ? 400 : 700,
                }));
              else if (key === "i") format((s) => ({ italic: !s.italic }));
              else format((s) => ({ underline: !s.underline }));
            } else if (
              (e.metaKey || e.ctrlKey) &&
              (e.key === "Enter" || e.key.toLowerCase() === "s")
            ) {
              e.preventDefault();
              finish();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand(
              "insertText",
              false,
              e.clipboardData.getData("text/plain"),
            );
            setDraft(read());
          }}
        />
      </foreignObject>
    </g>
  );
}
