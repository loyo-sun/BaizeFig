import { it, expect } from "vitest";
import { parseSchema, compileSchema, encodeBinarySchema } from "kiwi-schema";
import { deflateSync, strToU8 } from "fflate";
import { importFig } from "../src/figImport";
import { execute, validateDocument } from "../src/core";
const schema = parseSchema(`
struct GUID { uint sessionID; uint localID; }
struct Vector { float x; float y; }
struct Color { float r; float g; float b; float a; }
message Ref { GUID guid = 1; }
message Parent { GUID guid = 1; string position = 2; }
message Mode { GUID id = 1; string name = 2; }
message AnyValue { float floatValue = 1; string textValue = 2; bool boolValue = 3; Color colorValue = 4; Ref alias = 5; }
message Data { AnyValue value = 1; }
message ValueEntry { GUID modeID = 1; Data variableData = 2; }
message Values { ValueEntry[] entries = 1; }
message ConsumeEntry { string variableField = 1; Data variableData = 2; }
message Consumes { ConsumeEntry[] entries = 1; }
message ModeEntry { Ref variableSetID = 1; GUID variableModeID = 2; }
message ModeMap { ModeEntry[] entries = 1; }
message Stop { float position = 1; Color color = 2; }
message Paint { string type = 1; Color color = 2; float opacity = 3; Stop[] stops = 4; Data colorVar = 5; }
message Node { GUID guid = 1; string type = 2; Parent parentIndex = 3; string name = 4; Vector size = 5; string variableResolvedType = 6; Ref variableSetID = 7; Mode[] variableSetModes = 8; Values variableDataValues = 9; Consumes variableConsumptionMap = 10; ModeMap variableModeBySetMap = 11; Paint[] fillPaints = 12; uint count = 13; float starInnerScale = 14; string booleanOperation = 15; }
message Message { Node[] nodeChanges = 1; }
`);
const guid = (localID: number) => ({ sessionID: 0, localID });
function file(nodes: object[]) {
  const parts = [
      deflateSync(encodeBinarySchema(schema)),
      deflateSync(compileSchema(schema).encodeMessage({ nodeChanges: nodes })),
    ],
    bytes = new Uint8Array(12 + parts.reduce((s, p) => s + 4 + p.length, 0));
  bytes.set(strToU8("fig-kiwi"));
  new DataView(bytes.buffer).setUint32(8, 106, true);
  let offset = 12;
  for (const part of parts) {
    new DataView(bytes.buffer).setUint32(offset, part.length, true);
    bytes.set(part, offset + 4);
    offset += 4 + part.length;
  }
  return bytes;
}
const parent = (id: number, position = "a") => ({ guid: guid(id), position });
const roots = [
  { guid: guid(0), type: "DOCUMENT" },
  { guid: guid(1), type: "CANVAS", parentIndex: parent(0), name: "Page" },
];
it("decodes typed variable values and bindings from Kiwi, including inherited modes and transparency", () => {
  const result = importFig(
    file([
      ...roots,
      {
        guid: guid(10),
        type: "VARIABLE_SET",
        name: "Theme",
        variableSetModes: [
          { id: guid(100), name: "A" },
          { id: guid(101), name: "B" },
        ],
      },
      {
        guid: guid(11),
        type: "VARIABLE",
        name: "Size",
        variableResolvedType: "FLOAT",
        variableSetID: { guid: guid(10) },
        variableDataValues: {
          entries: [
            { modeID: guid(100), variableData: { value: { floatValue: 40 } } },
            { modeID: guid(101), variableData: { value: { floatValue: 80 } } },
          ],
        },
      },
      {
        guid: guid(12),
        type: "VARIABLE",
        name: "Color",
        variableResolvedType: "COLOR",
        variableSetID: { guid: guid(10) },
        variableDataValues: {
          entries: [
            {
              modeID: guid(100),
              variableData: {
                value: { colorValue: { r: 1, g: 0, b: 0, a: 0.5 } },
              },
            },
            {
              modeID: guid(101),
              variableData: {
                value: { colorValue: { r: 0, g: 1, b: 0, a: 0.2 } },
              },
            },
          ],
        },
      },
      {
        guid: guid(2),
        type: "FRAME",
        size: { x: 300, y: 200 },
        parentIndex: parent(1),
        variableModeBySetMap: {
          entries: [
            { variableSetID: { guid: guid(10) }, variableModeID: guid(101) },
          ],
        },
      },
      {
        guid: guid(3),
        type: "ROUNDED_RECTANGLE",
        size: { x: 20, y: 30 },
        parentIndex: parent(2),
        variableConsumptionMap: {
          entries: [
            {
              variableField: "WIDTH",
              variableData: { value: { alias: { guid: guid(11) } } },
            },
          ],
        },
        fillPaints: [
          {
            type: "SOLID",
            color: { r: 1, g: 0, b: 0, a: 1 },
            colorVar: { value: { alias: { guid: guid(12) } } },
          },
        ],
      },
    ]),
  );
  const child = result.document.nodes.find((n) => n.type === "rectangle")!;
  expect(child.width).toBe(80);
  expect(child.fill).toBe("#00ff0033");
  expect(result.document.typedVariables).toHaveLength(1);
  validateDocument(JSON.parse(JSON.stringify(result.document)));
});
it("retains gradient stops, boolean operators and polygon parameters from Kiwi", () => {
  const result = importFig(
    file([
      ...roots,
      {
        guid: guid(2),
        type: "BOOLEAN_OPERATION",
        name: "Cut",
        size: { x: 200, y: 100 },
        parentIndex: parent(1),
        booleanOperation: "SUBTRACT",
        fillPaints: [
          {
            type: "GRADIENT_LINEAR",
            stops: [
              { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
              { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
            ],
          },
        ],
      },
      {
        guid: guid(3),
        type: "REGULAR_POLYGON",
        size: { x: 100, y: 100 },
        parentIndex: parent(2),
        count: 6,
      },
      {
        guid: guid(4),
        type: "STAR",
        size: { x: 100, y: 100 },
        parentIndex: parent(2, "b"),
        count: 7,
        starInnerScale: 0.25,
      },
    ]),
  );
  expect(result.document.nodes[0].fidelity).toMatchObject({
    booleanOperation: "subtract",
    paints: [
      {
        type: "linear",
        stops: [
          { position: 0, color: "#ff0000ff" },
          { position: 1, color: "#0000ffff" },
        ],
      },
    ],
  });
  expect(result.document.nodes[1].fidelity?.pointCount).toBe(6);
  expect(result.document.nodes[2].fidelity?.innerRatio).toBe(0.25);
  validateDocument(result.document);
});
