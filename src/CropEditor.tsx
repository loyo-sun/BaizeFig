import { useEffect, useRef, useState, type PointerEvent } from "react";
import { worldTransform, type Document, type Node } from "./core";
import { inverse, transformPoint, multiply, type Matrix } from "./fidelity";
import {
  cropPlacement,
  cropOptions,
  imagePlacement,
  scaleCrop,
  cropCorners,
  type ImageOptions,
} from "./imageCrop";
import { useI18n } from "./LanguageContext";
export function CropEditor({
  doc,
  node,
  paintIndex,
  point,
  onCommit,
  onCancel,
}: {
  doc: Document;
  node: Node;
  paintIndex?: number;
  point: (e: { clientX: number; clientY: number }) => { x: number; y: number };
  onCommit: (patch: Partial<Node>) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n(),
    paint =
      paintIndex === undefined
        ? undefined
        : node.fidelity?.paints?.[paintIndex],
    src = paint?.image ?? node.image,
    previous = paint?.imageOptions ?? node.fidelity?.image;
  const [matrix, setMatrix] = useState<Matrix | null>(null),
    [natural, setNatural] = useState({ width: 1, height: 1 }),
    [error, setError] = useState("");
  const drag = useRef<{
      x: number;
      y: number;
      matrix: Matrix;
      corner?: number;
      pointer: number;
    } | null>(null),
    frame = useRef<SVGGElement>(null);
  useEffect(() => {
    let active = true;
    if (!src) {
      setError(t("No image to crop"));
      return;
    }
    const image = new Image();
    image.src = src;
    void image
      .decode()
      .then(() => {
        if (!active) return;
        setNatural({ width: image.naturalWidth, height: image.naturalHeight });
        setMatrix(
          cropPlacement(
            node,
            previous,
            image.naturalWidth,
            image.naturalHeight,
          ),
        );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [src]);
  const local = (e: { clientX: number; clientY: number }) => {
    const p = point(e);
    return transformPoint(inverse(worldTransform(doc, node)), p.x, p.y);
  };
  function down(e: PointerEvent<SVGElement>, corner?: number) {
    if (!matrix || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const p = local(e);
    drag.current = { ...p, matrix, corner, pointer: e.pointerId };
    frame.current?.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<SVGGElement>) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    e.stopPropagation();
    const p = local(e);
    if (d.corner === undefined)
      setMatrix([
        d.matrix[0],
        d.matrix[1],
        d.matrix[2],
        d.matrix[3],
        d.matrix[4] + p.x - d.x,
        d.matrix[5] + p.y - d.y,
      ]);
    else {
      const corners = cropCorners(d.matrix),
        anchor = corners[(d.corner + 2) % 4],
        start = corners[d.corner],
        dx = start.x - anchor.x,
        dy = start.y - anchor.y,
        scale = Math.max(
          0.02,
          Math.min(
            100,
            ((p.x - anchor.x) * dx + (p.y - anchor.y) * dy) /
              (dx * dx + dy * dy),
          ),
        );
      setMatrix(scaleCrop(d.matrix, scale, anchor));
    }
  }
  function commit() {
    if (!matrix) return;
    try {
      const options = cropOptions(
          node,
          matrix,
          natural.width,
          natural.height,
          previous,
        ),
        fidelity = {
          size: [node.width, node.height] as [number, number],
          ...node.fidelity,
        };
      if (paintIndex === undefined) fidelity.image = options;
      else
        fidelity.paints = fidelity.paints?.map((p, i) =>
          i === paintIndex ? { ...p, imageOptions: options } : p,
        );
      onCommit({ fidelity });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        commit();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  });
  const key = `crop-preview-${node.id}`;
  return (
    <g
      ref={frame}
      transform={`matrix(${worldTransform(doc, node).join(" ")})`}
      data-testid="image-crop-editor"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={move}
      onPointerUp={(e) => {
        drag.current = null;
        e.stopPropagation();
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      {matrix && (
        <>
          <defs>
            <clipPath id={key}>
              <rect width={node.width} height={node.height} />
            </clipPath>
          </defs>
          <image
            href={src}
            width={1}
            height={1}
            transform={`matrix(${matrix.join(" ")})`}
            opacity={0.25 * node.opacity * (paint?.opacity ?? 1)}
            pointerEvents="none"
          />
          <g clipPath={`url(#${key})`}>
            <image
              href={src}
              width={1}
              height={1}
              transform={`matrix(${matrix.join(" ")})`}
              opacity={
                (previous?.opacity ?? 1) * node.opacity * (paint?.opacity ?? 1)
              }
              pointerEvents="none"
            />
          </g>
          <rect
            width={node.width}
            height={node.height}
            fill="transparent"
            stroke="#287F71"
            vectorEffect="non-scaling-stroke"
            onPointerDown={(e) => down(e)}
            style={{ cursor: "move" }}
          />
          {cropCorners(matrix).map((p, i) => (
            <rect
              key={i}
              x={p.x - 5}
              y={p.y - 5}
              width={10}
              height={10}
              fill="white"
              stroke="#287F71"
              vectorEffect="non-scaling-stroke"
              aria-label={t("Scale crop image")}
              onPointerDown={(e) => down(e, i)}
              style={{ cursor: "nwse-resize" }}
            />
          ))}
        </>
      )}
      <foreignObject
        x={0}
        y={-100}
        width={Math.max(360, node.width)}
        height={95}
        overflow="visible"
      >
        <div
          className="crop-controls"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <strong>{t("Crop image visually")}</strong>
          <span>
            {t(
              "Drag to reposition; drag corners to scale. Enter applies, Escape cancels.",
            )}
          </span>
          <div className="find-buttons">
            <button
              onClick={() =>
                setMatrix(
                  imagePlacement(
                    node.width,
                    node.height,
                    natural.width,
                    natural.height,
                    "fit",
                  ),
                )
              }
            >
              {t("Fit image")}
            </button>
            <button
              onClick={() =>
                setMatrix(
                  imagePlacement(
                    node.width,
                    node.height,
                    natural.width,
                    natural.height,
                    "fill",
                  ),
                )
              }
            >
              {t("Fill image")}
            </button>
            <button
              onClick={() =>
                matrix &&
                setMatrix(
                  scaleCrop(matrix, 1.1, {
                    x: node.width / 2,
                    y: node.height / 2,
                  }),
                )
              }
            >
              {t("Zoom in")}
            </button>
            <button
              onClick={() =>
                matrix &&
                setMatrix(
                  scaleCrop(matrix, 1 / 1.1, {
                    x: node.width / 2,
                    y: node.height / 2,
                  }),
                )
              }
            >
              {t("Zoom out")}
            </button>
            <button
              onClick={() =>
                matrix &&
                setMatrix(
                  multiply(
                    [
                      0,
                      1,
                      -1,
                      0,
                      (node.width + node.height) / 2,
                      (node.height - node.width) / 2,
                    ],
                    matrix,
                  ),
                )
              }
            >
              {t("Rotate 90° right")}
            </button>
            <button className="primary" onClick={commit}>
              {t("Apply crop")}
            </button>
            <button onClick={onCancel}>{t("Cancel")}</button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      </foreignObject>
    </g>
  );
}
