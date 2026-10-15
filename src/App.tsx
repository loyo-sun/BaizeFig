import { arrangeNodes, type ArrangeMode } from "./arrange";
import {
  snapTargets,
  snapCoordinates,
  defaultSnapOptions,
  type SnapOptions,
  type SnapTarget,
  type SnapGuide,
} from "./snapping";
import { SnapOverlay } from "./SnapOverlay";
import { LayerThumbnail } from "./LayerThumbnail";
import { splitVectorLayers } from "./vectorSplit";
import { canvasCursor, prepareToolCursors } from "./toolCursor";
import {
  PathDrawingOverlay,
  type PathDrawingHandle,
} from "./PathDrawingOverlay";
import { drawnPath } from "./pathDrawing";
import { nodeSelectionBounds } from "./pathBounds";
import { VectorEditor } from "./VectorEditor";
import { editableNetwork, convertToPaths } from "./vectorGeometry";
import { BooleanIcon } from "./BooleanIcon";
import { CanvasTextEditor, type TextEditSession } from "./CanvasTextEditor";
import { combineShapes } from "./combine";
import { editTypedVariable, bindingTypes } from "./typedVariables";
import { resizeInWorld } from "./geometry";
import { inverse, transformPoint } from "./fidelity";
import { PrototypePlayer } from "./PrototypePlayer";
import type { PrototypeAction, PrototypeInteraction } from "./prototype";
import {
  createComponentInstance,
  resetComponentInstance,
  detachComponentInstance,
  editLibraryComponent,
  swapComponentInstance,
} from "./components";
import { localDelta, worldTransform, reflowAfterPointerEdit } from "./core";
import {
  setVariableMode,
  editVariableColor,
  removeVariable,
} from "./variables";
import { importFigFile } from "./figImportClient";
import type { FigImportResult } from "./figImport";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type PointerEvent as RPointer,
} from "react";
import {
  MousePointer2,
  Frame,
  Square,
  Circle,
  Minus,
  Type,
  PenTool,
  Pencil,
  Hand,
  Star,
  Triangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Play,
  Undo2,
  Redo2,
  Download,
  Upload,
  FolderOpen,
  Command as CommandIcon,
  Sparkles,
  Settings2,
  X,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Layers,
  Component,
  ArrowUpRight,
  Copy,
  Trash2,
  LayoutGrid,
  Link2,
  Grip,
  Keyboard,
  FilePlus2,
  MoreHorizontal,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  File,
  BriefcaseBusiness,
  Hexagon,
  HelpCircle,
  PanelLeftClose,
} from "lucide-react";
import {
  type Document,
  type Node,
  type Kind,
  type Command,
  makeNode,
  id,
  emptyDocument,
  demoDocument,
  execute,
  History,
  absolute,
  ancestors,
  roots,
  descendants,
  bounds,
  container,
  validateDocument,
} from "./core";
import { Scene, svgString, raster } from "./Canvas";
import {
  save,
  loadLast,
  listDocuments,
  download,
  trashDocument,
  restoreDocument,
  listTrash,
  type TrashRecord,
} from "./storage";
import { generate, type AIConfig } from "./ai";
import { useI18n } from "./LanguageProvider";
import type { Language } from "./i18n";

type Tool =
  | "move"
  | "hand"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "text"
  | "pen"
  | "pencil"
  | "star"
  | "polygon";
type Modal =
  | "files"
  | "shortcuts"
  | "commands"
  | "ai"
  | "bridge"
  | "text"
  | "assets"
  | "share"
  | "variables"
  | "fig-report"
  | "settings"
  | null;
