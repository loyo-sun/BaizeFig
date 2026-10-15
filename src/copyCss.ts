import { roots, worldTransform, type Document } from "./core";
// CSS is a style handoff, not a DOM/layout reconstruction. Paths remain SVG.
export function copyCss(doc: Document, ids: string[]): string {
  return roots(doc, ids)
    .map((n) => {
      const matrix = worldTransform(doc, n),
        rules: Record<string, string> = {
          position: "absolute",
          width: `${n.width}px`,
          height: `${n.height}px`,
          "transform-origin": "0 0",
          transform: `matrix(${matrix.join(", ")})`,
          opacity: String(n.opacity),
          "border-radius": `${n.radius}px`,
        };
      if (n.fill !== "none")
        rules[n.type === "text" ? "color" : "background-color"] = n.fill;
      if (n.strokeWidth > 0 && n.stroke !== "none")
        rules.border = `${n.strokeWidth}px solid ${n.stroke}`;
      if (n.type === "text")
        Object.assign(rules, {
          "font-family": n.fontFamily,
          "font-size": `${n.fontSize}px`,
          "font-weight": String(n.fontWeight),
          "line-height": String(n.lineHeight),
          "text-align": n.textAlign,
          "letter-spacing": `${n.textFlow?.letterSpacing ?? 0}px`,
          direction: n.textFlow?.direction === "rtl" ? "rtl" : "ltr",
        });
      return `/* ${n.name.replace(/\*\//g, "* /")} — base properties; use SVG for paths, layered paints and effects. */\n[data-baizefig-id=${JSON.stringify(n.id)}] {\n${Object.entries(
        rules,
      )
        .map(([k, v]) => `  ${k}: ${v};`)
        .join("\n")}\n}`;
    })
    .join("\n\n");
}
