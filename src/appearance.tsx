import React from "react";
import type { Node } from "./core";
import { inverse } from "./fidelity";
export interface ImportedPaint {
  space?: "user";
  geometry?: {
    matrix: [number, number, number, number, number, number];
    width: number;
    height: number;
  };
  type: "solid" | "linear" | "radial" | "image";
  color?: string;
  opacity: number;
  stops?: { position: number; color: string }[];
  transform?: [number, number, number, number, number, number];
  image?: string;
  imageOptions?: NonNullable<Node["fidelity"]>["image"];
}
export interface ImportedEffect {
  type: "drop-shadow" | "inner-shadow" | "blur" | "background-blur";
  color: string;
  radius: number;
  spread: number;
  x: number;
  y: number;
  visible: boolean;
}
export function Appearance({
  node,
  outline,
  render,
}: {
  node: Node;
  outline: boolean;
  render: (n: Node, o: boolean) => React.ReactNode;
}) {
  const paints = node.fidelity?.paints;
  if (outline || !paints?.length) return <>{render(node, outline)}</>;
  return (
    <>
      {[...paints].reverse().map((paint, index) => {
        const id = `paint-${node.id}-${index}`;
        let transform = "";
        try {
          transform = `matrix(${inverse(paint.transform ?? [1, 0, 0, 1, 0, 0]).join(" ")})`;
        } catch {
          /* rejected transforms use endpoint colors */
        }
        const color =
          paint.type === "solid"
            ? (paint.color ?? node.fill)
            : paint.type === "image"
              ? "none"
              : `url(#${id})`;
        const clone = {
          ...node,
          type:
            paint.type !== "image" && node.type === "image"
              ? ("rectangle" as const)
              : node.type,
          fill: color,
          stroke: "none",
          strokeWidth: 0,
          image: paint.type === "image" ? paint.image : undefined,
          fidelity: {
            ...node.fidelity!,
            image: paint.type === "image" ? paint.imageOptions : undefined,
            paints: undefined,
            paths: node.fidelity?.paths
              ?.filter((p) => !p.strokeOutline)
              .map((p) => ({ ...p, color })),
          },
        };
        return (
          <g key={index} opacity={paint.opacity}>
            <defs>
              {paint.type === "linear" ? (
                <linearGradient
                  id={id}
                  gradientUnits={
                    paint.space === "user" ? "userSpaceOnUse" : undefined
                  }
                  x1="0"
                  y1="0.5"
                  x2="1"
                  y2="0.5"
                  gradientTransform={transform}
                >
                  {paint.stops?.map((stop, i) => (
                    <stop
                      key={i}
                      offset={stop.position}
                      stopColor={stop.color}
                    />
                  ))}
                </linearGradient>
              ) : paint.type === "radial" ? (
                <radialGradient
                  id={id}
                  gradientUnits={
                    paint.space === "user" ? "userSpaceOnUse" : undefined
                  }
                  cx="0.5"
                  cy="0.5"
                  r="0.5"
                  gradientTransform={transform}
                >
                  {paint.stops?.map((stop, i) => (
                    <stop
                      key={i}
                      offset={stop.position}
                      stopColor={stop.color}
                    />
                  ))}
                </radialGradient>
              ) : null}
            </defs>
            {paint.type === "image" && node.fidelity?.paths?.length ? (
              <>
                <defs>
                  <clipPath id={`${id}-image-clip`}>
                    {node.fidelity.paths
                      .filter((p) => !p.strokeOutline)
                      .map((p, i) => (
                        <path
                          key={i}
                          d={p.d}
                          clipRule={p.rule}
                          transform={`scale(${node.fidelity!.size[0] ? node.width / node.fidelity!.size[0] : 1} ${node.fidelity!.size[1] ? node.height / node.fidelity!.size[1] : 1})`}
                        />
                      ))}
                  </clipPath>
                </defs>
                <g clipPath={`url(#${id}-image-clip)`}>
                  <g
                    transform={
                      paint.geometry
                        ? `matrix(${paint.geometry.matrix.join(" ")})`
                        : undefined
                    }
                  >
                    {render(
                      {
                        ...clone,
                        type: "image",
                        width: paint.geometry?.width ?? clone.width,
                        height: paint.geometry?.height ?? clone.height,
                        fidelity: { ...clone.fidelity, paths: undefined },
                      },
                      false,
                    )}
                  </g>
                </g>
              </>
            ) : (
              render(clone, false)
            )}
          </g>
        );
      })}
      {(node.strokeWidth > 0 ||
        node.fidelity?.paths?.some((p) => p.strokeOutline)) && (
        <g>
          {render(
            {
              ...node,
              type: node.type === "image" ? "rectangle" : node.type,
              fill: "none",
              image: undefined,
              fidelity: {
                ...node.fidelity!,
                image: undefined,
                paints: undefined,
                paths: node.fidelity?.paths?.map((p) => ({
                  ...p,
                  color: p.strokeOutline ? node.stroke : "none",
                })),
              },
            },
            false,
          )}
        </g>
      )}
    </>
  );
}
export function EffectDefinitions({ node }: { node: Node }) {
  const effects = node.fidelity?.effects?.filter(
    (e) => e.visible && e.type !== "background-blur",
  );
  if (!effects?.length) return null;
  let previous = "SourceGraphic";
  return (
    <defs>
      <filter
        id={`effect-${node.id}`}
        x="-100%"
        y="-100%"
        width="300%"
        height="300%"
        colorInterpolationFilters="sRGB"
      >
        {effects.map((e, i) => {
          const input = previous,
            result = `effect-${i}`;
          previous = result;
          if (e.type === "blur")
            return (
              <feGaussianBlur
                key={i}
                in={input}
                stdDeviation={e.radius / 2}
                result={result}
              />
            );
          const alpha = `alpha-${i}`,
            blur = `blur-${i}`,
            offset = `offset-${i}`,
            flood = `flood-${i}`,
            shadow = `shadow-${i}`;
          return (
            <React.Fragment key={i}>
              {e.spread !== 0 && (
                <feMorphology
                  in="SourceAlpha"
                  operator={e.spread > 0 ? "dilate" : "erode"}
                  radius={Math.abs(e.spread)}
                  result={alpha}
                />
              )}
              <feGaussianBlur
                in={e.spread !== 0 ? alpha : "SourceAlpha"}
                stdDeviation={e.radius / 2}
                result={blur}
              />
              <feOffset in={blur} dx={e.x} dy={e.y} result={offset} />
              <feFlood floodColor={e.color} result={flood} />
              {e.type === "inner-shadow" ? (
                <>
                  <feComposite
                    in="SourceAlpha"
                    in2={offset}
                    operator="out"
                    result={`${shadow}-cut`}
                  />
                  <feComposite
                    in={flood}
                    in2={`${shadow}-cut`}
                    operator="in"
                    result={shadow}
                  />
                  <feMerge result={result}>
                    <feMergeNode in={input} />
                    <feMergeNode in={shadow} />
                  </feMerge>
                </>
              ) : (
                <>
                  <feComposite
                    in={flood}
                    in2={offset}
                    operator="in"
                    result={shadow}
                  />
                  <feMerge result={result}>
                    <feMergeNode in={shadow} />
                    <feMergeNode in={input} />
                  </feMerge>
                </>
              )}
            </React.Fragment>
          );
        })}
      </filter>
    </defs>
  );
}
