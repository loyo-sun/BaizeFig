import { DOMParser } from "@xmldom/xmldom";
import paper from "paper";
import {
  makeNode,
  id,
  validateDocument,
  emptyDocument,
  type Node,
  type Document,
} from "./core";
import { multiply, inverse, identity, type Matrix } from "./fidelity";
import { parsePaths, transformedPath } from "./vectorGeometry";
import { networkBounds } from "./pathBounds";
import type { ImportedPaint } from "./appearance";
interface Xml {
  localName: string;
  nodeName: string;
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<Xml>;
  attributes: ArrayLike<{ name: string; value: string }>;
  getAttribute: (name: string) => string | null;
}
export interface SvgImportReport {
  layers: number;
  warnings: string[];
}
export interface SvgImportResult {
  nodes: Node[];
  rootId: string;
  report: SvgImportReport;
}
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
const kids = (e: Xml) =>
  Array.from(e.childNodes).filter((n) => n.nodeType === 1);
const attr = (e: Xml, name: string, fallback = "") =>
  e.getAttribute(name) ?? fallback;
const nums = (s: string) =>
  s.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)?.map(Number) ?? [];
const finite = (n: number) => {
  if (!Number.isFinite(n) || Math.abs(n) > 1e8)
    throw Error("SVG geometry is outside supported limits");
  return n;
};
export function svgTransform(value: string): Matrix {
  let m: Matrix = [...identity];
  let rest = value;
  for (const match of value.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
    if (
      match[2]
        .replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g, "")
        .replace(/[\s,]/g, "")
    )
      throw Error("Invalid SVG transform");
    const v = nums(match[2]);
    let next: Matrix;
    switch (match[1]) {
      case "matrix":
        if (v.length !== 6) throw Error("Invalid SVG transform");
        next = v as Matrix;
        break;
      case "translate":
        if (![1, 2].includes(v.length)) throw Error("Invalid SVG transform");
        next = [1, 0, 0, 1, v[0], v[1] ?? 0];
        break;
      case "scale":
        if (![1, 2].includes(v.length)) throw Error("Invalid SVG transform");
        next = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
        break;
      case "rotate": {
        if (![1, 3].includes(v.length)) throw Error("Invalid SVG transform");
        const r = (v[0] * Math.PI) / 180,
          c = Math.cos(r),
          s = Math.sin(r),
          x = v[1] ?? 0,
          y = v[2] ?? 0;
        next = [c, s, -s, c, x - c * x + s * y, y - s * x - c * y];
        break;
      }
      case "skewX":
        next = [1, 0, Math.tan((v[0] * Math.PI) / 180), 1, 0, 0];
        break;
      case "skewY":
        next = [1, Math.tan((v[0] * Math.PI) / 180), 0, 1, 0, 0];
        break;
      default:
        throw Error("Unsupported SVG transform");
    }
    next.forEach(finite);
    m = multiply(m, next);
    rest = rest.replace(match[0], "");
  }
  if (rest.trim()) throw Error("Invalid SVG transform");
  return m;
}
const translations: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  orange: "#ffa500",
  purple: "#800080",
  gray: "#808080",
  grey: "#808080",
  transparent: "#00000000",
  rebeccapurple: "#663399",
};
export function svgColor(value: string, opacity = 1): string {
  let c = value.trim().toLowerCase();
  c = translations[c] ?? c;
  if (/^#[0-9a-f]{3,4}$/.test(c))
    c = "#" + [...c.slice(1)].map((x) => x + x).join("");
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(c)) {
    const alpha = (parseInt(c.slice(7) || "ff", 16) / 255) * opacity;
    return (
      c.slice(0, 7) +
      (alpha < 1
        ? Math.round(Math.max(0, Math.min(1, alpha)) * 255)
            .toString(16)
            .padStart(2, "0")
        : "")
    );
  }
  const rgb = c.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const tokens = rgb[1].trim().split(/[\s,\/]+/);
    if (tokens.length < 3 || tokens.length > 4)
      throw Error("Unsupported SVG color");
    const channels = tokens
      .slice(0, 3)
      .map((s) =>
        Math.round(
          Math.max(
            0,
            Math.min(
              255,
              Number(s.replace("%", "")) * (s.endsWith("%") ? 2.55 : 1),
            ),
          ),
        ),
      );
    const a = tokens[3]
      ? Number(tokens[3].replace("%", "")) *
        (tokens[3].endsWith("%") ? 0.01 : 1)
      : 1;
    if ([...channels, a].some((n) => !Number.isFinite(n)))
      throw Error("Unsupported SVG color");
    return svgColor(
      "#" + channels.map((n) => n.toString(16).padStart(2, "0")).join(""),
      a * opacity,
    );
  }
  throw Error("Unsupported SVG color: " + value);
}
export function validateSvgPath(d: string) {
  const token =
    /[MLHVQCSTAZmlhvqcstaz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
  if (d.replace(token, "").replace(/[\s,]/g, ""))
    throw Error("Invalid SVG path");
  const tokens = d.match(token) ?? [];
  if (tokens.length > 250000) throw Error("SVG path exceeds processing limits");
  if (tokens.length && !/^[Mm]$/.test(tokens[0]!))
    throw Error("SVG paths must start with Move");
  const counts: Record<string, number> = {
    M: 2,
    L: 2,
    H: 1,
    V: 1,
    C: 6,
    S: 4,
    Q: 4,
    T: 2,
    A: 7,
    Z: 0,
  };
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++].toUpperCase(),
      count = counts[command];
    if (count === undefined) throw Error("Invalid SVG path");
    const values: number[] = [];
    while (i < tokens.length && !/^[MLHVQCSTAZ]$/i.test(tokens[i]))
      values.push(finite(Number(tokens[i++])));
    if (
      count === 0
        ? values.length !== 0
        : values.length === 0 || values.length % count !== 0
    )
      throw Error("Invalid SVG path arguments");
    if (command === "A")
      for (let k = 0; k < values.length; k += 7)
        if (
          values[k] < 0 ||
          values[k + 1] < 0 ||
          ![0, 1].includes(values[k + 3]) ||
          ![0, 1].includes(values[k + 4])
        )
          throw Error("Invalid SVG arc");
  }
}
export function importSvg(
  source: string,
  pageId: string,
  name = "SVG",
): SvgImportResult {
  if (source.length > 8 * 1024 * 1024)
    throw Error("SVG exceeds 8 MiB processing limit");
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw Error("SVG document types and entities are not allowed");
  const errors: string[] = [];
  const xml = new DOMParser({
    onError: (level: string, message: string) => {
      errors.push(level + ": " + message);
    },
  }).parseFromString(source, "image/svg+xml");
  if (
    errors.length ||
    !xml.documentElement ||
    xml.documentElement.localName !== "svg"
  )
    throw Error("Invalid SVG XML");
  const root = xml.documentElement as unknown as Xml,
    nodes: Node[] = [],
    warnings = new Set<string>(),
    byId = new Map<string, Xml>();
  let count = 0;
  const inspect = (e: Xml, depth = 0) => {
    if (depth > 128 || ++count > 15000)
      throw Error("SVG structure exceeds processing limits");
    const key = attr(e, "id");
    if (key) {
      if (byId.has(key)) throw Error("Duplicate SVG id");
      byId.set(key, e);
    }
    for (const a of Array.from(e.attributes))
      if (/^on/i.test(a.name)) warnings.add("Removed SVG event attributes");
    for (const c of kids(e)) inspect(c, depth + 1);
  };
  inspect(root);
  const warn = (s: string) => warnings.add(s);
  const length = (value: string, fallback: number, percent = 1) => {
    if (!value) return fallback;
    const m = value.trim().match(/^([-+\d.eE]+)(px|pt|pc|mm|cm|in|%)?$/);
    if (!m) throw Error("Unsupported SVG length: " + value);
    const unit = m[2] ?? "px",
      scale = (
        {
          px: 1,
          pt: 96 / 72,
          pc: 16,
          mm: 96 / 25.4,
          cm: 96 / 2.54,
          in: 96,
          "%": percent / 100,
        } as Record<string, number>
      )[unit];
    return finite(Number(m[1]) * scale);
  };
  const vb = nums(attr(root, "viewBox"));
  if (vb.length && (vb.length !== 4 || vb[2] <= 0 || vb[3] <= 0))
    throw Error("Invalid SVG viewBox");
  const width = length(attr(root, "width"), vb[2] ?? 300, vb[2] ?? 300),
    height = length(attr(root, "height"), vb[3] ?? 150, vb[3] ?? 150);
  if (width <= 0 || height <= 0 || width * height > 1e9)
    throw Error("SVG dimensions are outside supported limits");
  const viewport = [vb[2] ?? width, vb[3] ?? height];
  function viewTransform(
    view: number[],
    w: number,
    h: number,
    aspect: string,
  ): Matrix {
    if (!view.length) return [...identity];
    let sx = w / view[2],
      sy = h / view[3],
      dx = 0,
      dy = 0;
    if (!aspect.startsWith("none")) {
      const scale = aspect.includes("slice")
        ? Math.max(sx, sy)
        : Math.min(sx, sy);
      sx = sy = scale;
      dx =
        (w - view[2] * scale) *
        (aspect.includes("xMin") ? 0 : aspect.includes("xMax") ? 1 : 0.5);
      dy =
        (h - view[3] * scale) *
        (aspect.includes("YMin") ? 0 : aspect.includes("YMax") ? 1 : 0.5);
    }
    return [sx, 0, 0, sy, dx - view[0] * sx, dy - view[1] * sy];
  }
  const frame = makeNode("frame", pageId, {
    id: id(),
    name,
    width,
    height,
    x: 80,
    y: 80,
    fill: "none",
    fidelity: { size: [width, height], clipsContent: true },
  });
  nodes.push(frame);
  function group(
    label: string,
    parentId: string,
    m: Matrix,
    opacity = 1,
  ): Node {
    m.forEach(finite);
    const n = makeNode("group", pageId, {
      name: label,
      parentId,
      width: viewport[0],
      height: viewport[1],
      x: m[4],
      y: m[5],
      fill: "none",
      opacity,
      fidelity: {
        size: [viewport[0], viewport[1]],
        linear: [m[0], m[1], m[2], m[3]],
      },
    });
    nodes.push(n);
    if (nodes.length > 30000)
      throw Error("SVG layer count exceeds processing limits");
    return n;
  }
  const cssRules: {
    selector: string;
    style: Record<string, string>;
    specificity: number;
    order: number;
  }[] = [];
  function declarations(value: string) {
    return Object.fromEntries(
      value.split(";").flatMap((pair) => {
        const at = pair.indexOf(":");
        return at > 0
          ? [
              [
                pair.slice(0, at).trim().toLowerCase(),
                pair
                  .slice(at + 1)
                  .trim()
                  .replace(/\s*!important\s*$/, ""),
              ],
            ]
          : [];
      }),
    );
  }
  for (const e of byTag(root, "style")) {
    const css = e.textContent ?? "";
    if (/@|!important|\/\*/.test(css))
      warn("Complex SVG stylesheets require review");
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
      for (const selector of match[1].split(",").map((s) => s.trim())) {
        if (!/^(?:[\w-]+)?(?:[.#][\w-]+)*$/.test(selector)) {
          warn("Unsupported SVG CSS selector: " + selector);
          continue;
        }
        cssRules.push({
          selector,
          style: declarations(match[2]),
          specificity:
            (selector.match(/#/g)?.length ?? 0) * 100 +
            (selector.match(/\./g)?.length ?? 0) * 10 +
            (/^[a-z]/i.test(selector) ? 1 : 0),
          order: cssRules.length,
        });
      }
  }
  function byTag(e: Xml, tag: string): Xml[] {
    return [e, ...kids(e).flatMap((c) => byTag(c, tag))].filter(
      (c) => c.localName === tag,
    );
  }
  const inheritedKeys = [
    "fill",
    "fill-opacity",
    "fill-rule",
    "clip-rule",
    "stroke",
    "stroke-opacity",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "stroke-dashoffset",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "visibility",
  ];
  function styles(e: Xml, parent: Record<string, string>) {
    const s: Record<string, string> = Object.fromEntries(
      inheritedKeys.flatMap((k) =>
        parent[k] !== undefined ? [[k, parent[k]]] : [],
      ),
    );
    for (const a of Array.from(e.attributes)) s[a.name] = a.value;
    for (const rule of [...cssRules].sort(
      (a, b) => a.specificity - b.specificity || a.order - b.order,
    )) {
      const tag = rule.selector.match(/^[\w-]+/)?.[0],
        idPart = rule.selector.match(/#([\w-]+)/)?.[1],
        classes = [...rule.selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      if (
        (!tag || tag === e.localName) &&
        (!idPart || idPart === attr(e, "id")) &&
        classes.every((c) => attr(e, "class").split(/\s+/).includes(c))
      )
        Object.assign(s, rule.style);
    }
    Object.assign(s, declarations(attr(e, "style")));
    if (s.fill === "currentColor") s.fill = s.color ?? "#000";
    if (s.stroke === "currentColor") s.stroke = s.color ?? "#000";
    return s;
  }
  function gradient(
    reference: string,
    box: { x: number; y: number; width: number; height: number },
    opacity: number,
  ): ImportedPaint | undefined {
    const key = reference.match(/^url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)$/)?.[1];
    if (!key) {
      warn("External or invalid SVG paint reference was blocked");
      return;
    }
    let e = byId.get(key);
    if (!e || !["linearGradient", "radialGradient"].includes(e.localName)) {
      warn("Unsupported or missing SVG paint: " + key);
      return;
    }
    const attributes: Record<string, string> = {},
      seen = new Set<string>();
    let stops: Xml[] = [];
    const kind = e.localName;
    while (e) {
      if (seen.has(attr(e, "id"))) {
        warn("Cyclic SVG gradient reference");
        return;
      }
      seen.add(attr(e, "id"));
      for (const a of Array.from(e.attributes))
        if (attributes[a.name] === undefined) attributes[a.name] = a.value;
      if (!stops.length) stops = kids(e).filter((c) => c.localName === "stop");
      const href: string = attr(e, "href") || attr(e, "xlink:href");
      if (href && !href.startsWith("#")) {
        warn("External SVG gradient was blocked");
        break;
      }
      e = href ? byId.get(href.slice(1)) : undefined;
    }
    if (attributes.spreadMethod && attributes.spreadMethod !== "pad")
      warn("SVG gradient spread is approximated as pad");
    const user = attributes.gradientUnits === "userSpaceOnUse",
      unit = (v: string, f: number, axis: number) =>
        length(v, f, user ? viewport[axis] : 1),
      matrix = svgTransform(attributes.gradientTransform ?? "");
    let canonical: Matrix;
    if (kind === "linearGradient") {
      const x1 = unit(attributes.x1 ?? "", 0, 0),
        y1 = unit(attributes.y1 ?? "", 0, 1),
        x2 = unit(attributes.x2 ?? "", user ? viewport[0] : 1, 0),
        y2 = unit(attributes.y2 ?? "", 0, 1),
        dx = x2 - x1,
        dy = y2 - y1;
      canonical = [dx, dy, -dy, dx, x1 + dy * 0.5, y1 - dx * 0.5];
    } else {
      const cx = unit(attributes.cx ?? "", user ? viewport[0] / 2 : 0.5, 0),
        cy = unit(attributes.cy ?? "", user ? viewport[1] / 2 : 0.5, 1),
        r = unit(
          attributes.r ?? "",
          user ? Math.hypot(...viewport) / Math.SQRT2 / 2 : 0.5,
          0,
        );
      canonical = [2 * r, 0, 0, 2 * r, cx - r, cy - r];
      if (attributes.fx || attributes.fy || attributes.fr)
        warn("Focal SVG radial gradients use a centered focus");
    }
    const local: Matrix = [1, 0, 0, 1, -box.x, -box.y],
      bbox: Matrix = user
        ? [...identity]
        : [box.width, 0, 0, box.height, box.x, box.y];
    let transform: Matrix;
    try {
      transform = inverse(
        multiply(local, multiply(bbox, multiply(matrix, canonical))),
      );
    } catch {
      warn("Degenerate SVG gradient omitted");
      return;
    }
    let last = 0;
    const parsedStops = stops.slice(0, 1000).map((stop) => {
      const style = styles(stop, {}),
        position = Math.max(
          last,
          Math.max(0, Math.min(1, length(style.offset ?? "", 0, 1))),
        );
      last = position;
      return {
        position,
        color: svgColor(
          style["stop-color"] ?? "#000",
          Math.max(0, Math.min(1, Number(style["stop-opacity"] ?? 1))),
        ),
      };
    });
    if (stops.length > 1000)
      throw Error("SVG gradient stop count exceeds processing limits");
    return {
      type: kind === "linearGradient" ? "linear" : "radial",
      space: "user",
      transform,
      opacity,
      stops: parsedStops,
    };
  }
  function pathData(e: Xml): string | undefined {
    const n = e.localName,
      x = length(attr(e, "x"), 0, viewport[0]),
      y = length(attr(e, "y"), 0, viewport[1]);
    if (n === "path") return attr(e, "d");
    if (n === "rect") {
      const w = length(attr(e, "width"), 0, viewport[0]),
        h = length(attr(e, "height"), 0, viewport[1]);
      if (w <= 0 || h <= 0) return "";
      const rx = Math.min(
          w / 2,
          Math.max(0, length(attr(e, "rx"), length(attr(e, "ry"), 0))),
        ),
        ry = Math.min(h / 2, Math.max(0, length(attr(e, "ry"), rx)));
      return rx && ry
        ? `M${x + rx} ${y} H${x + w - rx} A${rx} ${ry} 0 0 1 ${x + w} ${y + ry} V${y + h - ry} A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} H${x + rx} A${rx} ${ry} 0 0 1 ${x} ${y + h - ry} V${y + ry} A${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
        : `M${x} ${y}h${w}v${h}h${-w}Z`;
    }
    if (n === "circle" || n === "ellipse") {
      const cx = length(attr(e, "cx"), 0, viewport[0]),
        cy = length(attr(e, "cy"), 0, viewport[1]),
        rx = length(attr(e, n === "circle" ? "r" : "rx"), 0, viewport[0]),
        ry = n === "circle" ? rx : length(attr(e, "ry"), 0, viewport[1]);
      if (rx <= 0 || ry <= 0) return "";
      return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    if (n === "line")
      return `M${length(attr(e, "x1"), 0)} ${length(attr(e, "y1"), 0)}L${length(attr(e, "x2"), 0)} ${length(attr(e, "y2"), 0)}`;
    if (n === "polyline" || n === "polygon") {
      const points = nums(attr(e, "points"));
      if (points.length % 2) throw Error("Invalid SVG points");
      return points.length
        ? "M" + points.join(" ") + (n === "polygon" ? "Z" : "")
        : "";
    }
    return;
  }
  function addPath(
    e: Xml,
    parentId: string,
    style: Record<string, string>,
    mask = false,
  ) {
    const d = pathData(e);
    if (!d) return;
    if (d.length > 2000000 || !/^[MLHVQCSTAZmlhvqcstaz\d\s.,+eE-]*$/.test(d))
      throw Error("Invalid SVG path");
    validateSvgPath(d);
    const rule =
        style[mask ? "clip-rule" : "fill-rule"] === "evenodd"
          ? "evenodd"
          : "nonzero",
      network = parsePaths([{ d, rule }]),
      box = networkBounds(network);
    network.vertices.forEach((v) => {
      finite(v.x);
      finite(v.y);
    });
    const w = Math.max(box.width, 0.001),
      h = Math.max(box.height, 0.001),
      normalized = transformedPath(d, [1, 0, 0, 1, -box.x, -box.y]);
    const node = makeNode("path", pageId, {
      name: attr(e, "id") || e.localName,
      parentId,
      x: box.x,
      y: box.y,
      width: w,
      height: h,
      fill: mask ? "#fff" : "#000000",
      stroke: "none",
      strokeWidth: 0,
      fidelity: {
        size: [w, h],
        paths: [{ d: normalized, rule }],
        network: parsePaths([{ d: normalized, rule }]),
      },
    });
    const opacity = (k: string) =>
      Math.max(0, Math.min(1, finite(Number(style[k] ?? 1))));
    const fill = style.fill ?? "#000";
    if (!mask) {
      if (fill === "none") node.fill = "none";
      else if (fill.startsWith("url(")) {
        const paint = gradient(fill, box, opacity("fill-opacity"));
        if (paint) node.fidelity!.paints = [paint];
        else node.fill = "none";
      } else node.fill = svgColor(fill, opacity("fill-opacity"));
      const stroke = style.stroke ?? "none";
      if (stroke !== "none") {
        if (stroke.startsWith("url(")) warn("SVG gradient strokes are omitted");
        else {
          node.stroke = svgColor(stroke);
          node.strokeWidth = Math.max(
            0,
            length(style["stroke-width"] ?? "", 1),
          );
          node.fidelity!.strokeOpacity = opacity("stroke-opacity");
        }
      }
      if (["butt", "round", "square"].includes(style["stroke-linecap"]))
        node.fidelity!.strokeCap = style["stroke-linecap"] as "butt";
      if (["miter", "round", "bevel"].includes(style["stroke-linejoin"]))
        node.fidelity!.strokeJoin = style["stroke-linejoin"] as "miter";
      if (style["stroke-miterlimit"])
        node.fidelity!.strokeMiterLimit = Math.max(
          1,
          finite(Number(style["stroke-miterlimit"])),
        );
      if (style["stroke-dasharray"] && style["stroke-dasharray"] !== "none") {
        const dash = nums(style["stroke-dasharray"]);
        if (dash.some((n) => n <= 0))
          warn("Zero or negative SVG dash patterns are omitted");
        else node.fidelity!.strokeDash = dash;
      }
      if (style["stroke-dashoffset"])
        node.fidelity!.strokeDashOffset = length(style["stroke-dashoffset"], 0);
      if (style["vector-effect"])
        warn("Non-scaling SVG strokes are not retained");
    }
    nodes.push(node);
    return box;
  }
  const activeRefs = new Set<string>();
  function walk(
    e: Xml,
    parentId: string,
    parentStyle: Record<string, string>,
    mask = false,
    depth = 0,
  ) {
    if (depth > 128) throw Error("SVG nesting exceeds processing limits");
    const tag = e.localName;
    if (
      [
        "defs",
        "title",
        "desc",
        "metadata",
        "style",
        "linearGradient",
        "radialGradient",
        "clipPath",
        "symbol",
      ].includes(tag)
    )
      return;
    if (
      [
        "script",
        "foreignObject",
        "iframe",
        "audio",
        "video",
        "animate",
        "animateTransform",
        "set",
      ].includes(tag)
    ) {
      warn("Removed active or unsupported SVG element: " + tag);
      return;
    }
    const style = styles(e, parentStyle);
    for (const key of [
      "marker-start",
      "marker-mid",
      "marker-end",
      "paint-order",
      "writing-mode",
      "textLength",
      "lengthAdjust",
    ])
      if (style[key]) warn("Unsupported SVG property: " + key);
    if (style.filter && style.filter !== "none")
      warn("SVG filters are omitted");

    if (style["mix-blend-mode"]) warn("SVG blend modes require review");
    const transform = svgTransform(style.transform ?? ""),
      opacity = mask
        ? 1
        : Math.max(0, Math.min(1, finite(Number(style.opacity ?? 1))));
    const wrapper = group(attr(e, "id") || tag, parentId, transform, opacity);
    wrapper.visible = style.display !== "none" && style.visibility !== "hidden";
    if (tag === "use") {
      const href = attr(e, "href") || attr(e, "xlink:href");
      if (!href.startsWith("#")) {
        warn("External SVG use references are blocked");
        return;
      }
      if (activeRefs.has(href)) throw Error("Cyclic SVG use reference");
      const target = byId.get(href.slice(1));
      if (!target) {
        warn("Missing SVG use reference");
        return;
      }
      activeRefs.add(href);
      const placement = group("use position", wrapper.id, [
        1,
        0,
        0,
        1,
        length(attr(e, "x"), 0),
        length(attr(e, "y"), 0),
      ]);
      if (target.localName === "symbol") {
        for (const c of kids(target))
          walk(c, placement.id, style, mask, depth + 1);
        warn("SVG symbol viewBox requires review");
      } else walk(target, placement.id, style, mask, depth + 1);
      activeRefs.delete(href);
      return;
    }
    let content = wrapper.id;
    const clip = style["clip-path"];
    if (clip && clip !== "none") {
      const ref = clip.match(/^url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)$/)?.[1],
        definition = ref ? byId.get(ref) : undefined;
      if (!definition || definition.localName !== "clipPath")
        warn("Missing or external SVG clip was omitted");
      else {
        let m = svgTransform(attr(definition, "transform"));
        if (attr(definition, "clipPathUnits") === "objectBoundingBox") {
          const d = pathData(e);
          if (d) {
            const b = networkBounds(parsePaths([{ d, rule: "nonzero" }]));
            m = multiply([b.width, 0, 0, b.height, b.x, b.y], m);
          } else warn("Object bounding box clip on groups requires review");
        }
        const clipGroup = group("SVG clip", wrapper.id, m);
        clipGroup.fidelity!.mask = "alpha";
        for (const c of kids(definition))
          walk(c, clipGroup.id, {}, true, depth + 1);
        content = group("Clipped content", wrapper.id, [...identity]).id;
      }
    }
    if (style.mask && style.mask !== "none") {
      const ref = style.mask.match(
          /^url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)$/,
        )?.[1],
        definition = ref ? byId.get(ref) : undefined;
      if (!definition || definition.localName !== "mask")
        warn("Missing or external SVG mask was omitted");
      else {
        if (activeRefs.has("mask:" + ref))
          throw Error("Cyclic SVG mask reference");
        activeRefs.add("mask:" + ref);
        let m: Matrix = [...identity];
        if (attr(definition, "maskContentUnits") === "objectBoundingBox") {
          const d = pathData(e);
          if (d) {
            const b = networkBounds(parsePaths([{ d, rule: "nonzero" }]));
            m = [b.width, 0, 0, b.height, b.x, b.y];
          } else warn("Object bounding box mask on groups requires review");
        }
        const maskGroup = group("SVG mask", content, m);
        maskGroup.fidelity!.mask =
          styles(definition, {})["mask-type"] === "alpha"
            ? "alpha"
            : "luminance";
        for (const c of kids(definition))
          walk(c, maskGroup.id, {}, false, depth + 1);
        content = group("Masked content", content, [...identity]).id;
        if (attr(definition, "maskUnits") !== "userSpaceOnUse")
          warn("SVG mask region bounds require review");
        activeRefs.delete("mask:" + ref);
      }
    }
    if (tag === "g" || tag === "svg" || tag === "a") {
      let parent = content;
      if (tag === "svg" && e !== root) {
        const w = length(attr(e, "width"), viewport[0]),
          h = length(attr(e, "height"), viewport[1]),
          view = nums(attr(e, "viewBox"));
        parent = group(
          "SVG viewport",
          content,
          multiply(
            [1, 0, 0, 1, length(attr(e, "x"), 0), length(attr(e, "y"), 0)],
            viewTransform(
              view,
              w,
              h,
              attr(e, "preserveAspectRatio", "xMidYMid meet"),
            ),
          ),
        ).id;
        warn("Nested SVG overflow requires review");
      }
      for (const c of kids(e)) walk(c, parent, style, mask, depth + 1);
      return;
    }
    if (tag === "text") {
      warn(
        "SVG text uses local fonts; precise tspan positioning is not retained",
      );
      if (kids(e).length)
        warn("SVG tspan mixed positioning/style requires review");
      let color = "#000000";
      try {
        color = svgColor(style.fill ?? "#000");
      } catch {
        warn("SVG text paint is approximated");
      }
      const size = Math.max(1, length(style["font-size"] ?? "", 16));
      nodes.push(
        makeNode("text", pageId, {
          name: attr(e, "id") || "SVG text",
          parentId: content,
          text: e.textContent ?? "",
          x: length(attr(e, "x"), 0),
          y: length(attr(e, "y"), 0) - size,
          width: viewport[0],
          height: size * 1.4,
          fontSize: size,
          fontFamily: style["font-family"] ?? "Arial, sans-serif",
          fontWeight:
            style["font-weight"] === "bold"
              ? 700
              : Number(style["font-weight"]) || 400,
          fill: color,
          textFlow: {
            autoResize: "both",
            verticalAlign: "top",
            letterSpacing: 0,
          },
        }),
      );
      return;
    }
    if (tag === "image") {
      warn("SVG image references are omitted; import bitmap assets separately");
      return;
    }
    if (pathData(e) !== undefined) {
      addPath(e, content, style, mask);
      return;
    }
    warn("Unsupported SVG element: " + tag);
  }
  const viewGroup = group(
    "SVG viewBox",
    frame.id,
    viewTransform(
      vb,
      width,
      height,
      attr(root, "preserveAspectRatio", "xMidYMid meet"),
    ),
  );
  const rootStyle = styles(root, {});
  if (rootStyle.filter && rootStyle.filter !== "none")
    warn("SVG filters are omitted");
  if (rootStyle.mask || rootStyle["clip-path"])
    warn("SVG root mask or clip requires review");
  const rootGroup = group(
    "SVG content",
    viewGroup.id,
    svgTransform(attr(root, "transform")),
    Math.max(0, Math.min(1, Number(rootStyle.opacity ?? 1))),
  );
  rootGroup.visible =
    rootStyle.display !== "none" && rootStyle.visibility !== "hidden";
  for (const e of kids(root)) walk(e, rootGroup.id, rootStyle);
  const doc = emptyDocument();
  doc.pages = [{ id: pageId, name: "SVG" }];
  doc.nodes = nodes;
  validateDocument(doc);
  return {
    nodes,
    rootId: frame.id,
    report: { layers: nodes.length, warnings: [...warnings] },
  };
}
