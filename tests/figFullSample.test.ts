import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import {
  figPageSummaries,
  importFigArchive,
  readFigArchive,
} from "../src/figImport";
import { validateDocument } from "../src/core";
import { svgString } from "../src/Canvas";

// Cover every visible root, splitting only at existing top-level boundaries.
// This checks conversion, native reload and SVG generation, not pixel equality.
it.skipIf(!process.env.FIG_FULL_SAMPLE_PATH)(
  "validates all visible subtrees, or an explicitly selected retry scope",
  async () => {
    const archive = readFigArchive(
      readFileSync(process.env.FIG_FULL_SAMPLE_PATH!),
    );
    const requested = process.env.FIG_FULL_ROOT_IDS?.split(",").filter(Boolean);
    const allPages = figPageSummaries(archive);
    const pages = requested
      ? allPages
          .map((p) => ({
            ...p,
            parts: p.parts?.filter((r) => requested.includes(r.id)),
          }))
          .filter((p) => p.parts?.length)
      : allPages;
    if (requested)
      expect(pages.flatMap((p) => p.parts!.map((r) => r.id)).sort()).toEqual(
        [...requested].sort(),
      );
    const rows: Record<string, any>[] = [];
    const save = () => {
      if (process.env.FIG_FULL_REPORT_PATH)
        writeFileSync(
          process.env.FIG_FULL_REPORT_PATH,
          JSON.stringify(
            {
              scope: requested ? "selected-retry" : "whole-visible-file",
              pages: pages.length,
              expectedRoots: pages.reduce(
                (n, p) => n + (p.parts?.length ?? 0),
                0,
              ),
              rows,
            },
            null,
            2,
          ),
        );
    };
    const check = async (
      page: string,
      parts: { id: string; layers: number }[],
    ): Promise<void> => {
      const row: Record<string, any> = {
        page,
        roots: parts.map((p) => p.id),
        sourceLayers: parts.reduce((n, p) => n + p.layers, 0),
      };
      try {
        const { document: doc, report } = importFigArchive(
          archive,
          "External full-file acceptance",
          row.roots,
        );
        if (parts.length > 1 && doc.nodes.length > 6000) {
          const at = Math.ceil(parts.length / 2);
          await check(page, parts.slice(0, at));
          await check(page, parts.slice(at));
          return;
        }
        validateDocument(doc);
        expect(
          doc.nodes
            .filter((n) => !n.parentId)
            .map((n) => n.fidelity?.sourceId)
            .sort(),
        ).toEqual([...row.roots].sort());
        validateDocument(JSON.parse(JSON.stringify(doc)));
        const svg = await svgString(doc, doc.pages[0].id);
        expect(svg).toContain("<svg");
        const numericAttributes = [
          ...svg.matchAll(
            /\b(?:d|transform|viewBox|x|y|width|height|rx|ry|cx|cy|r|stdDeviation|offset)="([^"]*)"/g,
          ),
        ];
        expect(
          numericAttributes.filter((a) => /NaN|Infinity/.test(a[1])),
        ).toEqual([]);
        row.layers = doc.nodes.length;
        row.warnings = report.warnings;
        row.sets = doc.componentSets?.length ?? 0;
        row.svgBytes = Buffer.byteLength(svg);
        row.success = true;
      } catch (e) {
        // Output limits are handled exactly as in the page/part chooser; all
        // smaller pieces must still pass, no content is silently skipped.
        if (parts.length > 1 && /limit|large|exceed/i.test(String(e))) {
          const at = Math.ceil(parts.length / 2);
          await check(page, parts.slice(0, at));
          await check(page, parts.slice(at));
          return;
        }
        row.success = false;
        row.error = String(e);
      }
      rows.push(row);
      save();
    };
    for (const page of pages) {
      let batch: { id: string; layers: number }[] = [],
        count = 0;
      for (const part of page.parts ?? []) {
        if (batch.length && count + part.layers > 1000) {
          await check(page.id, batch);
          batch = [];
          count = 0;
        }
        batch.push(part);
        count += part.layers;
      }
      if (batch.length) await check(page.id, batch);
    }
    expect(rows.flatMap((r) => r.roots).length).toBe(
      pages.reduce((n, p) => n + (p.parts?.length ?? 0), 0),
    );
    expect(rows.filter((r) => !r.success)).toEqual([]);
  },
  1800000,
);
