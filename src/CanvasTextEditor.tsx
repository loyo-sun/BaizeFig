import {
  validateTextFragment,
  sliceTextFragment,
  insertTextFragment,
} from "./textClipboard";
import { changeTextCase, type TextCase } from "./textCase";
import { TextDraftHistory, type TextDraft } from "./textDraft";
import {
  paragraphAt,
  paragraphStarts,
  remapParagraphs,
  setParagraphList,
  listMarkers,
  type TextParagraph,
} from "./textParagraphs";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { type Node, type Document, worldTransform } from "./core";
import { styleTextRange, safeTextLink, type TextStyle } from "./richText";
import { reflowText, remapTextRuns, type TextRun } from "./textLayout";
import { useI18n } from "./LanguageProvider";
import { editablePlainText, canonicalEditableText } from "./textEditing";
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
  onCommit: (
    text: string,
    runs: TextRun[],
    paragraphs: TextParagraph[],
  ) => void;
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
    paragraphs = useRef<TextParagraph[]>(
      structuredClone(node.textFlow?.paragraphs ?? []),
    ),
    history = useRef(new TextDraftHistory()),
    pendingInput = useRef<TextDraft | null>(null),
    typingStyle = useRef<TextStyle | null>(null),
    pendingBlur = useRef(false),
    finished = useRef(false),
    [draft, setDraft] = useState(node.text),
    [, refreshStyles] = useState(0);
  const read = () => {
    const el = element.current;
    if (!el) return buffer.current;
    const text = canonicalEditableText(
      editablePlainText(el),
      window.getSelection()?.isCollapsed ? selectedRange()?.end : undefined,
    );
    paragraphs.current = remapParagraphs(
      buffer.current,
      text,
      paragraphs.current,
    );
    runs.current = remapTextRuns(buffer.current, text, runs.current);
    if (typingStyle.current && buffer.current !== text) {
      let start = 0,
        oldEnd = buffer.current.length,
        end = text.length;
      while (
        start < oldEnd &&
        start < end &&
        buffer.current[start] === text[start]
      )
        start++;
      while (
        oldEnd > start &&
        end > start &&
        buffer.current[oldEnd - 1] === text[end - 1]
      ) {
        oldEnd--;
        end--;
      }
      runs.current = styleTextRange(
        text,
        runs.current,
        start,
        end,
        typingStyle.current,
      );
    }
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
    onCommit(buffer.current, runs.current, paragraphs.current);
  };
  function renderText() {
    const el = element.current;
    if (!el) return;
    el.replaceChildren();
    const text = buffer.current,
      markers = listMarkers(text, paragraphs.current);
    for (const start of paragraphStarts(text)) {
      const end =
          text.indexOf("\n", start) < 0
            ? text.length
            : text.indexOf("\n", start),
        row = document.createElement("div"),
        p = paragraphs.current.find((p) => p.start === start);
      row.className = "text-paragraph";
      row.dataset.marker = markers.get(start) ?? "";
      row.style.position = "relative";
      if (p)
        row.style.paddingInlineStart = `${(p.level + 1) * node.fontSize * 1.5}px`;
      row.style.minHeight = `${node.fontSize * node.lineHeight}px`;
      row.style.marginBottom = `${end < text.length ? (node.textFlow?.paragraphSpacing ?? 0) : 0}px`;
      const cuts = [
        ...new Set([
          start,
          end,
          ...runs.current
            .flatMap((r) => [r.start, r.end])
            .filter((i) => i > start && i < end),
        ]),
      ].sort((a, b) => a - b);
      if (cuts.length === 1) cuts.push(end);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i],
          b = cuts[i + 1],
          style = runs.current.find((r) => r.start <= a && r.end >= b),
          span = document.createElement("span");
        span.dataset.textStart = String(a);
        span.append(document.createTextNode(text.slice(a, b)));
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
        row.append(span);
      }
      if (start === end) row.append(document.createElement("br"));
      el.append(row);
    }
  }

  function selectedRange() {
    const el = element.current,
      selection = window.getSelection();
    if (!el || !selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer))
      return null;
    // Measure rendered prefix fragments, including contenteditable paragraph breaks.
    const offset = (container: globalThis.Node, at: number) => {
      const prefix = document.createRange();
      prefix.selectNodeContents(el);
      prefix.setEnd(container, at);
      return editablePlainText(prefix.cloneContents()).length;
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
    if (range.start === range.end) {
      typingStyle.current = {
        ...(typingStyle.current ?? {}),
        ...(typeof patch === "function"
          ? patch({ ...current, ...typingStyle.current })
          : patch),
      };
      refreshStyles((v) => v + 1);
      return;
    }
    history.current.push(snapshot());
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
    restoreSelection(range.start, range.end);
  }
  function restoreSelection(start: number, end: number) {
    const el = element.current;
    if (!el) return;
    const range = document.createRange();
    let started = false,
      ended = false;
    for (const span of el.querySelectorAll<HTMLElement>("[data-text-start]")) {
      const at = Number(span.dataset.textStart),
        leaf = span.firstChild!;
      const length = leaf.textContent?.length ?? 0;
      if (start >= at && start <= at + length) {
        range.setStart(leaf, start - at);
        started = true;
      }
      if (end >= at && end <= at + length) {
        range.setEnd(leaf, end - at);
        ended = true;
      }
    }
    if (!started || !ended) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    el.focus({ preventScroll: true });
  }
  function snapshot(): TextDraft {
    const range = selectedRange() ?? {
      start: buffer.current.length,
      end: buffer.current.length,
    };
    return structuredClone({
      text: buffer.current,
      runs: runs.current,
      paragraphs: paragraphs.current,
      ...range,
    });
  }
  function applyDraft(value: TextDraft) {
    buffer.current = value.text;
    runs.current = structuredClone(value.runs);
    paragraphs.current = structuredClone(value.paragraphs);
    renderText();
    setDraft(value.text);
    refreshStyles((v) => v + 1);
    restoreSelection(value.start, value.end);
  }
  function list(kind: "bullet" | "number" | null) {
    if (composing.current) return;
    read();
    const range = selectedRange();
    if (!range) return;
    history.current.push(snapshot());
    paragraphs.current = setParagraphList(
      buffer.current,
      paragraphs.current,
      range.start,
      range.end,
      kind,
    );
    applyDraft(snapshot());
  }

  function caseSelection(mode: TextCase) {
    if (composing.current) return;
    read();
    const range = selectedRange();
    if (!range || range.start === range.end) return;
    history.current.push(snapshot());
    const result = changeTextCase(
      buffer.current,
      runs.current,
      range.start,
      range.end,
      mode,
      node.textFlow?.language,
    );
    const oldLength = buffer.current.length;
    paragraphs.current = paragraphs.current.map((p) => ({
      ...p,
      start: result.offsets.get(p.start) ?? p.start,
    }));
    buffer.current = result.text;
    runs.current = result.runs;
    applyDraft({
      ...snapshot(),
      start: range.start,
      end: range.end + result.text.length - oldLength,
    });
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
    paragraphs: paragraphs.current,
  };
  reflowText(preview);
  const style: CSSProperties = {
    fontFamily: node.fontFamily,
    fontSize: node.fontSize,
    fontWeight: node.fontWeight,
    lineHeight: node.lineHeight,
    textAlign: node.textAlign,
    direction:
      node.textFlow?.direction === "auto"
        ? undefined
        : node.textFlow?.direction,
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
            title={t("Bulleted list")}
            aria-label={t("Bulleted list")}
            onClick={() => list("bullet")}
          >
            • ≡
          </button>
          <button
            title={t("Numbered list")}
            aria-label={t("Numbered list")}
            onClick={() => list("number")}
          >
            1. ≡
          </button>
          <button
            title={t("Undo text edit")}
            aria-label={t("Undo text edit")}
            onClick={() => applyDraft(history.current.undo(snapshot()))}
          >
            ↶
          </button>
          <button
            title={t("Redo text edit")}
            aria-label={t("Redo text edit")}
            onClick={() => applyDraft(history.current.redo(snapshot()))}
          >
            ↷
          </button>
          <button
            aria-label={t("UPPERCASE")}
            title={t("UPPERCASE")}
            onClick={() => caseSelection("upper")}
          >
            AA
          </button>
          <button
            aria-label={t("lowercase")}
            title={t("lowercase")}
            onClick={() => caseSelection("lower")}
          >
            aa
          </button>
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
          spellCheck={node.textFlow?.spellCheck ?? false}
          lang={node.textFlow?.language}
          dir={node.textFlow?.direction ?? "auto"}
          style={style}
          onBeforeInput={(e) => {
            const input = e.nativeEvent as InputEvent;
            if (composing.current) return;
            if (
              input.inputType === "historyUndo" ||
              input.inputType === "historyRedo"
            ) {
              e.preventDefault();
              applyDraft(
                input.inputType === "historyUndo"
                  ? history.current.undo(snapshot())
                  : history.current.redo(snapshot()),
              );
            } else pendingInput.current = snapshot();
          }}
          onPointerDown={() => {
            typingStyle.current = null;
          }}
          onInput={() => {
            if (composing.current) {
              setDraft(read());
              return;
            }
            const before = pendingInput.current;
            setDraft(read());
            if (before && !composing.current && before.text !== buffer.current)
              history.current.push(before);
            pendingInput.current = null;
            const caret = selectedRange();
            renderText();
            if (caret) restoreSelection(caret.start, caret.end);
          }}
          onBlur={() => {
            if (activated.current) finish();
          }}
          onCompositionStart={() => {
            pendingInput.current = snapshot();
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
            setDraft(read());
            if (pendingInput.current)
              history.current.push(pendingInput.current);
            pendingInput.current = null;
            if (pendingBlur.current) finish();
            else {
              const caret = selectedRange();
              renderText();
              if (caret) restoreSelection(caret.start, caret.end);
            }
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
              ].includes(e.key)
            )
              typingStyle.current = null;
            if (e.nativeEvent.isComposing || composing.current) return;
            if (
              (e.metaKey || e.ctrlKey) &&
              ["z", "y"].includes(e.key.toLowerCase())
            ) {
              e.preventDefault();
              applyDraft(
                e.key.toLowerCase() === "y" || e.shiftKey
                  ? history.current.redo(snapshot())
                  : history.current.undo(snapshot()),
              );
              return;
            }
            if (e.key === "Enter" || e.key === "Tab" || e.key === "Backspace") {
              const range = selectedRange(),
                start = range ? paragraphAt(buffer.current, range.start) : -1,
                p = paragraphs.current.find((p) => p.start === start);
              if (p && range) {
                const end =
                  buffer.current.indexOf("\n", start) < 0
                    ? buffer.current.length
                    : buffer.current.indexOf("\n", start);
                if (
                  (e.key === "Enter" && end === start) ||
                  (e.key === "Backspace" &&
                    range.start === range.end &&
                    range.start === start)
                ) {
                  e.preventDefault();
                  list(null);
                  return;
                }
                if (e.key === "Tab") {
                  e.preventDefault();
                  history.current.push(snapshot());
                  const last = paragraphAt(
                    buffer.current,
                    range.end > range.start ? range.end - 1 : range.end,
                  );
                  paragraphs.current = paragraphs.current.map((p) =>
                    p.start >= start && p.start <= last
                      ? {
                          ...p,
                          level: Math.max(
                            0,
                            Math.min(8, p.level + (e.shiftKey ? -1 : 1)),
                          ),
                        }
                      : p,
                  );
                  applyDraft(snapshot());
                  return;
                }
              }
            }
            if (
              (e.metaKey || e.ctrlKey) &&
              e.shiftKey &&
              ["7", "8"].includes(e.key)
            ) {
              e.preventDefault();
              list(e.key === "7" ? "number" : "bullet");
              return;
            }
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
          onCopy={(e) => {
            const range = selectedRange();
            if (!range || range.start === range.end) return;
            e.preventDefault();
            const fragment = sliceTextFragment(
              {
                text: buffer.current,
                runs: runs.current,
                paragraphs: paragraphs.current,
              },
              range.start,
              range.end,
            );
            const text = fragment.text;
            e.clipboardData.setData("text/plain", text);
            e.clipboardData.setData(
              "application/x-baizefig-text",
              JSON.stringify(fragment),
            );
          }}
          onPaste={(e) => {
            e.preventDefault();
            const before = snapshot(),
              range = selectedRange() ?? {
                start: buffer.current.length,
                end: buffer.current.length,
              };
            history.current.push(before);
            let fragment:
              | { text: string; runs: TextRun[]; paragraphs: TextParagraph[] }
              | undefined;
            try {
              const data = JSON.parse(
                e.clipboardData.getData("application/x-baizefig-text"),
              );
              validateTextFragment(data);
              fragment = data;
            } catch {
              /* external paste is plain text */
            }
            if (fragment) {
              const result = insertTextFragment(
                {
                  text: buffer.current,
                  runs: runs.current,
                  paragraphs: paragraphs.current,
                },
                fragment,
                range.start,
                range.end,
              );
              buffer.current = result.text;
              runs.current = result.runs;
              paragraphs.current = result.paragraphs;
              applyDraft({
                ...snapshot(),
                start: range.start + fragment.text.length,
                end: range.start + fragment.text.length,
              });
              return;
            }
            pendingInput.current = null;
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
