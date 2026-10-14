import { importFig } from "./figImport";
self.onmessage = (
  event: MessageEvent<{ bytes: Uint8Array; filename: string }>,
) => {
  try {
    self.postMessage({
      result: importFig(event.data.bytes, event.data.filename),
    });
  } catch (e) {
    self.postMessage({
      error:
        e instanceof Error ? e.message : "Invalid or unsupported Figma file",
    });
  }
};
