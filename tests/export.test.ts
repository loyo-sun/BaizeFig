import { describe, expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  History,
  validateDocument,
} from "../src/core";
import { exportBounds, svgString } from "../src/Canvas";
import {
  exportPlan,
  frameCandidates,
  taskSvg,
  validateExportPlan,
  exportFilename,
} from "../src/exportPlan";
import { imagePdf } from "../src/pdfExport";
import { PDFDocument, PDFName, PDFNumber } from "pdf-lib";
function sample() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.pages.push({ id: "second", name: "Second" });
  d.nodes = [
    makeNode("frame", p, {
      id: "a",
      name: "第一页",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    }),
    makeNode("rectangle", p, {
      id: "overflow",
      parentId: "a",
      x: 180,
      y: 30,
      width: 100,
      height: 100,
      rotation: 20,
    }),
    makeNode("text", p, {
      id: "title",
      parentId: "a",
      x: 10,
      y: 10,
      width: 100,
      height: 30,
      text: "白泽 BaizeFig",
    }),
    makeNode("frame", "second", {
      id: "b",
      name: "第二页",
      x: 400,
      y: 50,
      width: 300,
      height: 200,
      rotation: 30,
    }),
    makeNode("frame", p, {
      id: "nested",
      parentId: "a",
      width: 20,
      height: 20,
    }),
    makeNode("frame", p, { id: "hidden", visible: false }),
  ];
  return d;
}
it("plans visible top-level frames in stable page/layer order and respects explicit reordering", () => {
  const d = sample(),
    p = d.pages[0].id;
  expect(frameCandidates(d, p).map((n) => n.id)).toEqual(["a"]);
  expect(frameCandidates(d, p, true).map((n) => n.id)).toEqual(["a", "b"]);
  const tasks = exportPlan(d, p, [], "frames", ["b", "a"]);
  expect(tasks.map((t) => t.name)).toEqual(["第二页", "第一页"]);
  expect(tasks[1].viewport).toEqual({
    x: 100,
    y: 100,
    width: 200,
    height: 100,
  });
  expect(tasks[0].viewport.width).toBeCloseTo(
    300 * Math.cos(Math.PI / 6) + 100,
  );
});
it("exports frame bounds with clipped rotated children, Chinese text, and chosen background", async () => {
  const d = sample(),
    task = exportPlan(d, d.pages[0].id, [], "frames", ["a"])[0],
    svg = await taskSvg(d, task, "page");
  expect(svg).toContain('viewBox="100 100 200 100"');
  expect(svg).toContain(d.background);
  expect(svg.replace(/<[^>]*>/g, "")).toContain("白泽 BaizeFig");
  expect(svg).toContain("<clipPath");
  expect(svg).toContain('overflow="hidden"');
  expect(svg).not.toContain("第二页");
});
it("includes outside strokes and shadow extents but does not grow unrelated sibling bounds for blur", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("rectangle", p, {
      id: "stroke",
      x: 20,
      y: 20,
      width: 100,
      height: 100,
      strokeWidth: 8,
      fidelity: {
        size: [100, 100],
        strokeAlign: "outside",
        effects: [
          {
            type: "drop-shadow",
            visible: true,
            color: "#000000",
            radius: 4,
            spread: 2,
            x: 10,
            y: 20,
          },
        ],
      },
    }),
  ];
  const b = exportBounds(d, p);
  expect(b.x).toBeLessThanOrEqual(12);
  expect(b.y).toBeLessThanOrEqual(12);
  expect(b.x + b.width).toBeGreaterThanOrEqual(140);
  expect(b.y + b.height).toBeGreaterThanOrEqual(150);
  d.nodes = [
    makeNode("rectangle", p, {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fidelity: {
        size: [10, 10],
        effects: [
          {
            type: "blur",
            visible: true,
            color: "#000",
            radius: 2,
            spread: 0,
            x: 0,
            y: 0,
          },
        ],
      },
    }),
    makeNode("rectangle", p, { x: 1000, y: 1000, width: 10, height: 10 }),
  ];
  const bounds = exportBounds(d, p);
  expect(bounds.x + bounds.width).toBe(1010);
});
it("validates scale, pixel/side/batch bounds, empty selections, and safe filenames before rendering", () => {
  const d = sample(),
    tasks = exportPlan(d, d.pages[0].id, [], "frames", ["a"]);
  expect(() => validateExportPlan(tasks, "PNG", 0)).toThrow();
  expect(() => validateExportPlan([], "PDF", 2)).toThrow();
  const huge = structuredClone(tasks);
  huge[0].viewport.width = 20000;
  expect(() => validateExportPlan(huge, "PNG", 1)).toThrow("16384");
  expect(() => validateExportPlan(huge, "SVG", 1)).not.toThrow();
  expect(exportFilename("../目录/a?b")).not.toContain("/");
  expect(exportFilename("CON")).toBe("_CON");
  expect(exportPlan(d, d.pages[0].id, ["hidden"], "selection")).toEqual([]);
});
it("creates real PDF pages in requested order with fixed page dimensions and Unicode labels", async () => {
  const d = sample(),
    tasks = exportPlan(d, d.pages[0].id, [], "frames", ["b", "a"]),
    png = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCuoAAAAASUVORK5CYII=",
        "base64",
      ),
    ),
    seen: string[] = [];
  const bytes = await imagePdf(tasks, async (task) => {
    seen.push(task.name);
    return png;
  });
  const pdf = await PDFDocument.load(bytes);
  expect(seen).toEqual(["第二页", "第一页"]);
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPage(1).getSize()).toEqual({ width: 200, height: 100 });
  expect(pdf.catalog.get(PDFName.of("PageLabels"))).toBeDefined();
  expect(pdf.getSubject()).toContain(
    "Text and vector content are embedded as images",
  );
  const abort = new AbortController();
  abort.abort();
  await expect(imagePdf(tasks, async () => png, abort.signal)).rejects.toThrow(
    "cancelled",
  );
});
it("keeps long PDF page physical dimensions with UserUnit rather than truncating MediaBox", async () => {
  const d = sample(),
    tasks = exportPlan(d, d.pages[0].id, [], "frames", ["a"]);
  tasks[0].viewport.height = 20000;
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCuoAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const pdf = await PDFDocument.load(await imagePdf(tasks, async () => png)),
    page = pdf.getPage(0),
    unit = (page.node.get(PDFName.of("UserUnit")) as PDFNumber).asNumber();
  expect(page.getHeight() * unit).toBeCloseTo(20000);
});

