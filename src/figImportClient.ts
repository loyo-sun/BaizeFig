import type { FigImportResult, FigPageSummary } from "./figImport";
export function importFigFile(
  file: File,
  choosePages?: (pages: FigPageSummary[]) => Promise<string[]>,
): Promise<FigImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./figImport.worker.ts", import.meta.url),
      { type: "module" },
    );
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => {
      settled = true;
      clearTimeout(timer);
      worker.terminate();
    };
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        finish();
        reject(Error("Figma import timed out"));
      }, 20000);
    };
    arm();
    worker.onmessage = async (event) => {
      if (settled) return;
      if (event.data.pages) {
        clearTimeout(timer); // User choice must not consume the worker deadline.
        try {
          if (!choosePages)
            throw Error("Choose pages to import this large Figma file");
          const pageIds = await choosePages(event.data.pages);
          if (settled) return;
          if (!pageIds.length)
            throw new DOMException("Import cancelled", "AbortError");
          arm();
          worker.postMessage({ pageIds });
        } catch (error) {
          finish();
          reject(error);
        }
        return;
      }
      finish();
      event.data.error
        ? reject(Error(event.data.error))
        : resolve(event.data.result);
    };
    worker.onerror = () => {
      finish();
      reject(Error("Invalid or unsupported Figma file"));
    };
    file
      .arrayBuffer()
      .then((buffer) => {
        if (!settled)
          worker.postMessage(
            { bytes: new Uint8Array(buffer), filename: file.name },
            [buffer],
          );
      })
      .catch((error) => {
        if (!settled) {
          finish();
          reject(error);
        }
      });
  });
}
