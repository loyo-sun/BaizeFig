import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { JSDOM } from "test-dom-jsdom";
import { LayerTree, type LayerTreeActions } from "../src/LayerTree";
import { FrameGrid } from "../src/FrameGrid";
import { LanguageContext } from "../src/LanguageContext";
import { emptyDocument, makeNode } from "../src/core";

it("reuses 2000-layer list and grid during navigation, with current action handlers", () => {
  const dom = new JSDOM('<div id="root"></div>');
  for (const key of ["window", "document", "MouseEvent", "Event"])
    vi.stubGlobal(key, (dom.window as any)[key]);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  const reads = vi.fn();
  doc.nodes = Array.from({ length: 2000 }, (_, i) => {
    const node = makeNode("rectangle", page, { id: `layer-${i}` });
    Object.defineProperty(node, "name", {
      get() {
        reads();
        return `Layer ${i}`;
      },
    });
    Object.defineProperty(node, "frameGrid", {
      get() {
        reads();
        return undefined;
      },
    });
    return node;
  });
  const select = vi.fn(),
    latestSelect = vi.fn();
  const actions = {
    current: {
      begin: vi.fn(),
      move: vi.fn(),
      end: vi.fn(),
      cancel: vi.fn(),
      select,
      rename: vi.fn(),
      run: vi.fn(),
    } satisfies LayerTreeActions,
  };
  const props = {
    doc,
    page,
    selected: [] as string[],
    collapsed: new Set<string>(),
    layerFilter: "",
    layerDrop: null,
    renamingId: null,
    setSelected: vi.fn(),
    setCollapsed: vi.fn(),
    actions,
  };
  const language = {
    language: "en" as const,
    setLanguage: vi.fn(),
    persistenceError: false,
    t: (s: string) => s,
  };
  const root = createRoot(document.getElementById("root")!);
  function render(x: number, filter = "") {
    act(() =>
      root.render(
        React.createElement(
          LanguageContext.Provider,
          { value: language },
          React.createElement(
            "div",
            { style: { transform: `translateX(${x}px)` } },
            React.createElement(LayerTree, { ...props, layerFilter: filter }),
            React.createElement(
              "svg",
              null,
              React.createElement(FrameGrid, { doc, page }),
            ),
          ),
        ),
      ),
    );
  }
  try {
    render(0);
    expect(document.querySelectorAll("[data-layer-id]")).toHaveLength(2000);
    expect(reads).toHaveBeenCalled();
    reads.mockClear();
    actions.current.select = latestSelect;
    render(100);
    expect(reads).not.toHaveBeenCalled();
    act(() =>
      document
        .querySelector('[data-layer-id="layer-1999"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(latestSelect).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
    render(100, "Layer 1999");
    expect(document.querySelectorAll("[data-layer-id]")).toHaveLength(1);
    props.doc = {
      ...doc,
      nodes: doc.nodes.map((node, i) =>
        i === 1999 ? { ...node, parentId: "layer-0" } : node,
      ),
    };
    props.collapsed = new Set(["layer-0"]);
    render(100, "Layer 1999");
    expect(document.querySelectorAll("[data-layer-id]")).toHaveLength(1);
    expect(document.querySelector('[data-layer-id="layer-0"]')).not.toBeNull();
    props.collapsed = new Set();
    props.selected = ["layer-0"];
    render(100, "Layer 1999");
    expect(document.querySelectorAll("[data-layer-id]")).toHaveLength(2);
    expect(
      document
        .querySelector('[data-layer-id="layer-1999"]')!
        .classList.contains("in-selection"),
    ).toBe(true);
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
    dom.window.close();
  }
});
