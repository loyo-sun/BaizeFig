import { it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import {
  importFigArchive,
  readFigArchive,
  figPageSummaries,
} from "../src/figImport";
import { validateDocument } from "../src/core";

// User samples stay outside the repository. Persist only aggregate diagnostics
// to an explicitly supplied local output path; never log text or image payloads.
it.skipIf(!process.env.FIG_COMPAT_SAMPLE_PATH)(
  "validates an additional external Figma sample without embedding its contents",
  () => {
    const report: Record<string, unknown> = {};
    let stage = "read";
    try {
      const bytes = readFileSync(process.env.FIG_COMPAT_SAMPLE_PATH!);
      report.bytes = bytes.length;
      stage = "decode";
      const archive = readFigArchive(bytes);
      const source = archive.message.nodeChanges as Record<string, any>[];
      report.sourceLayers = source.length;
      report.decodedHeapMiB = Math.round(
        process.memoryUsage().heapUsed / 1048576,
      );
      const pages = figPageSummaries(archive);
      report.pageCount = pages.length;
      report.pageSizes = pages.map((p) => ({ id: p.id, layers: p.layers }));
      if (process.env.FIG_COMPAT_REPORT_PATH)
        writeFileSync(
          process.env.FIG_COMPAT_REPORT_PATH,
          JSON.stringify(report, null, 2),
        );
      const count = (values: string[]) =>
        Object.fromEntries(
          [...new Set(values)]
            .sort()
            .map((v) => [v, values.filter((x) => x === v).length]),
        );
      report.types = count(source.map((n) => n.type));
      report.paintTypes = count(
        source.flatMap((n) =>
          [...(n.fillPaints ?? []), ...(n.strokePaints ?? [])].map(
            (p) => p.type,
          ),
        ),
      );
      report.multiStrokeLayers = source.filter(
        (n) =>
          (n.strokePaints ?? []).filter((p: any) => p.visible !== false)
            .length > 1,
      ).length;
      stage = "import";
      const selected =
        process.env.FIG_COMPAT_PAGE_ID ??
        pages.filter((p) => p.layers > 0).sort((a, b) => a.layers - b.layers)[0]
          ?.id;
      report.selectedPageId = selected;
      const imported = importFigArchive(
        archive,
        "External compatibility sample",
        selected ? [selected] : undefined,
      );
      report.import = imported.report;
      stage = "validate";
      validateDocument(imported.document);
      expect(imported.document.pages.length).toBeGreaterThan(0);
      expect(imported.document.nodes.length).toBeGreaterThan(0);
      report.nativeBytes = Buffer.byteLength(JSON.stringify(imported.document));
      stage = "reload";
      validateDocument(JSON.parse(JSON.stringify(imported.document)));
      report.success = true;
    } catch (error) {
      report.success = false;
      report.stage = stage;
      report.error =
        error instanceof Error ? error.message : "Unknown sample failure";
      throw error;
    } finally {
      if (process.env.FIG_COMPAT_REPORT_PATH)
        writeFileSync(
          process.env.FIG_COMPAT_REPORT_PATH,
          JSON.stringify(report, null, 2),
        );
    }
  },
  60000,
);
