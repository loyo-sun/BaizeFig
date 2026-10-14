import type { FigImportResult } from "./figImport";
export function importFigFile(file: File): Promise<FigImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./figImport.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      finish();
      reject(Error("Figma import timed out"));
    }, 20000);
    worker.onmessage = (event) => {
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
      .then((buffer) =>
        worker.postMessage(
          { bytes: new Uint8Array(buffer), filename: file.name },
          [buffer],
        ),
      )
      .catch((e) => {
        finish();
        reject(e);
      });
  });
}
