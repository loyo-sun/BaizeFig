import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { JSDOM } from "test-dom-jsdom";
import { VectorEditor } from "../src/VectorEditor";
import { LanguageContext } from "../src/LanguageContext";
import { emptyDocument, makeNode } from "../src/core";
it("blank click exits vector selection but a node marquee does not", () => {
  const dom = new JSDOM('<div id="root"></div>');
  for (const key of ["window", "document", "SVGElement", "MouseEvent", "Event"])
    vi.stubGlobal(key, (dom.window as any)[key]);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "DOMPoint",
    class {
      constructor(
        public x: number,
        public y: number,
      ) {}
      matrixTransform() {
        return { x: this.x, y: this.y };
      }
    },
  );
  (SVGElement.prototype as any).getScreenCTM = () => ({ inverse: () => ({}) });
  (SVGElement.prototype as any).setPointerCapture = () => {};
  const doc = emptyDocument(),
    node = makeNode("rectangle", doc.pages[0].id),
    empty = vi.fn();
  doc.nodes = [node];
  const root = createRoot(document.getElementById("root")!);
  try {
    act(() =>
      root.render(
        React.createElement(
          LanguageContext.Provider,
          {
            value: {
              language: "en",
              setLanguage: () => {},
              persistenceError: false,
              t: (s) => s,
            },
          },
          React.createElement(
            "svg",
            null,
            React.createElement(VectorEditor, {
              doc,
              node,
              zoom: 1,
              view: { x: 0, y: 0 },
              panelTarget: null,
              onCommit: () => {},
              onClose: () => {},
              onEmptyClick: empty,
              onUndo: () => {},
              onRedo: () => {},
              onPan: () => {},
              onSplit: () => {},
              panTool: false,
              onTemporaryHandChange: () => {},
              onPanningChange: () => {},
            }),
          ),
        ),
      ),
    );
    const background = document.querySelector('rect[width="200000"]')!;
    const event = (type: string, x: number, y: number) =>
      act(() => {
        const e = new MouseEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          button: 0,
        });
        Object.defineProperty(e, "pointerId", { value: 1 });
        background.dispatchEvent(e);
      });
    event("pointerdown", 400, 400);
    event("pointerup", 400, 400);
    expect(empty).toHaveBeenCalledTimes(1);
    event("pointerdown", 400, 400);
    event("pointermove", 430, 440);
    event("pointerup", 430, 440);
    expect(empty).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
    dom.window.close();
  }
});
