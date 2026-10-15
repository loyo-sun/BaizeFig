import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { performanceDocument } from "./performanceFixtures";
import { validateDocument, History } from "../src/core";
import { svgString } from "../src/Canvas";
import { save, getDocument } from "../src/storage";
import { writeFileSync } from "node:fs";
import os from "node:os";
it("records deterministic synthetic render/clone/history/storage baselines", async () => {
  const rows = [];
  for (const size of [100, 1000, 5000]) {
    const d = performanceDocument(size);
    let at = performance.now();
    validateDocument(d);
    const validationMs = performance.now() - at;
    at = performance.now();
    const svg = await svgString(d, d.pages[0].id);
    const svgMs = performance.now() - at;
    expect(svg).toContain("Layer");
    at = performance.now();
    structuredClone(d);
    const cloneMs = performance.now() - at;
    at = performance.now();
    await save(d);
    const saveMs = performance.now() - at;
    at = performance.now();
    expect((await getDocument(d.id)).nodes).toHaveLength(size);
    const loadMs = performance.now() - at;
    expect(validationMs).toBeLessThan(1000);
    expect(svgMs).toBeLessThan(5000);
    const history = new History();
    at = performance.now();
    for (let i = 0; i < 100; i++) history.push({ ...d, name: `Step ${i}` });
    const historyMs = performance.now() - at;
    expect(history.estimatedBytes).toBeLessThanOrEqual(32 * 1048576);
    rows.push({
      size,
      validationMs,
      svgMs,
      cloneMs,
      saveMs,
      loadMs,
      historyMs,
      historyEntries: history.past.length,
      estimatedHistoryMiB: history.estimatedBytes / 1048576,
      jsonMiB: JSON.stringify(d).length / 1048576,
      svgMiB: svg.length / 1048576,
    });
  }
  const result = {
    at: new Date().toISOString(),
    runtime: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model,
    ramGiB: os.totalmem() / 2 ** 30,
    method:
      "Node SSR; fake-indexeddb, not native disk or browser FPS. 100 snapshots.",
    rows,
  };
  console.log(JSON.stringify(result));
  if (process.env.BAIZEFIG_BENCHMARK_OUTPUT)
    for (const n of [100, 1000, 5000])
      writeFileSync(
        `/private/tmp/baizefig-performance-${n}.baizefig`,
        JSON.stringify(performanceDocument(n)),
      );
  if (process.env.BAIZEFIG_BENCHMARK_OUTPUT)
    writeFileSync(
      process.env.BAIZEFIG_BENCHMARK_OUTPUT,
      JSON.stringify(result, null, 2),
    );
}, 60000);
