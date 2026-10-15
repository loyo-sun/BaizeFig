import { hasSavedTextOutlines } from "./glyphCache";
export { default as bundledFontLicense } from "@fontsource-variable/inter/LICENSE?raw";
import normalCss from "@fontsource-variable/inter/wght.css?raw";
import italicCss from "@fontsource-variable/inter/wght-italic.css?raw";
import { usesBundledInter } from "./fontFamily";
import { hasFont } from "./fonts";
import type { Node } from "./core";
const urls = import.meta.glob(
  "../node_modules/@fontsource-variable/inter/files/*-wght-*.woff2",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;
const faces = [
  ...(normalCss + "\n" + italicCss).matchAll(/@font-face\s*\{[^}]+\}/g),
].map(([css]) => {
  const file = css.match(/url\(\.\/files\/([^)]*)\)/)![1],
    unicode = css.match(/unicode-range:\s*([^;]+);/)![1];
  const ranges = unicode.split(",").map((r) =>
    r
      .trim()
      .replace(/^U\+/, "")
      .split("-")
      .map((n) => parseInt(n, 16)),
  );
  return {
    css,
    file,
    ranges,
    url: urls["../node_modules/@fontsource-variable/inter/files/" + file],
  };
});
export async function ensureBundledFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  if (
    ctx &&
    hasFont("Inter", (family, sample) => {
      ctx.font = `72px ${family}`;
      return ctx.measureText(sample).width;
    })
  )
    return;
  // All shipped subsets, both variable weight faces; no remote font service.
  const sample = "mmWWÀĀĂȘắЖҐѢἄΩ";
  await Promise.allSettled([
    document.fonts.load('400 16px "Inter Variable"', sample),
    document.fonts.load('italic 400 16px "Inter Variable"', sample),
  ]);
}
const loaded = new Map<string, Promise<Uint8Array>>();
const embeddedLoads = new Map<string, Promise<FontFace>>();
// WebKit can finish decoding an SVG image before its embedded font loads.
// Load the exact data URL first, so rasterization never captures blocked text.
export async function preloadEmbeddedFonts(svg: string) {
  if (typeof FontFace === "undefined") {
    if (svg.includes("data:font/woff2;base64,"))
      throw Error("Bundled font rendering is unavailable in this browser");
    return;
  }
  const pending: Promise<FontFace>[] = [];
  for (const [css] of svg.matchAll(/@font-face\s*\{[^}]+\}/g)) {
    if (!/font-family:\s*['"]Inter Variable['"]/.test(css)) continue;
    const source = css.match(
      /url\((data:font\/woff2;base64,[A-Za-z0-9+/=]+)\)/,
    )?.[1];
    if (!source) continue;
    let task = embeddedLoads.get(source);
    if (!task) {
      const face = new FontFace("Inter Variable", `url(${source})`, {
        style: css.match(/font-style:\s*([^;]+)/)?.[1],
        weight: css.match(/font-weight:\s*([^;]+)/)?.[1],
        unicodeRange: css.match(/unicode-range:\s*([^;]+)/)?.[1],
      });
      task = face.load().catch(() => {
        embeddedLoads.delete(source);
        throw Error("Could not load a bundled font for export");
      });
      if (embeddedLoads.size >= 32) embeddedLoads.clear();
      embeddedLoads.set(source, task);
    }
    pending.push(task);
  }
  await Promise.all(pending);
}
async function fetchFont(url: string) {
  let pending = loaded.get(url);
  if (!pending) {
    pending = fetch(url)
      .then(async (r) => {
        if (!r.ok) throw Error("Could not load a bundled font for export");
        const data = new Uint8Array(await r.arrayBuffer());
        if (data.length > 2 * 1024 * 1024) throw Error("Invalid bundled font");
        return data;
      })
      .catch((e) => {
        loaded.delete(url);
        throw e;
      });
    loaded.set(url, pending);
  }
  return pending;
}
function base64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 4096)
    binary += String.fromCharCode(...bytes.subarray(i, i + 4096));
  return btoa(binary);
}
export async function bundledFontCss(
  nodes: Node[],
  loader?: (url: string) => Promise<Uint8Array>,
) {
  // Server-side geometry tests do not fetch browser asset URLs.
  if (!loader && typeof window === "undefined") return "";
  const chars = new Set<number>();
  for (const n of nodes) {
    if (
      n.type !== "text" ||
      !n.visible ||
      (n.fidelity?.text?.characters === n.text &&
        ((n.fidelity.textPath && n.fidelity.text.glyphs) ||
          hasSavedTextOutlines(n)))
    )
      continue;
    if (usesBundledInter(n.fontFamily))
      for (const c of n.text) chars.add(c.codePointAt(0)!);
    for (const r of n.textFlow?.runs ?? n.fidelity?.text?.spans ?? [])
      if (r.fontFamily && usesBundledInter(r.fontFamily))
        for (const c of n.text.slice(r.start, r.end))
          chars.add(c.codePointAt(0)!);
  }
  const required = faces.filter((face) =>
    [...chars].some((cp) =>
      face.ranges.some(([a, b = a]) => cp >= a && cp <= b),
    ),
  );
  return (
    await Promise.all(
      required.map(async (f) => {
        if (!f.url) throw Error("Could not load a bundled font for export");
        const data = await (loader ?? fetchFont)(f.url);
        return f.css
          .replace(
            /url\([^)]*\)/,
            `url(data:font/woff2;base64,${base64(data)})`,
          )
          .replace("font-display: swap", "font-display: block");
      }),
    )
  ).join("\n");
}
