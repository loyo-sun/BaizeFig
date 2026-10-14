import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { zipSync, deflateSync, strToU8 } from "fflate";
import { parseSchema, encodeBinarySchema, compileSchema } from "kiwi-schema";
import { importFig, decodeFigMessage } from "../src/figImport";
import { validateDocument } from "../src/core";

const schema = parseSchema(`
struct GUID { uint sessionID; uint localID; }
struct Vector { float x; float y; }
struct Transform { float m00; float m01; float m02; float m10; float m11; float m12; }
message Parent { GUID guid = 1; string position = 2; }
message Font { string family = 1; string style = 2; }
message Text { string characters = 1; }
enum Type { DOCUMENT = 0; CANVAS = 1; FRAME = 2; TEXT = 3; ROUNDED_RECTANGLE = 4; }
message Node { GUID guid = 1; Parent parentIndex = 2; Type type = 3; string name = 4; bool visible = 5; Vector size = 6; Transform transform = 7; Text textData = 8; float fontSize = 9; Font fontName = 10; }
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
    validateDocument(result.document);
    console.log("REALJET import report", JSON.stringify(result.report));
  },
);
