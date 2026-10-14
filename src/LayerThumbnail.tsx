import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Scene } from "./Canvas";
import {
  bounds,
  descendants,
  worldTransform,
  type Document,
  type Node,
} from "./core";
import { identity } from "./fidelity";
import { useI18n } from "./LanguageProvider";

// Only render rows close to the scroll viewport; previews share the actual scene renderer.
export const LayerThumbnail = memo(function LayerThumbnail({
  doc,
  node,
}: {
  doc: Document;
  node: Node;
}) {
  const host = useRef<HTMLSpanElement>(null),
    [visible, setVisible] = useState(false),
    { t } = useI18n();
  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { root: host.current.closest(".layer-tree"), rootMargin: "80px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <span
      ref={host}
      className="layer-thumbnail"
      role="img"
      aria-label={t("Layer thumbnail {name}", { name: node.name })}
    >
      {visible && <LayerThumbnailContent doc={doc} node={node} />}
    </span>
  );
});

export function LayerThumbnailContent({
  doc,
  node,
}: {
  doc: Document;
  node: Node;
}) {
  const preview = useMemo(() => {
    const ids = new Set(descendants(doc, [node.id])),
      parent = doc.nodes.find((n) => n.id === node.parentId),
      m = parent ? worldTransform(doc, parent) : identity,
      box = bounds(doc, [node]);
    const margin = Math.max(1, Math.max(box.width, box.height) * 0.1);
    const scene = {
      ...doc,
      nodes: doc.nodes
        .filter((n) => ids.has(n.id))
        .map((n) =>
          n.id === node.id ? { ...n, parentId: null, visible: true } : n,
        ),
    };
    return {
      scene,
      m,
      viewBox: `${box.x - margin} ${box.y - margin} ${Math.max(1, box.width) + margin * 2} ${Math.max(1, box.height) + margin * 2}`,
    };
  }, [doc, node]);
  return (
    <svg
      viewBox={preview.viewBox}
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`matrix(${preview.m.join(" ")})`}>
        <Scene doc={preview.scene} pageId={node.pageId} rootId={node.id} />
      </g>
    </svg>
  );
}
