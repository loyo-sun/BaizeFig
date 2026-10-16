import { JSDOM } from "test-dom-jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import React, { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  PathDrawingOverlay,
  type PathDrawingHandle,
} from "../src/PathDrawingOverlay";
import { emptyDocument, History, validateDocument } from "../src/core";
import { drawnPath } from "../src/pathDrawing";
import { svgString } from "../src/Canvas";
import type { VectorNetwork } from "../src/vectorNetwork";
let host: HTMLDivElement,
  root: Root,
  finished: VectorNetwork[],
  ref: React.RefObject<PathDrawingHandle | null>;
let zoom = 1;
beforeEach(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  for (const key of [
    "window",
    "document",
    "SVGElement",
    "MouseEvent",
    "KeyboardEvent",
    "Event",
  ])
    vi.stubGlobal(key, (dom.window as any)[key]);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    "DOMPoint",
    class {
      constructor(
        public x: number,
        public y: number,
      ) {}
      matrixTransform() {
        return { x: this.x / zoom, y: this.y / zoom };
      }
    },
  );
  (SVGElement.prototype as any).getScreenCTM = () => ({ inverse: () => ({}) });
  (SVGElement.prototype as any).setPointerCapture = () => {};
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  finished = [];
  ref = createRef();
  zoom = 1;
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
function render(
  tool: "pen" | "pencil" = "pen",
  temporaryHand = false,
  snapPoint?: (p: any, d: boolean) => any,
) {
  act(() =>
    root.render(
      React.createElement(
        "svg",
        null,
        React.createElement(PathDrawingOverlay, {
          ref,
          tool,
          zoom,
          temporaryHand,
          snapPoint,
          onFinish: (n) => finished.push(n),
        }),
      ),
    ),
  );
}
function surface() {
  return host.querySelector("[data-path-drawing] > rect")!;
}
function event(
  target: Element,
  type: string,
  x: number,
  y: number,
  extra: Record<string, any> = {},
) {
  act(() => {
    const e = new MouseEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      button: 0,
      ...extra,
    });
    Object.defineProperty(e, "pointerId", { value: 1 });
    if (extra.samples)
      Object.defineProperty(e, "getCoalescedEvents", {
        value: () => extra.samples,
      });
    target.dispatchEvent(e);
  });
}
function click(x: number, y: number) {
  event(surface(), "pointerdown", x, y);
  event(surface(), "pointerup", x, y);
}
function finish() {
  act(() => ref.current!.finish());
  return finished.at(-1)!;
}
it("records release coordinates, ignores snapping on handles, and locks the opposite after Alt release", () => {
  render("pen", false, (p) => ({
    x: Math.round(p.x / 10) * 10,
    y: Math.round(p.y / 10) * 10,
  }));
  click(0, 0);
  event(surface(), "pointerdown", 100, 100);
  event(surface(), "pointermove", 140, 110);
  event(surface(), "pointermove", 160, 130, { altKey: true });
  event(surface(), "pointerup", 173, 151);
  click(250, 0);
  const n = finish();
  expect(n.segments[0].hb).toEqual({ x: -40, y: -10 });
  expect(n.segments[1].ha).toEqual({ x: 73, y: 51 });
});
it("keeps previously drawn anchors when a new gesture is cancelled or loses focus", () => {
  render();
  click(0, 0);
  click(100, 0);
  event(surface(), "pointerdown", 200, 30);
  event(surface(), "pointercancel", 220, 40);
  expect(host.querySelectorAll('[data-pen-control="anchor"]')).toHaveLength(2);
  event(surface(), "pointerdown", 200, 30);
  act(() => window.dispatchEvent(new Event("blur")));
  expect(finish().vertices).toEqual([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
});
it("restores a cancelled existing handle and ignores right-button control drags", () => {
  render();
  click(0, 0);
  event(surface(), "pointerdown", 100, 100);
  event(surface(), "pointerup", 140, 110);
  click(200, 0);
  const handle = host.querySelector('[aria-label="Pen handle 2 outgoing"]')!;
  event(handle, "pointerdown", 140, 110, { button: 2 });
  event(handle, "pointermove", 160, 150);
  event(handle, "pointerup", 160, 150, { button: 2 });
  expect(handle.getAttribute("cx")).toBe("140");
  event(handle, "pointerdown", 140, 110, { altKey: true });
  event(handle, "pointermove", 170, 150);
  event(handle, "pointercancel", 170, 150);
  const n = finish();
  expect(n.segments[1].ha).toEqual({ x: 40, y: 10 });
  expect(n.segments[0].hb).toEqual({ x: -40, y: -10 });
});
it("constrains Shift handles, pauses for temporary hand, and ignores typing in inputs", () => {
  render();
  click(0, 0);
  event(surface(), "pointerdown", 100, 100);
  event(surface(), "pointermove", 140, 120, { shiftKey: true });
  render("pen", true);
  event(surface(), "pointermove", 300, 300);
  render();
  event(surface(), "pointerup", 150, 120, { shiftKey: true });
  click(250, 0);
  const input = document.createElement("input");
  host.append(input);
  act(() =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  expect(finished).toHaveLength(0);
  const n = finish();
  expect(n.segments[1].ha.y).toBeCloseTo(0);
  expect(n.segments[1].ha.x).toBeCloseTo(Math.hypot(50, 20));
});
it.each([0.25, 2])(
  "preserves coalesced reverse pencil samples at zoom %s through undo/reload/export",
  async (z) => {
    zoom = z;
    render("pencil");
    event(surface(), "pointerdown", 150, 100);
    event(surface(), "pointermove", 90, 130, {
      samples: [
        { clientX: 130, clientY: 90 },
        { clientX: 110, clientY: 110 },
      ],
    });
    event(surface(), "pointerup", 70, 120);
    const n = finished[0];
    expect(n.vertices).toEqual([
      { x: 150 / z, y: 100 / z },
      { x: 130 / z, y: 90 / z },
      { x: 110 / z, y: 110 / z },
      { x: 90 / z, y: 130 / z },
      { x: 70 / z, y: 120 / z },
    ]);
    const d = emptyDocument(),
      next = { ...d, nodes: [drawnPath(d, d.pages[0].id, n, null)] },
      history = new History();
    history.push(d);
    expect(history.undo(next).nodes).toHaveLength(0);
    const restored = history.redo(d);
    validateDocument(JSON.parse(JSON.stringify(restored)));
    expect(restored.nodes[0].fidelity?.network).toEqual(
      next.nodes[0].fidelity?.network,
    );
    expect(await svgString(restored, d.pages[0].id)).toContain("<path");
  },
);
it("does not append a pencil jump when released during temporary hand mode", () => {
  render("pencil");
  event(surface(), "pointerdown", 0, 0);
  event(surface(), "pointermove", 50, 30);
  render("pencil", true);
  event(surface(), "pointermove", 300, 300);
  event(surface(), "pointerup", 350, 350);
  expect(finished[0].vertices).toEqual([
    { x: 0, y: 0 },
    { x: 50, y: 30 },
  ]);
});
it("closes a path once and supports deleting a pending anchor before continuing", () => {
  render();
  click(0, 0);
  click(100, 0);
  click(100, 100);
  act(() =>
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }),
    ),
  );
  click(80, 100);
  const first = host.querySelector('[aria-label="Pen anchor 1"]')!;
  event(first, "pointerdown", 0, 0);
  event(first, "pointerup", 0, 0);
  expect(finished).toHaveLength(1);
  expect(finished[0].vertices).toHaveLength(3);
  expect(finished[0].regions[0].loops[0]).toHaveLength(3);
});
