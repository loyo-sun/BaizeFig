import { inverse, multiply } from "./fidelity";
import React from "react";
import {
  type Document,
  type Node,
  bounds,
  localTransform,
  worldTransform,
} from "./core";
export function starPoints(w: number, h: number, count = 5, ratio = 0.44) {
  return Array.from({ length: count * 2 }, (_, i) => {
    const r = i % 2 ? ratio : 1,
      a = (i * Math.PI) / count - Math.PI / 2;
    return `${w / 2 + ((Math.cos(a) * w) / 2) * r},${h / 2 + ((Math.sin(a) * h) / 2) * r}`;
  }).join(" ");
}
function BasicNodeShape({
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
export function NodeShape({
  node: n,
  outline = false,
}: {
  node: Node;
  outline?: boolean;
}) {
  const f = n.fidelity;
  if (n.type === "text" && f?.text && f.text.characters === n.text)
    return (
      <text
        fill={outline ? "none" : n.fill}
        stroke={outline ? "#78909c" : undefined}
        fontFamily={n.fontFamily}
        fontSize={n.fontSize}
        fontWeight={n.fontWeight}
        letterSpacing={f.text.letterSpacing}
        style={{ whiteSpace: "pre", userSelect: "none" }}
      >
        {f.text.lines.map((line, i) => (
          <tspan key={i} x={line.x} y={line.y}>
            {textSpans(n, line.start, line.end)}
          </tspan>
        ))}
      </text>
    );
  if (f?.paths?.length)
    return (
      <g
        transform={`scale(${f.size[0] ? n.width / f.size[0] : 1} ${f.size[1] ? n.height / f.size[1] : 1})`}
      >
        {f.paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fillRule={p.rule}
            fill={
              outline
                ? "none"
                : (p.color ?? (p.strokeOutline ? n.stroke : n.fill))
            }
            stroke={
              outline
                ? "#78909c"
                : p.strokeOutline || f.paths?.some((a) => a.strokeOutline)
                  ? "none"
                  : n.stroke
            }
            strokeWidth={
              outline
                ? 1
                : p.strokeOutline || f.paths?.some((a) => a.strokeOutline)
                  ? 0
                  : n.strokeWidth
            }
            strokeLinecap={f.strokeCap ?? "butt"}
            strokeLinejoin={f.strokeJoin ?? "miter"}
          />
        ))}
      </g>
    );
  if (n.image) {
    const image = f?.image,
      clip = `image-clip-${n.id}`,
      pattern = `image-tile-${n.id}`;
    const corners = f?.corners;
    const shape = corners ? (
      <path d={roundedRect(n.width, n.height, corners)} />
    ) : n.type === "ellipse" ? (
      <ellipse
        cx={n.width / 2}
        cy={n.height / 2}
        rx={n.width / 2}
        ry={n.height / 2}
      />
    ) : (
      <rect width={n.width} height={n.height} rx={n.radius} />
    );
    let matrix: string | undefined;
    if (image?.mode === "crop") {
      try {
        matrix = `matrix(${multiply([n.width, 0, 0, n.height, 0, 0], inverse(image.transform)).join(" ")})`;
      } catch {
        /* degenerate crop falls back to fill */
      }
    }
    return (
      <g>
        <defs>
          <clipPath id={clip}>{shape}</clipPath>
          {image?.mode === "tile" && (
            <pattern
              id={pattern}
              patternUnits="userSpaceOnUse"
              width={image.width * image.scale}
              height={image.height * image.scale}
            >
              <image
                href={n.image}
                width={image.width * image.scale}
                height={image.height * image.scale}
              />
            </pattern>
          )}
        </defs>
        <g clipPath={`url(#${clip})`} opacity={image?.opacity ?? 1}>
          {image?.mode === "tile" ? (
            <rect width={n.width} height={n.height} fill={`url(#${pattern})`} />
          ) : (
            <image
              href={n.image}
              width={matrix ? 1 : n.width}
              height={matrix ? 1 : n.height}
              preserveAspectRatio={
                matrix
                  ? "none"
                  : image?.mode === "fit"
                    ? "xMidYMid meet"
                    : "xMidYMid slice"
              }
              transform={matrix}
            />
          )}
        </g>
        {n.strokeWidth > 0 &&
          React.cloneElement(shape, {
            fill: "none",
            stroke: n.stroke,
            strokeWidth: n.strokeWidth,
          })}
      </g>
    );
  }
  if (
    f?.corners &&
    n.type !== "text" &&
    !["ellipse", "line", "path", "star", "polygon"].includes(n.type)
  )
    return (
      <path
        d={roundedRect(n.width, n.height, f.corners)}
        fill={outline ? "none" : n.fill}
        stroke={outline ? "#78909c" : n.stroke}
        strokeWidth={outline ? 1 : n.strokeWidth}
      />
    );
  return <BasicNodeShape node={n} outline={outline} />;
}
function textSpans(n: Node, start: number, end: number) {
  const spans = n.fidelity?.text?.spans ?? [],
    cuts = [
      ...new Set([
        start,
        end,
        ...spans.flatMap((s) => [
          Math.max(start, Math.min(end, s.start)),
          Math.max(start, Math.min(end, s.end)),
        ]),
      ]),
    ].sort((a, b) => a - b);
  return cuts.slice(0, -1).map((a, i) => {
    const b = cuts[i + 1],
      style = spans.find((s) => s.start <= a && s.end >= b);
    return (
      <tspan
        key={a}
        fill={style?.fill}
        fontFamily={style?.fontFamily}
        fontSize={style?.fontSize}
        fontWeight={style?.fontWeight}
        fontStyle={style?.italic ? "italic" : undefined}
      >
        {n.text.slice(a, b).replace(/\n$/, "")}
      </tspan>
    );
  });
}
export function roundedRect(
  w: number,
  h: number,
  corners: [number, number, number, number],
) {
  let [tl, tr, br, bl] = corners;
  const scale = Math.min(
    1,
    w / Math.max(tl + tr, bl + br, 1),
    h / Math.max(tl + bl, tr + br, 1),
  );
  [tl, tr, br, bl] = [tl, tr, br, bl].map((v) => v * scale);
  return `M${tl} 0 H${w - tr} Q${w} 0 ${w} ${tr} V${h - br} Q${w} ${h} ${w - br} ${h} H${bl} Q0 ${h} 0 ${h - bl} V${tl} Q0 0 ${tl} 0 Z`;
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
        transform={`matrix(${localTransform(n).join(" ")})`}
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
        {n.type === "frame" && n.fidelity?.clipsContent !== false && (
          <defs>
            <clipPath id={`clip-${n.id}`}>
              {n.fidelity?.corners ? (
                <path d={roundedRect(n.width, n.height, n.fidelity.corners)} />
              ) : (
                <rect width={n.width} height={n.height} rx={n.radius} />
              )}
            </clipPath>
          </defs>
        )}
        <g
          clipPath={
            n.type === "frame" && n.fidelity?.clipsContent !== false
              ? `url(#clip-${n.id})`
              : undefined
          }
        >
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
            ? (() => {
                const m = worldTransform(doc, n);
                return {
                  ...n,
                  x: m[4],
                  y: m[5],
                  rotation: 0,
                  fidelity: {
                    ...n.fidelity,
                    size: n.fidelity?.size ?? [n.width, n.height],
                    linear: [m[0], m[1], m[2], m[3]] as [
                      number,
                      number,
                      number,
                      number,
                    ],
                  },
                  parentId: null,
                };
              })()
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
