import {
  importFigArchive,
  readFigArchive,
  figPageSummaries,
} from "./figImport";
let archive: ReturnType<typeof readFigArchive> | undefined;
let filename = "Untitled.fig";
self.onmessage = (
  event: MessageEvent<{
    bytes?: Uint8Array;
    filename?: string;
    pageIds?: string[];
  }>,
) => {
  try {
    if (event.data.bytes) {
      archive = readFigArchive(event.data.bytes);
      filename = event.data.filename ?? filename;
      const pages = figPageSummaries(archive);
      if (archive.message.nodeChanges.length > 20000) {
        self.postMessage({ pages });
        return;
      }
    }
    if (!archive) throw Error("Invalid or unsupported Figma file");
    const result = importFigArchive(archive, filename, event.data.pageIds);
    archive = undefined;
    self.postMessage({ result });
  } catch (e) {
    archive = undefined;
    self.postMessage({
      error:
        e instanceof Error ? e.message : "Invalid or unsupported Figma file",
    });
  }
};
