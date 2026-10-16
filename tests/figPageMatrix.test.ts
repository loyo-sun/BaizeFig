import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import {
  figPageSummaries,
  importFigArchive,
  readFigArchive,
} from "../src/figImport";
import { validateDocument } from "../src/core";

// Explicit external-sample acceptance: one largest top-level subtree per visible
// page. This is representative coverage, never a claim of whole-file fidelity.
it.skipIf(!process.env.FIG_MATRIX_SAMPLE_PATH)(
  "validates the largest top-level subtree on every visible sample page",
  () => {
    const archive = readFigArchive(
      readFileSync(process.env.FIG_MATRIX_SAMPLE_PATH!),
    );
    const rows: Record<string, unknown>[] = [];
    for (const page of figPageSummaries(archive)) {
      const part = [...(page.parts ?? [])].sort(
        (a, b) => b.layers - a.layers,
      )[0];
      if (!part) continue;
      const row: Record<string, unknown> = {
        page: page.id,
        root: part.id,
        sourceLayers: part.layers,
      };
      try {
        const result = importFigArchive(archive, "External page matrix", [
          part.id,
        ]);
        validateDocument(result.document);
        expect(result.document.pages).toHaveLength(1);
        expect(
          result.document.nodes
            .filter((n) => !n.parentId)
            .map((n) => n.fidelity?.sourceId),
        ).toEqual([part.id]);
        row.layers = result.document.nodes.length;
        row.library = result.document.componentLibrary?.length ?? 0;
        row.warnings = result.report.warnings;
        row.success = true;
      } catch (error) {
        row.success = false;
        row.error = error instanceof Error ? error.message : String(error);
      }
      rows.push(row);
      if (process.env.FIG_MATRIX_REPORT_PATH)
        writeFileSync(
          process.env.FIG_MATRIX_REPORT_PATH,
          JSON.stringify(rows, null, 2),
        );
    }
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => !r.success)).toEqual([]);
  },
  180000,
);
