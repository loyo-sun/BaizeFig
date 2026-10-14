import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { zipSync, deflateSync, strToU8 } from "fflate";
import { parseSchema, encodeBinarySchema, compileSchema } from "kiwi-schema";
import { importFig, decodeFigMessage } from "../src/figImport";
import { validateDocument, execute } from "../src/core";

const schema = parseSchema(`
struct GUID { uint sessionID; uint localID; }
struct Vector { float x; float y; }
struct Transform { float m00; float m01; float m02; float m10; float m11; float m12; }
message Parent { GUID guid = 1; string position = 2; }
message Font { string family = 1; string style = 2; }
message Text { string characters = 1; }
enum Type { DOCUMENT = 0; CANVAS = 1; FRAME = 2; TEXT = 3; ROUNDED_RECTANGLE = 4; }
message Event { string interactionType = 1; }
message Action { GUID transitionNodeID = 1; string connectionType = 2; string navigationType = 3; Vector extraScrollOffset = 4; string transitionType = 5; float transitionDuration = 6; }
message Interaction { Event event = 1; Action[] actions = 2; bool isDeleted = 3; }
message Node { GUID guid = 1; Parent parentIndex = 2; Type type = 3; string name = 4; bool visible = 5; Vector size = 6; Transform transform = 7; Text textData = 8; float fontSize = 9; Font fontName = 10; Interaction[] prototypeInteractions = 11; string scrollDirection = 12; }
message Message { Node[] nodeChanges = 1; }
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
    expect(
      result.document.nodes.filter((n) => !n.parentId).map((n) => n.name),
    ).toHaveLength(4);
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
);
