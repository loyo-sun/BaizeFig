import { useEffect, useState } from "react";
import type { Document } from "./core";
import { documentFonts, hasFont, replaceFont } from "./fonts";
import { useI18n } from "./LanguageProvider";
export function FontManager({
  doc,
  onReplace,
}: {
  doc: Document;
  onReplace: (d: Document) => void;
}) {
  const { t } = useI18n(),
    [status, setStatus] = useState<Record<string, boolean>>({}),
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
        Object.fromEntries(names.map((name) => [name, hasFont(name, probe)])),
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
          "Font detection uses browser rendering. Install the original fonts for matching typography; fallback fonts can change line breaks.",
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
                : status[name]
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
