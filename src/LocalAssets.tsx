import { useEffect, useRef, useState } from "react";
import { Component, Search, Grid2X2, List, ArrowLeft, X } from "lucide-react";
import type { Document, Node } from "./core";
import { LayerThumbnail, LayerThumbnailContent } from "./LayerThumbnail";
import { availableLibraryEntries } from "./componentLibraries";
import { createComponentInstance } from "./components";
import { ComponentProperties } from "./ComponentProperties";
import { useI18n } from "./LanguageContext";
type AssetEntry = {
  reference: string;
  node: Node;
  scene: Document;
  source: string;
  sourceName: string;
  name: string;
  setId?: string;
};
type Point = { x: number; y: number };
export function LocalAssets({
  doc,
  onInsert,
  onPreview,
  onLibraries,
}: {
  doc: Document;
  onInsert: (
    reference: string,
    client?: Point,
    values?: Record<string, string | boolean>,
  ) => void;
  onPreview?: (client?: Point) => void;
  onLibraries: () => void;
}) {
  const { t } = useI18n(),
    [query, setQuery] = useState(""),
    [mode, setMode] = useState("grid"),
    [source, setSource] = useState("all"),
    [folder, setFolder] = useState("all"),
    [draft, setDraft] = useState<{ doc: Document; id: string } | null>(null),
    [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null),
    suppressClick = useRef(false);
  const cancel = () => {
    gesture.current = null;
    setPreview(null);
    onPreview?.();
    suppressClick.current = true;
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
        setDraft(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const local = doc.nodes
    .filter((n) => n.type === "component" && !n.componentOwner)
    .map((node) => ({
      reference: node.id,
      node,
      scene: doc,
      source: "local",
      sourceName: t("Local components"),
      name: node.name,
    }));
  const external = availableLibraryEntries(doc).flatMap((entry) => {
    const node = entry.nodes.find((n) => !n.parentId);
    return node
      ? [
          {
            reference: entry.sourceId,
            node,
            scene: { ...doc, nodes: entry.nodes },
            source: entry.libraryId ?? "imported",
            sourceName:
              doc.libraries?.find((l) => l.id === entry.libraryId)?.name ??
              t("Imported library"),
            name: entry.name,
          },
        ]
      : [];
  });
  const usedSets = new Set<string>();
  const catalog = [...local, ...external].flatMap<AssetEntry>((entry) => {
    const set = doc.componentSets?.find((s) =>
      s.variants.some((v) => v.componentId === entry.reference),
    );
    if (set) {
      if (usedSets.has(set.id)) return [];
      usedSets.add(set.id);
      const preferred =
        [...local, ...external].find(
          (e) =>
            e.reference ===
            (set.defaultComponentId ?? set.variants[0]?.componentId),
        ) ?? entry;
      return [{ ...preferred, name: set.name, setId: set.id }];
    }
    return [{ ...entry, setId: undefined }];
  });
  const folders = [
    ...new Set(
      catalog.map((e) =>
        e.name.includes("/") ? e.name.slice(0, e.name.lastIndexOf("/")) : "",
      ),
    ),
  ].filter(Boolean);
  const matches = catalog.filter(
    (e) =>
      (source === "all" || e.source === source) &&
      (folder === "all" || e.name.startsWith(folder + "/")) &&
      e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const open = (reference: string) => {
    try {
      setDraft(createComponentInstance(doc, reference, doc.pages[0].id, 0, 0));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const root = draft?.doc.nodes.find((n) => n.id === draft.id);
  const dragHandlers = (
    reference: string,
    name: string,
    values?: Record<string, string | boolean>,
  ) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      suppressClick.current = false;
      gesture.current = { x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const g = gesture.current;
      if (!g) return;
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 5) g.moved = true;
      if (g.moved) {
        setPreview({ name, x: e.clientX, y: e.clientY });
        onPreview?.({ x: e.clientX, y: e.clientY });
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      const g = gesture.current;
      gesture.current = null;
      setPreview(null);
      onPreview?.();
      if (g?.moved) {
        suppressClick.current = true;
        onInsert(reference, { x: e.clientX, y: e.clientY }, values);
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onPointerCancel: cancel,
    onLostPointerCapture: () => {
      gesture.current = null;
      setPreview(null);
      onPreview?.();
    },
  });
  return (
    <section className="local-assets" aria-label={t("Local components")}>
      {draft && root ? (
        <>
          <button
            onClick={() => setDraft(null)}
            aria-label={t("Back to assets")}
          >
            <ArrowLeft size={16} />
            {t("Back to assets")}
          </button>
          <h3>{root.name}</h3>
          <p className="muted">
            {catalog.find((c) => c.reference === root.componentId)
              ?.sourceName ?? t("Local components")}
          </p>
          <button
            className="asset-detail-preview"
            aria-label={t("Drag preview to insert")}
            {...dragHandlers(
              root.componentId!,
              root.name,
              root.componentValues,
            )}
          >
            <LayerThumbnailContent doc={draft.doc} node={root} />
          </button>
          <p>{root.componentDescription || t("No component description")}</p>
          {root.componentDocumentation &&
            /^https?:\/\//.test(root.componentDocumentation) && (
              <a
                href={root.componentDocumentation}
                target="_blank"
                rel="noreferrer"
              >
                {t("Documentation")}
              </a>
            )}
          <ComponentProperties
            doc={draft.doc}
            node={root}
            selected={[root.id]}
            onChange={(next) => setDraft({ ...draft, doc: next })}
            onSelect={() => {}}
          />
          <button
            className="resource"
            onClick={() =>
              onInsert(root.componentId!, undefined, root.componentValues)
            }
          >
            {t("Insert instance")}
          </button>
        </>
      ) : (
        <>
          <h3>
            {t("Local components")} <span>{catalog.length}</span>
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
          <div className="asset-controls">
            <button
              title={t("Grid view")}
              aria-label={t("Grid view")}
              aria-pressed={mode === "grid"}
              onClick={() => setMode("grid")}
            >
              <Grid2X2 size={15} />
            </button>
            <button
              title={t("List view")}
              aria-label={t("List view")}
              aria-pressed={mode === "list"}
              onClick={() => setMode("list")}
            >
              <List size={15} />
            </button>
            <button onClick={onLibraries}>{t("Libraries")}</button>
          </div>
          <select
            aria-label={t("Component source")}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="all">{t("All sources")}</option>
            {[
              ...new Map(
                catalog.map((e) => [e.source, e.sourceName]),
              ).entries(),
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {!!folders.length && (
            <select
              aria-label={t("Component folder")}
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              <option value="all">{t("All folders")}</option>
              {folders.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          )}
          <p className="muted">
            {t(
              "Click for details; drag onto the canvas to create an instance.",
            )}
          </p>
          {!catalog.length && (
            <p>
              {t(
                "Create a main component to see it here. Components from every page in this file appear automatically.",
              )}
            </p>
          )}
          {!!catalog.length && !matches.length && (
            <p>{t("No matching components")}</p>
          )}
          <div className={`asset-grid ${mode === "list" ? "asset-list" : ""}`}>
            {matches.map((e) => (
              <button
                key={e.reference}
                className="asset-card"
                aria-label={t("Component details {name}", { name: e.name })}
                {...dragHandlers(e.reference, e.name)}
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  open(e.reference);
                }}
              >
                <LayerThumbnail doc={e.scene} node={e.node} />
                <span className="asset-name">
                  <Component size={13} />
                  {e.name}
                </span>
                <small>
                  {e.sourceName}
                  {e.setId ? " · " + t("Variants") : ""}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p role="alert">
          {t(error)}
          <button onClick={() => setError("")}>
            <X size={12} />
          </button>
        </p>
      )}
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
