import { emptyDocument, makeNode, type Document } from "../src/core";
export function performanceDocument(count: number): Document {
  const d = emptyDocument();
  d.id = `synthetic-${count}`;
  d.name = `BaizeFig synthetic ${count}`;
  d.pages[0].id = "benchmark-page";
  const p = d.pages[0].id;
  for (let i = 0; i < count; i++) {
    const container = i % 50 === 0,
      depth = i < 20;
    const n = makeNode(
      container || depth
        ? "frame"
        : i % 11 === 0
          ? "path"
          : i % 17 === 0
            ? "image"
            : "rectangle",
      p,
      {
        id: `layer-${i}`,
        name: `Layer ${i}`,
        parentId:
          i === 0
            ? null
            : depth
              ? `layer-${i - 1}`
              : `layer-${Math.floor(i / 50) * 50 === i ? 0 : Math.floor(i / 50) * 50}`,
        x: container ? (Math.floor(i / 50) % 10) * 420 : (i % 10) * 32,
        y: container
          ? Math.floor(i / 500) * 320
          : Math.floor((i % 50) / 10) * 32,
        width: container ? 400 : 24,
        height: container ? 300 : 24,
        fill: i % 2 ? "#94a3b8" : "#38bdf8",
      },
    );
    if (n.type === "path")
      n.fidelity = {
        size: [24, 24],
        paths: [
          { d: "M0 12 C0 -4 24 -4 24 12 C24 28 0 28 0 12 Z", rule: "nonzero" },
        ],
      };
    if (n.type === "image")
      n.image =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jW9kAAAAASUVORK5CYII=";
    if (i % 31 === 0)
      n.fidelity = {
        size: [n.width, n.height],
        ...n.fidelity,
        effects: [
          {
            type: "drop-shadow",
            visible: true,
            radius: 4,
            spread: 0,
            x: 2,
            y: 2,
            color: "#00000033",
          },
        ],
      };
    d.nodes.push(n);
  }
  return d;
}
