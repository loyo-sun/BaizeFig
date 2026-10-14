import type { Document, Node } from "./core";
import { reflowText } from "./textLayout";
export type Track = { kind: "fixed" | "fr" | "hug"; value: number };
export interface LayoutItem {
  grow?: number;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  absolute?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  column?: number;
  row?: number;
  columnSpan?: number;
  rowSpan?: number;
}
const bounded = (n: Node, key: "width" | "height", value: number) =>
  Math.max(
    n.layoutItem?.[key === "width" ? "minWidth" : "minHeight"] ?? 0,
    Math.min(
      n.layoutItem?.[key === "width" ? "maxWidth" : "maxHeight"] ?? Infinity,
      value,
    ),
  );
export function applyConstraints(original: Document, doc: Document): void {
  const visited = new Set<string>();
  function visit(parent: Node) {
    if (visited.has(parent.id)) return;
    visited.add(parent.id);
    const old = original.nodes.find((n) => n.id === parent.id);
    if (!old) return;
    for (const child of doc.nodes.filter((n) => n.parentId === parent.id)) {
      const before = original.nodes.find((n) => n.id === child.id);
      if (!before) continue;
      if (
        !parent.layout ||
        parent.layout === "none" ||
        child.layoutItem?.absolute
      ) {
        for (const horizontal of [true, false]) {
          const key = horizontal ? "width" : "height",
            pos = horizontal ? "x" : "y",
            mode =
              child.constraints?.[horizontal ? "horizontal" : "vertical"] ??
              "min",
            delta = parent[key] - old[key];
          if (!delta) continue;
          if (mode === "max") child[pos] = before[pos] + delta;
          else if (mode === "center") child[pos] = before[pos] + delta / 2;
          else if (mode === "stretch")
            child[key] = bounded(child, key, before[key] + delta);
          else if (mode === "scale" && old[key] > 0) {
            const scale = parent[key] / old[key];
            child[pos] = before[pos] * scale;
            child[key] = bounded(child, key, before[key] * scale);
          }
        }
      }
      if (child.type === "text" && child.width !== before.width)
        reflowText(child);
      visit(child);
    }
  }
  for (const root of doc.nodes.filter((n) => !n.parentId)) visit(root);
}
export function layoutContainer(n: Node, children: Node[]): void {
  const config = n.importedLayout!;
  const [top, right, bottom, left] = config.padding;
  const items = children.filter(
    (c) => c.visible && !c.layoutItem?.absolute && !c.importedLayout?.absolute,
  );
  if (n.layout === "grid") {
    grid(n, items);
    return;
  }
  const horizontal = n.layout === "horizontal",
    main = horizontal ? "width" : "height",
    cross = horizontal ? "height" : "width",
    mp = horizontal ? "x" : "y",
    cp = horizontal ? "y" : "x";
  const before = horizontal ? left : top,
    after = horizontal ? right : bottom,
    cBefore = horizontal ? top : left,
    cAfter = horizontal ? bottom : right,
    gap = n.gap ?? 0,
    cGap = config.counterGap ?? gap;
  if (config.primary === "hug" && !config.wrap)
    n[main] = Math.max(
      1,
      before +
        after +
        items.reduce((sum, c) => sum + c[main], 0) +
        Math.max(0, items.length - 1) * gap,
    );
  const available = Math.max(0, n[main] - before - after),
    lines: Node[][] = [[]];
  let used = 0;
  for (const c of items) {
    const line = lines[lines.length - 1],
      need = c[main] + (line.length ? gap : 0);
    if (config.wrap && line.length && used + need > available) {
      lines.push([c]);
      used = c[main];
    } else {
      line.push(c);
      used += need;
    }
  }
  const crossSizes: number[] = [];
  for (const line of lines) {
    const fixed = line
        .filter((c) => !c.layoutItem?.grow)
        .reduce((sum, c) => sum + c[main], 0),
      growing = line.filter((c) => (c.layoutItem?.grow ?? 0) > 0),
      room = available - fixed - Math.max(0, line.length - 1) * gap;
    // Freeze constrained items, then redistribute the remaining free space.
    let pending = [...growing],
      remaining = Math.max(0, room);
    while (pending.length) {
      const weight = pending.reduce(
        (sum, c) => sum + (c.layoutItem?.grow ?? 0),
        0,
      );
      const frozen = pending.filter((c) => {
        const share = (remaining * (c.layoutItem?.grow ?? 0)) / weight;
        return bounded(c, main, share) !== share;
      });
      if (!frozen.length) {
        for (const c of pending)
          c[main] = (remaining * (c.layoutItem?.grow ?? 0)) / weight;
        break;
      }
      for (const c of frozen) {
        c[main] = bounded(
          c,
          main,
          (remaining * (c.layoutItem?.grow ?? 0)) / weight,
        );
      }
      remaining = Math.max(
        0,
        remaining - frozen.reduce((sum, c) => sum + c[main], 0),
      );
      pending = pending.filter((c) => !frozen.includes(c));
    }
    for (const c of line) if (c.type === "text") reflowText(c);
    crossSizes.push(Math.max(0, ...line.map((c) => c[cross])));
  }
  if (config.counter === "hug")
    n[cross] = Math.max(
      1,
      cBefore +
        cAfter +
        crossSizes.reduce((a, b) => a + b, 0) +
        Math.max(0, lines.length - 1) * cGap,
    );
  if (!config.wrap && config.counter === "fixed")
    crossSizes[0] = Math.max(0, n[cross] - cBefore - cAfter);
  let crossPos = cBefore;
  lines.forEach((line, li) => {
    const free =
      available -
      line.reduce((sum, c) => sum + c[main], 0) -
      Math.max(0, line.length - 1) * gap;
    let actualGap = gap,
      pos = before;
    if (config.justify === "center") pos += free / 2;
    else if (config.justify === "end") pos += free;
    else if (config.justify === "space-between" && line.length > 1)
      actualGap += free / (line.length - 1);
    else if (config.justify === "space-around" && line.length) {
      actualGap += free / line.length;
      pos += free / (2 * line.length);
    } else if (config.justify === "space-evenly") {
      actualGap += free / (line.length + 1);
      pos += free / (line.length + 1);
    }
    const baseline = Math.max(
      0,
      ...line.map((c) => (c.type === "text" ? c.fontSize : c[cross])),
    );
    for (const c of line) {
      const align = c.layoutItem?.align ?? config.align;
      if (align === "stretch") c[cross] = bounded(c, cross, crossSizes[li]);
      if (c.type === "text") reflowText(c);
      const freeCross = crossSizes[li] - c[cross];
      c[mp] = pos;
      c[cp] =
        crossPos +
        (align === "center"
          ? freeCross / 2
          : align === "end"
            ? freeCross
            : align === "baseline" && horizontal
              ? baseline - (c.type === "text" ? c.fontSize : c[cross])
              : 0);
      pos += c[main] + actualGap;
    }
    crossPos += crossSizes[li] + cGap;
  });
}
function grid(n: Node, items: Node[]) {
  const config = n.importedLayout!,
    g = config.grid ?? {
      columns: [
        { kind: "fr" as const, value: 1 },
        { kind: "fr" as const, value: 1 },
      ],
      rows: [],
      columnGap: n.gap ?? 0,
      rowGap: config.counterGap ?? n.gap ?? 0,
    },
    [top, right, bottom, left] = config.padding;
  const cols = g.columns.length
      ? g.columns
      : [{ kind: "fr" as const, value: 1 }],
    columnCount = cols.length;
  const occupied = new Set<string>();
  const placements = items.map((node) => {
    const cs = Math.max(
        1,
        Math.min(columnCount, node.layoutItem?.columnSpan ?? 1),
      ),
      rs = Math.max(1, node.layoutItem?.rowSpan ?? 1);
    let col = Math.min(columnCount - cs, node.layoutItem?.column ?? 0),
      row = node.layoutItem?.row ?? 0;
    const cells = (c: number, r: number) =>
      Array.from({ length: rs }, (_, dy) =>
        Array.from({ length: cs }, (_, dx) => `${c + dx}:${r + dy}`),
      ).flat();
    if (
      node.layoutItem?.column === undefined ||
      node.layoutItem?.row === undefined
    ) {
      let found = false;
      for (let r = row; r < 10000 && !found; r++)
        for (let c = node.layoutItem?.column ?? 0; c <= columnCount - cs; c++) {
          if (!cells(c, r).some((cell) => occupied.has(cell))) {
            col = c;
            row = r;
            found = true;
            break;
          }
          if (node.layoutItem?.column !== undefined) break;
        }
    }
    cells(col, row).forEach((cell) => occupied.add(cell));
    return { node, col, row, cs, rs };
  });
  const rowCount = Math.max(
      g.rows.length,
      1,
      ...placements.map((p) => p.row + p.rs),
    ),
    rows = Array.from(
      { length: rowCount },
      (_, i) => g.rows[i] ?? { kind: "hug" as const, value: 0 },
    );
  function tracks(
    spec: Track[],
    available: number,
    gap: number,
    axis: "width" | "height",
  ) {
    const sizes = spec.map((s, i) =>
      s.kind === "fixed"
        ? s.value
        : s.kind === "hug"
          ? Math.max(
              0,
              ...placements
                .filter(
                  (p) =>
                    (axis === "width" ? p.col : p.row) === i &&
                    (axis === "width" ? p.cs : p.rs) === 1,
                )
                .map((p) => p.node[axis]),
            )
          : 0,
    );
    const free = Math.max(
        0,
        available -
          sizes.reduce((a, b) => a + b, 0) -
          gap * Math.max(0, spec.length - 1),
      ),
      fr = spec.reduce((sum, s) => sum + (s.kind === "fr" ? s.value : 0), 0);
    return sizes.map((v, i) =>
      spec[i].kind === "fr" ? (free * spec[i].value) / Math.max(fr, 1) : v,
    );
  }
  const widths = tracks(cols, n.width - left - right, g.columnGap, "width"),
    heights = tracks(rows, n.height - top - bottom, g.rowGap, "height");
  for (const p of placements) {
    const col = p.col,
      row = p.row,
      cs = Math.min(p.cs, columnCount - col),
      rs = Math.min(p.rs, rowCount - row),
      width =
        widths.slice(col, col + cs).reduce((a, b) => a + b, 0) +
        g.columnGap * (cs - 1),
      height =
        heights.slice(row, row + rs).reduce((a, b) => a + b, 0) +
        g.rowGap * (rs - 1);
    p.node.x =
      left +
      widths.slice(0, col).reduce((a, b) => a + b, 0) +
      g.columnGap * col;
    p.node.y =
      top + heights.slice(0, row).reduce((a, b) => a + b, 0) + g.rowGap * row;
    p.node.width = bounded(p.node, "width", width);
    p.node.height = bounded(p.node, "height", height);
    if (p.node.type === "text") reflowText(p.node);
  }
  if (config.primary === "hug")
    n.width =
      left +
      right +
      widths.reduce((a, b) => a + b, 0) +
      g.columnGap * (columnCount - 1);
  if (config.counter === "hug")
    n.height =
      top +
      bottom +
      heights.reduce((a, b) => a + b, 0) +
      g.rowGap * (rowCount - 1);
}
