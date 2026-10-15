import { useEffect, useRef, useState } from "react";
import type { Document, History } from "./core";
import { useI18n } from "./LanguageContext";
import { storageMetrics } from "./storage";
type Stats = {
  frames: number;
  p95: number;
  worst: number;
  inputP95: number;
  longTasks: number;
  heapMiB: number | null;
  elapsed: number;
};
const quantile = (a: number[], q: number) =>
  [...a].sort((x, y) => x - y)[Math.max(0, Math.ceil(a.length * q) - 1)] ?? 0;
export function PerformanceMonitor({
  doc,
  history,
  onClose,
}: {
  doc: Document;
  history: History;
  onClose: () => void;
}) {
  const { t } = useI18n(),
    [running, setRunning] = useState(false),
    [stats, setStats] = useState<Stats | null>(null),
    state = useRef({
      frames: [] as number[],
      inputs: [] as number[],
      longTasks: 0,
      heapMiB: null as number | null,
      started: 0,
    });
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      last = 0,
      pending = 0,
      lastPublish = 0;
    const data: typeof state.current = (state.current = {
      frames: [],
      inputs: [],
      longTasks: 0,
      heapMiB: null,
      started: performance.now(),
    });
    const input = (event: Event) => {
      if (!(event.target as Element)?.closest(".performance-monitor"))
        pending = performance.now();
    };
    let observer: PerformanceObserver | undefined;
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      observer = new PerformanceObserver((list) => {
        data.longTasks += list.getEntries().length;
      });
      observer.observe({ entryTypes: ["longtask"] });
    }
    const tick = (at: number) => {
      if (last) data.frames.push(at - last);
      last = at;
      if (pending) {
        data.inputs.push(performance.now() - pending);
        pending = 0;
      }
      const heap = (
        performance as Performance & { memory?: { usedJSHeapSize: number } }
      ).memory?.usedJSHeapSize;
      if (heap) data.heapMiB = Math.max(data.heapMiB ?? 0, heap / 1048576);
      if (at - lastPublish > 500) {
        setStats({
          frames: data.frames.length,
          p95: quantile(data.frames, 0.95),
          worst: Math.max(0, ...data.frames),
          inputP95: quantile(data.inputs, 0.95),
          longTasks: data.longTasks,
          heapMiB: data.heapMiB,
          elapsed: (at - data.started) / 1000,
        });
        lastPublish = at;
      }
      if (at - data.started >= 30000) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    for (const name of ["pointerdown", "pointermove", "wheel", "keydown"])
      window.addEventListener(name, input, { capture: true, passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      for (const name of ["pointerdown", "pointermove", "wheel", "keydown"])
        window.removeEventListener(name, input, true);
    };
  }, [running]);
  const value = (n: number) => Number(n.toFixed(2));
  return (
    <aside
      className="performance-monitor"
      aria-label={t("Performance diagnostics")}
    >
      <header>
        <strong>{t("Performance diagnostics")}</strong>
        <button onClick={onClose}>{t("Close")}</button>
      </header>
      <p>
        {t(
          "Measurements apply only to this device and browser. Input latency measures event handling to the next animation frame, not hardware latency. Runs stop after 30 seconds.",
        )}
      </p>
      <p>
        {doc.nodes.length} {t("Layers")} · {history.past.length}{" "}
        {t("Undo checkpoints")} · {value(history.estimatedBytes / 1048576)} MiB{" "}
        {t("Estimated history size")}
      </p>
      <p>
        {t("Last save")}: {value(storageMetrics.saveMs)} ms ·{" "}
        {t("Last restore")}: {value(storageMetrics.loadMs)} ms
      </p>
      <button onClick={() => setRunning((v) => !v)}>
        {t(running ? "Stop measurement" : "Start measurement")}
      </button>
      {stats && (
        <output>
          <p>
            {value(stats.elapsed)} s · {stats.frames} {t("Frame samples")}
          </p>
          <p>
            {t("Frame interval P95")}: {value(stats.p95)} ms ·{" "}
            {t("Worst frame")}: {value(stats.worst)} ms
          </p>
          <p>
            {t("Input to frame P95")}: {value(stats.inputP95)} ms ·{" "}
            {t("Long tasks")}: {stats.longTasks}
          </p>
          <p>
            {t("Observed JS heap peak")}:{" "}
            {stats.heapMiB === null
              ? t("Unavailable in this browser")
              : value(stats.heapMiB) + " MiB"}
          </p>
          <p>
            {t("Browser")}: {navigator.userAgent}
          </p>
        </output>
      )}
    </aside>
  );
}
