import React from "react";
import { type Document, type Node, bounds } from "./core";
export function starPoints(w: number, h: number, count = 5, ratio = 0.44) {
  return Array.from({ length: count * 2 }, (_, i) => {
    const r = i % 2 ? ratio : 1,
      a = (i * Math.PI) / count - Math.PI / 2;
    return `${w / 2 + ((Math.cos(a) * w) / 2) * r},${h / 2 + ((Math.sin(a) * h) / 2) * r}`;
  }).join(" ");
}
export function NodeShape({
  node: n,
  outline = false,
}: {
  node: Node;
  outline?: boolean;
}) {
  const shared = {
    fill: outline ? "none" : n.fill,
    stroke: outline ? "#78909c" : n.stroke,
    strokeWidth: outline ? 1 : n.strokeWidth,
  };
  if (n.type === "text")
    return (
      <text
        {...shared}
        fontFamily={n.fontFamily}
        fontSize={n.fontSize}
        fontWeight={n.fontWeight}
        textAnchor={
          n.textAlign === "center"
            ? "middle"
            : n.textAlign === "right"
              ? "end"
              : "start"
        }
        x={
          n.textAlign === "center"
            ? n.width / 2
            : n.textAlign === "right"
              ? n.width
              : 0
        }
        y={n.fontSize}
        style={{ userSelect: "none" }}
      >
        {n.text.split("\n").map((line, i) => (
          <tspan
            key={i}
            x={
              n.textAlign === "center"
                ? n.width / 2
                : n.textAlign === "right"
                  ? n.width
                  : 0
            }
            dy={i ? n.fontSize * n.lineHeight : 0}
          >
            {line || " "}
          </tspan>
        ))}
      </text>
    );
  if (n.type === "ellipse")
    return (
      <ellipse
        {...shared}
        cx={n.width / 2}
        cy={n.height / 2}
        rx={n.width / 2}
        ry={n.height / 2}
      />
    );
  if (n.type === "line")
    return (
      <line x1="0" y1="0" x2={n.width} y2={n.height} {...shared} fill="none" />
    );
  if (n.type === "star")
    return <polygon {...shared} points={starPoints(n.width, n.height)} />;
  if (n.type === "polygon")
    return (
      <polygon
        {...shared}
        points={`${n.width / 2},0 ${n.width},${n.height} 0,${n.height}`}
      />
    );
  if (n.type === "path")
    return (
      <polyline
        {...shared}
        points={(n.points ?? []).map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  if (n.type === "image" || n.image)
    return (
      <>
        <rect width={n.width} height={n.height} fill="#eceff1" />
        <image
          href={n.image}
          width={n.width}
          height={n.height}
          preserveAspectRatio="xMidYMid slice"
        />
      </>
    );
  if (n.type === "group" || n.type === "component" || n.type === "instance")
    return n.fill !== "none" ? (
      <rect {...shared} width={n.width} height={n.height} rx={n.radius} />
    ) : null;
  return <rect {...shared} width={n.width} height={n.height} rx={n.radius} />;
}
export function Scene({
  doc,
  pageId,
  onNode,
  outline = false,
  rootId,
}: {
  doc: Document;
  pageId: string;
  onNode?: (e: React.PointerEvent, id: string) => void;
  outline?: boolean;
  rootId?: string;
}) {
  function draw(n: Node): React.ReactNode {
    if (!n.visible) return null;
    return (
      <g
        key={n.id}
        data-node-id={n.id}
        data-node-name={n.name}
        transform={`translate(${n.x} ${n.y}) rotate(${n.rotation} ${n.width / 2} ${n.height / 2})`}
        opacity={n.opacity}
        onPointerDown={onNode ? (e) => onNode(e, n.id) : undefined}
      >
        {onNode && (
          <rect
            width={n.width}
            height={n.height}
            fill="transparent"
            stroke="none"
            pointerEvents="all"
          />
        )}
        <NodeShape node={n} outline={outline} />
        {n.type === "frame" && (
          <defs>
            <clipPath id={`clip-${n.id}`}>
              <rect width={n.width} height={n.height} rx={n.radius} />
            </clipPath>
          </defs>
        )}
        <g clipPath={n.type === "frame" ? `url(#clip-${n.id})` : undefined}>
          {doc.nodes
            .filter((c) => c.parentId === n.id && c.pageId === pageId)
            .map(draw)}
        </g>
      </g>
    );
  }
  const nodes = rootId
    ? doc.nodes.filter((n) => n.id === rootId)
    : doc.nodes.filter((n) => n.pageId === pageId && !n.parentId);
  return <>{nodes.map(draw)}</>;
}
export async function svgString(
  doc: Document,
  pageId: string,
  ids: string[] = [],
) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const included = ids.length
    ? doc.nodes.filter((n) => ids.includes(n.id))
    : doc.nodes.filter((n) => n.pageId === pageId && !n.parentId && n.visible);
  const b = bounds(doc, included);
  let exportDoc = doc;
  if (ids.length) {
    const selected = new Set(ids);
    const keep = new Set(ids);
    let change = true;
    while (change) {
      change = false;
      for (const n of doc.nodes)
        if (n.parentId && keep.has(n.parentId) && !keep.has(n.id)) {
          keep.add(n.id);
          change = true;
        }
    }
    exportDoc = {
      ...doc,
      nodes: doc.nodes
        .filter((n) => keep.has(n.id))
        .map((n) =>
          selected.has(n.id) && (!n.parentId || !keep.has(n.parentId))
            ? { ...n, ...world(doc, n), parentId: null }
            : n,
        ),
    };
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    renderToStaticMarkup(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={Math.max(1, b.width)}
        height={Math.max(1, b.height)}
        viewBox={`${b.x} ${b.y} ${Math.max(1, b.width)} ${Math.max(1, b.height)}`}
      >
        <Scene doc={exportDoc} pageId={pageId} />
      </svg>,
    )
  );
}
function world(doc: Document, n: Node) {
  let x = n.x,
    y = n.y,
    p = n.parentId;
  while (p) {
    const parent = doc.nodes.find((a) => a.id === p);
    if (!parent) break;
    x += parent.x;
    y += parent.y;
    p = parent.parentId;
  }
  return { x, y };
}
export async function raster(
  svg: string,
  scale = 1,
  type = "image/png",
): Promise<Blob> {
  const blob = new Blob([svg], { type: "image/svg+xml" }),
    url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.width * image.height * scale * scale > 40000000)
      throw Error("Export is too large. Reduce selection or scale.");
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, image.width * scale);
    canvas.height = Math.max(1, image.height * scale);
    const ctx = canvas.getContext("2d")!;
    if (type === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Export failed"))),
        type,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