describe("shared renderer export", () => {
  it("exports selected nested nodes in world coordinates without unrelated content", async () => {
    const doc = emptyDocument(),
      page = doc.pages[0].id;
    doc.nodes = [
      makeNode("frame", page, { id: "f", x: 100, y: 200 }),
      makeNode("text", page, {
        id: "t",
        parentId: "f",
        x: 10,
        y: 20,
        text: "Selected",
      }),
      makeNode("text", page, { text: "Unrelated" }),
    ];
    const svg = await svgString(doc, page, ["t"]);
    expect(svg).toContain('viewBox="110 220 160 100"');
    expect(svg).toContain("Selected");
    expect(svg).not.toContain("Unrelated");
    expect(svg).not.toContain("clip-f");
  });
  it("escapes text rather than turning design content into executable markup", async () => {
    const doc = emptyDocument(),
      page = doc.pages[0].id;
    doc.nodes = [
      makeNode("text", page, { text: "<script>alert(1)</script> & text" }),
    ];
    const svg = await svgString(doc, page);
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&amp; text");
  });
});

it("frame clipping toggle survives save, SVG export and undo", async () => {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes = [
    makeNode("frame", page, { id: "clip-frame", width: 100, height: 100 }),
    makeNode("rectangle", page, {
      id: "overflow-child",
      parentId: "clip-frame",
      x: 80,
      width: 80,
      height: 40,
    }),
  ];
  const history = new History();
  history.push(doc);
  const next = execute(doc, {
    type: "update",
    ids: ["clip-frame"],
    patch: { fidelity: { size: [100, 100], clipsContent: false } },
  }).doc;
  const restored = JSON.parse(JSON.stringify(next));
  validateDocument(restored);
  expect(await svgString(restored, page)).not.toMatch(
    /<clipPath id="clip-[^"]*-clip-frame"/,
  );
  expect(await svgString(history.undo(next), page)).toMatch(
    /<clipPath id="clip-[^"]*-clip-frame"/,
  );
});

it("clips component overflow in SVG and export bounds only when enabled", async () => {
  const doc = emptyDocument(),
    page = doc.pages[0].id;
  doc.nodes = [
    makeNode("component", page, {
      id: "clip-component",
      width: 100,
      height: 100,
      fill: "none",
      fidelity: { size: [100, 100], clipsContent: true },
    }),
    makeNode("rectangle", page, {
      id: "overflow",
      parentId: "clip-component",
      x: 80,
      y: 80,
      width: 100,
      height: 100,
    }),
  ];
  expect(await svgString(doc, page, ["clip-component"])).toContain("clipPath");
  expect(exportBounds(doc, page, ["clip-component"]).width).toBe(100);
  doc.nodes[0].fidelity!.clipsContent = false;
  expect(exportBounds(doc, page, ["clip-component"]).width).toBe(180);
});
