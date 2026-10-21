import { it, expect } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
  History,
} from "../src/core";
import { setVariableMode, removeVariable } from "../src/variables";
import { editTypedVariable } from "../src/typedVariables";
import {
  refreshCompositeTokens,
  resolveCompositeToken,
  removeCompositeToken,
  setTokenTheme,
} from "../src/compositeTokens";
import { pasteNodes } from "../src/clipboard";
import { publishLibrary, useLibrary } from "../src/componentLibraries";
it("typography styles override rich font metrics while retaining links and non-token formatting", () => {
  const doc = sample();
  doc.nodes[0].textFlow = {
    autoResize: "fixed",
    verticalAlign: "bottom",
    letterSpacing: 0,
    fontSettings: {
      features: { tnum: 1 },
      variations: { wght: 900, wdth: 120 },
    },
    runs: [
      {
        start: 0,
        end: 4,
        fontFamily: "Georgia",
        fontSize: 48,
        fontWeight: 900,
        italic: true,
        href: "https://example.com/",
      },
    ],
  };
  const next = refreshCompositeTokens(doc);
  validateDocument(next);
  expect(next.nodes[0].fontSize).toBe(16);
  expect(next.nodes[0].textFlow?.runs?.[0]).toMatchObject({
    italic: true,
    href: "https://example.com/",
  });
  expect(next.nodes[0].textFlow?.runs?.[0].fontSize).toBeUndefined();
  expect(next.nodes[0].textFlow?.fontSettings).toMatchObject({
    features: { tnum: 1 },
    variations: { wdth: 120 },
  });
  expect(
    next.nodes[0].textFlow?.fontSettings?.variations?.wght,
  ).toBeUndefined();
  const edited = execute(next, {
    type: "update",
    ids: ["text"],
    patch: {
      textFlow: {
        ...next.nodes[0].textFlow!,
        runs: [{ start: 0, end: 4, fontWeight: 700 }],
      },
    },
  }).doc;
  expect(edited.nodes[0].compositeBindings?.typography).toBeUndefined();
  expect(edited.nodes[0].textFlow?.runs?.[0].fontWeight).toBe(700);
});
it("named themes update primitive color bindings in cached library definitions", () => {
  let doc = sample();
  doc.nodes[1].type = "component";
  doc.nodes[1].variableId = "ink";
  doc = refreshCompositeTokens(doc);
  const target = useLibrary(emptyDocument(), publishLibrary(doc));
  const changed = setTokenTheme(target, target.tokenThemes![0].id);
  validateDocument(changed);
  expect(
    changed.componentLibrary![0].nodes.find((n) => n.variableId)?.fill,
  ).toBe("#eeeeee");
});
it("removing cross-set references keeps a node's resolved override appearance", () => {
  const doc = sample();
  doc.variableCollections!.push({
    id: "other",
    name: "Other",
    activeMode: "a",
    modes: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
  });
  doc.variables![0].collectionId = "other";
  doc.variables![0].values = {
    a: { color: "#111111" },
    b: { color: "#eeeeee" },
  };
  doc.nodes[1].variableModes = { other: "b" };
  const before = refreshCompositeTokens(doc),
    after = removeVariable(before, "ink");
  validateDocument(after);
  expect(after.nodes[1].fidelity?.effects?.[0].color).toBe("#eeeeee");
  expect(after.nodes[1].compositeBindings?.shadow).toBeUndefined();
});
function sample() {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.variableCollections = [
    {
      id: "set",
      name: "Theme",
      modes: [
        { id: "light", name: "Light" },
        { id: "dark", name: "Dark" },
      ],
      activeMode: "light",
    },
  ];
  doc.variables = [
    {
      id: "ink",
      name: "Ink",
      value: "#111111",
      collectionId: "set",
      values: { light: { color: "#111111" }, dark: { color: "#eeeeee" } },
    },
  ];
  doc.typedVariables = [
    {
      id: "size",
      name: "Scale",
      type: "number",
      value: 16,
      collectionId: "set",
      values: { light: { value: 16 }, dark: { value: 24 } },
    },
  ];
  doc.compositeTokens = [
    {
      id: "shadow",
      name: "Elevation",
      type: "shadow",
      collectionId: "set",
      value: {
        shadows: [
          {
            type: "drop-shadow",
            color: { token: "ink" },
            x: 0,
            y: 4,
            radius: { token: "size" },
            spread: 0,
            visible: true,
          },
        ],
      },
    },
    {
      id: "body",
      name: "Body",
      type: "typography",
      collectionId: "set",
      value: {
        fontFamily: "Inter",
        fontSize: { token: "size" },
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: 0,
      },
    },
  ];
  doc.tokenThemes = [{ id: "night", name: "Night", modes: { set: "dark" } }];
  doc.nodes = [
    makeNode("text", page, {
      id: "text",
      text: "Test",
      compositeBindings: { typography: "body" },
    }),
    makeNode("rectangle", page, {
      id: "rect",
      compositeBindings: { shadow: "shadow" },
    }),
  ];
  return refreshCompositeTokens(doc);
}
it("resolves compound values, scalar references, modes, inherited overrides and themes", () => {
  const original = sample();
  validateDocument(original);
  expect(original.nodes[0].fontSize).toBe(16);
  expect(original.nodes[1].fidelity?.effects?.[0].color).toBe("#111111");
  const dark = setVariableMode(original, "set", "dark");
  expect(dark.nodes[0].fontSize).toBe(24);
  expect(dark.nodes[1].fidelity?.effects?.[0].radius).toBe(24);
  expect(dark.nodes[1].fidelity?.effects?.[0].color).toBe("#eeeeee");
  const overridden = execute(dark, {
    type: "update",
    ids: ["text"],
    patch: { variableModes: { set: "light" } },
  }).doc;
  expect(overridden.nodes[0].fontSize).toBe(16);
  expect(setTokenTheme(original, "night").nodes[0].fontSize).toBe(24);
  expect(original.variableCollections?.[0].activeMode).toBe("light");
});
it("updates references, persists valid version-1 files, and restores bindings with history", () => {
  const before = sample(),
    after = editTypedVariable(before, "size", 32);
  expect(after.nodes[0].fontSize).toBe(32);
  const loaded = JSON.parse(JSON.stringify(after));
  validateDocument(loaded);
  expect(loaded.compositeTokens).toEqual(after.compositeTokens);
  const history = new History();
  history.push(before, ["text"]);
  expect(history.undo(after, ["text"]).nodes[0].fontSize).toBe(16);
  expect(
    history.redo(before, ["text"]).nodes[0].compositeBindings?.typography,
  ).toBe("body");
});
it("manual styling releases only the edited compound binding and preserves other effects", () => {
  const before = sample();
  before.nodes[1].fidelity!.effects!.push({
    type: "blur",
    radius: 2,
    spread: 0,
    x: 0,
    y: 0,
    color: "#000000",
    visible: true,
  });
  const after = execute(before, {
    type: "update",
    ids: ["text"],
    patch: { fontSize: 20 },
  }).doc;
  expect(after.nodes[0].fontSize).toBe(20);
  expect(after.nodes[0].compositeBindings?.typography).toBeUndefined();
  const detached = removeCompositeToken(before, "shadow");
  validateDocument(detached);
  expect(detached.nodes[1].compositeBindings?.shadow).toBeUndefined();
  expect(detached.nodes[1].fidelity?.effects).toHaveLength(2);
});
it("rejects cycles and mismatched aliases even in an inactive mode", () => {
  const doc = sample();
  doc.compositeTokens!.push({
    id: "alias",
    name: "Alias",
    type: "shadow",
    collectionId: "set",
    value: doc.compositeTokens![0].value,
    values: { dark: { alias: "shadow" } },
  });
  doc.compositeTokens![0].values = { dark: { alias: "alias" } };
  expect(() => validateDocument(doc)).toThrow(/Cyclic/);
  doc.compositeTokens![0].values = { dark: { alias: "body" } };
  expect(() => resolveCompositeToken(doc, "shadow", { set: "dark" })).toThrow(
    /type mismatch/,
  );
});
it("cross-document paste keeps rendered values and releases unavailable token bindings", () => {
  const source = sample(),
    target = emptyDocument();
  const result = pasteNodes(
    target,
    target.pages[0].id,
    { documentId: source.id, nodes: source.nodes },
    [],
  );
  validateDocument(result.doc);
  expect(result.doc.nodes.find((n) => n.type === "text")?.fontSize).toBe(16);
  expect(
    result.doc.nodes.every(
      (n) => !Object.keys(n.compositeBindings ?? {}).length,
    ),
  ).toBe(true);
});
it("deleting a referenced color materializes compound values without dangling bindings", () => {
  const source = sample(),
    next = removeVariable(source, "ink");
  validateDocument(next);
  expect(next.variables).toHaveLength(0);
  expect((resolveCompositeToken(next, "shadow") as any).shadows[0].color).toBe(
    "#111111",
  );
});
it("freezes the values of inactive modes when a referenced color is removed", () => {
  const next = removeVariable(sample(), "ink");
  expect(
    (resolveCompositeToken(next, "shadow", { set: "dark" }) as any).shadows[0]
      .color,
  ).toBe("#eeeeee");
  expect(
    (resolveCompositeToken(next, "shadow", { set: "light" }) as any).shadows[0]
      .color,
  ).toBe("#111111");
});
it("namespaces compound bindings, scalar references and themes in published libraries", () => {
  const doc = sample();
  doc.nodes[1].type = "component";
  doc.nodes[1].name = "Card";
  doc.nodes[0].parentId = "rect";
  const pkg = publishLibrary(doc),
    target = useLibrary(emptyDocument(), pkg);
  validateDocument(target);
  expect(target.compositeTokens).toHaveLength(2);
  const shadow = target.compositeTokens!.find((t) => t.type === "shadow")!;
  expect(shadow.id).not.toBe("shadow");
  expect(
    (resolveCompositeToken(target, shadow.id) as any).shadows[0].color,
  ).toBe("#111111");
  expect(Object.keys(target.tokenThemes![0].modes)[0]).not.toBe("set");
});
it("rejects malformed themes and ambiguous token IDs", () => {
  const doc = sample();
  doc.tokenThemes = [doc.tokenThemes![0], doc.tokenThemes![0]];
  expect(() => validateDocument(doc)).toThrow(/theme/);
  doc.tokenThemes = [];
  doc.compositeTokens![0].id = "size";
  expect(() => validateDocument(doc)).toThrow(/token/);
});
