import { useRef, useState } from "react";
import { Component, Search } from "lucide-react";
import type { Document, Node } from "./core";
import { LayerThumbnail } from "./LayerThumbnail";
import { useI18n } from "./LanguageContext";

export function LocalAssets({
  doc,
  onInsert,
}: {
  doc: Document;
  onInsert: (node: Node, client?: { x: number; y: number }) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const components = doc.nodes.filter(
    (n) => n.type === "component" && !n.componentOwner,
  );
  const matches = components.filter((n) =>
    n.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section className="local-assets" aria-label={t("Local components")}>
      <h3>
        {t("Local components")} <span>{components.length}</span>
      </h3>
      <label className="asset-search">
        <Search size={15} />
        <input
          aria-label={t("Search components")}
          placeholder={t("Search components")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <p className="muted">
        {t("Drag a component onto the canvas, or click to insert an instance.")}
      </p>
      {!components.length && (
        <p className="asset-empty">
          {t(
            "Create a main component to see it here. Components from every page in this file appear automatically.",
          )}
        </p>
      )}
      {!!components.length && !matches.length && (
        <p>{t("No matching components")}</p>
      )}
      <div className="asset-grid">
        {matches.map((node) => (
          <button
            key={node.id}
            className="asset-card"
            aria-label={t("Insert instance of {name}", { name: node.name })}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              suppressClick.current = false;
              gesture.current = { x: e.clientX, y: e.clientY, moved: false };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const g = gesture.current;
              if (!g) return;
              if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 5)
                g.moved = true;
              if (g.moved)
                setPreview({ name: node.name, x: e.clientX, y: e.clientY });
            }}
            onPointerUp={(e) => {
              const g = gesture.current;
              gesture.current = null;
              setPreview(null);
              if (g?.moved) {
                suppressClick.current = true;
                onInsert(node, { x: e.clientX, y: e.clientY });
              }
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              gesture.current = null;
              setPreview(null);
              suppressClick.current = true;
            }}
            onLostPointerCapture={() => {
              gesture.current = null;
              setPreview(null);
            }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onInsert(node);
            }}
          >
            <LayerThumbnail doc={doc} node={node} />
            <span className="asset-name">
              <Component size={13} />
              {node.name}
            </span>
            <small>{doc.pages.find((p) => p.id === node.pageId)?.name}</small>
          </button>
        ))}
      </div>
      {preview && (
        <div
          className="asset-drag-preview"
          style={{ left: preview.x + 12, top: preview.y + 12 }}
        >
          <Component size={14} />
          {preview.name}
        </div>
      )}
    </section>
  );
}
