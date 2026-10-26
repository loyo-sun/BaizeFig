import { test, expect } from "@playwright/test";
import { emptyDocument, makeNode } from "../../src/core";

test("2000 layers keep navigation separate from document edits", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    localStorage.setItem("baizefig.ui.language", "en");
    localStorage.setItem("baizefig.save.destination", "local");
  });
  await page.goto("/");
  await expect(page.getByLabel("Document name", { exact: true })).toBeVisible();
  const doc = emptyDocument();
  doc.nodes = Array.from({ length: 2000 }, (_, i) =>
    makeNode("rectangle", doc.pages[0].id, {
      id: `perf-${i}`,
      name: `Layer ${i}`,
      x: (i % 50) * 36,
      y: Math.floor(i / 50) * 36,
      width: 24,
      height: 24,
    }),
  );
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "navigation.baizefig",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.locator("[data-layer-id]")).toHaveCount(2000);
  const results = await page.evaluate(async () => {
    const canvas = document.querySelector(".design-canvas")!;
    const frame = () =>
      new Promise<number>((resolve) => requestAnimationFrame(resolve));
    const pan: number[] = [],
      zoom: number[] = [];
    for (const [ctrlKey, samples] of [
      [false, pan],
      [true, zoom],
    ] as const) {
      for (let i = 0; i < 25; i++) {
        await frame();
        const start = performance.now();
        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            deltaX: ctrlKey ? 0 : 8,
            deltaY: i % 2 ? -8 : 8,
            ctrlKey,
            clientX: 650,
            clientY: 400,
          }),
        );
        await frame();
        samples.push(performance.now() - start);
      }
    }
    const summarize = (samples: number[]) => {
      const sorted = [...samples].sort((a, b) => a - b);
      return {
        medianMs: sorted[Math.floor(sorted.length / 2)],
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      };
    };
    return { pan: summarize(pan), zoom: summarize(zoom) };
  });
  console.log("NAVIGATION_2000 " + JSON.stringify(results));
  const viewport = page.locator(".design-canvas > g").first();
  const beforePan = await viewport.getAttribute("transform");
  await page.mouse.move(650, 400);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(730, 440, { steps: 12 });
  await page.mouse.up({ button: "middle" });
  await expect(viewport).not.toHaveAttribute("transform", beforePan!);
  // Navigation must not alter the document.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const storagePath = "/src/storage.ts";
        const { loadLast } = await import(storagePath);
        return (await loadLast())?.nodes;
      }),
    )
    .toEqual(doc.nodes);
  // Navigation must preserve editor actions even when the list reuses its render.
  const row = page.locator('[data-layer-id="perf-1999"]');
  await row.click();
  await expect(row).toHaveAttribute("aria-selected", "true");
  await row
    .getByRole("button", { name: "Hide Layer 1999", exact: true })
    .click();
  await expect(page.locator('[data-node-id="perf-1999"]')).toHaveCount(0);
  await row
    .getByRole("button", { name: "Show Layer 1999", exact: true })
    .click();
  await expect(page.locator('[data-node-id="perf-1999"]')).toHaveCount(1);
  await row.locator(".layer-name").dblclick();
  const rename = row.getByRole("textbox", { name: "Layer name", exact: true });
  await rename.fill("Renamed after navigation");
  await rename.press("Enter");
  await expect(row.locator(".layer-name")).toHaveText(
    "Renamed after navigation",
  );
  await page.screenshot({ path: "test-results/large-document-navigation.png" });
});