const tools: { id: Tool; label: string; key: string; icon: typeof Square }[] = [
  { id: "move", label: "Move", key: "V", icon: MousePointer2 },
  { id: "frame", label: "Frame", key: "F", icon: Frame },
  { id: "rectangle", label: "Rectangle", key: "R", icon: Square },
  { id: "ellipse", label: "Ellipse", key: "O", icon: Circle },
  { id: "line", label: "Line", key: "L", icon: Minus },
  { id: "pen", label: "Pen / polyline", key: "P", icon: PenTool },
  { id: "pencil", label: "Pencil", key: "⇧ P", icon: Pencil },
  { id: "text", label: "Text", key: "T", icon: Type },
  { id: "hand", label: "Hand", key: "H", icon: Hand },
  { id: "star", label: "Star", key: "", icon: Star },
  { id: "polygon", label: "Polygon", key: "", icon: Triangle },
];
const shortcuts = [
  ["Tools", "Move", "V"],
  ["Tools", "Frame", "F / A"],
  ["Tools", "Rectangle", "R"],
  ["Tools", "Ellipse", "O"],
  ["Tools", "Line", "L"],
  ["Tools", "Pen (polyline)", "P"],
  ["Tools", "Pencil", "Shift P"],
  ["Tools", "Text", "T"],
  ["Tools", "Hand", "H / hold Space"],
  ["Edit", "Undo", "⌘ / Ctrl Z"],
  ["Edit", "Redo", "⌘ / Ctrl Shift Z"],
  ["Edit", "Copy / Cut / Paste", "⌘ / Ctrl C / X / V"],
  ["Edit", "Duplicate", "⌘ / Ctrl D / Alt drag"],
  ["Edit", "Delete", "Backspace / Delete"],
  ["Edit", "Group / Ungroup", "⌘ / Ctrl G / Shift G"],
  ["Edit", "Frame selection", "⌘ / Ctrl Alt G"],
  ["Edit", "Create component", "⌘ / Ctrl Alt K"],
  ["Edit", "Auto layout", "Shift A"],
  ["Edit", "Remove auto layout", "Alt Shift A"],
  ["Edit", "Select all", "⌘ / Ctrl A"],
  ["Edit", "Nudge / large nudge", "Arrow / Shift Arrow"],
  ["Edit", "Forward / backward", "] / ["],
  ["Edit", "Front / back", "⌘ / Ctrl ] / ["],
  ["View", "Zoom in / out", "+ / −"],
  ["View", "Actual size", "Shift 0"],
  ["View", "Zoom to fit", "Shift 1"],
  ["View", "Zoom to selection", "Shift 2"],
  ["View", "Pixel grid", "Shift G"],
  ["View", "Layer outlines", "Shift O"],
  ["View", "Show / hide UI", "⌘ / Ctrl \\"],
  ["File", "Save local copy", "⌘ / Ctrl S"],
  ["File", "Open / import", "⌘ / Ctrl O"],
  ["Help", "Actions", "⌘ / Ctrl K"],
  ["Help", "Shortcuts", "?"],
  ["Prototype", "Present", "Shift Space"],
];
const clone = <T,>(value: T): T => structuredClone(value);
export default function App() {
  const { language, setLanguage, persistenceError, t } = useI18n();
  const [doc, setDoc] = useState<Document>(() => demoDocument());
  const [figReport, setFigReport] = useState<FigImportResult["report"] | null>(
    null,
  );
  const [importBusy, setImportBusy] = useState(false);
  const importInFlight = useRef(false);
  const latestDocument = useRef(doc);
  latestDocument.current = doc;
  const figInput = useRef<HTMLInputElement>(null);
  const [arrangeGap, setArrangeGap] = useState(16);
  const [ready, setReady] = useState(false);
  const [snapOptions, setSnapOptions] = useState<SnapOptions>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("baizefig-snapping") ?? "null",
      );
      return Object.fromEntries(
        Object.entries(defaultSnapOptions).map(([k, v]) => [
          k,
          typeof saved?.[k] === "boolean" ? saved[k] : v,
        ]),
      ) as SnapOptions;
    } catch {
      return defaultSnapOptions;
    }
  });
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [snapSaveError, setSnapSaveError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("baizefig-snapping", JSON.stringify(snapOptions));
      setSnapSaveError(false);
    } catch {
      setSnapSaveError(true);
    }
  }, [snapOptions]);

  const [page, setPage] = useState(doc.pages[0].id),
    [selected, setSelected] = useState<string[]>([]),
    [tool, setTool] = useState<Tool>("move");
  const [view, setView] = useState({ x: 100, y: 70, zoom: 0.75 }),
    [modal, setModal] = useState<Modal>(null),
    [tab, setTab] = useState<"design" | "prototype">("design");
  const [editingVector, setEditingVector] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<TextEditSession | null>(null);
  const [toast, setToast] = useState(""),
    [saved, setSaved] = useState("Loading…"),
    [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [outline, setOutline] = useState(false),
    [grid, setGrid] = useState(false),
    [hiddenUI, setHiddenUI] = useState(false);
  const [zoomMenu, setZoomMenu] = useState(false),
    [layerFilter, setLayerFilter] = useState(""),
    [showLayerSearch, setShowLayerSearch] = useState(false);
  const [trashedFiles, setTrashedFiles] = useState<TrashRecord[]>([]);
  const [fileBusy, setFileBusy] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]),
    [query, setQuery] = useState(""),
    [textValue, setTextValue] = useState(""),
    [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [present, setPresent] = useState<string | null>(null),
    [exportType, setExportType] = useState("PNG"),
    [exportScale, setExportScale] = useState(1);
  const [ai, setAI] = useState<AIConfig>({
      baseUrl: "http://localhost:11434/v1",
      model: "",
      key: "",
      system: "",
    }),
    [prompt, setPrompt] = useState(""),
    [aiBusy, setAIBusy] = useState(false),
    [aiResult, setAIResult] = useState<{
      commands: Command[];
      base: string;
    } | null>(null);
  const [bridgeToken, setBridgeToken] = useState(""),
    [bridgeStatus, setBridgeStatus] = useState("Disconnected"),
    [bridgeWrite, setBridgeWrite] = useState(false);
  const history = useRef(new History()),
    svg = useRef<SVGSVGElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    clipboard = useRef<{ nodes: Node[] } | null>(null),
    space = useRef(false),
    socket = useRef<WebSocket | null>(null),
    abort = useRef<AbortController | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false),
    [isPanning, setIsPanning] = useState(false);
  const effectiveTool = spaceHeld || isPanning ? "hand" : tool;
  const [, refreshToolCursor] = useState(0);
  useEffect(() => {
    if (tool === "pen" || tool === "pencil")
      void prepareToolCursors()
        .then(() => refreshToolCursor((v) => v + 1))
        .catch(() => {});
  }, [tool]);
  const pathDrawing = useRef<PathDrawingHandle>(null);
  useEffect(() => {
    socket.current?.close();
    setBridgeWrite(false);
    setCollapsed(
      new Set(doc.nodes.filter((n) => container(n)).map((n) => n.id)),
    );
  }, [doc.id]);
  const lastPointerHit = useRef<string | undefined>(undefined);
  const drag = useRef<{
    type: "move" | "resize" | "draw" | "pan" | "marquee";
    start: { x: number; y: number };
    screen: { x: number; y: number };
    before: Document;
    ids: string[];
    nodeId?: string;
    handle?: string;
    view: { x: number; y: number; zoom: number };
    shift?: boolean;
    targets?: SnapTarget[];
    moveBase?: Document;
  } | null>(null);
  useEffect(() => {
    setEditingText(null);
  }, [doc.id, page]);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const current = useRef({ doc, page, selected, bridgeWrite });
  current.current = { doc, page, selected, bridgeWrite };
  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    let alive = true;
    loadLast()
      .then((found) => {
        if (alive && found) {
          setDoc(found);
          setPage(found.pages[0].id);
        }
      })
      .catch(() =>
        notify(
          "Unable to restore saved document. Your stored files are unchanged.",
        ),
      )
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [notify]);
  useEffect(() => {
    if (!ready) return;
    setSaved("Saving…");
    const t = setTimeout(
      () =>
        save(doc)
          .then((written) =>
            setSaved(written ? "Saved locally" : "File is in trash"),
          )
          .catch(() => {
            setSaved("Save failed");
            notify("Local storage unavailable. Export a .baizefig backup.");
          }),
      400,
    );
    return () => clearTimeout(t);
  }, [doc, ready, notify]);
  useEffect(
    () => () => {
      socket.current?.close();
      abort.current?.abort();
    },
    [],
  );
  const chosen = doc.nodes.filter((n) => selected.includes(n.id)),
    first = chosen[0];
  const [prototypeTrigger, setPrototypeTrigger] =
    useState<PrototypeInteraction["trigger"]>("click");
  const currentInteraction = first?.interactions?.find(
    (i) => i.trigger === prototypeTrigger,
  );
  const clickAction = currentInteraction?.actions[0];
  const clickType =
    clickAction?.type === "changeTo"
      ? "changeTo"
      : clickAction?.type === "scrollTo"
        ? "scrollTo"
        : "navigate";
  function editClickAction(action: PrototypeAction | undefined) {
    if (!first) return;
    patch({
      targetId: undefined,
      interactions: [
        ...(first.interactions ?? []).filter(
          (i) => i.trigger !== prototypeTrigger,
        ),
        ...(action
          ? [
              {
                ...currentInteraction,
                trigger: prototypeTrigger,
                ...(prototypeTrigger === "delay"
                  ? { delayMs: currentInteraction?.delayMs ?? 300 }
                  : {}),
                actions: [action],
              },
            ]
          : []),
      ],
    });
  }
  const change = (next: Document, selection?: string[]) => {
    validateDocument(next);
    history.current.push(doc);
    setDoc(next);
    if (selection) setSelected(selection);
  };
  const run = (command: Command) => {
    try {
      const result = execute(doc, command);
      if (JSON.stringify(result.doc) !== JSON.stringify(doc))
        change(result.doc, result.selection);
      else if (result.selection) setSelected(result.selection);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const undo = () => {
    setDoc(history.current.undo(doc));
    setSelected([]);
  };
  const redo = () => {
    setDoc(history.current.redo(doc));
    setSelected([]);
  };
  function editVector(node = first) {
    if (!node || node.locked || ancestors(doc, node).some((p) => p.locked))
      return;
    try {
      editableNetwork(node);
      setEditingText(null);
      setSelected([node.id]);
      setEditingVector(node.id);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function splitVectorSelection() {
    try {
      const result = splitVectorLayers(doc, selected);
      if (JSON.stringify(result.doc) !== JSON.stringify(doc)) {
        setEditingVector(null);
        change(result.doc, result.selection);
      }
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function vectorOperation(operation: "flatten" | "outline") {
    try {
      const result = convertToPaths(doc, selected, operation);
      setEditingVector(null);
      change(result.doc, result.selection);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  useEffect(() => {
    if (
      !selected.includes(editingVector ?? "") ||
      !doc.nodes.some(
        (n) =>
          n.id === editingVector &&
          n.pageId === page &&
          n.visible &&
          !n.locked &&
          !ancestors(doc, n).some((p) => p.locked || !p.visible),
      )
    )
      setEditingVector(null);
  }, [doc.id, doc.nodes, page, selected]);
  const patch = (patch: Partial<Node>) =>
    run({ type: "update", ids: selected, patch });
  const openFiles = async () => {
    await save(doc);
    setDocuments(await listDocuments());
    setTrashedFiles(await listTrash());
    setShowTrash(false);
    setModal("files");
  };
  async function deleteLocalFile(target: Document) {
    if (fileBusy) return;
    setFileBusy(true);
    try {
      if (target.id === doc.id) await save(doc);
      await trashDocument(target.id);
      const remaining = await listDocuments();
      if (target.id === doc.id) {
        const next = remaining[0] ?? emptyDocument();
        if (!remaining.length) {
          next.name = t("Untitled");
          next.pages[0].name = t("Page {number}", { number: 1 });
          await save(next);
          remaining.push(next);
        }
        history.current = new History();
        setDoc(next);
        setPage(next.pages[0].id);
        setSelected([]);
        setCollapsed(new Set());
        setView({ x: 100, y: 80, zoom: 1 });
      }
      setDocuments(remaining);
      setTrashedFiles(await listTrash());
      notify("File moved to trash");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setFileBusy(false);
    }
  }
  async function restoreLocalFile(id: string) {
    if (fileBusy) return;
    setFileBusy(true);
    try {
      await restoreDocument(id);
      setDocuments(await listDocuments());
      setTrashedFiles(await listTrash());
      notify("File restored");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setFileBusy(false);
    }
  }
  const localExport = () => {
    download(JSON.stringify(doc, null, 2), `${doc.name}.baizefig`);
    notify("Local copy exported");
  };
  const fit = (selection = false) => {
    const nodes = selection
      ? chosen
      : doc.nodes.filter((n) => n.pageId === page && !n.parentId && n.visible);
    const b = bounds(doc, nodes);
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const zoom = Math.min(
      2,
      Math.max(
        0.05,
        Math.min(
          (rect.width - 160) / Math.max(b.width, 100),
          (rect.height - 160) / Math.max(b.height, 100),
        ),
      ),
    );
    setView({
      zoom,
      x: (rect.width - b.width * zoom) / 2 - b.x * zoom,
      y: (rect.height - b.height * zoom) / 2 - b.y * zoom,
    });
  };
  const point = (e: { clientX: number; clientY: number }) => {
    const rect = svg.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - view.x) / view.zoom,
      y: (e.clientY - rect.top - view.y) / view.zoom,
    };
  };
  function snapWorldPoint(
    p: { x: number; y: number },
    exclude: string[] = [],
    disabled = false,
  ) {
    const result = snapCoordinates(
      [p.x],
      [p.y],
      snapTargets(doc, page, exclude),
      snapOptions,
      view.zoom,
      disabled,
    );
    setSnapGuides(result.guides);
    return { x: p.x + result.x, y: p.y + result.y };
  }
  function parentFor(p: { x: number; y: number }) {
    return [...doc.nodes].reverse().find(
      (n) =>
        n.pageId === page &&
        n.type === "frame" &&
        n.visible &&
        !n.locked &&
        (() => {
          try {
            const local = transformPoint(
              inverse(worldTransform(doc, n)),
              p.x,
              p.y,
            );
            return (
              local.x >= 0 &&
              local.x <= n.width &&
              local.y >= 0 &&
              local.y <= n.height
            );
          } catch {
            return false;
          }
        })(),
    );
  }
  function pointerDown(e: RPointer, id?: string, handle?: string) {
    if (editingText) return;
    lastPointerHit.current = id;
    if (e.button === 2) return;
    if (e.button !== 0 && e.button !== 1) return;
    setContext(null);
    e.stopPropagation();
    svg.current?.setPointerCapture(e.pointerId);
    const p = point(e);
    const base = {
      start: p,
      screen: { x: e.clientX, y: e.clientY },
      before: clone(doc),
      view: { ...view },
      ids: [] as string[],
    };
    if (tool === "hand" || space.current || e.button === 1) {
      drag.current = { ...base, type: "pan" };
      setIsPanning(true);
      return;
    }
    if (tool === "pen" || tool === "pencil") return;
    if (handle && id && tool === "move") {
      drag.current = { ...base, type: "resize", ids: [id], nodeId: id, handle };
      return;
    }
    if (id && tool === "move" && !handle && !e.metaKey && !e.ctrlKey) {
      const node = doc.nodes.find((n) => n.id === id);
      if (node?.type === "frame") {
        const local = transformPoint(
            inverse(worldTransform(doc, node)),
            p.x,
            p.y,
          ),
          edge = 5 / view.zoom;
        if (
          local.x > edge &&
          local.y > edge &&
          local.x < node.width - edge &&
          local.y < node.height - edge
        )
          id = undefined;
      }
    }
    if (tool !== "move") {
      const kind: Kind = tool;
      const parent = kind === "frame" ? undefined : parentFor(p);
      const origin = parent
        ? transformPoint(inverse(worldTransform(doc, parent)), p.x, p.y)
        : p;
      const n = makeNode(kind, page, {
        x: origin.x,
        y: origin.y,
        parentId: parent?.id ?? null,
        width: tool === "text" ? 240 : 0,
        height: tool === "text" ? 36 : 0,
        fill:
          kind === "line"
            ? "none"
            : kind === "frame"
              ? "#ffffff"
              : kind === "text"
                ? "#202a24"
                : "#c5c8d0",
      });
      setDoc({ ...doc, nodes: [...doc.nodes, n] });
      setSelected([n.id]);
      drag.current = { ...base, type: "draw", ids: [n.id], nodeId: n.id };
      return;
    }
    if (id) {
      let n = doc.nodes.find((n) => n.id === id)!;
      if (n.locked || ancestors(doc, n).some((p) => p.locked)) return;
      if (!e.metaKey && !e.ctrlKey) {
        const parents = ancestors(doc, n);
        const selectedParent = parents.find((p) => selected.includes(p.id));
        if (selectedParent) {
          const chain = [n, ...parents],
            index = chain.findIndex((p) => p.id === selectedParent.id);
          n = chain[Math.max(0, index - 1)];
        } else if (!selected.includes(n.id)) {
          const group = parents.find((p) =>
            ["group", "component", "instance"].includes(p.type),
          );
          if (group) n = group;
        }
      }
      let ids = e.shiftKey
        ? selected.includes(n.id)
          ? selected.filter((s) => s !== n.id)
          : [...selected, n.id]
        : selected.includes(n.id)
          ? selected
          : [n.id];
      let before = clone(doc);
      if (e.altKey) {
        const result = execute(doc, { type: "duplicate", ids, offset: 0 });
        setDoc(result.doc);
        ids = result.selection!;
        base.before = result.doc;
      }
      setSelected(ids);
      drag.current = {
        ...base,
        type: "move",
        ids,
        moveBase: clone(e.altKey ? base.before : doc),
        targets: snapTargets(doc, page, ids),
      };
      if (e.altKey) drag.current.before = before;
      return;
    }
    if (!e.shiftKey) setSelected([]);
    setMarquee({ x: p.x, y: p.y, width: 0, height: 0 });
    drag.current = {
      ...base,
      type: "marquee",
      ids: e.shiftKey ? selected : [],
    };
  }
  function pointerMove(e: RPointer) {
    const d = drag.current;
    if (!d) return;
    const raw = point(e),
      p =
        d.type === "resize" || d.type === "draw"
          ? snapWorldPoint(raw, d.ids, e.ctrlKey || e.metaKey || e.shiftKey)
          : raw,
      dx = p.x - d.start.x,
      dy = p.y - d.start.y;
    if (d.type === "pan") {
      setView({
        ...d.view,
        x: d.view.x + e.clientX - d.screen.x,
        y: d.view.y + e.clientY - d.screen.y,
      });
      return;
    }
    if (d.type === "marquee") {
      setMarquee({
        x: Math.min(p.x, d.start.x),
        y: Math.min(p.y, d.start.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      });
      return;
    }
    if (d.type === "move") {
      const source = d.moveBase!,
        nodes = roots(source, d.ids),
        box = bounds(source, nodes);
      let mx = e.shiftKey && Math.abs(dy) > Math.abs(dx) ? 0 : dx,
        my = e.shiftKey && Math.abs(dx) > Math.abs(dy) ? 0 : dy;
      const snapped = snapCoordinates(
        [box.x + mx, box.x + box.width / 2 + mx, box.x + box.width + mx],
        [box.y + my, box.y + box.height / 2 + my, box.y + box.height + my],
        d.targets ?? [],
        snapOptions,
        view.zoom,
        e.ctrlKey || e.metaKey,
      );
      if (!e.shiftKey || Math.abs(dx) >= Math.abs(dy)) mx += snapped.x;
      if (!e.shiftKey || Math.abs(dy) >= Math.abs(dx)) my += snapped.y;
      setSnapGuides(
        snapped.guides.filter(
          (g) =>
            !e.shiftKey ||
            (g.axis === "x"
              ? Math.abs(dx) >= Math.abs(dy)
              : Math.abs(dy) >= Math.abs(dx)),
        ),
      );
      const ids = new Set(nodes.map((n) => n.id));
      setDoc({
        ...source,
        nodes: source.nodes.map((n) => {
          if (!ids.has(n.id)) return n;
          const delta = localDelta(source, n, mx, my);
          return { ...n, x: n.x + delta.x, y: n.y + delta.y };
        }),
      });
      return;
    }
    if (d.type === "resize") {
      try {
        setDoc(
          resizeInWorld(d.before, d.nodeId!, d.handle!, dx, dy, e.shiftKey),
        );
      } catch (error) {
        setDoc(d.before);
        drag.current = null;
        notify((error as Error).message);
      }
      return;
    }
    if (d.type === "draw") {
      setDoc((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.id !== d.nodeId || n.type === "text") return n;
          const parent = n.parentId
            ? prev.nodes.find((a) => a.id === n.parentId)
            : undefined;
          const m = parent
            ? inverse(worldTransform(d.before, parent))
            : undefined;
          const start = m ? transformPoint(m, d.start.x, d.start.y) : d.start,
            end = m ? transformPoint(m, p.x, p.y) : p,
            localDx = end.x - start.x,
            localDy = end.y - start.y;
          if (n.type === "path") {
            const pts = [...(n.points ?? []), { x: localDx, y: localDy }];
            return {
              ...n,
              points: pts,
              width:
                Math.max(1, ...pts.map((a) => a.x)) -
                Math.min(0, ...pts.map((a) => a.x)),
              height:
                Math.max(1, ...pts.map((a) => a.y)) -
                Math.min(0, ...pts.map((a) => a.y)),
            };
          }
          let w = Math.abs(localDx),
            h = Math.abs(localDy);
          if (e.shiftKey) {
            const side = Math.max(w, h);
            w = side;
            h = side;
          }
          return {
            ...n,
            x: localDx < 0 ? start.x - w : start.x,
            y: localDy < 0 ? start.y - h : start.y,
            width: Math.max(1, w),
            height: Math.max(1, h),
          };
        }),
      }));
    }
  }
  function pointerUp() {
    setSnapGuides([]);
    setIsPanning(false);
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.type === "marquee") {
      if (marquee) {
        const hits = doc.nodes
          .filter(
            (n) => n.pageId === page && !n.parentId && n.visible && !n.locked,
          )
          .filter((n) => {
            const p = bounds(doc, [n]);
            return (
              p.x >= marquee.x &&
              p.y >= marquee.y &&
              p.x + p.width <= marquee.x + marquee.width &&
              p.y + p.height <= marquee.y + marquee.height
            );
          });
        setSelected([...new Set([...d.ids, ...hits.map((n) => n.id)])]);
      }
      setMarquee(null);
      return;
    }
    if (d.type === "pan") return;
    let next = doc;
    if (d.type === "draw") {
      next = {
        ...doc,
        nodes: doc.nodes.map((n) => {
          if (n.id !== d.nodeId) return n;
          if (n.type === "path" && n.points?.length) {
            const minX = Math.min(...n.points.map((p) => p.x)),
              minY = Math.min(...n.points.map((p) => p.y));
            return {
              ...n,
              x: n.x + minX,
              y: n.y + minY,
              points: n.points.map((p) => ({ x: p.x - minX, y: p.y - minY })),
            };
          }
          return n.width < 3 && n.height < 3
            ? { ...n, width: 160, height: 100 }
            : n;
        }),
      };
      setTool("move");
    }
    if (d.type === "move" || d.type === "resize") {
      try {
        next = reflowAfterPointerEdit(d.before, next);
      } catch (error) {
        notify((error as Error).message);
        setDoc(d.before);
        return;
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(d.before)) {
      history.current.push(d.before);
      setDoc(next);
    }
    if (
      d.type === "draw" &&
      next.nodes.find((n) => n.id === d.nodeId)?.type === "text"
    )
      setEditingText({ id: d.nodeId!, documentId: next.id, selectAll: true });
  }
  function cancelDrag() {
    setSnapGuides([]);
    setIsPanning(false);
    const d = drag.current;
    if (d) {
      setDoc(d.before);
      drag.current = null;
      setMarquee(null);
    }
  }
  function copy(cut = false) {
    const nodes = roots(doc, selected);
    const all = descendants(
      doc,
      nodes.map((n) => n.id),
    );
    const data = doc.nodes
      .filter((n) => all.includes(n.id))
      .map((n) =>
        nodes.includes(n)
          ? (() => {
              const m = worldTransform(doc, n);
              return {
                ...clone(n),
                x: m[4],
                y: m[5],
                rotation: 0,
                fidelity: {
                  ...clone(n.fidelity),
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
          : clone(n),
      );
    clipboard.current = { nodes: data };
    navigator.clipboard
      ?.writeText(JSON.stringify({ format: "baizefig-clipboard", nodes: data }))
      .catch(() => {});
    if (cut) run({ type: "delete", ids: selected });
    else notify("Copied");
  }
  async function paste() {
    let data = clipboard.current;
    try {
      const raw = await navigator.clipboard.readText();
      const parsed = JSON.parse(raw);
      if (parsed.format === "baizefig-clipboard" && Array.isArray(parsed.nodes))
        data = parsed;
    } catch {
      /* Browser clipboard permission may be unavailable; use session clipboard. */
    }
    if (!data) return;
    const map = new Map(data.nodes.map((n) => [n.id, id()]));
    const nodes = data.nodes.map((n) => ({
      ...clone(n),
      id: map.get(n.id)!,
      pageId: page,
      parentId: n.parentId ? (map.get(n.parentId) ?? null) : null,
      x: n.x + (n.parentId ? 0 : 20),
      y: n.y + (n.parentId ? 0 : 20),
      targetId: n.targetId ? map.get(n.targetId) : undefined,
    }));
    run({ type: "create", nodes });
  }
  function autoLayout(remove = false) {
    if (!first) return;
    if (selected.length === 1 && container(first))
      run({
        type: "layout",
        id: first.id,
        direction: remove ? "none" : "horizontal",
      });
    else {
      try {
        const result = execute(doc, {
          type: "group",
          ids: selected,
          kind: "frame",
        });
        const next = execute(result.doc, {
          type: "layout",
          id: result.selection![0],
          direction: "horizontal",
        });
        change(next.doc, result.selection);
      } catch (e) {
        notify((e as Error).message);
      }
    }
  }
  function presentStart() {
    const frame =
      first?.type === "frame"
        ? first
        : doc.nodes.find(
            (n) => n.pageId === page && n.type === "frame" && !n.parentId,
          );
    if (frame) setPresent(frame.id);
    else notify("Create a frame to start a prototype");
  }
  async function importFiles(files: FileList | File[] | null) {
    if (!files?.length || importInFlight.current) return;
    importInFlight.current = true;
    let next = doc;
    const selection: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024)
          throw Error("Files must be smaller than 50 MB");
        if (/\.(baizefig|json)$/i.test(file.name)) {
          const parsed = JSON.parse(await file.text());
          validateDocument(parsed);
          parsed.id = id();
          await save(doc);
          history.current = new History();
          setDoc(parsed);
          setPage(parsed.pages[0].id);
          setSelected([]);
          setModal(null);
          notify("Document imported");
          return;
        }
        if (/\.fig$/i.test(file.name)) {
          setImportBusy(true);
          const imported = await importFigFile(file);
          await save(latestDocument.current);
          await save(imported.document);
          history.current = new History();
          setDoc(imported.document);
          setPage(imported.document.pages[0].id);
          setSelected([]);
          setCollapsed(
            new Set(
              imported.document.nodes
                .filter((n) => !n.parentId)
                .map((n) => n.id),
            ),
          );
          setFigReport(imported.report);
          setModal("fig-report");
          const roots = imported.document.nodes.filter(
            (n) =>
              !n.parentId &&
              n.pageId === imported.document.pages[0].id &&
              n.visible,
          );
          const b = bounds(imported.document, roots);
          const rect = svg.current?.getBoundingClientRect();
          if (rect) {
            const zoom = Math.min(
              1,
              Math.max(
                0.01,
                Math.min(
                  (rect.width - 100) / Math.max(b.width, 100),
                  (rect.height - 100) / Math.max(b.height, 100),
                ),
              ),
            );
            setView({
              zoom,
              x: (rect.width - b.width * zoom) / 2 - b.x * zoom,
              y: (rect.height - b.height * zoom) / 2 - b.y * zoom,
            });
          }
          notify("Figma file imported");
          return;
        }
        if (/\.(sketch|pdf)$/i.test(file.name))
          throw Error(
            `${file.name.split(".").pop()?.toUpperCase()} import is not implemented yet. Use .baizefig, JSON, SVG or images.`,
          );
        if (
          ![
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "image/svg+xml",
          ].includes(file.type)
        )
          throw Error("Unsupported file type");
        let data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const image = new Image();
        image.src = data;
        await image.decode();
        if (image.width * image.height > 40000000)
          throw Error("Image dimensions exceed 40 megapixels");
        if (file.type === "image/svg+xml") {
          data = await new Promise<string>((resolve, reject) => {
            const c = document.createElement("canvas");
            c.width = Math.min(image.width || 800, 4096);
            c.height = Math.min(image.height || 600, 4096);
            c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
            try {
              resolve(c.toDataURL("image/png"));
            } catch {
              reject(Error("SVG contains unsupported resources"));
            }
          });
        }
        const n = makeNode("image", page, {
          name: file.name,
          image: data,
          x: 80 + selection.length * 30,
          y: 80 + selection.length * 30,
          width: Math.min(1200, image.width || 300),
          height:
            (image.height || 200) * Math.min(1, 1200 / (image.width || 300)),
        });
        next = execute(next, { type: "create", nodes: [n] }).doc;
        selection.push(n.id);
      }
      change(next, selection);
      notify(
        "Assets imported" +
          (Array.from(files).some((f) => f.type === "image/svg+xml")
            ? " · SVG imported as image"
            : ""),
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      importInFlight.current = false;
      setImportBusy(false);
      if (figInput.current) figInput.current.value = "";
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function exportAsset() {
    try {
      const data = await svgString(doc, page, selected);
      if (exportType === "SVG")
        download(data, `${first?.name ?? doc.name}.svg`, "image/svg+xml");
      else if (exportType === "HTML")
        download(
          `<!doctype html><html><meta charset="utf-8"><title>BaizeFig export</title><body style="margin:0">${data.replace(/^<\?xml[^>]*>/, "")}</body></html>`,
          `${doc.name}.html`,
          "text/html",
        );
      else
        download(
          await raster(
            data,
            exportScale,
            exportType === "JPG" ? "image/jpeg" : "image/png",
          ),
          `${first?.name ?? doc.name}.${exportType.toLowerCase()}`,
        );
      notify("Export complete");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function addPage() {
    const p = {
      id: id(),
      name: t("Page {number}", { number: doc.pages.length + 1 }),
    };
    change({ ...doc, pages: [...doc.pages, p] }, []);
    setPage(p.id);
  }
  function deletePage() {
    if (doc.pages.length === 1) {
      notify("Keep at least one page");
      return;
    }
    change(
      {
        ...doc,
        pages: doc.pages.filter((p) => p.id !== page),
        nodes: doc.nodes.filter((n) => n.pageId !== page),
      },
      [],
    );
    setPage(doc.pages.find((p) => p.id !== page)!.id);
  }
  function newDoc() {
    void save(doc).then(() => {
      const next = emptyDocument();
      next.name = t("Untitled");
      next.pages[0].name = t("Page {number}", { number: 1 });
      history.current = new History();
      setDoc(next);
      setPage(next.pages[0].id);
      setSelected([]);
      setModal(null);
      setView({ x: 100, y: 80, zoom: 1 });
    });
  }
  function createInstance(n: Node) {
    try {
      const next = createComponentInstance(doc, n.id, page, n.x + 40, n.y + 40);
      change(next.doc, [next.id]);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function openMainComponent() {
    if (!first?.componentId) return;
    try {
      const result = editLibraryComponent(doc, first.componentId);
      change(result.doc, [result.id]);
      setPage(result.doc.nodes.find((n) => n.id === result.id)!.pageId);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const arrangeCommands: { mode: ArrangeMode; name: string }[] = [
    { mode: "round", name: "Round to pixel" },
    { mode: "tidy", name: "Tidy up" },
    { mode: "pack-x", name: "Pack horizontal" },
    { mode: "pack-y", name: "Pack vertical" },
    { mode: "space-x", name: "Distribute horizontal spacing" },
    { mode: "space-y", name: "Distribute vertical spacing" },
    { mode: "left", name: "Distribute left" },
    { mode: "center", name: "Distribute horizontal centers" },
    { mode: "right", name: "Distribute right" },
    { mode: "top", name: "Distribute top" },
    { mode: "middle", name: "Distribute vertical centers" },
    { mode: "bottom", name: "Distribute bottom" },
  ];
  function arrangeSelection(mode: ArrangeMode) {
    try {
      change(arrangeNodes(doc, selected, mode, arrangeGap));
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const actions = [
    ...arrangeCommands.map((c) => ({
      name: c.name,
      key: "",
      run: () => arrangeSelection(c.mode),
    })),
    { name: "General settings", key: "", run: () => setModal("settings") },
    ...[
      { name: "Desktop frame · 1440 × 900", width: 1440, height: 900 },
      { name: "iPhone frame · 393 × 852", width: 393, height: 852 },
      { name: "Tablet frame · 834 × 1194", width: 834, height: 1194 },
    ].map((p) => ({
      name: p.name,
      key: "",
      run: () =>
        run({
          type: "create",
          nodes: [
            makeNode("frame", page, {
              name: p.name,
              x: 80,
              y: 80,
              width: p.width,
              height: p.height,
            }),
          ],
        }),
    })),
    { name: "New design file", key: "", run: newDoc },
    { name: "Open file browser", key: "", run: () => void openFiles() },
    {
      name: "Import file or image",
      key: "⌘ O",
      run: () => fileInput.current?.click(),
    },
    { name: "Save local copy", key: "⌘ S", run: localExport },
    { name: "Undo", key: "⌘ Z", run: undo },
    { name: "Redo", key: "⇧ ⌘ Z", run: redo },
    {
      name: "Duplicate selection",
      key: "⌘ D",
      run: () => run({ type: "duplicate", ids: selected }),
    },
    {
      name: "Group selection",
      key: "⌘ G",
      run: () => run({ type: "group", ids: selected }),
    },
    {
      name: "Ungroup selection",
      key: "⇧ ⌘ G",
      run: () => run({ type: "ungroup", ids: selected }),
    },
    {
      name: "Frame selection",
      key: "⌥ ⌘ G",
      run: () => run({ type: "group", ids: selected, kind: "frame" }),
    },
    {
      name: "Create component",
      key: "⌥ ⌘ K",
      run: () => run({ type: "group", ids: selected, kind: "component" }),
    },
    { name: "Edit vector", key: "Enter", run: () => editVector() },
    { name: "Flatten", key: "⌥ ⇧ F", run: () => vectorOperation("flatten") },
    {
      name: "Outline stroke",
      key: "⌥ ⌘ O",
      run: () => vectorOperation("outline"),
    },
    { name: "Split vector into layers", key: "", run: splitVectorSelection },
    { name: "Add auto layout", key: "⇧ A", run: () => autoLayout() },
    { name: "Zoom to fit", key: "⇧ 1", run: () => fit() },
    { name: "Zoom to selection", key: "⇧ 2", run: () => fit(true) },
    { name: "AI design engine", key: "", run: () => setModal("ai") },
    { name: "MCP connection", key: "", run: () => setModal("bridge") },
    { name: "Keyboard shortcuts", key: "?", run: () => setModal("shortcuts") },
  ];
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (importInFlight.current) return;
      const el = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
        el.isContentEditable
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Quote") {
        e.preventDefault();
        setSnapOptions((v) => ({ ...v, pixel: !v.pixel }));
        return;
      }
      if (e.altKey && e.ctrlKey && ["KeyT", "KeyH", "KeyV"].includes(e.code)) {
        e.preventDefault();
        arrangeSelection(
          e.code === "KeyT"
            ? "tidy"
            : e.code === "KeyH"
              ? "space-x"
              : "space-y",
        );
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const align = (
          {
            KeyA: "left",
            KeyH: "center",
            KeyD: "right",
            KeyW: "top",
            KeyV: "middle",
            KeyS: "bottom",
          } as const
        )[e.code as "KeyA"];
        if (align) {
          e.preventDefault();
          run({ type: "align", ids: selected, axis: align });
          return;
        }
      }
      if (editingVector) return;
      if (e.key === "Enter" && first && !modal && !present) {
        e.preventDefault();
        editVector();
        return;
      }
      if (e.altKey && e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        vectorOperation("flatten");
        return;
      }
      if (e.altKey && (e.metaKey || e.ctrlKey) && e.code === "KeyO") {
        e.preventDefault();
        vectorOperation("outline");
        return;
      }
      if (e.key === "Escape") {
        if (present) {
          setPresent(null);
          return;
        }
        if (modal) {
          setModal(null);
          return;
        }
        cancelDrag();
        setContext(null);
        setSelected([]);
        setTool("move");
        return;
      }
      if (modal || present) return;
      const mod = e.metaKey || e.ctrlKey,
        k = e.key.toLowerCase();
      if (k === " " && !e.shiftKey) {
        space.current = true;
        setSpaceHeld(true);
        e.preventDefault();
        return;
      }
      if (mod) {
        if (k === "z") {
          e.preventDefault();
          e.shiftKey ? redo() : undo();
          return;
        }
        if (k === "y") {
          e.preventDefault();
          redo();
          return;
        }
        if (k === "a") {
          e.preventDefault();
          setSelected(
            doc.nodes
              .filter(
                (n) =>
                  n.pageId === page && !n.parentId && n.visible && !n.locked,
              )
              .map((n) => n.id),
          );
          return;
        }
        if (k === "s") {
          e.preventDefault();
          localExport();
          return;
        }
        if (k === "o") {
          e.preventDefault();
          fileInput.current?.click();
          return;
        }
        if (k === "d") {
          e.preventDefault();
          run({ type: "duplicate", ids: selected });
          return;
        }
        if (k === "g") {
          e.preventDefault();
          run(
            e.shiftKey
              ? { type: "ungroup", ids: selected }
              : {
                  type: "group",
                  ids: selected,
                  kind: e.altKey ? "frame" : "group",
                },
          );
          return;
        }
        if (k === "k") {
          e.preventDefault();
          if (e.altKey)
            run({ type: "group", ids: selected, kind: "component" });
          else {
            setQuery("");
            setModal("commands");
          }
          return;
        }
        if (k === "c") {
          e.preventDefault();
          copy();
          return;
        }
        if (k === "x") {
          e.preventDefault();
          copy(true);
          return;
        }
        if (k === "v") {
          e.preventDefault();
          void paste();
          return;
        }
        if (k === "\\") {
          e.preventDefault();
          setHiddenUI((v) => !v);
          return;
        }
        if (k === "[" || k === "]") {
          e.preventDefault();
          run({
            type: "order",
            ids: selected,
            direction: k === "]" ? "front" : "back",
          });
          return;
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        run({ type: "delete", ids: selected });
        return;
      }
      if (k === "a" && e.shiftKey) {
        e.preventDefault();
        autoLayout(e.altKey);
        return;
      }
      if (k === "g" && e.shiftKey) {
        setGrid((v) => !v);
        return;
      }
      if (k === "o" && e.shiftKey) {
        setOutline((v) => !v);
        return;
      }
      if (k === " " && e.shiftKey) {
        e.preventDefault();
        presentStart();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        const ns = roots(doc, selected).filter(
          (n) => !n.locked && !ancestors(doc, n).some((p) => p.locked),
        );
        let next = doc;
        for (const n of ns)
          next = execute(next, {
            type: "update",
            ids: [n.id],
            patch: {
              x:
                n.x +
                (k === "arrowright" ? amount : k === "arrowleft" ? -amount : 0),
              y:
                n.y +
                (k === "arrowdown" ? amount : k === "arrowup" ? -amount : 0),
            },
          }).doc;
        if (ns.length) change(next);
        return;
      }
      if (k === "[" || k === "]") {
        e.preventDefault();
        run({
          type: "order",
          ids: selected,
          direction: k === "]" ? "forward" : "backward",
        });
        return;
      }
      if (e.shiftKey && e.code === "Digit1") {
        e.preventDefault();
        fit();
        return;
      }
      if (e.shiftKey && e.code === "Digit2") {
        e.preventDefault();
        fit(true);
        return;
      }
      if (e.shiftKey && e.code === "Digit0") {
        setView((v) => ({ ...v, zoom: 1 }));
        return;
      }
      if (k === "+" || k === "=" || k === "-") {
        e.preventDefault();
        setView((v) => ({
          ...v,
          zoom: Math.min(8, Math.max(0.05, v.zoom * (k === "-" ? 0.8 : 1.25))),
        }));
        return;
      }
      if (e.key === "?") {
        setModal("shortcuts");
        return;
      }
      const mapping: Record<string, Tool> = {
        v: "move",
        f: "frame",
        a: "frame",
        r: "rectangle",
        o: "ellipse",
        l: "line",
        p: e.shiftKey ? "pencil" : "pen",
        t: "text",
        h: "hand",
      };
      if (mapping[k] && !mod) {
        pathDrawing.current?.finish();
        setTool(mapping[k]);
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") {
        space.current = false;
        setSpaceHeld(false);
      }
    };
    const blur = () => {
      space.current = false;
      setSpaceHeld(false);
      cancelDrag();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  });
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect(),
          px = e.clientX - r.left,
          py = e.clientY - r.top;
        setView((v) => {
          const z = Math.max(
            0.05,
            Math.min(8, v.zoom * Math.exp(-e.deltaY * 0.01)),
          );
          return {
            zoom: z,
            x: px - ((px - v.x) * z) / v.zoom,
            y: py - ((py - v.y) * z) / v.zoom,
          };
        });
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [hiddenUI, ready]);
  async function askAI() {
    if (!ai.model || !prompt.trim()) {
      notify("Enter a model and design request");
      return;
    }
    setAIBusy(true);
    setAIResult(null);
    abort.current = new AbortController();
    const base = JSON.stringify(doc);
    try {
      const commands = await generate(
        ai,
        prompt,
        doc,
        selected,
        abort.current.signal,
      );
      setAIResult({ commands, base });
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setAIBusy(false);
    }
  }
  function applyAI() {
    if (!aiResult) return;
    if (JSON.stringify(doc) !== aiResult.base) {
      notify("Document changed. Generate a new proposal before applying.");
      return;
    }
    try {
      let next = doc;
      for (const c of aiResult.commands) next = execute(next, c).doc;
      change(next);
      setAIResult(null);
      setModal(null);
      notify("AI changes applied · Undo available");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function connectBridge() {
    socket.current?.close();
    const ws = new WebSocket(
      `ws://127.0.0.1:4319/?token=${encodeURIComponent(bridgeToken)}`,
    );
    socket.current = ws;
    setBridgeStatus("Connecting…");
    ws.onopen = () => setBridgeStatus("Connected");
    ws.onclose = () => setBridgeStatus("Disconnected");
    ws.onerror = () =>
      notify(
        "Bridge connection failed. Start npm run bridge and check the pairing token.",
      );
    ws.onmessage = async (event) => {
      let message: {
        id: string;
        method: string;
        params?: { commands?: Command[] };
      };
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      try {
        const c = current.current;
        let result: unknown;
        if (message.method === "get_document") result = c.doc;
        else if (message.method === "get_selection")
          result = {
            ids: c.selected,
            nodes: c.doc.nodes.filter((n) => c.selected.includes(n.id)),
          };
        else if (message.method === "get_screenshot") {
          const blob = await raster(await svgString(c.doc, c.page, c.selected));
          result = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
        } else if (message.method === "export_svg")
          result = await svgString(c.doc, c.page, c.selected);
        else if (message.method === "apply_commands") {
          if (!c.bridgeWrite)
            throw Error("Write access is disabled in the editor");
          const commands = message.params?.commands;
          if (!Array.isArray(commands) || commands.length > 100)
            throw Error("Invalid command batch");
          let next = c.doc;
          for (const cmd of commands) {
            if (
              ![
                "create",
                "update",
                "delete",
                "group",
                "ungroup",
                "duplicate",
                "order",
                "align",
                "layout",
              ].includes(cmd.type)
            )
              throw Error("Unknown command");
            next = execute(next, cmd).doc;
          }
          history.current.push(c.doc);
          current.current = { ...c, doc: next };
          setDoc(next);
          result = { applied: commands.length };
        } else throw Error("Unknown method");
        ws.send(JSON.stringify({ id: message.id, result }));
      } catch (e) {
        ws.send(
          JSON.stringify({ id: message.id, error: (e as Error).message }),
        );
      }
    };
  }
  function tree(parentId: string | null, depth = 0) {
    return [
      ...doc.nodes.filter((n) => n.pageId === page && n.parentId === parentId),
    ]
      .reverse()
      .map((n) => {
        if (
          layerFilter &&
          !descendants(doc, [n.id]).some((key) =>
            doc.nodes
              .find((a) => a.id === key)
              ?.name.toLowerCase()
              .includes(layerFilter.toLowerCase()),
          )
        )
          return null;
        const children = doc.nodes.some((c) => c.parentId === n.id);
        return (
          <div key={n.id}>
            <div
              className={`layer ${selected.includes(n.id) ? "selected" : ""} ${!n.visible ? "dim" : ""}`}
              style={{ paddingLeft: 12 + depth * 14 }}
              onClick={(e) =>
                setSelected(
                  e.shiftKey
                    ? selected.includes(n.id)
                      ? selected.filter((s) => s !== n.id)
                      : [...selected, n.id]
                    : [n.id],
                )
              }
              onDoubleClick={() => {
                setSelected([n.id]);
                setTextValue(n.name);
                setModal("text");
              }}
            >
              <button
                className="tiny"
                aria-label={t("Toggle {name}", { name: n.name })}
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed((old) => {
                    const next = new Set(old);
                    next.has(n.id) ? next.delete(n.id) : next.add(n.id);
                    return next;
                  });
                }}
              >
                {children ? (
                  collapsed.has(n.id) ? (
                    <ChevronRight size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )
                ) : (
                  <span className="spacer" />
                )}
              </button>
              <LayerThumbnail doc={doc} node={n} />
              <span className="layer-name">{n.name}</span>
              <button
                className="tiny layer-action"
                aria-label={t(n.visible ? "Hide {name}" : "Show {name}", {
                  name: n.name,
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  run({
                    type: "update",
                    ids: [n.id],
                    patch: { visible: !n.visible },
                  });
                }}
              >
                {n.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                className="tiny layer-action"
                aria-label={t(n.locked ? "Unlock {name}" : "Lock {name}", {
                  name: n.name,
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  run({
                    type: "update",
                    ids: [n.id],
                    patch: { locked: !n.locked },
                  });
                }}
              >
                {n.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
            {!collapsed.has(n.id) && tree(n.id, depth + 1)}
          </div>
        );
      });
  }
  const selectionBox = chosen.length ? bounds(doc, roots(doc, selected)) : null;
  const title =
    modal === "fig-report"
      ? "Figma import result"
      : modal === "settings"
        ? "General settings"
        : modal === "share"
          ? "Share this design"
          : modal === "variables"
            ? "Local color variables"
            : modal === "assets"
              ? "Components & assets"
              : modal === "files"
                ? "Your local workspace"
                : modal === "shortcuts"
                  ? "Keyboard shortcuts"
                  : modal === "commands"
                    ? "Actions"
                    : modal === "ai"
                      ? "Create with Baize"
                      : modal === "bridge"
                        ? "Connect external AI"
                        : "Rename layer";
  return (
    <div className={`app ${hiddenUI ? "ui-hidden" : ""}`}>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept=".baizefig,.json,.fig,.sketch,.pdf,.svg,.png,.jpg,.jpeg,.webp,.gif"
        onChange={(e) => void importFiles(e.target.files)}
      />
      <input
        ref={figInput}
        type="file"
        hidden
        accept=".fig"
        onChange={(e) => void importFiles(e.target.files)}
      />
      <div className="workspace">
        {!hiddenUI && (
          <nav className="app-rail" aria-label={t("Workspace tools")}>
            <button
              className="rail-logo"
              aria-label={t("BaizeFig local files")}
              onClick={() => void openFiles()}
            >
              <img src="/baize.svg" alt="BaizeFig" />
            </button>
            <span className="rail-separator" />
            <button className="rail-item active" onClick={() => setModal(null)}>
              <span>
                <File size={19} />
              </span>
              {t("File")}
            </button>
            {[
              { label: "Agents", Icon: Sparkles },
              { label: "Assets", Icon: Plus },
              { label: "Tools", Icon: BriefcaseBusiness },
              { label: "Variables", Icon: Hexagon },
            ].map(({ label, Icon }) => (
              <div
                className="rail-research"
                key={label}
                title={t("Under research")}
              >
                <button
                  className="rail-item"
                  disabled
                  aria-label={t(label)}
                  aria-describedby={`research-${label}`}
                >
                  <span>
                    <Icon size={19} />
                  </span>
                  {t(label)}
                </button>
                <span
                  className="research-tooltip"
                  id={`research-${label}`}
                  role="tooltip"
                >
                  {t("Under research")}
                </span>
              </div>
            ))}
            <div className="rail-bottom">
              <button
                className="tiny"
                aria-label={t("General settings")}
                title={t("General settings")}
                onClick={() => setModal("settings")}
              >
                <Settings2 size={17} />
              </button>
            </div>
          </nav>
        )}
        {!hiddenUI && (
          <aside className="left-panel">
            <div className="file-panel-header">
              <div className="file-title-row">
                <input
                  className="document-title"
                  aria-label={t("Document name")}
                  value={doc.name}
                  onChange={(e) => setDoc({ ...doc, name: e.target.value })}
                />
                <button
                  className="tiny"
                  aria-label={t("File menu")}
                  onClick={() => void openFiles()}
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  className="tiny collapse-panel"
                  aria-label={t("Hide panels")}
                  onClick={() => setHiddenUI(true)}
                >
                  <PanelLeftClose size={17} />
                </button>
              </div>
              <div className="file-subtitle">
                <span>{t("Drafts")}</span>
                <span className="local-plan">{t("Local")}</span>
                <span className="save-state">{t(saved)}</span>
              </div>
            </div>
            <div className="page-heading">
              <span>{t("Pages")}</span>
              <button
                className="tiny page-search"
                aria-label={t("Search layers")}
                onClick={() => setShowLayerSearch((v) => !v)}
              >
                <Search size={16} />
              </button>
              <button
                className="tiny"
                aria-label={t("Add page")}
                onClick={addPage}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="pages">
              {doc.pages.map((p) => (
                <div
                  className={`page ${p.id === page ? "active" : ""}`}
                  key={p.id}
                >
                  <button
                    onClick={() => {
                      setPage(p.id);
                      setSelected([]);
                    }}
                  >
                    <span>
                      {p.id === page ? (
                        <Check size={12} />
                      ) : (
                        <span className="spacer" />
                      )}
                    </span>
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        const name = window.prompt(t("Page name"), p.name);
                        if (name?.trim())
                          change({
                            ...doc,
                            pages: doc.pages.map((a) =>
                              a.id === p.id ? { ...a, name: name.trim() } : a,
                            ),
                          });
                      }}
                    >
                      {p.name}
                    </span>
                  </button>
                  {p.id === page && (
                    <button
                      className="tiny"
                      aria-label={t("Delete current page")}
                      onClick={deletePage}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="layer-heading">
              {t("Layers")}{" "}
              <span>{doc.nodes.filter((n) => n.pageId === page).length}</span>
              <button
                className="tiny"
                aria-label={t("Import assets")}
                onClick={() => fileInput.current?.click()}
              >
                <Plus size={14} />
              </button>
            </div>
            {showLayerSearch && (
              <div className="layer-search">
                <Search size={14} />
                <input
                  autoFocus
                  aria-label={t("Filter layers")}
                  value={layerFilter}
                  onChange={(e) => setLayerFilter(e.target.value)}
                  placeholder={t("Search layers…")}
                />
              </div>
            )}
            <div className="layer-tree">
              {tree(null)}
              {!doc.nodes.some((n) => n.pageId === page) && (
                <div className="empty-layers">
                  <Square size={24} />
                  <p>{t("Your next idea starts here.")}</p>
                  <span>{t("Choose a tool and draw on the canvas.")}</span>
                </div>
              )}
            </div>
            <div className="left-footer">
              <div className="brand-caption">{t("白泽 · 通万物、识万象")}</div>
              <div>
                <button
                  className="tiny"
                  aria-label={t("Keyboard shortcuts")}
                  onClick={() => setModal("shortcuts")}
                >
                  <Keyboard size={15} />
                </button>
                <button
                  className="tiny"
                  aria-label={t("Local files")}
                  onClick={() => void openFiles()}
                >
                  <FolderOpen size={15} />
                </button>
                <span>
                  {t("LOCAL FIRST")}
                  <span className="green-dot" />
                </span>
              </div>
            </div>
          </aside>
        )}
        <main
          className={`canvas-wrap tool-${effectiveTool}${effectiveTool !== "move" ? " cursor-override" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void importFiles(e.dataTransfer.files);
          }}
        >
          <div className="canvas-top-note">
            <span className="green-dot" />
            {t("Your canvas. Your possibilities.")}
          </div>
          <svg
            ref={svg}
            className="design-canvas"
            aria-label={t("Design canvas")}
            onPointerDown={(e) => pointerDown(e)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={cancelDrag}
            onContextMenu={(e) => {
              e.preventDefault();
              setContext({ x: e.clientX, y: e.clientY });
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              const el = (e.target as Element).closest("[data-node-id]");
              const hitId =
                el?.getAttribute("data-node-id") ?? lastPointerHit.current;
              if (!hitId) return;
              const n = doc.nodes.find((n) => n.id === hitId);
              if (n?.type === "text") {
                setSelected([n.id]);
                if (!n.locked && !ancestors(doc, n).some((p) => p.locked))
                  setEditingText({
                    id: n.id,
                    documentId: doc.id,
                    caret: { x: e.clientX, y: e.clientY },
                  });
              } else if (n) {
                setSelected([n.id]);
                if (
                  [
                    "path",
                    "rectangle",
                    "ellipse",
                    "polygon",
                    "star",
                    "line",
                  ].includes(n.type)
                )
                  editVector(n);
              }
            }}
            style={{
              background: doc.background,
              cursor: canvasCursor(tool, spaceHeld, isPanning),
            }}
          >
            <defs>
              <pattern
                id="pixel-grid"
                width={view.zoom * 10}
                height={view.zoom * 10}
                patternUnits="userSpaceOnUse"
                x={view.x}
                y={view.y}
              >
                <path
                  d={`M ${view.zoom * 10} 0 L 0 0 0 ${view.zoom * 10}`}
                  fill="none"
                  stroke="#aeb2ba"
                  strokeWidth=".5"
                />
              </pattern>
            </defs>
            {grid && (
              <rect
                width="100%"
                height="100%"
                fill="url(#pixel-grid)"
                pointerEvents="none"
              />
            )}
            <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
              {doc.nodes
                .filter(
                  (n) => n.pageId === page && !n.parentId && n.type === "frame",
                )
                .map((n) => (
                  <text
                    key={n.id}
                    x={n.x}
                    y={n.y - 12 / view.zoom}
                    fontSize={11 / view.zoom}
                    fill="#69716b"
                    pointerEvents="none"
                  >
                    {n.name}
                  </text>
                ))}
              <Scene
                doc={doc}
                pageId={page}
                onNode={pointerDown}
                outline={outline}
                editingTextId={
                  editingVector ??
                  (editingText?.documentId === doc.id
                    ? editingText.id
                    : undefined)
                }
              />
              {(tool === "pen" || tool === "pencil") && !editingVector && (
                <PathDrawingOverlay
                  key={`${doc.id}-${page}-${tool}`}
                  ref={pathDrawing}
                  tool={tool}
                  zoom={view.zoom}
                  temporaryHand={spaceHeld || isPanning}
                  snapPoint={(p, disabled) => snapWorldPoint(p, [], disabled)}
                  onSnapEnd={() => setSnapGuides([])}
                  onFinish={(network) => {
                    const first = network.vertices[0],
                      parent = parentFor(first),
                      node = drawnPath(doc, page, network, parent?.id ?? null);
                    change({ ...doc, nodes: [...doc.nodes, node] }, [node.id]);
                  }}
                />
              )}
              {editingText?.documentId === doc.id &&
                (() => {
                  const node = doc.nodes.find(
                    (n) => n.id === editingText.id && n.pageId === page,
                  );
                  return node ? (
                    <CanvasTextEditor
                      key={`${doc.id}-${node.id}`}
                      doc={doc}
                      node={node}
                      session={editingText}
                      onCancel={() => setEditingText(null)}
                      onCommit={(text) => {
                        setEditingText(null);
                        if (text !== node.text)
                          run({
                            type: "update",
                            ids: [node.id],
                            patch: { text },
                          });
                      }}
                    />
                  ) : null;
                })()}
              {editingVector &&
                (() => {
                  const node = doc.nodes.find((n) => n.id === editingVector);
                  return node ? (
                    <VectorEditor
                      key={`${doc.id}-${node.id}`}
                      doc={doc}
                      node={node}
                      zoom={view.zoom}
                      view={view}
                      width={Math.min(
                        730,
                        (svg.current?.clientWidth ?? 762) - 32,
                      )}
                      panTool={tool === "hand"}
                      snapPoint={(p, disabled) =>
                        snapWorldPoint(p, [node.id], disabled)
                      }
                      onSnapEnd={() => setSnapGuides([])}
                      onTemporaryHandChange={(held) => {
                        space.current = held;
                        setSpaceHeld(held);
                      }}
                      onPanningChange={setIsPanning}
                      onPan={(position) =>
                        setView((v) => ({ ...v, ...position }))
                      }
                      onSplit={splitVectorSelection}
                      onUndo={() => setDoc(history.current.undo(doc))}
                      onRedo={() => setDoc(history.current.redo(doc))}
                      onClose={() => setEditingVector(null)}
                      onCommit={(patch) =>
                        run({ type: "update", ids: [node.id], patch })
                      }
                    />
                  ) : null;
                })()}
              {selectionBox &&
                !editingVector &&
                (tool === "move" || tool === "hand") && (
                  <g className="selection-overlay">
                    <rect
                      x={selectionBox.x}
                      y={selectionBox.y}
                      width={selectionBox.width}
                      height={selectionBox.height}
                      fill="none"
                      stroke={
                        first?.type === "component" ? "#9b65ef" : "#2487ff"
                      }
                      strokeWidth={1 / view.zoom}
                      pointerEvents="none"
                    />
                    {chosen.length === 1 &&
                      !first.locked &&
                      ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => {
                        const localBox = nodeSelectionBounds(first),
                          handlePoint = transformPoint(
                            worldTransform(doc, first),
                            h.includes("e")
                              ? localBox.x + localBox.width
                              : h.includes("w")
                                ? localBox.x
                                : localBox.x + localBox.width / 2,
                            h.includes("s")
                              ? localBox.y + localBox.height
                              : h.includes("n")
                                ? localBox.y
                                : localBox.y + localBox.height / 2,
                          ),
                          x = handlePoint.x,
                          y = handlePoint.y;
                        return (
                          <rect
                            key={h}
                            aria-label={t("Resize {direction}", {
                              direction: h,
                            })}
                            x={x - 3.5 / view.zoom}
                            y={y - 3.5 / view.zoom}
                            width={7 / view.zoom}
                            height={7 / view.zoom}
                            fill="#fff"
                            stroke="#2487ff"
                            strokeWidth={1 / view.zoom}
                            style={{ cursor: `${h}-resize` }}
                            onPointerDown={(e) => pointerDown(e, first.id, h)}
                          />
                        );
                      })}
                    <g pointerEvents="none">
                      <rect
                        x={
                          selectionBox.x +
                          selectionBox.width / 2 -
                          40 / view.zoom
                        }
                        y={
                          selectionBox.y + selectionBox.height + 10 / view.zoom
                        }
                        width={80 / view.zoom}
                        height={20 / view.zoom}
                        rx={4 / view.zoom}
                        fill="#2487ff"
                      />
                      <text
                        x={selectionBox.x + selectionBox.width / 2}
                        y={
                          selectionBox.y + selectionBox.height + 24 / view.zoom
                        }
                        fontSize={10 / view.zoom}
                        textAnchor="middle"
                        fill="white"
                      >
                        {Math.round(selectionBox.width)} ×{" "}
                        {Math.round(selectionBox.height)}
                      </text>
                    </g>
                  </g>
                )}
              <SnapOverlay guides={snapGuides} zoom={view.zoom} />
              {marquee && (
                <rect
                  {...marquee}
                  fill="#2487ff22"
                  stroke="#2487ff"
                  strokeWidth={1 / view.zoom}
                  pointerEvents="none"
                />
              )}
            </g>
          </svg>
          <div className="zoom-controls">
            <button
              title={t("Zoom out")}
              aria-label={t("Zoom out")}
              onClick={() =>
                setView((v) => ({ ...v, zoom: Math.max(0.05, v.zoom / 1.25) }))
              }
            >
              <Minus size={13} />
            </button>
            <button
              className="zoom-value"
              onClick={() => fit()}
              title={t("Zoom to fit")}
            >
              {Math.round(view.zoom * 100)}%<ChevronDown size={10} />
            </button>
            <button
              title={t("Zoom in")}
              aria-label={t("Zoom in")}
              onClick={() =>
                setView((v) => ({ ...v, zoom: Math.min(8, v.zoom * 1.25) }))
              }
            >
              <Plus size={13} />
            </button>
            <span />
            <button
              title={t("Fit canvas · Shift 1")}
              aria-label={t("Zoom to fit")}
              onClick={() => fit()}
            >
              <Maximize size={13} />
            </button>
          </div>
          <div className="tool-dock">
            <div className="dock-grip">
              <Grip size={14} />
            </div>
            {tools.map((item) => (
              <button
                key={item.id}
                className={effectiveTool === item.id ? "active" : ""}
                aria-pressed={effectiveTool === item.id}
                aria-label={t(item.label)}
                title={`${t(item.label)}${item.key ? " · " + item.key : ""}`}
                onClick={() => {
                  pathDrawing.current?.finish();
                  if (item.id !== "move" && item.id !== "hand")
                    setEditingVector(null);
                  setTool(item.id);
                }}
              >
                <item.icon size={18} />
              </button>
            ))}
            <span className="dock-divider" />
            <button
              aria-label={t("AI design engine")}
              title={t("AI design engine")}
              onClick={() => setModal("ai")}
            >
              <Sparkles size={18} />
            </button>
          </div>
          <button
            className="help-fab"
            aria-label={t("Keyboard shortcuts and help")}
            onClick={() => setModal("shortcuts")}
          >
            <HelpCircle size={21} />
          </button>
          {hiddenUI && (
            <button
              className="restore-panels"
              onClick={() => setHiddenUI(false)}
            >
              <PanelLeftClose size={17} />
              {t("Show panels")}
            </button>
          )}
          <div className="canvas-bottom-note">
            {tool === "move"
              ? t("V to select · Space to pan · ⌘ / Ctrl + scroll to zoom")
              : tool === "pen"
                ? t(
                    "Click to add points · Drag for curves · Click first point to close · Enter / Esc to finish",
                  )
                : tool === "pencil"
                  ? t("Drag to draw freely · Release to finish · Space to pan")
                  : t("{tool} · Click and drag to draw · Shift to constrain", {
                      tool: t(
                        tools.find((item) => item.id === tool)?.label ?? "",
                      ),
                    })}
          </div>
        </main>
        {!hiddenUI && (
          <aside className="right-panel">
            <div className="inspector-top">
              <button
                className="profile-button"
                aria-label={t("Local workspace files")}
                onClick={() => void openFiles()}
              >
                <span className="profile-avatar">白</span>
                <ChevronDown size={12} />
              </button>
              <div className="inspector-top-actions">
                <button
                  className="icon-button"
                  aria-label={t("Present")}
                  title={t("Present · Shift Space")}
                  onClick={presentStart}
                >
                  <Play size={21} />
                </button>
                <button
                  className="share-button"
                  onClick={() => setModal("share")}
                >
                  {t("Share")}
                </button>
              </div>
            </div>
            <div className="right-tabs">
              <button
                className={tab === "design" ? "active" : ""}
                onClick={() => setTab("design")}
              >
                {t("Design")}
              </button>
              <button
                className={tab === "prototype" ? "active" : ""}
                onClick={() => setTab("prototype")}
              >
                {t("Prototype")}
              </button>
              <button
                className="inspector-zoom"
                aria-label={t("Zoom menu")}
                onClick={() => setZoomMenu((v) => !v)}
              >
                {Math.round(view.zoom * 100)}%<ChevronDown size={12} />
              </button>
              {zoomMenu && (
                <div className="zoom-menu">
                  {[25, 50, 100, 200].map((z) => (
                    <button
                      key={z}
                      onClick={() => {
                        setView((v) => ({ ...v, zoom: z / 100 }));
                        setZoomMenu(false);
                      }}
                    >
                      {z}%
                    </button>
                  ))}
                  <hr />
                  <button
                    onClick={() => {
                      fit();
                      setZoomMenu(false);
                    }}
                  >
                    {t("Zoom to fit")}
                    <kbd>Shift 1</kbd>
                  </button>
                  <button
                    onClick={() => {
                      fit(true);
                      setZoomMenu(false);
                    }}
                  >
                    {t("Zoom to selection")}
                    <kbd>Shift 2</kbd>
                  </button>
                </div>
              )}
            </div>
            <div className="properties">
              {!first ? (
                <>
                  <section>
                    <div className="section-heading">{t("Page")}</div>
                    <label className="color-row">
                      <input
                        type="color"
                        aria-label={t("Page background")}
                        value={doc.background}
                        onChange={(e) =>
                          change({ ...doc, background: e.target.value })
                        }
                      />
                      <span>
                        {doc.background.toUpperCase().replace("#", "")}
                      </span>
                      <span>100%</span>
                    </label>
                  </section>
                  <section className="local-styles">
                    <div className="section-heading">
                      {t("Styles")}
                      <button
                        className="tiny"
                        aria-label={t("Manage variables")}
                        onClick={() => setModal("variables")}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="muted">{t("Local color variables")}</p>
                    {(doc.variables ?? []).map((v) => (
                      <button
                        className="style-swatch"
                        key={v.id}
                        onClick={() => setModal("variables")}
                      >
                        <span style={{ background: v.value }} />
                        {v.name}
                      </button>
                    ))}
                    {!doc.variables?.length && (
                      <button
                        className="empty-style"
                        onClick={() => setModal("variables")}
                      >
                        {t("Create a local variable")}
                      </button>
                    )}
                  </section>
                </>
              ) : tab === "prototype" ? (
                <>
                  <section>
                    <div className="section-heading">
                      {t("Interactions")}
                      <Plus size={14} />
                    </div>
                    <label>{t("Interaction trigger")}</label>
                    <select
                      aria-label={t("Interaction trigger")}
                      value={prototypeTrigger}
                      onChange={(e) =>
                        setPrototypeTrigger(
                          e.target.value as PrototypeInteraction["trigger"],
                        )
                      }
                    >
                      {(
                        [
                          "click",
                          "hover",
                          "leave",
                          "press",
                          "release",
                          "delay",
                        ] as const
                      ).map((value) => (
                        <option key={value} value={value}>
                          {t(`Trigger ${value}`)}
                        </option>
                      ))}
                    </select>
                    <label>{t("Interaction action")}</label>
                    <select
                      aria-label={t("Interaction action")}
                      value={clickType}
                      onChange={(e) => {
                        if (e.target.value === "changeTo") {
                          const reference =
                            doc.componentLibrary?.[0]?.sourceId ??
                            doc.nodes.find((n) => n.type === "component")?.id;
                          if (reference)
                            editClickAction({
                              type: "changeTo",
                              componentId: reference,
                            });
                          return;
                        }
                        const targetId =
                          clickAction && "targetId" in clickAction
                            ? clickAction.targetId
                            : first.targetId;
                        if (targetId)
                          editClickAction(
                            e.target.value === "scrollTo"
                              ? { type: "scrollTo", targetId }
                              : {
                                  type: "navigate",
                                  targetId:
                                    doc.nodes.find((n) => n.type === "frame")
                                      ?.id ?? targetId,
                                },
                          );
                        else if (e.target.value === "scrollTo") {
                          const target = doc.nodes.find(
                            (n) =>
                              n.pageId === page &&
                              n.id !== first.id &&
                              n.parentId,
                          );
                          if (target)
                            editClickAction({
                              type: "scrollTo",
                              targetId: target.id,
                            });
                        }
                      }}
                    >
                      <option value="navigate">{t("Navigate to frame")}</option>
                      <option value="scrollTo">{t("Scroll to target")}</option>
                      <option value="changeTo">
                        {t("Change component state")}
                      </option>
                    </select>
                    {clickType === "changeTo" &&
                    clickAction?.type === "changeTo" ? (
                      <select
                        aria-label={t("Component state")}
                        value={clickAction.componentId}
                        onChange={(e) =>
                          editClickAction({
                            type: "changeTo",
                            componentId: e.target.value,
                          })
                        }
                      >
                        {[
                          ...(doc.componentLibrary ?? []).map((c) => ({
                            id: c.sourceId,
                            name: c.name,
                          })),
                          ...doc.nodes
                            .filter((n) => n.type === "component")
                            .map((n) => ({ id: n.id, name: n.name })),
                        ].map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        aria-label={t("Prototype destination")}
                        value={
                          clickAction && "targetId" in clickAction
                            ? clickAction.targetId
                            : (first.targetId ?? "")
                        }
                        onChange={(e) =>
                          editClickAction(
                            e.target.value
                              ? {
                                  type: clickType as "navigate" | "scrollTo",
                                  targetId: e.target.value,
                                }
                              : undefined,
                          )
                        }
                      >
                        <option value="">{t("None")}</option>
                        {doc.nodes
                          .filter((n) =>
                            clickType === "scrollTo"
                              ? n.pageId === page && n.id !== first.id
                              : n.type === "frame",
                          )
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name}
                            </option>
                          ))}
                      </select>
                    )}
                    {clickAction?.type === "scrollTo" && (
                      <>
                        <label>{t("Scroll animation")}</label>
                        <select
                          aria-label={t("Scroll animation")}
                          value={clickAction.transition ?? "instant"}
                          onChange={(e) =>
                            editClickAction({
                              ...clickAction,
                              transition: e.target.value as
                                "instant" | "animate",
                            })
                          }
                        >
                          <option value="instant">{t("Instant")}</option>
                          <option value="animate">{t("Animate")}</option>
                        </select>
                        {clickAction.transition === "animate" && (
                          <label>
                            {t("Scroll duration (ms)")}
                            <input
                              aria-label={t("Scroll duration (ms)")}
                              type="number"
                              min="0"
                              max="60000"
                              value={clickAction.durationMs ?? 300}
                              onChange={(e) => {
                                const value = e.target.valueAsNumber;
                                if (
                                  Number.isFinite(value) &&
                                  value >= 0 &&
                                  value <= 60000
                                )
                                  editClickAction({
                                    ...clickAction,
                                    durationMs: value,
                                  });
                              }}
                            />
                          </label>
                        )}
                        {(["x", "y"] as const).map((axis) => (
                          <label key={axis}>
                            {t("Scroll offset")} {axis.toUpperCase()}
                            <input
                              aria-label={`${t("Scroll offset")} ${axis.toUpperCase()}`}
                              type="number"
                              value={clickAction.offset?.[axis] ?? 0}
                              onChange={(e) => {
                                if (Number.isFinite(e.target.valueAsNumber))
                                  editClickAction({
                                    ...clickAction,
                                    offset: {
                                      x: clickAction.offset?.x ?? 0,
                                      y: clickAction.offset?.y ?? 0,
                                      [axis]: e.target.valueAsNumber,
                                    },
                                  });
                              }}
                            />
                          </label>
                        ))}
                      </>
                    )}
                    {["frame", "component", "instance"].includes(
                      first.type,
                    ) && (
                      <>
                        <label>{t("Overflow scrolling")}</label>
                        <select
                          aria-label={t("Overflow scrolling")}
                          value={first.prototypeScroll ?? "none"}
                          onChange={(e) =>
                            patch({
                              prototypeScroll: e.target
                                .value as Node["prototypeScroll"],
                            })
                          }
                        >
                          {["none", "horizontal", "vertical", "both"].map(
                            (value) => (
                              <option key={value} value={value}>
                                {t(
                                  value === "none"
                                    ? "None"
                                    : value === "horizontal"
                                      ? "Horizontal"
                                      : value === "vertical"
                                        ? "Vertical"
                                        : "Both directions",
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </>
                    )}
                    <button className="primary full" onClick={presentStart}>
                      <Play size={14} />
                      {t("Present prototype")}
                    </button>
                  </section>
                  <section>
                    <p className="muted">
                      {t(
                        "Preview supports navigation, overlays and scroll-to actions. Advanced conditions and smart animation are tracked in the feature matrix.",
                      )}
                    </p>
                  </section>
                </>
              ) : (
                <>
                  <section>
                    <div className="section-heading">
                      <span>
                        {selected.length > 1
                          ? t("{count} selected", { count: selected.length })
                          : first.type.charAt(0).toUpperCase() +
                            first.type.slice(1)}
                      </span>
                      <div className="inline">
                        <button
                          className="tiny"
                          aria-label={t("Toggle visibility")}
                          onClick={() => patch({ visible: !first.visible })}
                        >
                          {first.visible ? (
                            <Eye size={14} />
                          ) : (
                            <EyeOff size={14} />
                          )}
                        </button>
                        <button
                          className="tiny"
                          aria-label={t("Toggle lock")}
                          onClick={() => patch({ locked: !first.locked })}
                        >
                          {first.locked ? (
                            <Lock size={14} />
                          ) : (
                            <Unlock size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    <input
                      className="layer-title-input"
                      aria-label={t("Layer name")}
                      key={first.id + first.name}
                      defaultValue={first.name}
                      onBlur={(e) => {
                        if (e.target.value !== first.name)
                          patch({ name: e.target.value });
                      }}
                    />
                    <div className="alignment">
                      {[
                        { axis: "left", icon: AlignLeft },
                        { axis: "center", icon: AlignCenter },
                        { axis: "right", icon: AlignRight },
                        { axis: "top", icon: AlignStartVertical },
                        { axis: "middle", icon: AlignCenterVertical },
                        { axis: "bottom", icon: AlignEndVertical },
                      ].map((a) => (
                        <button
                          key={a.axis}
                          title={t("Align {axis}", { axis: t(a.axis) })}
                          aria-label={t("Align {axis}", { axis: t(a.axis) })}
                          disabled={selected.length < 2}
                          onClick={() =>
                            run({
                              type: "align",
                              ids: selected,
                              axis: a.axis as "left",
                            })
                          }
                        >
                          <a.icon size={16} />
                        </button>
                      ))}
                    </div>
                    {selected.length > 1 && (
                      <div className="combine-controls">
                        {(
                          [
                            "union",
                            "subtract",
                            "intersect",
                            "exclude",
                            "mask",
                          ] as const
                        ).map((mode) => (
                          <button
                            key={mode}
                            title={t(
                              {
                                union: "Union",
                                subtract: "Subtract",
                                intersect: "Intersect",
                                exclude: "Exclude",
                                mask: "Use as mask",
                              }[mode],
                            )}
                            aria-label={t(
                              {
                                union: "Union",
                                subtract: "Subtract",
                                intersect: "Intersect",
                                exclude: "Exclude",
                                mask: "Use as mask",
                              }[mode],
                            )}
                            onClick={() => {
                              try {
                                const next = combineShapes(doc, selected, mode);
                                change(next.doc, [next.id]);
                              } catch (error) {
                                notify((error as Error).message);
                              }
                            }}
                          >
                            <BooleanIcon operation={mode} />
                          </button>
                        ))}
                      </div>
                    )}
                    <details className="arrange-tools">
                      <summary>{t("Arrange and distribute")}</summary>
                      <NumberField
                        label="Spacing"
                        value={arrangeGap}
                        min={0}
                        onChange={setArrangeGap}
                      />
                      <div className="arrange-grid">
                        {arrangeCommands.map((c) => (
                          <button
                            key={c.mode}
                            onClick={() => arrangeSelection(c.mode)}
                          >
                            {t(c.name)}
                          </button>
                        ))}
                      </div>
                    </details>
                    <div className="vector-actions">
                      <button onClick={splitVectorSelection}>
                        {t("Split vector into layers")}
                      </button>
                      <button
                        onClick={() => editVector()}
                        disabled={
                          ![
                            "path",
                            "rectangle",
                            "ellipse",
                            "line",
                            "polygon",
                            "star",
                          ].includes(first.type)
                        }
                      >
                        {t("Edit vector")}
                      </button>
                      <button onClick={() => vectorOperation("outline")}>
                        {t("Outline stroke")}
                      </button>
                      <button onClick={() => vectorOperation("flatten")}>
                        {t("Flatten")}
                      </button>
                    </div>
                    <div className="field-grid">
                      <NumberField
                        label="X"
                        value={first.x}
                        onChange={(v) => patch({ x: v })}
                      />
                      <NumberField
                        label="Y"
                        value={first.y}
                        onChange={(v) => patch({ y: v })}
                      />
                      <NumberField
                        label="W"
                        value={first.width}
                        min={1}
                        onChange={(v) => patch({ width: v })}
                      />
                      <NumberField
                        label="H"
                        value={first.height}
                        min={1}
                        onChange={(v) => patch({ height: v })}
                      />
                      <NumberField
                        label="↻"
                        aria="Rotation"
                        value={first.rotation}
                        onChange={(v) => patch({ rotation: v })}
                      />
                      <NumberField
                        label="⌜"
                        aria="Corner radius"
                        value={first.radius}
                        min={0}
                        onChange={(v) => patch({ radius: v })}
                      />
                    </div>
                  </section>
                  {container(first) && (
                    <section>
                      <div className="section-heading">
                        {t("Auto layout")}
                        <button
                          className="tiny"
                          title={t("Add auto layout · Shift A")}
                          aria-label={t("Add auto layout")}
                          onClick={() => autoLayout()}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="segmented">
                        {(
                          ["none", "horizontal", "vertical", "grid"] as const
                        ).map((d) => (
                          <button
                            key={d}
                            className={
                              (first.layout ?? "none") === d ? "active" : ""
                            }
                            onClick={() =>
                              run({
                                type: "layout",
                                id: first.id,
                                direction: d,
                              })
                            }
                          >
                            {t(
                              d === "none"
                                ? "Free"
                                : d === "horizontal"
                                  ? "→ Horizontal"
                                  : d === "vertical"
                                    ? "↓ Vertical"
                                    : "Grid",
                            )}
                          </button>
                        ))}
                      </div>
                      {first.layout && first.layout !== "none" && (
                        <div className="field-grid">
                          <NumberField
                            label="Gap"
                            value={first.gap ?? 12}
                            min={0}
                            onChange={(v) =>
                              run({
                                type: "layout",
                                id: first.id,
                                direction: first.layout!,
                                gap: v,
                              })
                            }
                          />
                          <NumberField
                            label="Pad"
                            value={first.padding ?? 16}
                            min={0}
                            onChange={(v) =>
                              run({
                                type: "layout",
                                id: first.id,
                                direction: first.layout!,
                                padding: v,
                              })
                            }
                          />
                        </div>
                      )}
                    </section>
                  )}
                  {first.type === "text" && (
                    <section>
                      <div className="section-heading">
                        {t("Typography")}
                        <Type size={14} />
                      </div>
                      <input
                        aria-label={t("Font family")}
                        key={first.id + first.fontFamily}
                        defaultValue={first.fontFamily}
                        onBlur={(e) => patch({ fontFamily: e.target.value })}
                      />
                      <div className="field-grid">
                        <NumberField
                          label="Size"
                          value={first.fontSize}
                          min={1}
                          onChange={(v) => patch({ fontSize: v })}
                        />
                        <NumberField
                          label="Weight"
                          value={first.fontWeight}
                          min={100}
                          onChange={(v) => patch({ fontWeight: v })}
                        />
                        <NumberField
                          label="Line height"
                          value={first.lineHeight}
                          min={0.1}
                          step={0.1}
                          onChange={(v) => patch({ lineHeight: v })}
                        />
                        <select
                          aria-label={t("Text alignment")}
                          value={first.textAlign}
                          onChange={(e) =>
                            patch({
                              textAlign: e.target.value as Node["textAlign"],
                            })
                          }
                        >
                          {["left", "center", "right"].map((a) => (
                            <option key={a} value={a}>
                              {t(a)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="muted">
                        {t("Double-click text on the canvas to edit content.")}
                      </p>
                    </section>
                  )}
                  <section>
                    <div className="section-heading">
                      {t("Fill")}
                      <button
                        className="tiny"
                        aria-label={t("Reset fill")}
                        onClick={() =>
                          patch({
                            fill: first.fill === "none" ? "#d9d9d9" : "none",
                          })
                        }
                      >
                        {first.fill === "none" ? (
                          <Plus size={14} />
                        ) : (
                          <Minus size={14} />
                        )}
                      </button>
                    </div>
                    <label className="color-row">
                      <input
                        type="color"
                        aria-label={t("Fill color")}
                        value={
                          first.fill === "none"
                            ? "#ffffff"
                            : first.fill.slice(0, 7)
                        }
                        onChange={(e) => patch({ fill: e.target.value })}
                      />
                      <span>
                        {first.fill === "none"
                          ? t("None")
                          : first.fill.replace("#", "").toUpperCase()}
                      </span>
                      <NumberField
                        label="%"
                        aria="Opacity"
                        value={Math.round(first.opacity * 100)}
                        min={0}
                        max={100}
                        onChange={(v) => patch({ opacity: v / 100 })}
                      />
                    </label>
                  </section>
                  <section>
                    <div className="section-heading">
                      {t("Stroke")}
                      <button
                        className="tiny"
                        aria-label={t("Toggle stroke")}
                        onClick={() =>
                          patch({ strokeWidth: first.strokeWidth ? 0 : 1 })
                        }
                      >
                        {first.strokeWidth ? (
                          <Minus size={14} />
                        ) : (
                          <Plus size={14} />
                        )}
                      </button>
                    </div>
                    {first.strokeWidth > 0 && (
                      <>
                        <label className="color-row">
                          <input
                            type="color"
                            aria-label={t("Stroke color")}
                            value={
                              first.stroke === "none"
                                ? "#202a24"
                                : first.stroke.slice(0, 7)
                            }
                            onChange={(e) => patch({ stroke: e.target.value })}
                          />
                          <span>
                            {first.stroke.toUpperCase().replace("#", "")}
                          </span>
                        </label>
                        <NumberField
                          label="Width"
                          aria="Stroke width"
                          value={first.strokeWidth}
                          min={0}
                          onChange={(v) => patch({ strokeWidth: v })}
                        />
                      </>
                    )}
                  </section>
                  <section>
                    <div className="section-heading">
                      {t("Component")}
                      <Component size={14} />
                    </div>
                    {first.type === "component" ? (
                      <button
                        className="resource"
                        onClick={() => createInstance(first)}
                      >
                        <Copy size={14} />
                        {t("Create instance copy")}
                      </button>
                    ) : (
                      <button
                        className="resource"
                        onClick={() =>
                          run({
                            type: "group",
                            ids: selected,
                            kind: "component",
                          })
                        }
                      >
                        <Component size={14} />
                        {t("Create component")}
                      </button>
                    )}
                    {first.type === "instance" && (
                      <>
                        <p className="muted">
                          {t(
                            "Instances follow their main component while preserving local overrides.",
                          )}
                        </p>
                        <button onClick={openMainComponent}>
                          {t("Edit main component")}
                        </button>
                        <label>
                          {t("Swap component")}
                          <select
                            aria-label={t("Swap component")}
                            value={first.componentId ?? ""}
                            onChange={(e) => {
                              try {
                                change(
                                  swapComponentInstance(
                                    doc,
                                    first.id,
                                    e.target.value,
                                  ),
                                  [first.id],
                                );
                              } catch (error) {
                                notify((error as Error).message);
                              }
                            }}
                          >
                            {(doc.componentLibrary ?? []).map((c) => (
                              <option key={c.sourceId} value={c.sourceId}>
                                {c.name}
                              </option>
                            ))}
                            {doc.nodes
                              .filter((n) => n.type === "component")
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          onClick={() => {
                            try {
                              change(resetComponentInstance(doc, first.id), [
                                first.id,
                              ]);
                            } catch (error) {
                              notify((error as Error).message);
                            }
                          }}
                        >
                          {t("Reset instance overrides")}
                        </button>
                        <button
                          onClick={() =>
                            change(detachComponentInstance(doc, first.id), [
                              first.id,
                            ])
                          }
                        >
                          {t("Detach instance")}
                        </button>
                      </>
                    )}
                  </section>
                </>
              )}
              <section>
                <div className="section-heading">
                  {t("Export")}
                  <Plus size={14} />
                </div>
                <div className="export-controls">
                  <select
                    aria-label={t("Export scale")}
                    value={exportScale}
                    onChange={(e) => setExportScale(Number(e.target.value))}
                  >
                    {[1, 2, 3].map((v) => (
                      <option value={v} key={v}>
                        {v}x
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t("Export format")}
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value)}
                  >
                    {["PNG", "JPG", "SVG", "HTML"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="export-button"
                  onClick={() => void exportAsset()}
                >
                  <Download size={14} />
                  {t("Export {name}", {
                    name: selected.length
                      ? (first?.name ?? t("selection"))
                      : t("page"),
                  })}
                </button>
              </section>
            </div>
            <div className="mcp-inspector-row">
              <button onClick={() => setModal("bridge")}>
                <strong>{t("MCP")}</strong>
                <span>
                  {t(bridgeStatus === "Connected" ? "1 connection" : "Connect")}
                </span>
                <Settings2 size={15} />
              </button>
            </div>
            <div className="right-footer">
              <span className="green-dot" />
              {t("All changes stay on your device.")}
            </div>
          </aside>
        )}
      </div>
      {context && (
        <div
          className="context-menu"
          style={{
            left: Math.min(context.x, window.innerWidth - 240),
            top: Math.min(context.y, window.innerHeight - 400),
          }}
        >
          {actions
            .filter((a) =>
              [
                "Duplicate selection",
                "Group selection",
                "Ungroup selection",
                "Frame selection",
                "Create component",
                "Add auto layout",
              ].includes(a.name),
            )
            .map((a) => (
              <button
                key={a.name}
                onClick={() => {
                  a.run();
                  setContext(null);
                }}
              >
                {t(a.name)}
                <kbd>{a.key}</kbd>
              </button>
            ))}
          <hr />
          <button
            onClick={() => {
              copy();
              setContext(null);
            }}
          >
            {t("Copy")}
            <kbd>⌘ C</kbd>
          </button>
          <button
            onClick={() => {
              void paste();
              setContext(null);
            }}
          >
            {t("Paste")}
            <kbd>⌘ V</kbd>
          </button>
          <button
            onClick={() => {
              run({ type: "delete", ids: selected });
              setContext(null);
            }}
          >
            {t("Delete")}
            <kbd>⌫</kbd>
          </button>
        </div>
      )}
      {importBusy && (
        <div
          className="modal-backdrop import-progress"
          role="alert"
          aria-busy="true"
        >
          <div className="modal">
            <h2>{t("Importing Figma file…")}</h2>
            <p>{t("Decoding layers and embedded images locally.")}</p>
          </div>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className={`modal modal-${modal}`}
            role="dialog"
            aria-modal="true"
            aria-label={t(title)}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">BAIZEFIG / 白泽</span>
                <h2>{t(title)}</h2>
              </div>
              <button
                className="icon-button"
                aria-label={t("Close dialog")}
                onClick={() => setModal(null)}
              >
                <X size={19} />
              </button>
            </div>
            {modal === "fig-report" && figReport && (
              <section className="fig-import-report">
                <p>
                  {t(
                    "Imported {pages} pages, {layers} editable layers and {images} image fills.",
                    {
                      pages: figReport.pages,
                      layers: figReport.layers,
                      images: figReport.images,
                    },
                  )}
                </p>
                <p className="muted">
                  {t(
                    "This is a compatibility import, not a lossless Figma conversion. Keep the original .fig file.",
                  )}
                </p>
                {figReport.warnings.length > 0 && (
                  <>
                    <h3>{t("Compatibility notes")}</h3>
                    <ul>
                      {figReport.warnings.map((w) => (
                        <li key={w}>{t(w)}</li>
                      ))}
                    </ul>
                  </>
                )}
                <button className="primary" onClick={() => setModal(null)}>
                  {t("Continue editing")}
                </button>
              </section>
            )}
            {modal === "settings" && (
              <section className="general-settings">
                <p className="muted">
                  {t(
                    "Choose the language used throughout BaizeFig. Changes take effect immediately.",
                  )}
                </p>
                <div className="setting-row">
                  <label htmlFor="interface-language">
                    {t("Interface language")}
                  </label>
                  <select
                    id="interface-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <p className="notice">
                  {t(
                    "Language is saved on this browser and does not change design content, layer names or files.",
                  )}
                </p>
                {persistenceError && (
                  <p className="settings-error" role="alert">
                    {t(
                      "Your language preference could not be saved. It will apply for this session only.",
                    )}
                  </p>
                )}
                <h3>{t("Snapping")}</h3>
                {(["objects", "geometry", "pixel"] as const).map((key) => (
                  <label className="setting-row" key={key}>
                    {t(
                      key === "objects"
                        ? "Snap to objects"
                        : key === "geometry"
                          ? "Snap to geometry"
                          : "Snap to pixel grid",
                    )}
                    <input
                      type="checkbox"
                      checked={snapOptions[key]}
                      onChange={(e) =>
                        setSnapOptions({
                          ...snapOptions,
                          [key]: e.target.checked,
                        })
                      }
                    />
                  </label>
                ))}
                <p className="muted">
                  {t(
                    "Hold Ctrl or Command while dragging to temporarily disable snapping.",
                  )}
                </p>
                {snapSaveError && (
                  <p role="alert">
                    {t("Snapping preferences apply for this session only.")}
                  </p>
                )}
                <button
                  className="primary settings-done"
                  onClick={() => setModal(null)}
                >
                  {t("Done")}
                </button>
              </section>
            )}
            {modal === "share" && (
              <>
                <p className="muted">
                  {t(
                    "Share a portable copy of this design. Anyone with the file can open it in BaizeFig.",
                  )}
                </p>
                <div className="share-options">
                  <button onClick={localExport}>
                    <File size={20} />
                    <span>
                      <strong>{t("Download design file")}</strong>
                      <small>
                        {t("Editable .baizefig copy, with assets included")}
                      </small>
                    </span>
                    <Download size={17} />
                  </button>
                  <button
                    onClick={() => {
                      setExportType("PNG");
                      setModal(null);
                      notify(
                        "Choose PNG in Export, then export the current page or selection.",
                      );
                    }}
                  >
                    <Square size={20} />
                    <span>
                      <strong>{t("Export an image")}</strong>
                      <small>
                        {t("PNG, JPG or SVG from the Export panel")}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <p className="notice">
                  {t(
                    "Live collaboration and shareable room links are still in development. Sharing a file does not create a live collaboration session.",
                  )}
                </p>
              </>
            )}
            {modal === "variables" && (
              <>
                <p className="muted">
                  {t(
                    "Local color variables. Bind a fill to reuse the same color across this document.",
                  )}
                </p>
                {(doc.variableCollections ?? []).map((collection) => (
                  <label className="variable-mode" key={collection.id}>
                    {collection.name}
                    <select
                      aria-label={t("Mode for {name}", {
                        name: collection.name,
                      })}
                      value={collection.activeMode}
                      onChange={(e) => {
                        try {
                          change(
                            setVariableMode(doc, collection.id, e.target.value),
                          );
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }}
                    >
                      {collection.modes.map((mode) => (
                        <option key={mode.id} value={mode.id}>
                          {mode.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                {(doc.typedVariables ?? []).map((v) => (
                  <div className="variable-row" key={v.id}>
                    <span>{v.name}</span>
                    <input
                      aria-label={t("Value for {name}", { name: v.name })}
                      key={`${v.id}-${v.value}`}
                      type={
                        v.type === "number"
                          ? "number"
                          : v.type === "boolean"
                            ? "checkbox"
                            : "text"
                      }
                      defaultValue={
                        v.type !== "boolean" ? String(v.value) : undefined
                      }
                      defaultChecked={
                        v.type === "boolean" ? Boolean(v.value) : undefined
                      }
                      onChange={(e) => {
                        if (v.type === "boolean") {
                          try {
                            change(
                              editTypedVariable(doc, v.id, e.target.checked),
                            );
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (v.type !== "boolean") {
                          try {
                            change(
                              editTypedVariable(
                                doc,
                                v.id,
                                v.type === "number"
                                  ? Number(e.target.value)
                                  : e.target.value,
                              ),
                            );
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }
                      }}
                    />
                    <select
                      aria-label={t("Bind variable {name}", { name: v.name })}
                      value=""
                      disabled={!selected.length}
                      onChange={(e) => {
                        let next = doc;
                        for (const node of chosen)
                          next = execute(next, {
                            type: "update",
                            ids: [node.id],
                            patch: {
                              bindings: {
                                ...node.bindings,
                                [e.target.value]: v.id,
                              },
                            },
                          }).doc;
                        change(next);
                      }}
                    >
                      <option value="">{t("Bind property")}</option>
                      {Object.entries(bindingTypes)
                        .filter(([, type]) => type === v.type)
                        .map(([key]) => (
                          <option key={key} value={key}>
                            {t(key)}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
                {first &&
                  (doc.variableCollections ?? []).map((c) => (
                    <label className="variable-mode" key={`node-${c.id}`}>
                      <span>
                        {t("Layer mode")} · {c.name}
                      </span>
                      <select
                        aria-label={t("Layer mode for {name}", {
                          name: c.name,
                        })}
                        value={first.variableModes?.[c.id] ?? ""}
                        onChange={(e) => {
                          const modes = { ...first.variableModes };
                          if (e.target.value) modes[c.id] = e.target.value;
                          else delete modes[c.id];
                          patch({ variableModes: modes });
                        }}
                      >
                        <option value="">{t("Inherit")}</option>
                        {c.modes.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                <div className="variables-list">
                  {(doc.variables ?? []).map((v) => (
                    <div className="variable-row" key={v.id}>
                      <input
                        type="color"
                        aria-label={t("Color {name}", { name: v.name })}
                        value={v.value}
                        onChange={(e) => {
                          try {
                            change(
                              editVariableColor(doc, v.id, e.target.value),
                            );
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }}
                      />
                      <input
                        aria-label={t("Name {name}", { name: v.name })}
                        defaultValue={v.name}
                        onBlur={(e) => {
                          if (
                            e.target.value.trim() &&
                            e.target.value !== v.name
                          )
                            change({
                              ...doc,
                              variables: doc.variables?.map((a) =>
                                a.id === v.id
                                  ? { ...a, name: e.target.value.trim() }
                                  : a,
                              ),
                            });
                        }}
                      />
                      <code>{v.value}</code>
                      <button
                        disabled={!selected.length}
                        onClick={() => {
                          run({
                            type: "update",
                            ids: selected,
                            patch: { variableId: v.id, fill: v.value },
                          });
                          notify("Variable applied to selection");
                        }}
                      >
                        {t("Apply")}
                      </button>
                      <button
                        aria-label={t("Delete variable {name}", {
                          name: v.name,
                        })}
                        onClick={() => {
                          try {
                            change(removeVariable(doc, v.id));
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    change({
                      ...doc,
                      variables: [
                        ...(doc.variables ?? []),
                        {
                          id: id(),
                          name: t("Color {number}", {
                            number: (doc.variables?.length ?? 0) + 1,
                          }),
                          value: "#0d99ff",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={15} />
                  {t("Create color variable")}
                </button>
                <p className="notice">
                  {t(
                    "Color, number, string and boolean variables retain modes and resolvable aliases.",
                  )}
                </p>
              </>
            )}
            {modal === "assets" && (
              <>
                <p className="muted">
                  {t(
                    "Instances follow their main component while preserving local overrides.",
                  )}
                </p>
                <div className="asset-list">
                  {doc.nodes
                    .filter((n) => n.type === "component")
                    .map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          createInstance(n);
                          setPage(n.pageId);
                          setModal(null);
                        }}
                      >
                        <Component size={18} />
                        <span>{n.name}</span>
                        <Plus size={14} />
                      </button>
                    ))}
                  {!doc.nodes.some((n) => n.type === "component") && (
                    <p className="muted">
                      {t(
                        "Select layers and create a component with ⌥ ⌘ K / Ctrl Alt K.",
                      )}
                    </p>
                  )}
                </div>
                <button
                  className="primary"
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload size={14} />
                  {t("Import image or SVG")}
                </button>
              </>
            )}
            {modal === "shortcuts" && (
              <>
                <p className="muted">
                  {t(
                    "Familiar keys. A canvas of your own. ⌘ on Mac, Ctrl on Windows/Linux.",
                  )}
                </p>
                <div className="shortcut-list">
                  {shortcuts.map(([group, name, key]) => (
                    <div key={name}>
                      <span className="shortcut-group">{t(group)}</span>
                      <span>{t(name)}</span>
                      <kbd>{t(key)}</kbd>
                    </div>
                  ))}
                </div>
              </>
            )}
            {modal === "commands" && (
              <>
                <div className="command-search">
                  <Search size={17} />
                  <input
                    autoFocus
                    placeholder={t("Search actions…")}
                    aria-label={t("Search actions")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="action-list">
                  {actions
                    .filter((a) =>
                      [a.name, t(a.name)].some((name) =>
                        name.toLowerCase().includes(query.toLowerCase()),
                      ),
                    )
                    .map((a) => (
                      <button
                        key={a.name}
                        onClick={() => {
                          setModal(null);
                          a.run();
                        }}
                      >
                        <span>{t(a.name)}</span>
                        <kbd>{a.key}</kbd>
                      </button>
                    ))}
                </div>
              </>
            )}
            {modal === "files" && (
              <>
                <p className="muted">
                  {t(
                    "Stored in this browser. Export a local copy to keep a backup.",
                  )}
                </p>
                <div className="file-actions">
                  <button className="primary" onClick={newDoc}>
                    <FilePlus2 size={16} />
                    {t("New design file")}
                  </button>
                  <button onClick={() => figInput.current?.click()}>
                    <Upload size={16} />
                    {t("Import Figma (.fig)")}
                  </button>
                  <button onClick={() => fileInput.current?.click()}>
                    <Upload size={16} />
                    {t("Import")}
                  </button>
                </div>
                <div className="file-list-tabs">
                  <button
                    className={!showTrash ? "active" : ""}
                    onClick={() => setShowTrash(false)}
                  >
                    {t("Files")}
                  </button>
                  <button
                    className={showTrash ? "active" : ""}
                    onClick={() => setShowTrash(true)}
                  >
                    {t("Trash")} {`(${trashedFiles.length})`}
                  </button>
                </div>
                {showTrash && (
                  <p className="muted">
                    {t(
                      "Deleted files stay in this browser trash and can be restored. Original files on your computer are unchanged.",
                    )}
                  </p>
                )}
                <div className="file-grid">
                  {(showTrash
                    ? trashedFiles.map((record) => record.document)
                    : documents
                  ).map((d) => (
                    <article className="file-card-shell" key={d.id}>
                      <button
                        className="file-card"
                        disabled={fileBusy || showTrash}
                        onClick={() => {
                          void save(doc).then(() => {
                            setDoc(d);
                            setPage(d.pages[0].id);
                            setSelected([]);
                            history.current = new History();
                            setModal(null);
                          });
                        }}
                      >
                        <div className="file-preview" aria-hidden="true">
                          <svg viewBox="0 0 1200 850">
                            <Scene doc={d} pageId={d.pages[0].id} />
                          </svg>
                        </div>
                        <strong>{d.name}</strong>
                        <span>
                          {t("{pages} page · {layers} layers", {
                            pages: d.pages.length,
                            layers: d.nodes.length,
                          })}
                        </span>
                      </button>
                      <button
                        className="file-card-action"
                        disabled={fileBusy}
                        aria-label={t(
                          showTrash ? "Restore {name}" : "Delete file {name}",
                          { name: d.name },
                        )}
                        onClick={() =>
                          void (showTrash
                            ? restoreLocalFile(d.id)
                            : deleteLocalFile(d))
                        }
                      >
                        {showTrash ? t("Restore") : <Trash2 size={16} />}
                      </button>
                    </article>
                  ))}
                </div>
                {showTrash && !trashedFiles.length && (
                  <p className="muted">{t("Trash is empty")}</p>
                )}
              </>
            )}
            {modal === "text" && (
              <>
                <textarea
                  autoFocus
                  aria-label={t("Rename layer")}
                  className="edit-text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                />
                <button
                  className="primary"
                  onClick={() => {
                    patch({ name: textValue });
                    setModal(null);
                  }}
                >
                  {t("Apply changes")}
                </button>
              </>
            )}
            {modal === "ai" && (
              <>
                <p className="muted">
                  {t(
                    "Bring your own model. Generate editable layers, then refine them by hand.",
                  )}
                </p>
                <div className="ai-config">
                  <label>
                    {t("OpenAI-compatible API base URL")}
                    <input
                      aria-label={t("AI API URL")}
                      value={ai.baseUrl}
                      onChange={(e) =>
                        setAI({ ...ai, baseUrl: e.target.value })
                      }
                      placeholder="http://localhost:11434/v1"
                    />
                  </label>
                  <div className="two-col">
                    <label>
                      {t("Model")}
                      <input
                        aria-label={t("AI model")}
                        value={ai.model}
                        onChange={(e) =>
                          setAI({ ...ai, model: e.target.value })
                        }
                        placeholder={t("Your model name")}
                      />
                    </label>
                    <label>
                      {t("API key · session only")}
                      <input
                        aria-label={t("AI API key")}
                        type="password"
                        autoComplete="off"
                        value={ai.key}
                        onChange={(e) => setAI({ ...ai, key: e.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    {t("Design guidelines")}
                    <textarea
                      value={ai.system}
                      onChange={(e) => setAI({ ...ai, system: e.target.value })}
                      placeholder={t(
                        "Your component, color and typography rules",
                      )}
                    />
                  </label>
                  <label>
                    {t("What would you like to design?")}
                    <textarea
                      aria-label={t("Design prompt")}
                      className="ai-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t(
                        "Create a minimal dashboard with navigation, search and a table…",
                      )}
                    />
                  </label>
                </div>
                <p className="notice">
                  {t(
                    "Generating sends this document and selection to your configured endpoint. Browser access requires CORS support. Keys remain in memory and are never saved in the design file.",
                  )}
                </p>
                {aiResult && (
                  <div className="ai-result">
                    <strong>
                      {t("{count} proposed operations", {
                        count: aiResult.commands.length,
                      })}
                    </strong>
                    <pre>{JSON.stringify(aiResult.commands, null, 2)}</pre>
                    <button className="primary" onClick={applyAI}>
                      {t("Apply as one undoable change")}
                    </button>
                  </div>
                )}
                <div className="file-actions">
                  <button
                    className="primary"
                    disabled={aiBusy}
                    onClick={() => void askAI()}
                  >
                    <Sparkles size={15} />
                    {t(aiBusy ? "Generating…" : "Generate proposal")}
                  </button>
                  {aiBusy && (
                    <button onClick={() => abort.current?.abort()}>
                      {t("Cancel")}
                    </button>
                  )}
                </div>
              </>
            )}
            {modal === "bridge" && (
              <>
                <p className="muted">
                  {t(
                    "Let an MCP client read and edit this open design through the local bridge.",
                  )}
                </p>
                <div className="connection-state">
                  <span
                    className={
                      bridgeStatus === "Connected" ? "green-dot" : "gray-dot"
                    }
                  />
                  {t(bridgeStatus)}
                </div>
                <ol className="bridge-steps">
                  <li>
                    {t("In this project, start")} <code>npm run bridge</code>{" "}
                    {t("as a stdio MCP server in your client.")}
                  </li>
                  <li>
                    {t(
                      "Copy the pairing token from the bridge output into the field below.",
                    )}
                  </li>
                  <li>
                    {t(
                      "Connect this browser. Enable writes only when you want the client to edit.",
                    )}
                  </li>
                </ol>
                <label className="config-label">
                  {t("Pairing token")}
                  <input
                    type="password"
                    aria-label={t("Bridge pairing token")}
                    value={bridgeToken}
                    onChange={(e) => setBridgeToken(e.target.value)}
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={bridgeWrite}
                    onChange={(e) => setBridgeWrite(e.target.checked)}
                  />
                  {t("Allow MCP to modify the currently open document")}
                </label>
                <div className="file-actions">
                  <button
                    className="primary"
                    disabled={!bridgeToken}
                    onClick={connectBridge}
                  >
                    <Link2 size={15} />
                    {t("Connect bridge")}
                  </button>
                  <button onClick={() => socket.current?.close()}>
                    {t("Disconnect")}
                  </button>
                </div>
                <p className="notice">
                  {t(
                    "Local bridge only. Remote ChatGPT HTTPS access and P2P sharing are not implemented in this version.",
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {present && (
        <PrototypePlayer
          doc={doc}
          initialId={present}
          onClose={() => setPresent(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {t(toast)}
        </div>
      )}
    </div>
  );
}
function NumberField({
  label,
  aria,
  value,
  onChange,
  min = -100000,
  max = 100000,
  step = 1,
}: {
  label: string;
  aria?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setDraft(String(Math.round(value * 100) / 100)), [value]);
  function apply() {
    const n = Number(draft);
    if (Number.isFinite(n) && draft.trim()) {
      const next = Math.min(max, Math.max(min, n));
      if (next !== value) onChange(next);
      setDraft(String(next));
    } else setDraft(String(value));
  }
  return (
    <label className="number-field">
      <span>{t(label)}</span>
      <input
        type="number"
        aria-label={t(aria ?? label)}
        value={draft}
        step={step}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            apply();
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
