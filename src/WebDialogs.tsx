import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "./LanguageContext";
type Request = {
  id: number;
  kind: "alert" | "confirm" | "prompt";
  message: string;
  initial: string;
  resolve: (value: string | boolean | null) => void;
};
let queue: Request[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
function ask(kind: Request["kind"], message: string, initial = "") {
  return new Promise<string | boolean | null>((resolve) => {
    queue = [...queue, { id: ++nextId, kind, message, initial, resolve }];
    notify();
  });
}
export const webPrompt = async (message: string, initial = "") =>
  (await ask("prompt", message, initial)) as string | null;
export const webConfirm = async (message: string) =>
  Boolean(await ask("confirm", message));
export const webAlert = async (message: string) => {
  await ask("alert", message);
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export function WebDialogs() {
  const current = useSyncExternalStore(subscribe, () => queue[0] || null);
  return current ? <WebDialog key={current.id} request={current} /> : null;
}
function WebDialog({ request }: { request: Request }) {
  const { t } = useI18n();
  const [value, setValue] = useState(request.initial);
  const box = useRef<HTMLElement>(null);
  const finish = (result: string | boolean | null) => {
    if (queue[0] !== request) return;
    queue = queue.slice(1);
    request.resolve(result);
    notify();
  };
  const cancel = () => finish(request.kind === "prompt" ? null : false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const stop = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === "Tab") {
        const items = Array.from(
          box.current?.querySelectorAll<HTMLElement>("button,input") || [],
        );
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && i === items.length - 1) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    };
    window.addEventListener("keydown", stop, true);
    return () => {
      window.removeEventListener("keydown", stop, true);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div className="web-dialog-backdrop">
      <section
        ref={box}
        className="web-dialog"
        role={request.kind === "alert" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="web-dialog-title"
      >
        <header>
          <h3 id="web-dialog-title">
            {t(
              request.kind === "prompt"
                ? "Enter a value"
                : request.kind === "confirm"
                  ? "Confirm action"
                  : "Message",
            )}
          </h3>
          <button aria-label={t("Close")} onClick={cancel}>
            <X size={18} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish(request.kind === "prompt" ? value : true);
          }}
        >
          <label>
            <span className="web-dialog-message">{request.message}</span>
            {request.kind === "prompt" && (
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </label>
          <footer>
            {request.kind !== "alert" && (
              <button
                type="button"
                autoFocus={request.kind === "confirm"}
                onClick={cancel}
              >
                {t("Cancel")}
              </button>
            )}
            <button
              type="submit"
              className="primary"
              autoFocus={request.kind === "alert"}
              onClick={(e) => {
                e.preventDefault();
                finish(request.kind === "prompt" ? value : true);
              }}
            >
              {t("Confirm")}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
