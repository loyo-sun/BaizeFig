import { chromium } from "../node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";

// Run against the local Vite server: node tests/image-subtract-browser.mjs
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4318");
  const results = await page.evaluate(async () => {
    const { emptyDocument, makeNode, validateDocument } =
      await import("/src/core.ts");
    const { combineShapes } = await import("/src/combine.ts");
    const { svgString, Scene } = await import("/src/Canvas.tsx");
    const { default: React } =
      await import("/node_modules/.vite/deps/react.js");
    const {
      default: { createRoot },
    } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const {
      default: { flushSync },
    } = await import("/node_modules/.vite/deps/react-dom.js");
    const source = document.createElement("canvas");
    source.width = 100;
    source.height = 80;
    const sourceContext = source.getContext("2d");
    sourceContext.fillStyle = "#ff0000";
    sourceContext.fillRect(0, 0, 50, 80);
    sourceContext.fillStyle = "#0000ff";
    sourceContext.fillRect(50, 0, 50, 80);
    sourceContext.clearRect(0, 0, 10, 10);
    sourceContext.clearRect(70, 0, 20, 20);
    sourceContext.fillStyle = "rgba(0,255,0,0.5)";
    sourceContext.fillRect(70, 0, 20, 20);
    const image = source.toDataURL();
    const results = [];
    for (const variant of [
      "image",
      "reverse-selection",
      "image-paint",
      "opacity",
      "vector-bottom",
    ]) {
      const doc = emptyDocument();
      const p = doc.pages[0].id;
      const photo = makeNode("image", p, {
        id: "photo",
        x: 30,
        y: 40,
        width: 100,
        height: 80,
        fill: "none",
        image,
        opacity: variant === "opacity" ? 0.5 : 1,
      });
      if (variant === "image-paint") {
        photo.type = "rectangle";
        photo.image = undefined;
        photo.fidelity = {
          size: [100, 80],
          paints: [{ type: "image", image, opacity: 1 }],
        };
      }
      const circle = makeNode("ellipse", p, {
        id: "circle",
        x: 65,
        y: 65,
        width: 30,
        height: 30,
        fill: "#00ff00",
      });
      const corner = makeNode("rectangle", p, {
        id: "corner",
        x: 120,
        y: 100,
        width: 10,
        height: 20,
        fill: "#ff00ff",
      });
      doc.nodes =
        variant === "vector-bottom"
          ? [circle, photo, corner]
          : [photo, circle, corner];
      const ids =
        variant === "reverse-selection"
          ? ["corner", "circle", "photo"]
          : ["photo", "circle", "corner"];
      const combined = combineShapes(doc, ids, "subtract");
      validateDocument(combined.doc);
      for (const mode of ["live", "export"]) {
        let svg;
        if (mode === "live") {
          const host = document.createElement("div");
          document.body.append(host);
          const root = createRoot(host);
          flushSync(() =>
            root.render(
              React.createElement(
                "svg",
                {
                  xmlns: "http://www.w3.org/2000/svg",
                  width: 100,
                  height: 80,
                  viewBox: "30 40 100 80",
                },
                React.createElement(Scene, { doc: combined.doc, pageId: p }),
              ),
            ),
          );
          svg = new XMLSerializer().serializeToString(host.firstChild);
          root.unmount();
          host.remove();
        } else svg = await svgString(combined.doc, p);
        const url = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml" }),
        );
        const rendered = new Image();
        rendered.src = url;
        await rendered.decode();
        const canvas = document.createElement("canvas");
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        const context = canvas.getContext("2d");
        context.drawImage(rendered, 0, 0);
        const pixel = (x, y) => [...context.getImageData(x, y, 1, 1).data];
        results.push({
          variant,
          mode,
          red: pixel(20, 20),
          blue: pixel(80, 40),
          hole: pixel(50, 40),
          corner: pixel(95, 70),
          transparent: pixel(5, 5),
          translucent: pixel(80, 10),
          editable: combined.doc.nodes
            .filter((n) => n.parentId === combined.id)
            .map((n) => n.id),
          originalUnchanged: doc.nodes.every((n) => !n.parentId),
        });
        URL.revokeObjectURL(url);
      }
    }
    return results;
  });
  for (const result of results) {
    const label = `${result.variant}/${result.mode}`;
    assert.equal(result.originalUnchanged, true, label);
    assert.equal(result.editable.length, 3, label);
    if (result.variant === "vector-bottom") {
      assert.equal(
        result.hole[3],
        0,
        `${label}: upper image subtracts from the bottom vector`,
      );
      assert.equal(result.red[3], 0, `${label}: upper photo is not displayed`);
      continue;
    }
    const alpha = result.variant === "opacity" ? 128 : 255;
    assert.deepEqual(
      result.red,
      [255, 0, 0, alpha],
      `${label}: original red pixels`,
    );
    assert.deepEqual(
      result.blue,
      [0, 0, 255, alpha],
      `${label}: original blue pixels`,
    );
    for (const key of ["hole", "corner", "transparent"])
      assert.equal(result[key][3], 0, `${label}: ${key} stays transparent`);
    assert.deepEqual(
      result.translucent.slice(0, 3),
      [0, 255, 0],
      `${label}: original translucent color`,
    );
    assert.ok(
      Math.abs(result.translucent[3] - alpha / 2) <= 1,
      `${label}: alpha applied once`,
    );
  }
  console.log(
    `PASS: ${results.length} live/export pixel checks preserve image colors, transparency, multiple cutouts, editable sources and layer order.`,
  );
} finally {
  await browser.close();
}
