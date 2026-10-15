import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { importFigFile } from "../src/figImportClient";

class WorkerStub {
  static current: WorkerStub;
  onmessage?: (e: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    WorkerStub.current = this;
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}
const file = {
  name: "sample.fig",
  arrayBuffer: async () => new ArrayBuffer(4),
} as File;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", WorkerStub);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("does not time out while choosing pages and releases the worker after import", async () => {
  let choose!: (ids: string[]) => void;
  const result = importFigFile(
    file,
    () =>
      new Promise((resolve) => {
        choose = resolve;
      }),
  );
  const worker = WorkerStub.current;
  await Promise.resolve();
  worker.emit({ pages: [{ id: "p", name: "Page", layers: 3 }] });
  await vi.advanceTimersByTimeAsync(120000);
  expect(worker.terminate).not.toHaveBeenCalled();
  choose(["p"]);
  await Promise.resolve();
  expect(worker.postMessage).toHaveBeenLastCalledWith({ pageIds: ["p"] });
  const imported = { document: {}, report: {} };
  worker.emit({ result: imported });
  expect(await result).toEqual(imported);
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it("cancels page selection without importing and releases decoded data", async () => {
  const result = importFigFile(file, async () => []);
  const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
  await Promise.resolve();
  const worker = WorkerStub.current;
  worker.emit({ pages: [] });
  await rejected;
  expect(worker.postMessage).toHaveBeenCalledTimes(1);
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it("times out a stalled import and never posts a late file read to a terminated worker", async () => {
  let read!: (buffer: ArrayBuffer) => void;
  const result = importFigFile({
    name: "slow.fig",
    arrayBuffer: () =>
      new Promise((resolve) => {
        read = resolve;
      }),
  } as File);
  const rejected = expect(result).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(20001);
  await rejected;
  read(new ArrayBuffer(4));
  await Promise.resolve();
  expect(WorkerStub.current.postMessage).not.toHaveBeenCalled();
  expect(WorkerStub.current.terminate).toHaveBeenCalledOnce();
});

it("restarts the processing deadline after choosing pages", async () => {
  const result = importFigFile(file, async () => ["p"]);
  const rejected = expect(result).rejects.toThrow("timed out");
  WorkerStub.current.emit({ pages: [{ id: "p" }] });
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(20001);
  await rejected;
  expect(WorkerStub.current.terminate).toHaveBeenCalledOnce();
});
