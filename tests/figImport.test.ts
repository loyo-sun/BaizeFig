import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { zipSync, deflateSync, strToU8 } from "fflate";
import { parseSchema, encodeBinarySchema, compileSchema } from "kiwi-schema";
import { importFig, decodeFigMessage, readFigArchive } from "../src/figImport";
import { validateDocument, execute, ancestors } from "../src/core";
import { svgString } from "../src/Canvas";
import { setComponentValue } from "../src/components";
import { commandsPath } from "../src/fidelity";
import { editableNetwork } from "../src/vectorGeometry";
import { networkGeometry } from "../src/vectorNetwork";
import { transitionPrototype } from "../src/prototype";

const schema = parseSchema(`
struct GUID { uint sessionID; uint localID; }
struct Vector { float x; float y; }
struct Transform { float m00; float m01; float m02; float m10; float m11; float m12; }
message Parent { GUID guid = 1; string position = 2; }
message Font { string family = 1; string style = 2; }
message Text { string characters = 1; }
enum Type { DOCUMENT = 0; CANVAS = 1; FRAME = 2; TEXT = 3; ROUNDED_RECTANGLE = 4; SYMBOL = 5; INSTANCE = 6; BRUSH = 7; TEXT_PATH = 8; }
message GUIDPath { GUID[] guids = 1; }
message SymbolOverride { GUIDPath guidPath = 1; float fontSize = 2; }
message SymbolData { GUID symbolID = 1; SymbolOverride[] symbolOverrides = 2; }
message Event { string interactionType = 1; }
message Action { GUID transitionNodeID = 1; string connectionType = 2; string navigationType = 3; Vector extraScrollOffset = 4; string transitionType = 5; float transitionDuration = 6; }
message Interaction { Event event = 1; Action[] actions = 2; bool isDeleted = 3; }
message Node { GUID guid = 1; Parent parentIndex = 2; Type type = 3; string name = 4; bool visible = 5; Vector size = 6; Transform transform = 7; Text textData = 8; float fontSize = 9; Font fontName = 10; Interaction[] prototypeInteractions = 11; string scrollDirection = 12; SymbolData symbolData = 13; Geometry[] fillGeometry = 14; VectorData vectorData = 15; Paint[] fillPaints = 16; PropertyDef[] componentPropDefs = 17; PropertyRef[] componentPropRefs = 18; Assignment[] componentPropAssignments = 19; DerivedText derivedTextData = 20; TextPathStart textPathStart = 21; StyleRef styleIdForText = 22; string styleType = 23; string key = 24; LineHeight lineHeight = 25; string textDecoration = 26; }
message AssetRef { string key = 1; }
message StyleRef { GUID guid = 1; AssetRef assetRef = 2; }
message LineHeight { string units = 1; float value = 2; }
message Glyph { uint commandsBlob = 1; Vector position = 2; float fontSize = 3; uint firstCharacter = 4; float advance = 5; float rotation = 6; }
message DerivedText { Glyph[] glyphs = 1; }
message TextPathStart { float tValue = 1; bool forward = 2; }
message PropertyValue { Text textValue = 1; bool boolValue = 2; GUID guidValue = 3; }
message PropertyDef { GUID id = 1; string name = 2; string type = 3; PropertyValue initialValue = 4; GUID parentPropDefId = 5; }
message PropertyRef { GUID defID = 1; string componentPropNodeField = 2; }
message Assignment { GUID defID = 1; PropertyValue value = 2; }
message Blob { byte[] bytes = 1; }
message Color { float r = 1; float g = 2; float b = 3; float a = 4; }
message Paint { string type = 1; Color color = 2; float opacity = 3; bool visible = 4; }
message Geometry { uint commandsBlob = 1; string windingRule = 2; }
message VectorData { uint vectorNetworkBlob = 1; Vector normalizedSize = 2; }
message Message { Node[] nodeChanges = 1; Blob[] blobs = 2; }
`);
const g = (localID: number) => ({ sessionID: 0, localID });
const nodes = [
  { guid: g(0), type: "DOCUMENT" },
  {
    guid: g(1),
    parentIndex: { guid: g(0), position: "!" },
    type: "CANVAS",
    name: "中文页面",
    visible: true,
  },
  {
    guid: g(2),
    parentIndex: { guid: g(1), position: "!" },
    type: "FRAME",
    name: "Desktop",
    size: { x: 1440, y: 900 },
    transform: { m00: 1, m01: 0, m02: 200, m10: 0, m11: 1, m12: 300 },
  },
  {
    guid: g(3),
    parentIndex: { guid: g(2), position: "b" },
    type: "TEXT",
    name: "标题",
    size: { x: 200, y: 40 },
    textData: { characters: "Hello 白泽" },
    fontSize: 24,
    fontName: { family: "Inter", style: "Bold" },
  },
  {
    guid: g(4),
    parentIndex: { guid: g(2), position: "a" },
    type: "ROUNDED_RECTANGLE",
    name: "Background",
    size: { x: 200, y: 40 },
  },
];
function stream(message = { nodeChanges: nodes }) {
  const chunks = [
    deflateSync(encodeBinarySchema(schema)),
    deflateSync(compileSchema(schema).encodeMessage(message)),
  ];
  const result = new Uint8Array(
    12 + chunks.reduce((n, c) => n + 4 + c.length, 0),
  );
  result.set(strToU8("fig-kiwi"));
  new DataView(result.buffer).setUint32(8, 106, true);
  let offset = 12;
  for (const c of chunks) {
    new DataView(result.buffer).setUint32(offset, c.length, true);
    offset += 4;
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}
describe("Figma import", () => {
  it("applies inherited text, boolean and nested swap assignments while importing binary data", () => {
    const source: any[] = [
      nodes[0],
      nodes[1],
      {
        guid: g(10),
        parentIndex: { guid: g(0), position: "z" },
        type: "CANVAS",
        visible: false,
      },
      {
        guid: g(11),
        parentIndex: { guid: g(10), position: "a" },
        type: "SYMBOL",
        name: "Button",
        size: { x: 200, y: 100 },
        componentPropDefs: [
          {
            id: g(100),
            name: "Label",
            type: "TEXT",
            initialValue: { textValue: { characters: "Default" } },
          },
          {
            id: g(101),
            name: "Visible",
            type: "BOOL",
            initialValue: { boolValue: true },
          },
          {
            id: g(102),
            name: "Icon",
            type: "INSTANCE_SWAP",
            initialValue: { guidValue: g(50) },
          },
        ],
      },
      {
        guid: g(12),
        parentIndex: { guid: g(11), position: "a" },
        type: "TEXT",
        name: "Label",
        size: { x: 100, y: 30 },
        textData: { characters: "Default" },
        componentPropRefs: [
          { defID: g(100), componentPropNodeField: "TEXT_DATA" },
          { defID: g(101), componentPropNodeField: "VISIBLE" },
        ],
      },
      {
        guid: g(13),
        parentIndex: { guid: g(11), position: "b" },
        type: "INSTANCE",
        name: "Icon",
        size: { x: 20, y: 20 },
        symbolData: { symbolID: g(50) },
        componentPropRefs: [
          { defID: g(102), componentPropNodeField: "OVERRIDDEN_SYMBOL_ID" },
        ],
      },
      ...[50, 51].map((i) => ({
        guid: g(i),
        parentIndex: { guid: g(10), position: String(i) },
        type: "SYMBOL",
        name: "Icon " + i,
        size: { x: 20, y: 20 },
      })),
      {
        guid: g(14),
        parentIndex: { guid: g(13), position: "z" },
        type: "ROUNDED_RECTANGLE",
        name: "Stale icon child",
        size: { x: 8, y: 8 },
      },
      {
        guid: g(52),
        parentIndex: { guid: g(51), position: "a" },
        type: "ROUNDED_RECTANGLE",
        name: "New icon child",
        size: { x: 10, y: 10 },
      },
      {
        guid: g(90),
        parentIndex: { guid: g(1), position: "a" },
        type: "INSTANCE",
        name: "Imported",
        size: { x: 200, y: 100 },
        symbolData: { symbolID: g(11) },
        componentPropAssignments: [
          { defID: g(100), value: { textValue: { characters: "Custom" } } },
          { defID: g(101), value: { boolValue: false } },
          { defID: g(102), value: { guidValue: g(51) } },
        ],
      },
    ];
    let doc = importFig(stream({ nodeChanges: source })).document;
    const instance = doc.nodes.find((n) => n.name === "Imported")!;
    expect(doc.nodes.find((n) => n.name === "Label")).toMatchObject({
      text: "Custom",
      visible: false,
    });
    expect(doc.nodes.find((n) => n.name === "Icon")).toMatchObject({
      componentId: "0:51",
    });
    expect(doc.nodes.some((n) => n.name === "New icon child")).toBe(true);
    expect(doc.nodes.some((n) => n.name === "Stale icon child")).toBe(false);
    doc = setComponentValue(doc, instance.id, "figprop:0:101", true);
    expect(doc.nodes.find((n) => n.name === "Label")).toMatchObject({
      text: "Custom",
      visible: true,
    });
    expect(doc.nodes.find((n) => n.name === "Icon")).toMatchObject({
      componentId: "0:51",
    });
    validateDocument(doc);
  });
  it("resolves linked typography, decorations and preserves styled edits", async () => {
    const result = importFig(
      stream({
        nodeChanges: [
          nodes[0],
          nodes[1],
          {
            guid: g(70),
            type: "TEXT",
            styleType: "TEXT",
            key: "heading-style",
            fontSize: 40,
            fontName: { family: "Inter", style: "Semi Bold Italic" },
            lineHeight: { units: "PIXELS", value: 46 },
            textDecoration: "UNDERLINE",
          },
          {
            guid: g(71),
            type: "TEXT",
            parentIndex: { guid: g(1), position: "a" },
            name: "Styled heading",
            size: { x: 420, y: 100 },
            fontSize: 12,
            fontName: { family: "Inter", style: "Regular" },
            styleIdForText: { assetRef: { key: "heading-style" } },
            textData: { characters: "BaizeFig 白泽" },
          },
        ],
      } as any),
    );
    const doc = result.document,
      node = doc.nodes[0];
    expect(node.fontSize).toBe(40);
    expect(node.fontWeight).toBe(600);
    expect(node.lineHeight).toBeCloseTo(1.15);
    expect(node.textFlow?.runs?.[0]).toMatchObject({
      italic: true,
      underline: true,
    });
    const svg = await svgString(doc, doc.pages[0].id, [node.id]);
    expect(svg).toContain('font-size="40"');
    expect(svg).toContain('font-style="italic"');
    expect(svg).toContain('text-decoration="underline"');
    const changed = execute(doc, {
      type: "update",
      ids: [node.id],
      patch: { text: "BaizeFig 文字样式" },
    }).doc;
    expect(changed.nodes[0].fontSize).toBe(40);
    validateDocument(JSON.parse(JSON.stringify(changed)));
    if (process.env.BAIZEFIG_STYLED_TEXT_FIXTURE)
      writeFileSync(
        "/private/tmp/baizefig-styled-text.baizefig",
        JSON.stringify(doc),
      );
  });
  it("keeps explicit symbol typography overrides over an inherited text style", () => {
    const result = importFig(
      stream({
        nodeChanges: [
          nodes[0],
          nodes[1],
          {
            guid: g(10),
            type: "CANVAS",
            visible: false,
            parentIndex: { guid: g(0), position: "z" },
          },
          {
            guid: g(70),
            type: "TEXT",
            styleType: "TEXT",
            key: "type-style",
            fontSize: 40,
            fontName: { family: "Inter", style: "Semi Bold" },
          },
          {
            guid: g(72),
            type: "SYMBOL",
            parentIndex: { guid: g(10), position: "a" },
            size: { x: 300, y: 100 },
          },
          {
            guid: g(73),
            type: "TEXT",
            parentIndex: { guid: g(72), position: "a" },
            name: "Label",
            size: { x: 300, y: 60 },
            fontSize: 12,
            styleIdForText: { assetRef: { key: "type-style" } },
            textData: { characters: "Default" },
          },
          {
            guid: g(74),
            type: "INSTANCE",
            parentIndex: { guid: g(1), position: "a" },
            name: "Override",
            size: { x: 300, y: 100 },
            symbolData: {
              symbolID: g(72),
              symbolOverrides: [{ guidPath: { guids: [g(73)] }, fontSize: 24 }],
            },
          },
        ],
      } as any),
    ).document;
    expect(result.nodes.find((n) => n.name === "Label")!.fontSize).toBe(24);
    expect(
      result
        .componentLibrary!.find((c) => c.sourceId === "0:72")!
        .nodes.find((n) => n.name === "Label")!.fontSize,
    ).toBe(40);
  });
  it("imports a curved text baseline and saved glyphs from binary data", async () => {
    const bytes = new Uint8Array(12 + 2 * 12 + 28),
      v = new DataView(bytes.buffer);
    let at = 0;
    const u = (x: number) => {
        v.setUint32(at, x, true);
        at += 4;
      },
      f = (x: number) => {
        v.setFloat32(at, x, true);
        at += 4;
      };
    u(2);
    u(1);
    u(0);
    u(0);
    f(10);
    f(100);
    u(0);
    f(250);
    f(100);
    u(0);
    u(0);
    f(60);
    f(-100);
    u(1);
    f(-60);
    f(-100);
    const glyph = new Uint8Array(1 + 8 + 1 + 8 + 1 + 8 + 1 + 8 + 1),
      b = new DataView(glyph.buffer);
    let offset = 0;
    for (const [op, x, y] of [
      [1, 0, 0],
      [2, 0, 1],
      [2, 0.8, 1],
      [2, 0.8, 0],
    ] as const) {
      glyph[offset++] = op;
      b.setFloat32(offset, x, true);
      offset += 4;
      b.setFloat32(offset, y, true);
      offset += 4;
    }
    glyph[offset] = 0;
    const result = importFig(
      stream({
        nodeChanges: [
          nodes[0],
          nodes[1],
          {
            guid: g(30),
            parentIndex: { guid: g(1), position: "a" },
            type: "TEXT_PATH",
            name: "Curved text",
            size: { x: 260, y: 120 },
            textData: { characters: "白泽" },
            fontSize: 24,
            vectorData: {
              vectorNetworkBlob: 0,
              normalizedSize: { x: 260, y: 120 },
            },
            textPathStart: { forward: true, tValue: 0.5 },
            derivedTextData: {
              glyphs: [
                {
                  commandsBlob: 1,
                  position: { x: 100, y: 30 },
                  fontSize: 24,
                  firstCharacter: 0,
                  advance: 1,
                  rotation: 0,
                },
                {
                  commandsBlob: 1,
                  position: { x: 126, y: 30 },
                  fontSize: 24,
                  firstCharacter: 1,
                  advance: 1,
                  rotation: 0,
                },
              ],
            },
          },
        ],
        blobs: [{ bytes: [...bytes] }, { bytes: [...glyph] }],
      } as any),
    );
    const doc = result.document,
      node = doc.nodes[0];
    expect(node.type).toBe("text");
    expect(node.fidelity?.text?.glyphs).toHaveLength(2);
    expect(node.fidelity?.textPath?.network.segments).toHaveLength(1);
    expect(node.textFlow?.autoResize).toBe("fixed");
    expect(await svgString(doc, doc.pages[0].id, [node.id])).toContain(
      "scale(24 -24)",
    );
    const changed = execute(doc, {
      type: "update",
      ids: [node.id],
      patch: { text: "BaizeFig" },
    }).doc;
    expect(await svgString(changed, changed.pages[0].id, [node.id])).toContain(
      "<textPath",
    );
  });
  it("imports saved brush outlines rather than replacing them with the brush centerline", async () => {
    const ops: number[] = [];
    const command = (op: number, ...values: number[]) => {
      ops.push(op);
      for (const value of values) {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setFloat32(0, value, true);
        ops.push(...bytes);
      }
    };
    command(1, 0, 0);
    command(4, 35, -8, 65, 22, 100, 0);
    command(2, 100, 20);
    command(4, 65, 42, 35, 12, 0, 20);
    command(0);
    command(1, 35, 10);
    command(2, 65, 10);
    command(2, 50, 16);
    command(0);
    const result = importFig(
      stream({
        nodeChanges: [
          nodes[0],
          nodes[1],
          {
            guid: g(20),
            parentIndex: { guid: g(1), position: "a" },
            type: "BRUSH",
            name: "Brush outline",
            size: { x: 100, y: 30 },
            fillPaints: [
              {
                type: "SOLID",
                color: { r: 0.15, g: 0.3, b: 0.2, a: 1 },
                opacity: 1,
                visible: true,
              },
            ],
            fillGeometry: [{ commandsBlob: 0, windingRule: "ODD" }],
            vectorData: {
              vectorNetworkBlob: 1,
              normalizedSize: { x: 100, y: 30 },
            },
          },
        ] as typeof nodes,
        blobs: [{ bytes: ops }, { bytes: [0, 0, 0, 0] }],
      } as any),
    );
    const doc = result.document,
      brush = doc.nodes[0];
    expect(brush.type).toBe("path");
    expect(brush.fill).toBe("#264d33ff");
    expect(brush.fidelity?.network).toBeUndefined();
    expect(brush.fidelity?.paths?.[0]).toMatchObject({ rule: "evenodd" });
    expect(brush.fidelity?.paths?.[0].d).toContain("C35 -8 65 22 100 0");
    const original = brush.fidelity!.paths![0].d;
    const network = editableNetwork(brush);
    expect(network.regions[0].loops).toHaveLength(2);
    network.vertices[0].x += 5;
    expect(networkGeometry(network)[0].d).not.toBe(original);
    const renamed = execute(doc, {
      type: "update",
      ids: [brush.id],
      patch: { name: "Edited brush" },
    }).doc;
    expect(renamed.nodes[0].fidelity!.paths![0].d).toBe(original);
    validateDocument(JSON.parse(JSON.stringify(renamed)));
    const svg = await svgString(renamed, renamed.pages[0].id, [brush.id]);
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain(original);
    expect(result.report.warnings).toContain(
      "Brush strokes use editable outline paths; brush dynamics are not retained.",
    );
    if (process.env.BAIZEFIG_BRUSH_FIXTURE)
      writeFileSync(
        "/private/tmp/baizefig-brush.baizefig",
        JSON.stringify(doc),
      );
  });

  it("retains hidden component state definitions and inherits interactive state actions on instances", () => {
    const message = {
      nodeChanges: [
        ...nodes,
        {
          guid: g(10),
          parentIndex: { guid: g(0), position: "z" },
          type: "CANVAS",
          visible: false,
        },
        {
          guid: g(11),
          parentIndex: { guid: g(10), position: "a" },
          type: "SYMBOL",
          name: "Variant A",
          size: { x: 100, y: 50 },
          prototypeInteractions: [
            {
              event: { interactionType: "ON_HOVER" },
              actions: [
                {
                  transitionNodeID: g(12),
                  connectionType: "INTERNAL_NODE",
                  navigationType: "SWAP_STATE",
                  transitionType: "INSTANT_TRANSITION",
                },
              ],
            },
          ],
        },
        {
          guid: g(12),
          parentIndex: { guid: g(10), position: "b" },
          type: "SYMBOL",
          name: "Variant B",
          size: { x: 100, y: 50 },
        },
        {
          guid: g(13),
          parentIndex: { guid: g(2), position: "z" },
          type: "INSTANCE",
          name: "Interactive",
          size: { x: 100, y: 50 },
          symbolData: { symbolID: g(11) },
        },
      ],
    };
    const r = importFig(stream(message)),
      d = r.document,
      instance = d.nodes.find((n) => n.name === "Interactive")!,
      alternate = d.componentLibrary!.find((c) => c.name === "Variant B")!;
    expect(instance.interactions![0]).toMatchObject({
      trigger: "hover",
      actions: [{ type: "changeTo", componentId: alternate.sourceId }],
    });
    expect(
      d.componentLibrary!.find((c) => c.name === "Variant A")!.nodes[0]
        .interactions,
    ).toEqual(instance.interactions);
    expect(r.report.warnings).not.toContain(
      "Some advanced prototype actions or transitions could not be restored.",
    );
    validateDocument(JSON.parse(JSON.stringify(d)));
  });
  it("imports scroll-to actions on non-frame layers, offsets, animation and container directions", () => {
    const message = {
      nodeChanges: nodes.map((n) =>
        n.guid.localID === 2
          ? { ...n, scrollDirection: "VERTICAL" }
          : n.guid.localID === 3
            ? {
                ...n,
                prototypeInteractions: [
                  {
                    event: { interactionType: "ON_CLICK" },
                    actions: [
                      {
                        transitionNodeID: g(4),
                        connectionType: "INTERNAL_NODE",
                        navigationType: "SCROLL_TO",
                        extraScrollOffset: { x: 12, y: -30 },
                        transitionType: "SCROLL_ANIMATE",
                        transitionDuration: 0.25,
                      },
                    ],
                  },
                ],
              }
            : n,
      ),
    };
    const r = importFig(stream(message)),
      d = r.document;
    expect(d.nodes[0].prototypeScroll).toBe("vertical");
    expect(
      d.nodes.find((n) => n.name === "标题")!.interactions![0].actions[0],
    ).toMatchObject({
      type: "scrollTo",
      targetId: d.nodes.find((n) => n.name === "Background")!.id,
      offset: { x: 12, y: -30 },
      transition: "animate",
      durationMs: 250,
    });
    expect(r.report.warnings).not.toContain(
      "Some advanced prototype actions or transitions could not be restored.",
    );
    validateDocument(d);
  });
  it("decodes raw Kiwi and ZIP with real editable structure, text, sibling order and positions", () => {
    const raw = stream();
    const result = importFig(
      zipSync({
        "canvas.fig": raw,
        "meta.json": strToU8(JSON.stringify({ file_name: "Fixture" })),
      }),
    );
    expect(result.document.name).toBe("Fixture");
    expect(result.document.pages[0].name).toBe("中文页面");
    expect(result.document.nodes.map((n) => n.name)).toEqual([
      "Desktop",
      "Background",
      "标题",
    ]);
    const [frame, , text] = result.document.nodes;
    expect(frame.x).toBe(200);
    expect(frame.y).toBe(300);
    expect(text.parentId).toBe(frame.id);
    expect(text.text).toBe("Hello 白泽");
    expect(text.fontWeight).toBe(700);
    expect(() =>
      validateDocument(JSON.parse(JSON.stringify(result.document))),
    ).not.toThrow();
    expect(importFig(raw, "Raw.fig").document.name).toBe("Raw");
  });
  it("restores same-page click navigation and reports hover triggers without inventing unsupported interactions", () => {
    const message = {
      nodeChanges: [
        ...nodes.map((n) =>
          n.guid.localID === 3
            ? {
                ...n,
                prototypeInteractions: [
                  {
                    event: { interactionType: "ON_CLICK" },
                    actions: [
                      {
                        transitionNodeID: g(5),
                        connectionType: "INTERNAL_NODE",
                        navigationType: "NAVIGATE",
                      },
                    ],
                  },
                ],
              }
            : n,
        ),
        {
          guid: g(5),
          parentIndex: { guid: g(1), position: "z" },
          type: "FRAME",
          name: "Destination",
          size: { x: 100, y: 100 },
        },
      ],
    };
    const result = importFig(stream(message));
    const text = result.document.nodes.find((n) => n.name === "标题")!,
      target = result.document.nodes.find((n) => n.name === "Destination")!;
    expect(text.targetId).toBe(target.id);
    const advanced = structuredClone(message);
    advanced.nodeChanges.find(
      (n) => n.guid.localID === 3,
    )!.prototypeInteractions![0].event.interactionType = "ON_HOVER";
    const skipped = importFig(stream(advanced));
    expect(
      skipped.document.nodes.find((n) => n.name === "标题")!.interactions?.[0]
        .trigger,
    ).toBe("hover");
    expect(
      skipped.document.nodes.find((n) => n.name === "标题")!.targetId,
    ).toBeUndefined();
    expect(
      skipped.report.warnings.some((w) => w.includes("advanced prototype")),
    ).toBe(false);
  });
  it("rejects malformed archives, truncation and a thumbnail-only file without claiming success", () => {
    for (const bytes of [
      new Uint8Array(),
      strToU8("not fig"),
      stream().slice(0, 40),
      zipSync({ "thumbnail.png": new Uint8Array([1, 2]) }),
    ])
      expect(() => importFig(bytes)).toThrow(
        "Invalid or unsupported Figma file",
      );
  });
  it("rejects cyclic layer trees and missing visible pages", () => {
    const cycle = structuredClone(nodes);
    cycle[2].parentIndex!.guid = g(2);
    expect(() => importFig(stream({ nodeChanges: cycle }))).toThrow(
      "Invalid or unsupported Figma file",
    );
    expect(() => importFig(stream({ nodeChanges: [] }))).toThrow(
      "No supported pages",
    );
  });
  it("does not execute schema names and rejects unbounded array lengths", () => {
    const encoded = compileSchema(schema).encodeMessage({ nodeChanges: nodes });
    const evil = structuredClone(schema);
    evil.definitions
      .find((d) => d.name === "Node")!
      .fields.find((f) => f.name === "name")!.name = "__proto__";
    const decoded = decodeFigMessage(evil, encoded);
    expect(Object.getPrototypeOf(decoded.nodeChanges[1])).toBeNull();
    const malformed = new Uint8Array([1, 255, 255, 255, 255, 15]);
    expect(() => decodeFigMessage(schema, malformed)).toThrow();
  });
});
const sample = process.env.FIG_SAMPLE_PATH;
it.skipIf(!sample)(
  "imports the supplied REALJET file locally without committing its contents",
  () => {
    const result = importFig(
      new Uint8Array(readFileSync(sample!)),
      "REALJET.fig",
    );
    expect(result.document.name).toBe("REALJET");
    expect(result.document.pages.map((p) => p.name)).toEqual([
      "REALJET · Precast Plant / Web + Mobile",
    ]);
    const archive = readFigArchive(new Uint8Array(readFileSync(sample!)));
    const raw = archive.message.nodeChanges as Record<string, any>[];
    const rawGuid = (g: any) => (g ? `${g.sessionID}:${g.localID}` : "");
    const visiblePages = new Set(
      raw
        .filter((n) => n.type === "CANVAS" && n.visible !== false)
        .map((n) => rawGuid(n.guid)),
    );
    const expectedRoots = raw.filter(
      (n) =>
        visiblePages.has(rawGuid(n.parentIndex?.guid)) &&
        n.size &&
        !n.styleType,
    );
    const importedRoots = result.document.nodes.filter((n) => !n.parentId);
    expect(importedRoots.map((n) => n.fidelity?.sourceId).sort()).toEqual(
      expectedRoots.map((n) => rawGuid(n.guid)).sort(),
    );
    const curved = raw.filter((n) => n.type === "TEXT_PATH");
    const curvedDoc = importFig(
      stream({
        nodeChanges: [
          nodes[0],
          nodes[1],
          ...curved.map((n) => ({
            ...n,
            parentIndex: { guid: g(1), position: "a" },
          })),
        ],
        blobs: archive.message.blobs,
      } as any),
    ).document;
    expect(curvedDoc.nodes).toHaveLength(curved.length);
    for (const original of curved) {
      const converted = curvedDoc.nodes.find(
        (n) => n.fidelity?.sourceId === rawGuid(original.guid),
      )!;
      expect(converted.fidelity?.textPath).toBeDefined();
      expect(converted.fidelity?.text?.glyphs?.length ?? 0).toBe(
        original.derivedTextData?.glyphs?.length ?? 0,
      );
      expect(converted.text).toBe(original.textData.characters);
      for (const [i, g] of (original.derivedTextData?.glyphs ?? []).entries()) {
        expect(converted.fidelity!.text!.glyphs![i]).toMatchObject({
          d: commandsPath(archive.message.blobs[g.commandsBlob].bytes),
          x: g.position.x,
          y: g.position.y,
          size: g.fontSize,
          rotation: g.rotation ?? 0,
          start: g.firstCharacter,
        });
      }
    }
    const brushes = raw.filter((n) => n.type === "BRUSH");
    // The supplied brush nodes belong to an internal hidden page. Exercise
    // their exact saved geometry in a visible page using our trusted test schema.
    const brushDocument = importFig(
      stream({
        nodeChanges: [
          nodes[0],
          nodes[1],
          ...brushes.map((n) => ({
            ...n,
            parentIndex: { guid: g(1), position: "a" },
          })),
        ],
        blobs: archive.message.blobs,
      } as any),
    ).document;
    for (const source of brushes) {
      const imported = brushDocument.nodes.find(
        (n) => n.fidelity?.sourceId === rawGuid(source.guid),
      );
      expect(imported?.type).toBe("path");
      expect(imported?.fidelity?.network).toBeUndefined();
      expect(imported?.fidelity?.paths?.[0].d).toBe(
        commandsPath(
          archive.message.blobs[source.fillGeometry[0].commandsBlob].bytes,
        ),
      );
    }
    expect(result.document.nodes.length).toBeGreaterThan(500);
    expect(result.report.images).toBeGreaterThan(15);
    expect(
      result.document.nodes.some((n) => n.text === "Get a Plant Proposal"),
    ).toBe(true);
    expect(
      result.document.nodes.filter(
        (n) => n.type === "path" && n.fidelity?.paths?.length,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      result.document.nodes.filter((n) => n.fidelity?.text?.lines.length)
        .length,
    ).toBeGreaterThan(100);
    expect(
      result.document.nodes.filter((n) => n.importedLayout).length,
    ).toBeGreaterThan(100);
    expect(result.document.variables!.length).toBeGreaterThan(20);
    expect(
      result.document.nodes.filter((n) => n.fidelity?.network).length,
    ).toBeGreaterThan(0);
    expect(
      result.document.nodes.filter((n) => n.variableId).length,
    ).toBeGreaterThan(100);
    expect(result.document.componentLibrary!.length).toBeGreaterThan(20);
    expect(result.document.componentSets?.length).toBe(
      raw.filter((n) => n.isStateGroup).length,
    );
    expect(
      result.document.componentLibrary!.some((c) =>
        c.nodes[0].componentProperties?.some((p) => p.type === "text"),
      ),
    ).toBe(true);
    expect(
      result.document.componentLibrary!.some((c) =>
        c.nodes[0].componentProperties?.some((p) => p.type === "boolean"),
      ),
    ).toBe(true);
    expect(
      result.document.componentLibrary!.some((c) =>
        c.nodes[0].componentProperties?.some((p) => p.type === "instance"),
      ),
    ).toBe(true);

    for (const node of result.document.nodes)
      for (const interaction of node.interactions ?? []) {
        const actions = interaction.actions.filter(
          (a) => a.type === "changeTo",
        );
        if (!actions.length) continue;
        const instance = [node, ...ancestors(result.document, node)].find(
          (n) => n.type === "instance" && n.componentId,
        )!;
        expect(instance).toBeDefined();
        const frameId = ancestors(result.document, node).at(-1)!.id;
        const state = transitionPrototype(
          result.document,
          { frameId, overlays: [], history: [] },
          actions,
          {},
          node.id,
        );
        expect(
          state.runtime!.nodes.find((n) => n.id === instance.id)!.componentId,
        ).toBe(actions.at(-1)!.componentId);
        validateDocument(state.runtime!);
      }
    expect(
      new Set(
        result.document.componentLibrary!.flatMap((c) =>
          c.nodes
            .filter((n) =>
              n.interactions?.some((i) =>
                i.actions.some((a) => a.type === "changeTo"),
              ),
            )
            .map((n) => n.fidelity?.sourceId),
        ),
      ).size,
    ).toBe(10);
    expect(
      result.document.nodes
        .flatMap((n) => n.interactions ?? [])
        .flatMap((i) => i.actions)
        .filter((a) => a.type === "changeTo").length,
    ).toBeGreaterThan(0);
    expect(
      new Set(
        result.document.nodes
          .filter((n) =>
            n.interactions?.some((i) =>
              i.actions.some((a) => a.type === "scrollTo"),
            ),
          )
          .map((n) => n.fidelity?.sourceId),
      ).size,
    ).toBe(18);
    expect(result.report.warnings).not.toContain(
      "Some vector geometry could not be decoded and uses bounds.",
    );
    validateDocument(result.document);
    validateDocument(JSON.parse(JSON.stringify(result.document)));
    const before = result.document.nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      text: n.text,
      fill: n.fill,
    }));
    const untouched = execute(result.document, {
      type: "update",
      ids: [result.document.nodes[0].id],
      patch: { name: "Renamed only" },
    }).doc;
    expect(
      untouched.nodes.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        text: n.text,
        fill: n.fill,
      })),
    ).toEqual(before);

    console.log(
      "REALJET compatibility",
      JSON.stringify({
        ...result.report,
        paths: result.document.nodes.filter((n) => n.fidelity?.paths?.length)
          .length,
        networks: result.document.nodes.filter((n) => n.fidelity?.network)
          .length,
        textLayouts: result.document.nodes.filter((n) => n.fidelity?.text)
          .length,
        layouts: result.document.nodes.filter(
          (n) => n.layout && n.importedLayout,
        ).length,
        variables: result.document.variables?.length,
        bindings: result.document.nodes.filter((n) => n.variableId).length,
        componentDefinitions: result.document.componentLibrary?.length,
      }),
    );
  },
  15000,
);
