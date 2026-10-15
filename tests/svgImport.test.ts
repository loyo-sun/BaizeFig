import { expect, it } from "vitest";
import { importSvg, svgTransform, svgColor } from "../src/svgImport";
import {
  emptyDocument,
  execute,
  validateDocument,
  worldTransform,
  History,
  type Document,
} from "../src/core";
import { svgString } from "../src/Canvas";
import { editableNetwork } from "../src/vectorGeometry";
import { networkGeometry } from "../src/vectorNetwork";
const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 120 80"><defs><linearGradient id="paint"><stop stop-color="#ff0000"/><stop offset="100%" stop-color="blue" stop-opacity=".5"/></linearGradient><clipPath id="clip"><circle cx="40" cy="30" r="24"/></clipPath></defs><g transform="translate(10 5) rotate(15)" opacity=".7"><path id="hole" d="M0 0H80V60H0Z M20 20V40H60V20Z" fill-rule="evenodd" fill="url(#paint)" stroke="#334455" stroke-width="2" stroke-linejoin="round" clip-path="url(#clip)"/></g></svg>`;
function documentFor(source = sample) {
  const doc = emptyDocument();
  const result = importSvg(source, doc.pages[0].id, "fixture.svg");
  doc.nodes = result.nodes;
  return { doc, result };
}
it("imports curved holes, hierarchy, affine transforms, gradient stops, alpha and clipping as editable layers", () => {
  const { doc, result } = documentFor();
  validateDocument(doc);
  expect(result.report.warnings).toEqual([]);
  const path = doc.nodes.find((n) => n.name === "hole" && n.type === "path")!;
  expect(path.fidelity?.network?.regions[0].rule).toBe("evenodd");
  expect(path.fidelity?.network?.regions[0].loops).toHaveLength(2);
  expect(path.fidelity?.paints?.[0].stops?.[1].color).toBe("#0000ff80");
  expect(doc.nodes.some((n) => n.fidelity?.mask === "alpha")).toBe(true);
  expect(worldTransform(doc, path)[0]).toBeCloseTo(Math.cos(Math.PI / 12) * 2);
  const network = editableNetwork(path);
  network.vertices[0].x += 4;
  expect(networkGeometry(network)[0].d).not.toBe(path.fidelity!.paths![0].d);
});
it("preserves geometry and styles through native persistence, SVG export and editable SVG reimport", async () => {
  const { doc } = documentFor();
  const restored = JSON.parse(JSON.stringify(doc)) as Document;
  validateDocument(restored);
  expect(JSON.stringify(restored)).toBe(JSON.stringify(doc));
  const exported = await svgString(doc, doc.pages[0].id, [doc.nodes[0].id]);
  const again = documentFor(exported);
  validateDocument(again.doc);
  expect(again.doc.nodes.some((n) => n.fidelity?.mask === "alpha")).toBe(true);
  const original = doc.nodes.find(
    (n) =>
      n.type === "path" && n.fidelity?.network?.regions[0]?.loops.length === 2,
  )!;
  const roundtrip = again.doc.nodes.find(
    (n) =>
      n.type === "path" && n.fidelity?.network?.regions[0]?.loops.length === 2,
  )!;
  expect(worldTransform(again.doc, roundtrip)).toEqual(
    worldTransform(doc, original),
  );
  expect(roundtrip.fidelity?.network?.vertices).toEqual(
    original.fidelity?.network?.vertices,
  );
  expect(
    again.doc.nodes.some((n) =>
      n.fidelity?.paints?.some((p) => p.type === "linear"),
    ),
  ).toBe(true);
  expect(
    again.doc.nodes
      .filter((n) => n.type === "path")
      .some((n) => n.fidelity?.network?.regions[0]?.loops.length === 2),
  ).toBe(true);
  expect(again.result.report.warnings.some((w) => w.includes("omitted"))).toBe(
    false,
  );
});
it("imports basic shapes, local use references and simple CSS with specificity", () => {
  const { doc } = documentFor(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><style>rect {fill:red}.icon{fill:blue} #one {fill:green}</style><defs><rect id="one" class="icon" width="20" height="10"/></defs><use href="#one" x="30"/><ellipse cx="70" cy="50" rx="10" ry="20"/><polygon points="0,0 10,20 20,0"/><polyline points="0,50 10,60 20,50" fill="none" stroke="black"/><line x1="5" x2="30" y2="20" stroke="black"/></svg>`,
  );
  expect(doc.nodes.filter((n) => n.type === "path")).toHaveLength(5);
  expect(
    doc.nodes.find((n) => n.type === "path" && n.name === "one")?.fill,
  ).toBe("#008000");
});
it("blocks active content and external references without storing SVG markup or resource URLs", () => {
  const { doc, result } = documentFor(
    `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://example.invalid/tracker.png"/><use href="https://example.invalid/a.svg#x"/><rect onload="alert(1)" width="10" height="10" fill="url(https://example.invalid/paint)" filter="url(#f)"/></svg>`,
  );
  expect(result.report.warnings.length).toBeGreaterThanOrEqual(6);
  expect(JSON.stringify(doc)).not.toContain("https://");
  expect(JSON.stringify(doc)).not.toContain("alert(1)");
  expect(() =>
    importSvg(
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>',
      "p",
    ),
  ).toThrow();
  expect(() => importSvg("<svg><g></svg>", "p")).toThrow();
});
it("rejects cyclic uses, excessive hierarchy, invalid transforms and malformed paths", () => {
  expect(() =>
    importSvg('<svg><g id="x"><use href="#x"/></g></svg>', "p"),
  ).toThrow("Cyclic");
  expect(() =>
    importSvg("<svg>" + "<g>".repeat(130) + "</g>".repeat(130) + "</svg>", "p"),
  ).toThrow();
  expect(() => svgTransform("translate(2) evil(1)")).toThrow();
  expect(() => svgTransform("matrix(NaN 1 0 1 0 0)")).toThrow();
  expect(() => importSvg('<svg><path d="alert(1)"/></svg>', "p")).toThrow();
  expect(() => importSvg('<svg><path d="M0 0 L"/></svg>', "p")).toThrow();
  expect(svgColor("rgba(255,0,0,.5)")).toBe("#ff000080");
});
it("imports in one undoable operation without changing original nodes", () => {
  const doc = emptyDocument(),
    history = new History(),
    result = importSvg(sample, doc.pages[0].id);
  history.push(doc);
  const next = execute(doc, { type: "create", nodes: result.nodes }).doc;
  expect(next.nodes.length).toBeGreaterThan(3);
  expect(history.undo(next)?.nodes).toEqual([]);
  expect(history.redo(doc)?.nodes).toEqual(next.nodes);
});
