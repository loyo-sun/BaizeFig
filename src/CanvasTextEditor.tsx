import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { type Node, type Document, worldTransform } from "./core";
import { reflowText, remapTextRuns } from "./textLayout";
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
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n(),
    element = useRef<HTMLDivElement>(null),
    composing = useRef(false),
    activated = useRef(false),
    buffer = useRef(node.text),
    pendingBlur = useRef(false),
    finished = useRef(false),
    [draft, setDraft] = useState(node.text);
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
    onCommit(buffer.current);
  };
  useLayoutEffect(() => {
    const el = element.current;
    if (!el) return;
    el.replaceChildren();
    // Populate text nodes rather than HTML so imported text can never create markup.
    const runs = node.textFlow?.runs ?? node.fidelity?.text?.spans ?? [],
      cuts = [
        ...new Set([
          0,
          node.text.length,
          ...runs.flatMap((r) => [r.start, r.end]),
        ]),
      ].sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const start = cuts[i],
        end = cuts[i + 1],
        style = runs.find((r) => r.start <= start && r.end >= end),
        span = document.createElement("span");
      span.textContent = node.text.slice(start, end);
      if (style) {
        Object.assign(span.style, {
          fontFamily: style.fontFamily ?? "",
          fontSize: style.fontSize ? `${style.fontSize}px` : "",
          fontWeight: style.fontWeight ? String(style.fontWeight) : "",
          color: style.fill ?? "",
          fontStyle: style.italic ? "italic" : "",
        });
      }
      el.append(span);
    }
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
  if (preview.textFlow?.runs)
    preview.textFlow.runs = remapTextRuns(
      node.text,
      draft,
      preview.textFlow.runs,
    );
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
