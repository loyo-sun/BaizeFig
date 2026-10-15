import { useEffect, useState } from "react";
import type { Document } from "./core";
import { usesBundledInter } from "./fontFamily";
import { documentFonts, hasFont, replaceFont } from "./fonts";
import { useI18n } from "./LanguageContext";
export function FontManager({
  doc,
  onReplace,
}: {
  doc: Document;
  onReplace: (d: Document) => void;
}) {
  const { t } = useI18n(),
    [status, setStatus] = useState<
      Record<string, "system" | "bundled" | "missing">
    >({}),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("Arial"),
    [message, setMessage] = useState("");
  const names = documentFonts(doc);
  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (!active) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      const probe = (family: string, sample: string) => {
        ctx.font = `72px ${family}`;
        return ctx.measureText(sample).width;
      };
      setStatus(
        Object.fromEntries(
          names.map((name) => [
            name,
            hasFont(name, probe)
              ? "system"
              : usesBundledInter(name) && hasFont("Inter Variable", probe)
                ? "bundled"
                : "missing",
          ]),
        ),
      );
    });
    return () => {
      active = false;
    };
  }, [doc]);
  return (
    <section className="font-manager">
      <p className="muted">
        {t(
          "Installed fonts are preferred. Built-in Inter is a compatible fallback; matching the original font version is still needed for precise typography.",
        )}
      </p>
      <div className="font-list">
        {names.map((name) => (
          <label key={name}>
            <input
              type="radio"
              name="replace-font"
              checked={from === name}
              onChange={() => setFrom(name)}
            />
            <span>{name}</span>
            <small>
              {status[name] === undefined
                ? t("Checking fonts…")
                : status[name] === "bundled"
                  ? t("Built-in compatible font")
                  : status[name] === "system"
                    ? t("Available")
                    : t("Not detected")}
            </small>
          </label>
        ))}
      </div>
      <label>
        {t("Replacement font")}
        <input
          aria-label={t("Replacement font")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <button
        className="primary"
        disabled={!from || !to.trim()}
        onClick={() => {
          try {
            const r = replaceFont(doc, from, to);
            onReplace(r.doc);
            setMessage(
              t(
                "Updated {count} text layers; skipped {skipped} locked layers.",
                { count: r.count, skipped: r.skipped },
              ),
            );
            setFrom("");
          } catch (e) {
            setMessage(t((e as Error).message));
          }
        }}
      >
        {t("Replace font in document")}
      </button>
      <p role="status">{message}</p>
      <small>
        {t(
          "Component library definitions keep their source fonts; detached and document text layers can be replaced here.",
        )}
      </small>
    </section>
  );
}
