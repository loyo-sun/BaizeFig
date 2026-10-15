import { it, expect } from "vitest";
import { parseSchema, compileSchema, encodeBinarySchema } from "kiwi-schema";
import { deflateSync, strToU8 } from "fflate";
import { importFig } from "../src/figImport";
import { svgString } from "../src/Canvas";
import { validateDocument } from "../src/core";
it("imports whole-layer links, range overrides, explicit removal and rejects unsafe links from binary .fig data", async () => {
  const schema = parseSchema(`
struct GUID { uint sessionID; uint localID; }
struct Vector { float x; float y; }
message Parent { GUID guid = 1; string position = 2; }
message Hyperlink { string url = 1; GUID guid = 2; }
message TextData { string characters = 1; uint[] characterStyleIDs = 2; Node[] styleOverrideTable = 3; }
message Node { GUID guid = 1; string type = 2; Parent parentIndex = 3; string name = 4; Vector size = 5; float fontSize = 6; TextData textData = 7; uint styleID = 8; Hyperlink hyperlink = 9; }
message Message { Node[] nodeChanges = 1; }
 `);
  const guid = (localID: number) => ({ sessionID: 0, localID });
  const parts = [
    deflateSync(encodeBinarySchema(schema)),
    deflateSync(
      compileSchema(schema).encodeMessage({
        nodeChanges: [
          { guid: guid(1), type: "DOCUMENT" },
          {
            guid: guid(2),
            type: "CANVAS",
            parentIndex: { guid: guid(1), position: "!" },
          },
          {
            guid: guid(3),
            type: "TEXT",
            name: "Links",
            parentIndex: { guid: guid(2), position: "!" },
            size: { x: 200, y: 60 },
            fontSize: 30,
            hyperlink: { url: "https://example.com" },
            textData: {
              characters: "ABCD",
              characterStyleIDs: [0, 1, 2, 3],
              styleOverrideTable: [
                { styleID: 1, hyperlink: { url: "mailto:hello@example.com" } },
                { styleID: 2, hyperlink: {} },
                { styleID: 3, hyperlink: { url: "javascript:alert(1)" } },
              ],
            },
          },
        ],
      }),
    ),
  ];
  const bytes = new Uint8Array(
    12 + parts.reduce((s, p) => s + 4 + p.length, 0),
  );
  bytes.set(strToU8("fig-kiwi"));
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 106, true);
  let offset = 12;
  for (const p of parts) {
    view.setUint32(offset, p.length, true);
    bytes.set(p, offset + 4);
    offset += 4 + p.length;
  }
  const doc = importFig(bytes).document;
  validateDocument(JSON.parse(JSON.stringify(doc)));
  const runs = doc.nodes.find((n) => n.type === "text")!.textFlow!.runs!;
  expect(runs.map((r) => r.href)).toEqual([
    "https://example.com/",
    "mailto:hello@example.com",
    undefined,
    undefined,
  ]);
  const svg = await svgString(doc, doc.pages[0].id);
  expect(svg).toContain('href="https://example.com/"');
  expect(svg).toContain("mailto:hello@example.com");
  expect(svg).not.toContain("javascript:");
});
