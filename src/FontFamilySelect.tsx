import { useEffect, useMemo, useState } from "react";
import type { Document } from "./core";
import { documentFonts, hasFont, fontFamilies } from "./fonts";
import { useI18n } from "./LanguageContext";
const candidates = [
  "Inter",
  "Arial",
  "Helvetica",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Menlo",
  "Monaco",
  "PingFang SC",
  "Hiragino Sans GB",
  "Songti SC",
  "Heiti SC",
  "Microsoft YaHei",
  "SimSun",
  "Noto Sans CJK SC",
  "Noto Sans SC",
];
export function FontFamilySelect({
  doc,
  value,
  onChange,
  label = "Font family",
}: {
  doc: Document;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { t } = useI18n();
  const [installed, setInstalled] = useState<string[]>(["Inter"]);
  const names = useMemo(() => documentFonts(doc), [doc]);
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx || !alive) return;
      setInstalled(
        candidates.filter(
          (name) =>
            name === "Inter" ||
            hasFont(name, (font, sample) => {
              ctx.font = `72px ${font}`;
              return ctx.measureText(sample).width;
            }),
        ),
      );
    });
    return () => {
      alive = false;
    };
  }, []);
  const choices = [...new Set([...installed, ...names])].sort((a, b) =>
    a.localeCompare(b),
  );
  return (
    <select
      className="font-family-select"
      aria-label={t(label)}
      title={value}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value={value}>{fontFamilies(value)[0] || value}</option>
      {choices
        .filter((name) => name !== value && JSON.stringify(name) !== value)
        .map((name) => (
          <option key={name} value={JSON.stringify(name)}>
            {name}
            {!installed.includes(name) ? ` · ${t("Document font")}` : ""}
          </option>
        ))}
    </select>
  );
}
