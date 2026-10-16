import { savedTextGlyphs, hasSavedTextOutlines } from "./glyphCache";
import { fontSettingsStyle, mergeFontSettings } from "./fontSettings";
import { renderFontFamily } from "./fontFamily";
import {
  bundledFontCss,
  bundledFontLicense,
  preloadEmbeddedFonts,
} from "./bundledFonts";
import { textBaselineD } from "./textPath";
import { documentIndex } from "./documentIndex";
import {
  transformedPath,
  vectorVisualBounds,
  savedGlyphPaths,
} from "./vectorGeometry";
import { networkGeometry, networkStroke } from "./vectorNetwork";
import { Appearance, EffectDefinitions } from "./appearance";
import { layoutText } from "./textLayout";
import { inverse, multiply, transformPoint } from "./fidelity";
import React from "react";
import {
  type Document,
  type Node,
  bounds,
  ancestors,
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
    strokeMiterlimit: n.fidelity?.strokeMiterLimit ?? 4,
    strokeLinecap: n.fidelity?.strokeCap ?? "butt",
    strokeLinejoin: n.fidelity?.strokeJoin ?? "miter",
    strokeOpacity: n.fidelity?.strokeOpacity ?? 1,
    strokeDasharray: n.fidelity?.strokeDash?.join(" "),
    strokeDashoffset: n.fidelity?.strokeDashOffset,
  };
  if (n.type === "text")
    return (
      <text
        {...shared}
        fontFamily={renderFontFamily(n.fontFamily)}
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
        style={{
          ...fontSettingsStyle(n.textFlow?.fontSettings),
          userSelect: "none",
        }}
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
    return (
      <polygon
        {...shared}
        points={starPoints(
          n.width,
          n.height,
          n.fidelity?.pointCount ?? 5,
          n.fidelity?.innerRatio ?? 0.44,
        )}
      />
    );
  if (n.type === "polygon")
    return (
      <polygon
        {...shared}
        points={Array.from({ length: n.fidelity?.pointCount ?? 3 }, (_, i) => {
          const a =
            (i * 2 * Math.PI) / (n.fidelity?.pointCount ?? 3) - Math.PI / 2;
          return `${n.width / 2 + (Math.cos(a) * n.width) / 2},${n.height / 2 + (Math.sin(a) * n.height) / 2}`;
        }).join(" ")}
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
function ShapeContent({
  node: n,
  outline = false,
}: {
  node: Node;
  outline?: boolean;
}) {
  const dynamic =
    n.type === "text" &&
    n.textFlow &&
    (!n.fidelity?.text ||
      n.fidelity.text.characters !== n.text ||
      (n.textFlow.truncation === "ending" && !hasSavedTextOutlines(n)))
      ? layoutText(n)
      : undefined;
  const f = dynamic
    ? {
        ...n.fidelity,
        size: n.fidelity?.size ?? [n.width, n.height],
        text: {
          characters: n.text,
          lines: dynamic.lines,
          letterSpacing: n.textFlow?.letterSpacing ?? 0,
          spans: n.textFlow?.runs,
        },
      }
    : n.fidelity;
  if (n.type === "text" && f?.textPath) {
    const id = "text-baseline-" + n.id;
    const sx = f.size[0] ? n.width / f.size[0] : 1,
      sy = f.size[1] ? n.height / f.size[1] : 1;
    const glyphs = f.text?.characters === n.text ? f.text.glyphs : undefined;
    return (
      <g transform={glyphs ? `scale(${sx} ${sy})` : undefined}>
        <defs>
          <path
            id={id}
            d={
              glyphs
                ? textBaselineD(f.textPath)
                : transformedPath(textBaselineD(f.textPath), [
                    sx,
                    0,
                    0,
                    sy,
                    0,
                    0,
                  ])
            }
          />
        </defs>
        {outline && <use href={"#" + id} fill="none" stroke="#78909c" />}
        {glyphs ? (
          <g aria-label={n.text}>
            {glyphs.map((g, i) => (
              <path
                key={i}
                d={g.d}
                fill={
                  outline
                    ? "none"
                    : (f.text?.spans?.find(
                        (s) => s.start <= g.start && s.end > g.start,
                      )?.fill ?? n.fill)
                }
                stroke={outline ? "#78909c" : undefined}
                vectorEffect="non-scaling-stroke"
                transform={`translate(${g.x} ${g.y}) rotate(${(-g.rotation * 180) / Math.PI}) scale(${g.size} ${-g.size})`}
              />
            ))}
          </g>
        ) : (
          <text
            fill={outline ? "none" : n.fill}
            stroke={outline ? "#78909c" : undefined}
            style={fontSettingsStyle(n.textFlow?.fontSettings)}
            fontFamily={renderFontFamily(n.fontFamily)}
            fontSize={n.fontSize}
            fontWeight={n.fontWeight}
            letterSpacing={
              n.textFlow?.letterSpacing ?? f.text?.letterSpacing ?? 0
            }
            textAnchor={
              n.textAlign === "center"
                ? "middle"
                : n.textAlign === "right"
                  ? "end"
                  : "start"
            }
          >
            <textPath
              href={"#" + id}
              startOffset={`${f.textPath.offset * 100}%`}
            >
              {textSpans(
                n,
                0,
                n.text.length,
                n.textFlow?.runs ?? f.text?.spans,
              )}
            </textPath>
          </text>
        )}
      </g>
    );
  }
  if (f?.text && hasSavedTextOutlines(n))
    return (
      <g
        aria-label={n.text}
        transform={`scale(${f.size[0] ? n.width / f.size[0] : 1} ${f.size[1] ? n.height / f.size[1] : 1})`}
      >
        {savedGlyphPaths(
          savedTextGlyphs(f.text)!,
          n.textFlow?.runs ?? f.text.spans,
        ).map((p, i) => {
          const path = (
            <path
              key={i}
              d={p.d}
              fill={outline ? "none" : (p.fill ?? n.fill)}
              stroke={outline ? "#78909c" : n.stroke}
              strokeWidth={outline ? 1 : n.strokeWidth}
            />
          );
          return p.href ? (
            <a key={i} href={p.href} onClick={(e) => e.preventDefault()}>
              {path}
            </a>
          ) : (
            path
          );
        })}
        {f.text.decorations?.map((r, i) => (
          <rect
            key={`decoration-${i}`}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            fill={outline ? "none" : (r.fill ?? n.fill)}
            stroke={outline ? "#78909c" : undefined}
          />
        ))}
      </g>
    );
  if (n.type === "text" && f?.text && f.text.characters === n.text)
    return (
      <text
        fill={outline ? "none" : n.fill}
        stroke={outline ? "#78909c" : undefined}
        fontFamily={renderFontFamily(n.fontFamily)}
        fontSize={n.fontSize}
        fontWeight={n.fontWeight}
        letterSpacing={f.text.letterSpacing}
        style={{
          ...fontSettingsStyle(n.textFlow?.fontSettings),
          whiteSpace: "pre",
          userSelect: "none",
        }}
      >
        {f.text.lines.map((line, i) => (
          <React.Fragment key={i}>
            {line.marker && (
              <tspan
                x={line.markerX}
                y={line.y}
                direction={line.direction}
                unicodeBidi="isolate"
              >
                {line.marker}
              </tspan>
            )}
            <tspan
              x={line.x}
              y={line.y}
              direction={line.direction ?? "ltr"}
              unicodeBidi="isolate"
            >
              {textSpans(n, line.start, line.end, f.text?.spans)}
              {line.ellipsis &&
                textSpans(
                  {
                    ...n,
                    text:
                      n.text.slice(0, Math.max(line.start, line.end - 1)) + "…",
                  },
                  Math.max(line.start, line.end - 1),
                  Math.max(line.start, line.end - 1) + 1,
                  f.text?.spans,
                )}
            </tspan>
          </React.Fragment>
        ))}
      </text>
    );
  if (f?.network) {
    const paths = networkGeometry(f.network);
    return (
      <g
        transform={`scale(${f.size[0] ? n.width / f.size[0] : 1} ${f.size[1] ? n.height / f.size[1] : 1})`}
      >
        {paths.map((p, i) => (
          <Appearance
            key={i}
            node={{
              ...n,
              id: `${n.id}-region-${i}`,
              width: f.size[0],
              height: f.size[1],
              strokeWidth: 0,
              stroke: "none",
              fill: p.color ?? n.fill,
              fidelity: {
                size: f.size,
                paths: [{ ...p, paints: undefined }],
                paints: p.paints ?? (p.color ? undefined : f.paints),
              },
            }}
            outline={outline}
            render={(node, o) => <ShapeContent node={node} outline={o} />}
          />
        ))}
        <defs>
          {f.strokeAlign === "inside" && (
            <clipPath id={`stroke-inside-${n.id}`}>
              {paths.map((p, i) => (
                <path key={i} d={p.d} clipRule={p.rule} />
              ))}
            </clipPath>
          )}
          {f.strokeAlign === "outside" && (
            <mask
              id={`stroke-outside-${n.id}`}
              maskUnits="userSpaceOnUse"
              x={-100000}
              y={-100000}
              width={200000}
              height={200000}
            >
              <rect
                x={-100000}
                y={-100000}
                width={200000}
                height={200000}
                fill="white"
              />
              {paths.map((p, i) => (
                <path key={i} d={p.d} fillRule={p.rule} fill="black" />
              ))}
            </mask>
          )}
        </defs>
        <path
          d={networkStroke(f.network)}
          fill="none"
          stroke={outline ? "#78909c" : n.stroke}
          strokeWidth={
            outline
              ? 1
              : n.strokeWidth *
                (paths.length && f.strokeAlign && f.strokeAlign !== "center"
                  ? 2
                  : 1)
          }
          strokeOpacity={f.strokeOpacity ?? 1}
          strokeLinecap={f.strokeCap ?? "butt"}
          strokeLinejoin={f.strokeJoin ?? "miter"}
          strokeMiterlimit={f.strokeMiterLimit ?? 4}
          strokeDasharray={f.strokeDash?.join(" ")}
          strokeDashoffset={f.strokeDashOffset}
          clipPath={
            !outline && paths.length && f.strokeAlign === "inside"
              ? `url(#stroke-inside-${n.id})`
              : undefined
          }
          mask={
            !outline && paths.length && f.strokeAlign === "outside"
              ? `url(#stroke-outside-${n.id})`
              : undefined
          }
        />
      </g>
    );
  }
  if (f?.paths?.some((p) => p.paints))
    return (
      <g
        transform={`scale(${f.size[0] ? n.width / f.size[0] : 1} ${f.size[1] ? n.height / f.size[1] : 1})`}
      >
        {f.paths.map((p, i) => (
          <Appearance
            key={i}
            node={{
              ...n,
              id: `${n.id}-path-${i}`,
              width: f.size[0],
              height: f.size[1],
              fill: p.color ?? (p.strokeOutline ? n.stroke : n.fill),
              stroke: f.paths?.some((q) => q.strokeOutline) ? "none" : n.stroke,
              strokeWidth: f.paths?.some((q) => q.strokeOutline)
                ? 0
                : n.strokeWidth,
              fidelity: {
                size: f.size,
                paths: [{ ...p, strokeOutline: false, paints: undefined }],
                paints:
                  p.paints ??
                  (p.strokeOutline || p.color ? undefined : f.paints),
              },
            }}
            outline={outline}
            render={(node, o) => <ShapeContent node={node} outline={o} />}
          />
        ))}
      </g>
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
            strokeOpacity={f.strokeOpacity ?? 1}
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
    const shape = (
      <NativeShapeWithStroke
        node={{
          ...n,
          type: n.type === "image" ? "rectangle" : n.type,
          image: undefined,
          fill: "#fff",
          strokeWidth: 0,
        }}
      />
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
        {n.strokeWidth > 0 && (
          <NativeShapeWithStroke node={{ ...n, fill: "none" }} />
        )}
      </g>
    );
  }
  return <NativeShapeWithStroke node={n} outline={outline} />;
}
function NativeShapeWithStroke({
  node: n,
  outline = false,
}: {
  node: Node;
  outline?: boolean;
}) {
  const f = n.fidelity;
  const shape = (node: Node, o = false) =>
    f?.corners &&
    !["text", "ellipse", "line", "path", "star", "polygon"].includes(n.type) ? (
      <path
        d={roundedRect(n.width, n.height, f.corners)}
        fill={o ? "none" : node.fill}
        stroke={o ? "#78909c" : node.stroke}
        strokeWidth={o ? 1 : node.strokeWidth}
        strokeLinecap={f.strokeCap}
        strokeLinejoin={f.strokeJoin}
        strokeMiterlimit={f.strokeMiterLimit}
        strokeDasharray={f.strokeDash?.join(" ")}
        strokeDashoffset={f.strokeDashOffset}
        strokeOpacity={f.strokeOpacity ?? 1}
      />
    ) : (
      <BasicNodeShape
        node={
          node.type === "image"
            ? { ...node, type: "rectangle", image: undefined }
            : node
        }
        outline={o}
      />
    );
  if (
    outline ||
    !n.strokeWidth ||
    !f?.strokeAlign ||
    f.strokeAlign === "center" ||
    ["text", "line", "path"].includes(n.type)
  )
    return shape(n, outline);
  const inside = f.strokeAlign === "inside",
    key = `native-stroke-${n.id}`,
    pad = n.strokeWidth * 2;
  return (
    <g>
      <defs>
        {inside ? (
          <clipPath id={key}>
            {shape({ ...n, fill: "#fff", strokeWidth: 0 })}
          </clipPath>
        ) : (
          <mask
            id={key}
            maskUnits="userSpaceOnUse"
            x={-pad}
            y={-pad}
            width={n.width + pad * 2}
            height={n.height + pad * 2}
          >
            <rect
              x={-pad}
              y={-pad}
              width={n.width + pad * 2}
              height={n.height + pad * 2}
              fill="white"
            />
            {shape({ ...n, fill: "#000", strokeWidth: 0 })}
          </mask>
        )}
      </defs>
      {shape({ ...n, strokeWidth: 0 })}
      <g
        clipPath={inside ? `url(#${key})` : undefined}
        mask={!inside ? `url(#${key})` : undefined}
      >
        {shape({ ...n, fill: "none", strokeWidth: n.strokeWidth * 2 })}
      </g>
    </g>
  );
}

function textSpans(
  n: Node,
  start: number,
  end: number,
  spans = n.fidelity?.text?.spans ?? [],
) {
  const cuts = [
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
    const span = (
      <tspan
        key={a}
        fill={style?.fill}
        style={fontSettingsStyle(
          mergeFontSettings(n.textFlow?.fontSettings, style?.fontSettings),
        )}
        fontFamily={
          style?.fontFamily ? renderFontFamily(style.fontFamily) : undefined
        }
        fontSize={style?.fontSize}
        fontWeight={style?.fontWeight}
        fontStyle={style?.italic ? "italic" : undefined}
        textDecoration={
          [
            style?.underline ? "underline" : "",
            style?.strikethrough ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        {n.text.slice(a, b).replace(/\n$/, "")}
      </tspan>
    );
    return style?.href ? (
      <a key={a} href={style.href} onClick={(e) => e.preventDefault()}>
        {span}
      </a>
    ) : (
      span
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
export function NodeShape({
  node,
  outline = false,
}: {
  node: Node;
  outline?: boolean;
}) {
  if (node.fidelity?.exportRegion) return null;
  if (node.fidelity?.network || node.fidelity?.paths?.some((p) => p.paints))
    return <ShapeContent node={node} outline={outline} />;
  return (
    <Appearance
      node={node}
      outline={outline}
      render={(n, o) => <ShapeContent node={n} outline={o} />}
    />
  );
}
export const Scene = React.memo(function Scene({
  doc,
  pageId,
  onNode,
  outline = false,
  rootId,
  editingTextId,
}: {
  doc: Document;
  pageId: string;
  onNode?: (e: React.PointerEvent, id: string) => void;
  outline?: boolean;
  rootId?: string;
  editingTextId?: string;
}) {
  const index = documentIndex(doc);
  const prefix = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const renderId = (n: Node) => `${prefix}-${n.id}`;
  function draw(n: Node): React.ReactNode {
    if (!n.visible || n.fidelity?.exportRegion) return null;
    return (
      <g
        key={n.id}
        id={`scene-${renderId(n)}`}
        data-node-id={n.id}
        data-node-name={n.name}
        transform={`matrix(${localTransform(n).join(" ")})`}
        opacity={n.id === editingTextId ? 0 : n.opacity}
        filter={
          n.fidelity?.effects?.some(
            (e) => e.visible && e.type !== "background-blur",
          )
            ? `url(#effect-${renderId(n)})`
            : undefined
        }
        style={{
          mixBlendMode: n.fidelity
            ?.blendMode as React.CSSProperties["mixBlendMode"],
        }}
        onPointerDown={onNode ? (e) => onNode(e, n.id) : undefined}
      >
        {onNode && n.type === "text" && (
          <rect
            width={n.width}
            height={n.height}
            fill="transparent"
            stroke="none"
            pointerEvents="all"
          />
        )}
        <EffectDefinitions node={{ ...n, id: renderId(n) }} />
        {n.fidelity?.booleanOperation && !outline ? (
          drawBoolean(n)
        ) : (
          <NodeShape node={{ ...n, id: renderId(n) }} outline={outline} />
        )}
        {n.type === "frame" && n.fidelity?.clipsContent !== false && (
          <defs>
            <clipPath id={`clip-${renderId(n)}`}>
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
              ? `url(#clip-${renderId(n)})`
              : undefined
          }
        >
          {(!n.fidelity?.booleanOperation || outline) &&
            drawSiblings(
              (index.children.get(n.id) ?? []).filter(
                (c) => c.pageId === pageId,
              ),
            )}
        </g>
      </g>
    );
  }
  function drawBoolean(n: Node): React.ReactNode {
    const children = (index.children.get(n.id) ?? []).filter(
        (c) => c.pageId === pageId && c.visible,
      ),
      mode = n.fidelity!.booleanOperation,
      base = `boolean-${renderId(n)}`,
      white = `${base}-white`,
      black = `${base}-black`;
    if (!children.length) return null;
    const paint = (
      <NodeShape
        node={{
          ...n,
          id: `${base}-paint`,
          type: "rectangle",
          fidelity: { ...n.fidelity!, booleanOperation: undefined },
        }}
      />
    );
    const use = (id: string, color = white, mask?: string) => (
      <use
        href={`#${id}`}
        filter={`url(#${color})`}
        mask={mask ? `url(#${mask})` : undefined}
      />
    );
    const area = (fill: string) => (
      <rect
        x={-100000}
        y={-100000}
        width={200000}
        height={200000}
        fill={fill}
      />
    );
    let result: React.ReactNode = paint;
    if (mode === "intersect") {
      for (const child of children)
        result = <g mask={`url(#${base}-${child.id})`}>{result}</g>;
    } else result = <g mask={`url(#${base}-result)`}>{paint}</g>;
    return (
      <>
        <defs>
          {children.map(draw)}
          <filter id={white}>
            <feFlood floodColor="#fff" />
            <feComposite in2="SourceAlpha" operator="in" />
          </filter>
          <filter id={black}>
            <feFlood floodColor="#000" />
            <feComposite in2="SourceAlpha" operator="in" />
          </filter>
          {mode === "intersect" ? (
            children.map((child) => (
              <mask
                key={child.id}
                id={`${base}-${child.id}`}
                maskUnits="userSpaceOnUse"
                x={-100000}
                y={-100000}
                width={200000}
                height={200000}
              >
                {use(`scene-${renderId(child)}`)}
              </mask>
            ))
          ) : mode === "exclude" ? (
            <>
              <g id={`${base}-step-0`}>
                {use(`scene-${renderId(children[0])}`)}
              </g>
              {children.slice(1).map((child, index) => {
                const previous = `${base}-step-${index}`,
                  current = `scene-${renderId(child)}`,
                  notPrevious = `${base}-not-prev-${index}`,
                  notCurrent = `${base}-not-current-${index}`;
                return (
                  <React.Fragment key={child.id}>
                    <mask
                      id={notPrevious}
                      maskUnits="userSpaceOnUse"
                      x={-100000}
                      y={-100000}
                      width={200000}
                      height={200000}
                    >
                      {area("#fff")}
                      {use(previous, black)}
                    </mask>
                    <mask
                      id={notCurrent}
                      maskUnits="userSpaceOnUse"
                      x={-100000}
                      y={-100000}
                      width={200000}
                      height={200000}
                    >
                      {area("#fff")}
                      {use(current, black)}
                    </mask>
                    <g id={`${base}-step-${index + 1}`}>
                      {use(previous, white, notCurrent)}
                      {use(current, white, notPrevious)}
                    </g>
                  </React.Fragment>
                );
              })}
              <mask
                id={`${base}-result`}
                maskUnits="userSpaceOnUse"
                x={-100000}
                y={-100000}
                width={200000}
                height={200000}
              >
                {use(`${base}-step-${children.length - 1}`)}
              </mask>
            </>
          ) : (
            <mask
              id={`${base}-result`}
              maskUnits="userSpaceOnUse"
              x={-100000}
              y={-100000}
              width={200000}
              height={200000}
            >
              {children.map((child, i) => (
                <React.Fragment key={child.id}>
                  {use(
                    `scene-${renderId(child)}`,
                    mode === "subtract" && i > 0 ? black : white,
                  )}
                </React.Fragment>
              ))}
            </mask>
          )}
        </defs>
        {result}
      </>
    );
  }
  const nodes = rootId
    ? index.byId.has(rootId)
      ? [index.byId.get(rootId)!]
      : []
    : (index.children.get(null) ?? []).filter((n) => n.pageId === pageId);
  function drawSiblings(siblings: Node[]): React.ReactNode[] {
    const output: React.ReactNode[] = [];
    for (let i = 0; i < siblings.length; i++) {
      const n = siblings[i];
      const blur = n.fidelity?.effects?.find(
        (e) => e.visible && e.type === "background-blur",
      );
      if (blur && !outline && n.visible) {
        const clip = `backdrop-clip-${renderId(n)}`,
          filter = `backdrop-filter-${renderId(n)}`,
          parent = n.parentId ? index.byId.get(n.parentId) : undefined;
        output.push(
          <g key={filter} pointerEvents="none">
            <defs>
              <clipPath id={clip}>
                <g transform={`matrix(${localTransform(n).join(" ")})`}>
                  <NodeShape
                    node={{
                      ...n,
                      id: clip,
                      fill: "#fff",
                      opacity: 1,
                      image: undefined,
                      stroke: "none",
                      strokeWidth: 0,
                      fidelity: {
                        ...n.fidelity!,
                        paints: undefined,
                        effects: undefined,
                        image: undefined,
                      },
                    }}
                  />
                </g>
              </clipPath>
              <filter
                id={filter}
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                <feGaussianBlur stdDeviation={blur.radius / 2} />
              </filter>
            </defs>
            <g clipPath={`url(#${clip})`}>
              <g filter={`url(#${filter})`}>
                {parent ? (
                  <NodeShape node={{ ...parent, id: `${filter}-parent` }} />
                ) : (
                  <rect
                    x={-100000}
                    y={-100000}
                    width={200000}
                    height={200000}
                    fill={doc.background}
                  />
                )}{" "}
                {siblings
                  .slice(0, i)
                  .filter((p) => p.visible && !p.fidelity?.mask)
                  .map((p) => (
                    <use key={p.id} href={`#scene-${renderId(p)}`} />
                  ))}
              </g>
            </g>
          </g>,
        );
      }
      if (!n.fidelity?.mask) {
        output.push(draw(n));
        continue;
      }
      if (!n.visible) continue;
      const following: Node[] = [];
      while (i + 1 < siblings.length && !siblings[i + 1].fidelity?.mask)
        following.push(siblings[++i]);
      output.push(
        <g key={`masked-${n.id}`}>
          <defs>
            <mask
              id={`mask-${renderId(n)}`}
              maskUnits="userSpaceOnUse"
              x="-100000"
              y="-100000"
              width="200000"
              height="200000"
              style={{ maskType: n.fidelity.mask }}
            >
              {draw(n)}
            </mask>
          </defs>
          <g mask={`url(#mask-${renderId(n)})`}>{following.map(draw)}</g>
        </g>,
      );
    }
    return output;
  }
  return <>{drawSiblings(nodes)}</>;
});
export interface ExportViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function exportBounds(
  doc: Document,
  pageId: string,
  ids: string[] = [],
): ExportViewport {
  const included = doc.nodes.filter(
    (n) =>
      n.pageId === pageId &&
      n.visible &&
      (ids.length
        ? ids.includes(n.id)
        : !n.parentId && !n.fidelity?.exportRegion) &&
      !ancestors(doc, n).some((p) => !p.visible),
  );
  let result = bounds(doc, included);
  const seen = new Set<string>();
  const union = (a: ExportViewport, b: ExportViewport) => {
    const x = Math.min(a.x, b.x),
      y = Math.min(a.y, b.y);
    return {
      x,
      y,
      width: Math.max(a.x + a.width, b.x + b.width) - x,
      height: Math.max(a.y + a.height, b.y + b.height) - y,
    };
  };
  function expand(n: Node) {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    let visual = vectorVisualBounds(doc, n) ?? bounds(doc, [n]);
    const m = worldTransform(doc, n),
      scale = Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
    for (const e of n.fidelity?.effects ?? []) {
      if (!e.visible) continue;
      if (e.type === "blur") {
        const pad = e.radius * 2 * scale;
        visual = {
          x: visual.x - pad,
          y: visual.y - pad,
          width: visual.width + 2 * pad,
          height: visual.height + 2 * pad,
        };
      } else if (e.type === "drop-shadow") {
        const pad = e.radius * 2 + Math.max(0, e.spread),
          points = [
            [-pad + e.x, -pad + e.y],
            [n.width + pad + e.x, -pad + e.y],
            [-pad + e.x, n.height + pad + e.y],
            [n.width + pad + e.x, n.height + pad + e.y],
          ].map(([x, y]) => transformPoint(m, x, y)),
          x = Math.min(...points.map((p) => p.x)),
          y = Math.min(...points.map((p) => p.y));
        visual = union(visual, {
          x,
          y,
          width: Math.max(...points.map((p) => p.x)) - x,
          height: Math.max(...points.map((p) => p.y)) - y,
        });
      }
    }
    result = union(result, visual);
    if (n.type !== "frame" || n.fidelity?.clipsContent === false)
      for (const child of doc.nodes.filter(
        (c) => c.parentId === n.id && c.visible,
      ))
        expand(child);
  }
  included.forEach(expand);
  return result;
}
export async function svgString(
  doc: Document,
  pageId: string,
  ids: string[] = [],
  options: { viewport?: ExportViewport; background?: string } = {},
) {
  if (ids.length === 1) {
    const region = doc.nodes.find(
      (n) => n.id === ids[0] && n.fidelity?.exportRegion,
    );
    if (region) {
      options = {
        ...options,
        viewport: options.viewport ?? bounds(doc, [region]),
      };
      ids = [];
    }
  }
  const { renderToStaticMarkup } = await import("react-dom/server");
  const b = options.viewport ?? exportBounds(doc, pageId, ids);
  if (
    ![b.x, b.y, b.width, b.height].every(Number.isFinite) ||
    b.width <= 0 ||
    b.height <= 0
  )
    throw Error("Invalid export dimensions");
  if (options.background && !/^#[\da-f]{3,8}$/i.test(options.background))
    throw Error("Invalid export background");
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
  const fontCss = await bundledFontCss(
    exportDoc.nodes.filter((n) => n.pageId === pageId),
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    renderToStaticMarkup(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        overflow="hidden"
        width={Math.max(1, b.width)}
        height={Math.max(1, b.height)}
        viewBox={`${b.x} ${b.y} ${Math.max(1, b.width)} ${Math.max(1, b.height)}`}
      >
        {fontCss && (
          <defs>
            <metadata>{bundledFontLicense}</metadata>
            <style>{fontCss}</style>
          </defs>
        )}
        {options.background && (
          <rect
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            fill={options.background}
          />
        )}
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
  if (!Number.isFinite(scale) || scale <= 0 || scale > 32)
    throw Error("Invalid export scale");
  await preloadEmbeddedFonts(svg);
  const blob = new Blob([svg], { type: "image/svg+xml" }),
    url = URL.createObjectURL(blob);
  let canvas: HTMLCanvasElement | undefined;
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = Number(
        svg.match(/<svg[^>]*\bwidth="([\d.eE+-]+)"/)?.[1] ?? image.width,
      ),
      height = Number(
        svg.match(/<svg[^>]*\bheight="([\d.eE+-]+)"/)?.[1] ?? image.height,
      );
    if (Math.ceil(width * scale) > 16384 || Math.ceil(height * scale) > 16384)
      throw Error("Export exceeds 16384 pixels per side. Reduce scale.");
    if (Math.ceil(width * scale) * Math.ceil(height * scale) > 40000000)
      throw Error("Export is too large. Reduce selection or scale.");
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width * scale));
    canvas.height = Math.max(1, Math.ceil(height * scale));
    const ctx = canvas.getContext("2d")!;
    if (type === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas!.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Export failed"))),
        type,
      ),
    );
  } finally {
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
    URL.revokeObjectURL(url);
  }
}
