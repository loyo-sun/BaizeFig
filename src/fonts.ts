import { fontFamilies } from "./fontFamily";
export { fontFamilies } from "./fontFamily";
import { ancestors, execute, type Document } from "./core";
const generic = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);
export type FontProbe = (family: string, sample: string) => number;
export function hasFont(family: string, measure: FontProbe): boolean {
  if (generic.has(family.toLowerCase())) return true;
  const quoted = JSON.stringify(family),
    sample = "mmmmWWWW0123汉字";
  return ["monospace", "serif"].some(
    (fallback) =>
      measure(`${quoted}, ${fallback}`, sample) !== measure(fallback, sample),
  );
}
export function documentFonts(doc: Document): string[] {
  const names = new Set<string>();
  for (const n of [
    ...doc.nodes,
    ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
  ])
    if (n.type === "text") {
      for (const value of [
        n.fontFamily,
        ...(n.textFlow?.runs ?? n.fidelity?.text?.spans ?? []).map(
          (r) => r.fontFamily ?? "",
        ),
      ])
        fontFamilies(value).forEach((f) => names.add(f));
    }
  return [...names].sort((a, b) => a.localeCompare(b));
}
export function replaceFont(doc: Document, from: string, to: string) {
  if (!to.trim() || to.length > 200) throw Error("Enter a font family");
  const replace = (value: string) =>
    [
      ...new Set(
        fontFamilies(value).map((f) =>
          f.toLowerCase() === from.toLowerCase() ? to.trim() : f,
        ),
      ),
    ]
      .map((f) => (generic.has(f.toLowerCase()) ? f : JSON.stringify(f)))
      .join(", ");
  let next = doc,
    count = 0,
    skipped = 0;
  for (const n of doc.nodes.filter((n) => n.type === "text")) {
    const oldRuns = n.textFlow?.runs ?? n.fidelity?.text?.spans ?? [];
    const uses = (s: string) =>
      fontFamilies(s).some((f) => f.toLowerCase() === from.toLowerCase());
    if (
      !uses(n.fontFamily) &&
      !oldRuns.some((r) => r.fontFamily && uses(r.fontFamily))
    )
      continue;
    if (n.locked || ancestors(doc, n).some((p) => p.locked)) {
      skipped++;
      continue;
    }
    const runs = oldRuns.map((r) => ({
      ...r,
      ...(r.fontFamily ? { fontFamily: replace(r.fontFamily) } : {}),
    }));
    next = execute(next, {
      type: "update",
      ids: [n.id],
      patch: {
        fontFamily: replace(n.fontFamily),
        textFlow: {
          ...(n.textFlow ?? {
            autoResize: "fixed",
            verticalAlign: "top",
            letterSpacing: n.fidelity?.text?.letterSpacing ?? 0,
          }),
          runs,
        },
      },
    }).doc;
    count++;
  }
  return { doc: next, count, skipped };
}
