import { CloudPanel } from "./CloudPanel";
import { configuredMcpEndpoint } from "./mcpConnections";
import { McpConnectionWizard, type OAuthApproval } from "./McpConnectionWizard";
import { EditorMcp, McpError, bridgeWebSocketUrl } from "./mcp";
import {
  createIndependentMain,
  createMultipleComponents,
  addComponentVariant,
} from "./componentAuthoring";
import { canvasTarget } from "./canvasSelection";
import { ArrangeIcon } from "./ArrangeIcon";
import { FigPagePicker } from "./FigPagePicker";
import type { FigPageSummary } from "./figImport";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { ExportDialog } from "./ExportDialog";
import type { ExportFormat, ExportScope } from "./exportPlan";
import { LibraryManager } from "./LibraryManager";
import { availableLibraryEntries } from "./componentLibraries";
import { ComponentOverridesPanel } from "./ComponentOverridesPanel";
import { ComponentProperties } from "./ComponentProperties";
import { CommandMenu, type MenuItem } from "./CommandMenu";
import {
  shortcutRegistry,
  shortcutMatches,
  shortcutLabel,
  readKeyboardLayout,
  type KeyboardLayout,
} from "./shortcuts";
import { copyCss } from "./copyCss";
import { styleTextRange, safeTextLink, type TextStyle } from "./richText";
import { setParagraphList } from "./textParagraphs";
import { LayoutProperties } from "./LayoutProperties";
import { setDimensionMode } from "./layoutSizing";
import { CropEditor } from "./CropEditor";
import { FillProperties } from "./FillProperties";
import { EffectsProperties } from "./EffectsProperties";
import { StrokeProperties } from "./StrokeProperties";
import { TextProperties } from "./TextProperties";
import { changeDocumentTextCase } from "./textCase";
import { sampleSvgColor } from "./colorPicker";
import { pasteNodes, type NodeClipboard, type PasteMode } from "./clipboard";
import { FontNotice } from "./FontNotice";
import { FontManager } from "./FontManager";
import { DesignBranches } from "./DesignBranches";
import { VersionHistory } from "./VersionHistory";
import {
  copyProperties,
  pasteProperties,
  propertyPatch,
  readDefaultStyles,
  DEFAULT_STYLES_KEY,
  type StyleProperties,
} from "./styleClipboard";
import { FindPanel } from "./FindPanel";
import { replaceMatches, type FindMatch } from "./findReplace";
import { FrameGrid } from "./FrameGrid";
import { CanvasAids, MeasureOverlay, type Box } from "./CanvasAids";
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
import { assetDestination, insertAsset } from "./assetPlacement";
import { LocalAssets } from "./LocalAssets";
import { LayerThumbnail } from "./LayerThumbnail";
import { splitVectorLayers } from "./vectorSplit";
import { canvasCursor, prepareToolCursors } from "./toolCursor";
import {
  PathDrawingOverlay,
  type PathDrawingHandle,
} from "./PathDrawingOverlay";
import { drawnPath } from "./pathDrawing";
import { nodeSelectionBounds } from "./pathBounds";
import { canFitContent, fitContent } from "./fitContent";
import { VectorEditor } from "./VectorEditor";
import { editableNetwork, convertToPaths } from "./vectorGeometry";
import { BooleanIcon } from "./BooleanIcon";
import { CanvasTextEditor, type TextEditSession } from "./CanvasTextEditor";
import { combineShapes } from "./combine";
import {
  editTypedVariable,
  bindingTypes,
  canBindProperty,
} from "./typedVariables";
import {
  resizeInWorld,
  resizeSelection,
  rotateSelection,
  flipSelection,
  nodeRotation,
  setSelectionRotation,
} from "./geometry";
import { inverse, transformPoint } from "./fidelity";
import { PrototypePlayer } from "./PrototypePlayer";
import type { PrototypeAction, PrototypeInteraction } from "./prototype";
import {
  createComponentInstance,
  resetComponentInstance,
  detachComponentInstance,
  editLibraryComponent,
  swapComponentInstance,
  inComponentSlot,
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
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  Unlink,
  RotateCw,
  BringToFront,
  SendToBack,
  Ungroup,
  Spline,
  ScanLine,
  Combine,
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
  ArrowDown,
  PanelsTopLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
  File,
  Cloud,
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
  getDocument,
  saveRecoveryCopy,
  listDocuments,
  download,
  trashDocument,
  restoreDocument,
  listTrash,
  type TrashRecord,
} from "./storage";
import { generate, type AIConfig } from "./ai";
import { useI18n } from "./LanguageContext";
import type { Language } from "./i18n";

type Tool =
  | "scale"
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
  | "export"
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
  | "svg-report"
  | "settings"
  | "branches"
  | "versions"
  | "fonts"
  | null;
const tools: { id: Tool; label: string; key: string; icon: typeof Square }[] = [
  { id: "move", label: "Move", key: "V", icon: MousePointer2 },
  { id: "scale", label: "Scale", key: "K", icon: Maximize },
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
const clone = <T,>(value: T): T => structuredClone(value);
function readCanvasAids() {
  try {
    const v = JSON.parse(localStorage.getItem("baizefig-canvas-aids") ?? "{}");
    return {
      rulers: v.rulers === true,
      grid: v.grid === true,
      step:
        typeof v.step === "number" && v.step >= 1 && v.step <= 1000
          ? v.step
          : 8,
    };
  } catch {
    return { rulers: false, grid: false, step: 8 };
  }
}
export default function App() {
  const { language, setLanguage, persistenceError, t } = useI18n();
  const [doc, setDoc] = useState<Document>(() => demoDocument());
  const [leftTab, setLeftTab] = useState<"file" | "assets" | "cloud">("file");
  const [svgReport, setSvgReport] = useState<{
    layers: number;
    warnings: string[];
  } | null>(null);
  const [figReport, setFigReport] = useState<FigImportResult["report"] | null>(
    null,
  );
  const [importBusy, setImportBusy] = useState(false);
  const [figPages, setFigPages] = useState<{
    pages: FigPageSummary[];
    resolve: (ids: string[]) => void;
  } | null>(null);
  const importInFlight = useRef(false);
  const latestDocument = useRef(doc);
  latestDocument.current = doc;
  const figInput = useRef<HTMLInputElement>(null);
  const styleClipboard = useRef<StyleProperties | null>(null);
  const [defaultStyles, setDefaultStyles] = useState(readDefaultStyles);
  const [colorPicking, setColorPicking] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [arrangeGap, setArrangeGap] = useState(16);
  const [rulers, setRulers] = useState(() => readCanvasAids().rulers),
    [layoutGrid, setLayoutGrid] = useState(() => readCanvasAids().grid),
    [gridStep, setGridStep] = useState(() => readCanvasAids().step);
  const [measure, setMeasure] = useState<{ a: Box; b: Box } | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(
        "baizefig-canvas-aids",
        JSON.stringify({ rulers, grid: layoutGrid, step: gridStep }),
      );
    } catch {
      notify("Canvas aid preferences apply for this session only.");
    }
  }, [rulers, layoutGrid, gridStep]);
  const layerPointer = useRef<{
      ids: string[];
      x: number;
      y: number;
      active: boolean;
    } | null>(null),
    layerPointerDrop = useRef<{
      id: string;
      position: "before" | "inside" | "after";
    } | null>(null),
    suppressLayerClick = useRef(false),
    pagePointer = useRef<{
      id: string;
      x: number;
      y: number;
      target?: string;
      after?: boolean;
      active: boolean;
    } | null>(null),
    suppressPageClick = useRef(false);
  const [pageDrop, setPageDrop] = useState<{
    id: string;
    after: boolean;
  } | null>(null);
  const [layerDrop, setLayerDrop] = useState<{
    id: string;
    position: "before" | "inside" | "after";
  } | null>(null);
  const [exportRequest, setExportRequest] = useState<{
    format: ExportFormat;
    scope: ExportScope;
  }>({ format: "PNG", scope: "page" });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [keyboardLayout, setKeyboardLayout] =
    useState<KeyboardLayout>(readKeyboardLayout);
  const [keyboardError, setKeyboardError] = useState(false);
  const platform = /Mac|iPhone|iPad/.test(navigator.platform)
    ? ("mac" as const)
    : ("other" as const);
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
  const [editingCrop, setEditingCrop] = useState<{
    id: string;
    paintIndex?: number;
  } | null>(null);
  const [vectorPanel, setVectorPanel] = useState<HTMLDivElement | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [selectionScope, setSelectionScope] = useState<string | null>(null);
  const [editingVector, setEditingVector] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<TextEditSession | null>(null);
  const [toast, setToast] = useState(""),
    [saved, setSaved] = useState("Loading…"),
    [persistentSaveError, setPersistentSaveError] = useState(""),
    [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [outline, setOutline] = useState(false),
    [grid, setGrid] = useState(false),
    [hiddenUI, setHiddenUI] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
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
  const [bridgeRemote, setBridgeRemote] = useState(true);
  const [oauthApprovals, setOauthApprovals] = useState<OAuthApproval[]>([]);
  const [bridgeToken, setBridgeToken] = useState(""),
    [bridgeAddress, setBridgeAddress] = useState(() =>
      configuredMcpEndpoint(import.meta.env.VITE_BAIZEFIG_MCP_URL),
    ),
    [bridgeExport, setBridgeExport] = useState(false),
    [bridgeStatus, setBridgeStatus] = useState("Disconnected"),
    [bridgeWrite, setBridgeWrite] = useState(false);
  const history = useRef(new History()),
    svg = useRef<SVGSVGElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    clipboard = useRef<NodeClipboard | null>(null),
    space = useRef(false),
    socket = useRef<WebSocket | null>(null),
    mcp = useRef(new EditorMcp()),
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
    disconnectBridge();
    setCollapsed(
      new Set(doc.nodes.filter((n) => container(n)).map((n) => n.id)),
    );
  }, [doc.id]);
  const lastPointerHit = useRef<string | undefined>(undefined);
  const drag = useRef<{
    type: "move" | "resize" | "rotate" | "draw" | "pan" | "marquee";
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
    setEditingCrop(null);
  }, [doc.id, page]);
  useEffect(() => {
    if (
      editingCrop &&
      (!selected.includes(editingCrop.id) ||
        !doc.nodes.some(
          (n) =>
            n.id === editingCrop.id &&
            n.visible &&
            !n.locked &&
            !ancestors(doc, n).some((p) => p.locked || !p.visible),
        ))
    )
      setEditingCrop(null);
  }, [selected, doc.nodes, editingCrop]);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    setSelectionScope(null);
    setHoverTarget(null);
  }, [doc.id, page]);
  const committedDocument = useRef<Document | null>(null);
  const current = useRef({
    doc,
    page,
    selected,
    bridgeWrite,
    bridgeExport,
    editing: Boolean(editingText || editingCrop || editingVector),
  });
  current.current = {
    doc,
    page,
    selected,
    bridgeWrite,
    bridgeExport,
    editing: Boolean(editingText || editingCrop || editingVector),
  };
  const scenePointerRef = useRef(pointerDown);
  scenePointerRef.current = pointerDown;
  const scenePointerDown = useCallback(
    (event: RPointer, id: string) => scenePointerRef.current(event, id),
    [],
  );
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
          committedDocument.current = found;
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
  const persistCurrent = useCallback(async (snapshot: Document) => {
    try {
      const written = await save(snapshot);
      if (!written) throw Error("File is in trash");
      committedDocument.current = snapshot;
      if (current.current.doc === snapshot) {
        setSaved("Saved locally");
        setPersistentSaveError("");
      }
    } catch (error) {
      if (current.current.doc !== snapshot) return;
      setSaved("Save failed");
      const e = error as Error;
      setPersistentSaveError(
        e.name === "QuotaExceededError"
          ? "Browser storage is full. Export a backup or free storage, then retry."
          : e.message,
      );
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (doc === committedDocument.current) {
      setSaved("Saved locally");
      return;
    }
    setSaved("Saving…");
    const timer = setTimeout(() => void persistCurrent(doc), 400);
    return () => clearTimeout(timer);
  }, [doc, ready, persistCurrent]);
  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      if (current.current.doc !== committedDocument.current)
        void persistCurrent(current.current.doc);
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (current.current.doc !== committedDocument.current) {
        flush();
        event.preventDefault();
        event.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", unload);
    };
  }, [ready, persistCurrent]);
  useEffect(
    () => () => {
      socket.current?.close();
      abort.current?.abort();
    },
    [],
  );
  const chosen = doc.nodes.filter((n) => selected.includes(n.id)),
    first = chosen[0];
  const instanceGeometryRestricted = chosen.some(
    (n) =>
      n.componentOwner && n.componentOwner !== n.id && !inComponentSlot(doc, n),
  );
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
    try {
      await save(doc);
      setDocuments(await listDocuments());
      setTrashedFiles(await listTrash());
      setShowTrash(false);
      setModal("files");
    } catch (e) {
      setPersistentSaveError((e as Error).message);
    }
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
  const snapCache = useRef<{
    doc: Document;
    page: string;
    key: string;
    targets: SnapTarget[];
  } | null>(null);
  function snapWorldPoint(
    p: { x: number; y: number },
    exclude: string[] = [],
    disabled = false,
    prepared?: SnapTarget[],
  ) {
    const key = exclude.join("|");
    if (
      !prepared &&
      (!snapCache.current ||
        snapCache.current.doc !== doc ||
        snapCache.current.page !== page ||
        snapCache.current.key !== key)
    )
      snapCache.current = {
        doc,
        page,
        key,
        targets: snapTargets(doc, page, exclude),
      };
    const result = snapCoordinates(
      [p.x],
      [p.y],
      prepared ?? snapCache.current!.targets,
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
        (n.type === "frame" || n.componentSlot) &&
        (!n.componentOwner || inComponentSlot(doc, n, true)) &&
        n.visible &&
        !n.locked &&
        !ancestors(doc, n).some((p) => p.locked || !p.visible) &&
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
    if (editingText || editingCrop) return;
    if (colorPicking && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      setColorPicking(false);
      const at = point(e),
        before = doc,
        destination = [...selected];
      void svgString(before, page)
        .then((source) => sampleSvgColor(source, at, before.background))
        .then((color) => {
          if (latestDocument.current === before) {
            run({ type: "update", ids: destination, patch: color });
            notify("Color picked");
          } else notify("Design changed; pick the color again");
        })
        .catch((error) => notify((error as Error).message));
      return;
    }
    lastPointerHit.current = id;
    if (e.button === 2) {
      e.stopPropagation();
      if (id && !selected.includes(id)) setSelected([id]);
      return;
    }
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
    if (handle && id && (tool === "move" || tool === "scale")) {
      drag.current = {
        ...base,
        type: handle === "rotate" ? "rotate" : "resize",
        ids: selected.includes(id) ? selected : [id],
        nodeId: id,
        handle,
        targets: snapTargets(
          doc,
          page,
          selected.includes(id) ? selected : [id],
        ),
      };
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
    if (tool !== "move" && tool !== "scale") {
      const kind: Kind = tool;
      const candidate = parentFor(p);
      const parent =
        kind === "frame"
          ? candidate?.componentSlot
            ? candidate
            : undefined
          : candidate;
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
      if (defaultStyles[n.type])
        Object.assign(n, propertyPatch(n, defaultStyles[n.type]!));
      setDoc({ ...doc, nodes: [...doc.nodes, n] });
      setSelected([n.id]);
      drag.current = {
        ...base,
        type: "draw",
        ids: [n.id],
        nodeId: n.id,
        targets: snapTargets(doc, page),
      };
      return;
    }
    if (id) {
      const n = canvasTarget(doc, id, selectionScope, e.metaKey || e.ctrlKey);
      if (!n) return;
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
    if (!e.shiftKey) {
      setSelected([]);
      setSelectionScope(null);
    }
    setMarquee({ x: p.x, y: p.y, width: 0, height: 0 });
    drag.current = {
      ...base,
      type: "marquee",
      ids: e.shiftKey ? selected : [],
    };
  }
  function pointerMove(e: RPointer) {
    const d = drag.current;
    if (!d) {
      const rawId = (e.target as Element)
        .closest("[data-node-id]")
        ?.getAttribute("data-node-id");
      const candidate =
        !editingVector && !editingText && !space.current && tool === "move"
          ? canvasTarget(
              doc,
              rawId ?? undefined,
              selectionScope,
              e.metaKey || e.ctrlKey,
            )
          : undefined;
      let preview = candidate;
      if (preview?.type === "frame" && !e.metaKey && !e.ctrlKey) {
        const p = point(e),
          local = transformPoint(
            inverse(worldTransform(doc, preview)),
            p.x,
            p.y,
          ),
          edge = 5 / view.zoom;
        if (
          local.x > edge &&
          local.y > edge &&
          local.x < preview.width - edge &&
          local.y < preview.height - edge
        )
          preview = undefined;
      }
      setHoverTarget(preview?.id ?? null);
      if (e.altKey && selected.length && tool === "move") {
        const id = (e.target as Element)
            .closest("[data-node-id]")
            ?.getAttribute("data-node-id"),
          node = doc.nodes.find((n) => n.id === id);
        if (node && !descendants(doc, selected).includes(node.id))
          setMeasure({
            a: bounds(doc, roots(doc, selected)),
            b: bounds(doc, [node]),
          });
        else setMeasure(null);
      } else setMeasure(null);
      return;
    }
    setHoverTarget(null);
    setMeasure(null);
    const raw = point(e),
      p =
        d.type === "resize" || d.type === "draw"
          ? snapWorldPoint(
              raw,
              d.ids,
              e.ctrlKey || e.metaKey || e.shiftKey,
              d.targets,
            )
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
      (d as typeof d & { crossing?: boolean }).crossing = dx < 0;
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
    if (d.type === "rotate") {
      const b = bounds(d.before, roots(d.before, d.ids)),
        cx = b.x + b.width / 2,
        cy = b.y + b.height / 2;
      let angle =
        Math.atan2(p.y - cy, p.x - cx) -
        Math.atan2(d.start.y - cy, d.start.x - cx);
      if (e.shiftKey)
        angle = (Math.round(angle / (Math.PI / 12)) * Math.PI) / 12;
      try {
        setDoc(rotateSelection(d.before, d.ids, angle));
      } catch (error) {
        notify((error as Error).message);
        cancelDrag();
      }
      return;
    }
    if (d.type === "resize") {
      try {
        setDoc(
          d.ids.length > 1 || tool === "scale"
            ? resizeSelection(
                d.before,
                d.ids,
                d.handle!,
                dx,
                dy,
                tool === "scale" || e.shiftKey,
              )
            : resizeInWorld(d.before, d.nodeId!, d.handle!, dx, dy, e.shiftKey),
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
            const crossing = !!(d as typeof d & { crossing?: boolean })
              .crossing;
            return crossing
              ? p.x <= marquee.x + marquee.width &&
                  p.y <= marquee.y + marquee.height &&
                  p.x + p.width >= marquee.x &&
                  p.y + p.height >= marquee.y
              : p.x >= marquee.x &&
                  p.y >= marquee.y &&
                  p.x + p.width <= marquee.x + marquee.width &&
                  p.y + p.height <= marquee.y + marquee.height;
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
    if (
      d.type === "draw" ||
      d.type === "move" ||
      d.type === "resize" ||
      d.type === "rotate"
    ) {
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
    if (!selected.length) return;
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
    clipboard.current = { nodes: data, documentId: doc.id };
    navigator.clipboard
      ?.writeText(
        JSON.stringify({
          format: "baizefig-clipboard",
          nodes: data,
          documentId: doc.id,
        }),
      )
      .catch(() => {});
    if (cut) run({ type: "delete", ids: selected });
    else notify("Copied");
  }
  async function paste(mode: PasteMode = "normal", provided?: NodeClipboard) {
    let data = provided ?? clipboard.current;
    try {
      if (!data?.nodes.length) {
        const raw = await navigator.clipboard.readText();
        const parsed = JSON.parse(raw);
        if (
          parsed.format === "baizefig-clipboard" &&
          Array.isArray(parsed.nodes)
        )
          data = parsed;
      }
    } catch {
      /* Browser clipboard permission may be unavailable; use session clipboard. */
    }
    if (!data || latestDocument.current.id !== doc.id) return;
    try {
      const result = pasteNodes(doc, page, data, selected, mode);
      if (JSON.stringify(result.doc) !== JSON.stringify(doc))
        change(result.doc, result.selection);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function copyAs(format: "SVG" | "PNG" | "CSS") {
    if (!selected.length) return;
    try {
      if (format === "CSS") {
        await navigator.clipboard.writeText(copyCss(doc, selected));
        notify("Copied as CSS");
        return;
      }
      const data = await svgString(doc, page, selected);
      if (format === "SVG") {
        await navigator.clipboard.writeText(data);
        notify("Copied as SVG");
      } else if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": await raster(data) }),
        ]);
        notify("Copied as PNG");
      } else {
        download(await raster(data), "BaizeFig.png");
        notify("PNG clipboard unavailable; exported a file instead");
      }
    } catch (error) {
      notify((error as Error).message);
    }
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
      first?.type === "frame" && !first.componentSetId
        ? first
        : doc.nodes.find(
            (n) =>
              n.pageId === page &&
              n.type === "frame" &&
              !n.parentId &&
              !n.componentSetId &&
              n.visible,
          );
    if (frame) setPresent(frame.id);
    else notify("Create a frame to start a prototype");
  }
  async function importFiles(files: FileList | File[] | null) {
    if (!files?.length || importInFlight.current) return;
    importInFlight.current = true;
    let next = doc;
    const selection: string[] = [];
    const svgResults = { layers: 0, warnings: [] as string[] };
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
        if (/\.svg$/i.test(file.name) || file.type === "image/svg+xml") {
          const { importSvg } = await import("./svgImport");
          const result = importSvg(await file.text(), page, file.name);
          next = execute(next, { type: "create", nodes: result.nodes }).doc;
          selection.push(result.rootId);
          svgResults.layers += result.report.layers;
          svgResults.warnings.push(
            ...result.report.warnings.map((w) => `${file.name}: ${w}`),
          );
          continue;
        }
        if (/\.fig$/i.test(file.name)) {
          setImportBusy(true);
          const imported = await importFigFile(
            file,
            (pages) =>
              new Promise((resolve) => {
                setModal(null);
                setFigPages({ pages, resolve });
              }),
          );
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
      if (svgResults.layers) {
        setSvgReport(svgResults);
        setModal("svg-report");
      } else notify("Assets imported");
    } catch (e) {
      if ((e as Error).name !== "AbortError") notify((e as Error).message);
    } finally {
      importInFlight.current = false;
      setImportBusy(false);
      if (figInput.current) figInput.current.value = "";
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function exportAsset() {
    setExportRequest({
      format: exportType as ExportFormat,
      scope: selected.length ? "selection" : "page",
    });
    setModal("export");
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
        guides: doc.guides?.filter((g) => g.pageId !== page),
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
      const b = bounds(doc, [n]);
      const next = createComponentInstance(
        doc,
        n.id,
        page,
        b.x + b.width + 40,
        b.y,
      );
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
  function transformCommand(
    kind: "flip-x" | "flip-y" | "left" | "right" | "half",
  ) {
    try {
      change(
        kind.startsWith("flip")
          ? flipSelection(doc, selected, kind === "flip-x" ? "x" : "y")
          : rotateSelection(
              doc,
              selected,
              kind === "half"
                ? Math.PI
                : kind === "left"
                  ? -Math.PI / 2
                  : Math.PI / 2,
            ),
      );
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function copyStyle() {
    if (!first) return;
    styleClipboard.current = copyProperties(first);
    notify("Properties copied");
  }
  function pasteStyle() {
    if (!styleClipboard.current) {
      notify("Copy properties first");
      return;
    }
    try {
      change(pasteProperties(doc, selected, styleClipboard.current));
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function saveDefaultStyle() {
    if (!first) return;
    const next = { ...defaultStyles, [first.type]: copyProperties(first) };
    try {
      localStorage.setItem(DEFAULT_STYLES_KEY, JSON.stringify(next));
      setDefaultStyles(next);
      notify("Default properties saved");
    } catch {
      notify("Could not save default properties");
    }
  }
  async function pickScreenColor() {
    if (!first) return;
    const EyeDropper = (
      window as unknown as {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;
    if (!EyeDropper) {
      notify(
        "Screen color picking is unavailable in this browser. Use the fill color control.",
      );
      return;
    }
    try {
      const result = await new EyeDropper().open();
      run({ type: "update", ids: selected, patch: { fill: result.sRGBHex } });
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        notify((error as Error).message);
    }
  }
  const editableSelection = doc.nodes.filter(
    (n) =>
      selected.includes(n.id) &&
      !n.locked &&
      !ancestors(doc, n).some((p) => p.locked),
  );
  const textSelection = editableSelection.filter((n) => n.type === "text");
  function textUpdate(make: (n: Node) => Partial<Node>) {
    let next = doc;
    for (const n of textSelection)
      next = execute(next, { type: "update", ids: [n.id], patch: make(n) }).doc;
    if (next !== doc) change(next);
  }
  function textStyle(style: TextStyle) {
    textUpdate((n) => ({
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        ...n.textFlow,
        runs: styleTextRange(
          n.text,
          n.textFlow?.runs ?? n.fidelity?.text?.spans ?? [],
          0,
          n.text.length,
          style,
        ),
      },
    }));
  }
  function listStyle(kind: "bullet" | "number") {
    textUpdate((n) => ({
      textFlow: {
        autoResize: "height",
        verticalAlign: "top",
        letterSpacing: 0,
        ...n.textFlow,
        paragraphs: setParagraphList(
          n.text,
          n.textFlow?.paragraphs ?? [],
          0,
          n.text.length,
          kind,
        ),
      },
    }));
  }
  const selectionActions = new Set([
    "Copy",
    "Cut",
    "Copy as SVG",
    "Copy as PNG",
    "Copy as CSS",
    "Delete",
    "Duplicate selection",
    "Group selection",
    "Ungroup selection",
    "Frame selection",
    "Create component",
    "Edit vector",
    "Flatten",
    "Outline stroke",
    "Split vector into layers",
    "Add auto layout",
    "Remove auto layout",
    "Bring to front",
    "Bring forward",
    "Send backward",
    "Send to back",
    "Flip horizontal",
    "Flip vertical",
    "Rotate 90° left",
    "Rotate 90° right",
    "Rotate 180°",
    "Copy properties",
    "Paste properties",
    "Set default properties",
    "Pick color",
    "Pick screen color",
    "Show/Hide selection",
    "Lock/Unlock selection",
  ]);
  const textActionNames = new Set([
    "Bold",
    "Italic",
    "Underline",
    "Strikethrough",
    "Create link",
    "Bulleted list",
    "Numbered list",
    "UPPERCASE",
    "lowercase",
    "Title Case",
    "Text align left",
    "Text align center",
    "Text align right",
    "Text align top",
    "Text align middle",
    "Text align bottom",
    "Left to right",
    "Right to left",
    "Automatic direction",
    "Browser spell check",
    "Increase font size",
    "Decrease font size",
    "Increase letter spacing",
    "Decrease letter spacing",
    "Auto width and height",
    "Auto height",
    "Fixed size",
  ]);
  const actions = [
    {
      name: "Paste over selection",
      disabled: !selected.length,
      key: "⇧ ⌘ / Ctrl Shift V",
      run: () => void paste("over"),
    },
    {
      name: "Paste to replace",
      disabled: !selected.length,
      key: "⇧ ⌘ / Ctrl Shift R",
      run: () => void paste("replace"),
    },
    { name: "Copy as SVG", key: "", run: () => void copyAs("SVG") },
    { name: "Copy as PNG", key: "", run: () => void copyAs("PNG") },
    {
      name: "Font availability and replacement",
      key: "",
      run: () => setModal("fonts"),
    },
    { name: "Create branch", run: () => setModal("branches") },
    {
      name: "Performance diagnostics",
      run: () => {
        setModal(null);
        setShowPerformance(true);
      },
    },
    { name: "Version history", key: "", run: () => setModal("versions") },
    { name: "Save to version history", run: () => setModal("versions") },
    { name: "Copy properties", key: "⌥ ⌘ / Ctrl Alt C", run: copyStyle },
    { name: "Paste properties", key: "⌥ ⌘ / Ctrl Alt V", run: pasteStyle },
    { name: "Set default properties", key: "", run: saveDefaultStyle },
    {
      name: "Pick color",
      key: "",
      run: () => {
        if (first) {
          setColorPicking(true);
          notify("Click the canvas to pick a color; Escape cancels");
        }
      },
    },
    { name: "Pick screen color", key: "", run: () => void pickScreenColor() },
    {
      name: "Find and replace",
      key: "⌘ / Ctrl F",
      run: () => setFindOpen(true),
    },
    ...[
      { kind: "flip-x", name: "Flip horizontal" },
      { kind: "flip-y", name: "Flip vertical" },
      { kind: "left", name: "Rotate 90° left" },
      { kind: "right", name: "Rotate 90° right" },
      { kind: "half", name: "Rotate 180°" },
    ].map((c) => ({
      name: c.name,
      key: "",
      run: () => transformCommand(c.kind as "flip-x"),
    })),
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
    {
      name: "Undo",
      key: "⌘ Z",
      run: undo,
      disabled: !history.current.past.length,
    },
    {
      name: "Redo",
      key: "⇧ ⌘ Z",
      run: redo,
      disabled: !history.current.future.length,
    },
    {
      name: "Duplicate selection",
      disabled: !selected.length,
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
    {
      name: "Edit vector",
      key: "Enter",
      run: () => {
        if (first?.type === "text")
          setEditingText({ id: first.id, documentId: doc.id, selectAll: true });
        else editVector();
      },
    },
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
    {
      name: "Actions",
      run: () => {
        setQuery("");
        setModal("commands");
      },
    },
    { name: "Copy", run: () => copy() },
    { name: "Cut", run: () => copy(true) },
    { name: "Paste", run: () => void paste() },
    { name: "Copy as CSS", run: () => void copyAs("CSS") },
    { name: "Delete", run: () => run({ type: "delete", ids: selected }) },
    {
      name: "Select all",
      run: () =>
        setSelected(
          doc.nodes
            .filter(
              (n) => n.pageId === page && !n.parentId && n.visible && !n.locked,
            )
            .map((n) => n.id),
        ),
    },
    { name: "Select none", run: () => setSelected([]) },
    { name: "Find", run: () => setFindOpen(true) },
    ...(
      [
        ["Select all text", "text"],
        ["Select all frames", "frame"],
        ["Select all images", "image"],
      ] as const
    ).map(([name, type]) => ({
      name,
      run: () =>
        setSelected(
          doc.nodes
            .filter(
              (n) =>
                n.pageId === page &&
                n.type === type &&
                n.visible &&
                !n.locked &&
                !ancestors(doc, n).some((p) => p.locked || !p.visible),
            )
            .map((n) => n.id),
        ),
    })),

    {
      name: "Select inverse",
      run: () =>
        setSelected(
          doc.nodes
            .filter(
              (n) =>
                n.pageId === page &&
                !n.parentId &&
                n.visible &&
                !n.locked &&
                !selected.includes(n.id),
            )
            .map((n) => n.id),
        ),
    },
    { name: "Place image", run: () => fileInput.current?.click() },
    { name: "Import Figma (.fig)", run: () => figInput.current?.click() },
    { name: "Export", run: () => void exportAsset() },
    {
      name: "Export frames to PDF",
      disabled: !doc.nodes.some(
        (n) => n.type === "frame" && !n.parentId && n.visible,
      ),
      run: () => {
        setExportRequest({ format: "PDF", scope: "frames" });
        setModal("export");
      },
    },
    { name: "Remove auto layout", run: () => autoLayout(true) },
    {
      name: "Layout rules",
      disabled: !first,
      run: () => {
        if (first?.parentId && !first.layout) {
          const parent = doc.nodes.find((n) => n.id === first.parentId);
          if (parent?.layout && parent.layout !== "none")
            setSelected([parent.id]);
        }
        requestAnimationFrame(() =>
          document
            .querySelector(".layout-properties")
            ?.scrollIntoView({ block: "center" }),
        );
      },
    },
    ...(
      [
        ["Bring to front", "front"],
        ["Bring forward", "forward"],
        ["Send backward", "backward"],
        ["Send to back", "back"],
      ] as const
    ).map(([name, direction]) => ({
      name,
      run: () => run({ type: "order", ids: selected, direction }),
    })),
    {
      name: "Show/Hide selection",
      run: () => patch({ visible: !first?.visible }),
    },
    {
      name: "Lock/Unlock selection",
      run: () => patch({ locked: !first?.locked }),
    },
    { name: "Pixel grid", checked: grid, run: () => setGrid((v) => !v) },
    {
      name: "Layout guides",
      checked: layoutGrid,
      run: () => setLayoutGrid((v) => !v),
    },
    { name: "Rulers", checked: rulers, run: () => setRulers((v) => !v) },
    {
      name: "Layer outlines",
      checked: outline,
      run: () => setOutline((v) => !v),
    },
    {
      name: "Show/Hide UI",
      checked: !hiddenUI,
      run: () => setHiddenUI((v) => !v),
    },
    {
      name: "Zoom in",
      run: () => setView((v) => ({ ...v, zoom: Math.min(8, v.zoom * 1.25) })),
    },
    {
      name: "Zoom out",
      run: () => setView((v) => ({ ...v, zoom: Math.max(0.05, v.zoom * 0.8) })),
    },
    { name: "Zoom to 100%", run: () => setView((v) => ({ ...v, zoom: 1 })) },
    { name: "Present", run: presentStart },
    ...(["objects", "geometry", "pixel"] as const).map((key) => ({
      name:
        key === "objects"
          ? "Snap to objects"
          : key === "geometry"
            ? "Snap to geometry"
            : "Snap to pixel grid",
      checked: snapOptions[key],
      run: () => setSnapOptions((v) => ({ ...v, [key]: !v[key] })),
    })),
    {
      name: "Bold",
      run: () =>
        textStyle({
          fontWeight:
            (first?.textFlow?.runs?.[0]?.fontWeight ?? first?.fontWeight) ===
            700
              ? 400
              : 700,
        }),
    },
    {
      name: "Italic",
      run: () => textStyle({ italic: !first?.textFlow?.runs?.[0]?.italic }),
    },
    {
      name: "Underline",
      run: () =>
        textStyle({ underline: !first?.textFlow?.runs?.[0]?.underline }),
    },
    {
      name: "Strikethrough",
      run: () =>
        textStyle({
          strikethrough: !first?.textFlow?.runs?.[0]?.strikethrough,
        }),
    },
    {
      name: "Create link",
      run: () => {
        const value = window.prompt(t("Link URL (empty to remove)"), "");
        if (value !== null) {
          try {
            textStyle({ href: safeTextLink(value) ?? "" });
          } catch (error) {
            notify((error as Error).message);
          }
        }
      },
    },
    { name: "Bulleted list", run: () => listStyle("bullet") },
    { name: "Numbered list", run: () => listStyle("number") },
    ...(["upper", "lower", "title"] as const).map((mode) => ({
      name:
        mode === "upper"
          ? "UPPERCASE"
          : mode === "lower"
            ? "lowercase"
            : "Title Case",
      run: () => change(changeDocumentTextCase(doc, selected, mode)),
    })),
    ...(["left", "center", "right"] as const).map((v) => ({
      name: `Text align ${v}`,
      run: () => textUpdate(() => ({ textAlign: v })),
    })),
    ...(["top", "center", "bottom"] as const).map((v) => ({
      name: `Text align ${v === "center" ? "middle" : v}`,
      run: () =>
        textUpdate((n) => ({
          textFlow: {
            autoResize: "fixed",
            letterSpacing: 0,
            ...n.textFlow,
            verticalAlign: v,
          },
        })),
    })),
    ...(["auto", "ltr", "rtl"] as const).map((v) => ({
      name:
        v === "auto"
          ? "Automatic direction"
          : v === "ltr"
            ? "Left to right"
            : "Right to left",
      run: () =>
        textUpdate((n) => ({
          textFlow: {
            autoResize: "height",
            verticalAlign: "top",
            letterSpacing: 0,
            ...n.textFlow,
            direction: v,
          },
        })),
    })),
    {
      name: "Browser spell check",
      checked: first?.textFlow?.spellCheck ?? false,
      run: () =>
        textUpdate((n) => ({
          textFlow: {
            autoResize: "height",
            verticalAlign: "top",
            letterSpacing: 0,
            ...n.textFlow,
            spellCheck: !n.textFlow?.spellCheck,
          },
        })),
    },
    ...([-1, 1] as const).flatMap((delta) => [
      {
        name: delta > 0 ? "Increase font size" : "Decrease font size",
        run: () =>
          textUpdate((n) => ({ fontSize: Math.max(1, n.fontSize + delta) })),
      },
      {
        name: delta > 0 ? "Increase letter spacing" : "Decrease letter spacing",
        run: () =>
          textUpdate((n) => ({
            textFlow: {
              autoResize: "height",
              verticalAlign: "top",
              ...n.textFlow,
              letterSpacing: (n.textFlow?.letterSpacing ?? 0) + delta,
            },
          })),
      },
    ]),
    ...(["both", "height", "fixed"] as const).map((v) => ({
      name:
        v === "both"
          ? "Auto width and height"
          : v === "height"
            ? "Auto height"
            : "Fixed size",
      run: () =>
        textUpdate((n) => ({
          layoutItem: {
            ...n.layoutItem,
            horizontalSizing: v === "both" ? "hug" : "fixed",
            verticalSizing: v === "fixed" ? "fixed" : "hug",
          },
          textFlow: {
            verticalAlign: "top",
            letterSpacing: 0,
            ...n.textFlow,
            autoResize: v,
          },
        })),
    })),
    ...(
      [
        ["left", "Align left"],
        ["center", "Align horizontal centers"],
        ["right", "Align right"],
        ["top", "Align top"],
        ["middle", "Align vertical centers"],
        ["bottom", "Align bottom"],
      ] as const
    ).map(([axis, name]) => ({
      name,
      disabled: editableSelection.length < 2,
      run: () => run({ type: "align", ids: selected, axis }),
    })),
    ...(["union", "subtract", "intersect", "exclude", "mask"] as const).map(
      (mode) => ({
        name: {
          union: "Union",
          subtract: "Subtract",
          intersect: "Intersect",
          exclude: "Exclude",
          mask: "Use as mask",
        }[mode],
        disabled: editableSelection.length < (mode === "mask" ? 2 : 1),
        run: () => {
          try {
            const result = combineShapes(doc, selected, mode);
            change(result.doc, [result.id]);
          } catch (error) {
            notify((error as Error).message);
          }
        },
      }),
    ),
    {
      name: "Reset instance",
      disabled: !first?.componentId,
      run: () => {
        if (first) change(resetComponentInstance(doc, first.id), [first.id]);
      },
    },
    {
      name: "Detach instance",
      disabled: !first?.componentId,
      run: () => {
        if (first) change(detachComponentInstance(doc, first.id), [first.id]);
      },
    },
    {
      name: "Go to main component",
      disabled:
        !first?.componentId ||
        ![
          ...doc.nodes.filter((n) => n.type === "component").map((n) => n.id),
          ...(doc.componentLibrary ?? []).map((n) => n.sourceId),
        ].includes(first.componentId),
      run: openMainComponent,
    },
    {
      name: "Remove fill",
      disabled: !editableSelection.length,
      run: () => {
        let next = doc;
        for (const n of editableSelection)
          next = execute(next, {
            type: "update",
            ids: [n.id],
            patch: {
              fill: "none",
              fidelity: n.fidelity ? { ...n.fidelity, paints: [] } : undefined,
            },
          }).doc;
        change(next);
      },
    },
    {
      name: "Remove stroke",
      disabled: !editableSelection.length,
      run: () => patch({ stroke: "none", strokeWidth: 0 }),
    },
    {
      name: "Swap fill and stroke",
      disabled: !editableSelection.length,
      run: () => {
        let next = doc;
        for (const n of editableSelection)
          next = execute(next, {
            type: "update",
            ids: [n.id],
            patch: {
              fill: n.stroke,
              stroke: n.fill,
              strokeWidth: n.strokeWidth || 1,
            },
          }).doc;
        change(next);
      },
    },
    {
      name: "Remove interactions",
      disabled: !editableSelection.length,
      run: () => patch({ interactions: [], targetId: undefined }),
    },
    {
      name: "Collapse layers",
      run: () =>
        setCollapsed(new Set(doc.nodes.filter(container).map((n) => n.id))),
    },
    {
      name: "Previous page",
      disabled: doc.pages.findIndex((p) => p.id === page) === 0,
      run: () => {
        setPage(
          doc.pages[Math.max(0, doc.pages.findIndex((p) => p.id === page) - 1)]
            .id,
        );
        setSelected([]);
      },
    },
    {
      name: "Next page",
      disabled:
        doc.pages.findIndex((p) => p.id === page) === doc.pages.length - 1,
      run: () => {
        setPage(
          doc.pages[
            Math.min(
              doc.pages.length - 1,
              doc.pages.findIndex((p) => p.id === page) + 1,
            )
          ].id,
        );
        setSelected([]);
      },
    },
    { name: "Keyboard layout", run: () => setModal("settings") },
    { name: "Libraries", run: () => setModal("assets") },
    {
      name: "Manage slots",
      disabled:
        !first ||
        !(
          first.type === "component" ||
          first.componentOwner ||
          ancestors(doc, first).some((n) => n.type === "component")
        ),
      run: () => {
        document
          .querySelector(".component-properties")
          ?.scrollIntoView({ block: "center" });
      },
    },
    ...(
      [
        ["", "Automatic spelling language"],
        ["en", "Spell check: English"],
        ["zh-CN", "Spell check: 简体中文"],
      ] as const
    ).map(([language, name]) => ({
      name,
      disabled: !textSelection.length,
      checked: (first?.textFlow?.language ?? "") === language,
      run: () =>
        textUpdate((n) => ({
          textFlow: {
            autoResize: "height",
            verticalAlign: "top",
            letterSpacing: 0,
            ...n.textFlow,
            language: language || undefined,
          },
        })),
    })),
    ...tools.map((tool) => ({
      name: tool.label,
      run: () => {
        pathDrawing.current?.finish();
        setTool(tool.id);
      },
    })),
  ].map((a) => ({
    ...a,
    key: shortcutLabel(a.name, platform),
    disabled:
      ("disabled" in a && a.disabled) ||
      (selectionActions.has(a.name) && !selected.length) ||
      (selectionActions.has(a.name) &&
        ![
          "Copy",
          "Copy as SVG",
          "Copy as PNG",
          "Copy as CSS",
          "Copy properties",
          "Lock/Unlock selection",
        ].includes(a.name) &&
        !editableSelection.length) ||
      (textActionNames.has(a.name) && !textSelection.length) ||
      (a.name === "Ungroup selection" && !editableSelection.some(container)) ||
      (["Reset instance", "Detach instance", "Go to main component"].includes(
        a.name,
      ) &&
        !editableSelection.length) ||
      (a.name === "Paste properties" && !styleClipboard.current),
    checked: "checked" in a ? Boolean(a.checked) : undefined,
  }));
  const actionItem = (name: string): MenuItem =>
    actions.find((a) => a.name === name) ?? {
      name,
      disabled: true,
      reason: "Research in progress",
    };
  const sub = (name: string, names: (string | MenuItem)[]): MenuItem => ({
    name,
    children: names.map((n) => (typeof n === "string" ? actionItem(n) : n)),
  });
  const menuItems: MenuItem[] = [
    { ...actionItem("Open file browser"), name: "Back to files" },
    actionItem("Actions"),
    sub("File", [
      "New design file",
      sub("New", ["New design file"]),
      "Import file or image",
      "Import Figma (.fig)",
      "Place image",
      "Duplicate file",
      "Save local copy",
      "Save to version history",
      "Version history",
      "Export",
      "Export frames to PDF",
      "Create branch",
    ]),
    sub("Edit", [
      "Undo",
      "Redo",
      "Cut",
      "Copy",
      "Paste",
      sub("Copy as", ["Copy as CSS", "Copy as SVG", "Copy as PNG"]),
      "Paste over selection",
      "Paste to replace",
      "Duplicate selection",
      "Delete",
      "Find",
      "Find next",
      "Find previous",
      "Find and replace",
      "Set default properties",
      "Copy properties",
      "Paste properties",
      "Pick color",
      "Select all",
      "Select none",
      "Select inverse",
      "Select matching layers",
      sub("Select all with", [
        "Select all text",
        "Select all frames",
        "Select all images",
      ]),
    ]),
    sub("View", [
      "Pixel grid",
      "Layout guides",
      "Rulers",
      "Show slices",
      "Comments",
      "Annotations",
      sub("Outlines", ["Layer outlines", "Mask outlines", "Frame outlines"]),
      "Pixel preview",
      "Memory usage",
      "Additional labels",
      "Minimize left navigation bar",
      "Minimize UI",
      "Show/Hide UI",
      "Multiplayer cursors",
      "Switch to Draw",
      "Switch to Dev Mode",
      sub("Panels", ["General settings", "Keyboard shortcuts"]),
      "Zoom in",
      "Zoom out",
      "Zoom to 100%",
      "Zoom to fit",
      "Zoom to selection",
      "Previous page",
      "Next page",
      "Zoom to previous frame",
    ]),
    sub("Object", [
      "Frame selection",
      "Group selection",
      "Ungroup selection",
      "Wrap in new section",
      "Convert to section",
      "Convert to frame",
      "Restore default thumbnail",
      "Use as mask",
      "Add auto layout",
      sub("More layout options", ["Layout rules", "Remove auto layout"]),
      "Create component",
      sub("Slots", ["Manage slots"]),
      "Reset instance",
      "Detach instance",
      sub("Main component", ["Go to main component"]),
      "Bring to front",
      "Bring forward",
      "Send backward",
      "Send to back",
      "Flip horizontal",
      "Flip vertical",
      "Rotate 180°",
      "Rotate 90° left",
      "Rotate 90° right",
      "Flatten",
      "Outline stroke",
      sub("Boolean groups", ["Union", "Subtract", "Intersect", "Exclude"]),
      "Show/Hide selection",
      "Lock/Unlock selection",
      "Hide other layers",
      "Collapse layers",
      "Remove fill",
      "Remove stroke",
      "Swap fill and stroke",
      "Remove interactions",
      "Delete contents",
    ]),
    sub("Text", [
      "Bold",
      "Italic",
      "Underline",
      "Strikethrough",
      "Create link",
      "Bulleted list",
      "Numbered list",
      sub("Alignment", [
        "Text align left",
        "Text align center",
        "Text align right",
        "Text align top",
        "Text align middle",
        "Text align bottom",
      ]),
      sub("Adjust", [
        "Increase font size",
        "Decrease font size",
        "Increase letter spacing",
        "Decrease letter spacing",
        "Auto width and height",
        "Auto height",
        "Fixed size",
      ]),
      sub("Case", ["UPPERCASE", "lowercase", "Title Case"]),
      sub("Text direction", [
        "Automatic direction",
        "Left to right",
        "Right to left",
      ]),
      sub("Spell check", [
        "Browser spell check",
        "Automatic spelling language",
        "Spell check: English",
        "Spell check: 简体中文",
      ]),
    ]),
    sub("Arrange", [
      ...arrangeCommands.map((c) => c.name),
      "Align left",
      "Align horizontal centers",
      "Align right",
      "Align top",
      "Align vertical centers",
      "Align bottom",
    ]),
    sub("Vector", [
      "Edit vector",
      "Split vector into layers",
      "Join selection",
      "Smooth join selection",
      "Delete and heal selection",
      "Split vector",
      "Simplify vector",
      "Offset vector",
    ]),
    sub("Plugins", ["Run last plugin", "Manage plugins"]),
    sub("Widgets", ["Manage widgets", "Select all widgets"]),
    sub("Preferences", [
      "Snap to geometry",
      "Snap to objects",
      "Snap to pixel grid",
      "Keep tool selected after use",
      "Highlight layers on hover",
      "Rename duplicated layers",
      "Show dimensions on objects",
      "Hide canvas UI during changes",
      "Use smart quotes/symbols",
      "Flip objects while resizing",
      "Keyboard zooms into selection",
      "Invert zoom direction",
      "Ctrl+click opens right click menus",
      "Use number keys for opacity",
      "Use old shortcuts for outlines",
      "Use ⌘⌥↑/↓ to rotate layers",
      "Play audio notifications in AI chat",
      "Open links in desktop app",
      "Show Agents on canvas",
      "Use scroll wheel zoom",
      "Right-click and drag to pan",
      "Theme",
      "Color profile",
      "Keyboard layout",
      "Accessibility settings",
      "Permissions and helpers",
      "Nudge amount",
      "General settings",
    ]),
    actionItem("Libraries"),
    actionItem("Open in desktop app"),
    sub("AI balance", ["AI design engine"]),
    sub("Help and account", [
      "Performance diagnostics",
      "Keyboard shortcuts",
      "MCP connection",
      "General settings",
    ]),
  ];

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (importInFlight.current || e.defaultPrevented) return;
      const el = e.target as HTMLElement;
      if (
        el.closest('[role="menu"]') ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
        el.isContentEditable
      )
        return;
      if (
        (e.altKey && e.code === "Digit2") ||
        (e.shiftKey && e.code === "KeyI" && !e.metaKey && !e.ctrlKey)
      ) {
        e.preventDefault();
        setLeftTab("assets");
        return;
      }
      if (e.key === "Escape") {
        if (menuAnchor) {
          setMenuAnchor(null);
          return;
        }
        if (colorPicking) {
          setColorPicking(false);
          return;
        }
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
      if (modal || present || menuAnchor || editingCrop) return;
      if (
        e.key === " " &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        space.current = true;
        setSpaceHeld(true);
        e.preventDefault();
        return;
      }
      if (e.key.startsWith("Arrow") && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        let next = doc;
        for (const n of roots(doc, selected).filter(
          (n) => !n.locked && !ancestors(doc, n).some((p) => p.locked),
        ))
          next = execute(next, {
            type: "update",
            ids: [n.id],
            patch: {
              x:
                n.x +
                (e.key === "ArrowRight"
                  ? amount
                  : e.key === "ArrowLeft"
                    ? -amount
                    : 0),
              y:
                n.y +
                (e.key === "ArrowDown"
                  ? amount
                  : e.key === "ArrowUp"
                    ? -amount
                    : 0),
            },
          }).doc;
        if (next !== doc) change(next);
        return;
      }
      let command = shortcutRegistry.find((s) =>
        shortcutMatches(e, s, keyboardLayout, platform),
      );
      // Explicit legacy aliases; every canonical key comes from the registry.
      if (
        !command &&
        ((e.code === "Delete" &&
          !e.shiftKey &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.altKey) ||
          (e.code === "KeyY" && e.ctrlKey && !e.shiftKey && !e.altKey) ||
          (e.code === "KeyG" &&
            (e.metaKey || e.ctrlKey) &&
            e.shiftKey &&
            !e.altKey))
      )
        command = shortcutRegistry.find(
          (s) =>
            s.name ===
            (e.code === "Delete"
              ? "Delete"
              : e.code === "KeyY"
                ? "Redo"
                : "Ungroup selection"),
        );
      if (!command) return;
      if (command.native) return;
      e.preventDefault();
      const action = actions.find((a) => a.name === command!.name);
      if (action && !action.disabled) action.run();
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === "Alt") setMeasure(null);
      if (e.key === " ") {
        space.current = false;
        setSpaceHeld(false);
      }
    };
    const blur = () => {
      layerPointer.current = null;
      layerPointerDrop.current = null;
      pagePointer.current = null;
      setLayerDrop(null);
      setPageDrop(null);
      space.current = false;
      setSpaceHeld(false);
      cancelDrag();
    };
    const pasteEvent = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        modal ||
        present ||
        importInFlight.current ||
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      )
        return;
      try {
        const parsed = JSON.parse(e.clipboardData?.getData("text/plain") ?? "");
        if (
          parsed.format === "baizefig-clipboard" &&
          Array.isArray(parsed.nodes)
        ) {
          e.preventDefault();
          clipboard.current = parsed;
          void paste("normal", parsed);
        }
      } catch {
        /* Plain text remains available in the canvas text editor. */
      }
    };
    window.addEventListener("paste", pasteEvent);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("paste", pasteEvent);
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
  function disconnectBridge() {
    const ws = socket.current;
    socket.current = null;
    ws?.close();
    if (current.current)
      current.current = {
        ...current.current,
        bridgeWrite: false,
        bridgeExport: false,
      };
    setBridgeWrite(false);
    setBridgeExport(false);
    setBridgeStatus("Disconnected");
    setOauthApprovals([]);
  }
  function connectBridge(automatic = false) {
    let address: string;
    try {
      address = bridgeWebSocketUrl(bridgeAddress.trim());
    } catch (e) {
      notify((e as Error).message);
      return;
    }
    const previous = socket.current;
    socket.current = null;
    previous?.close();
    const ws = new WebSocket(address);
    const documentId = current.current.doc.id;
    socket.current = ws;
    setBridgeStatus("Connecting…");
    ws.onopen = () => {
      if (socket.current !== ws || current.current.doc.id !== documentId) {
        ws.close();
        return;
      }
      ws.send(
        JSON.stringify({
          type: "pair",
          token: automatic ? undefined : bridgeToken,
          auto: automatic,
          documentId,
          editorId: mcp.current.editorId,
        }),
      );
    };
    ws.onclose = (event) => {
      if (socket.current === ws) {
        disconnectBridge();
        if (event.code === 1008)
          notify(
            "Pairing rejected. Check the token and disconnect any other paired editor.",
          );
      }
    };
    ws.onerror = () => {
      if (socket.current === ws)
        notify(
          "Bridge connection failed. Check the service address, editor origin and pairing token.",
        );
    };
    ws.onmessage = async (event) => {
      if (socket.current !== ws || current.current.doc.id !== documentId)
        return;
      let message: {
        id: string;
        type?: string;
        method: string;
        params?: Record<string, unknown>;
        request?: OAuthApproval;
      };
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!message || typeof message !== "object") return;
      if (message.type === "oauth_request" && message.request) {
        const r = message.request;
        if (
          typeof r.id === "string" &&
          typeof r.clientName === "string" &&
          typeof r.redirectUri === "string"
        ) {
          setOauthApprovals((list) =>
            [...list.filter((item) => item.id !== r.id), r].slice(-20),
          );
          setModal("bridge");
        }
        return;
      }
      if (message.type === "paired") {
        setBridgeStatus("Connected");
        return;
      }
      try {
        const c = current.current;
        if (
          (drag.current || c.editing) &&
          ["apply_commands", "preview_commands"].includes(message.method)
        )
          throw new McpError(
            "EDITOR_BUSY",
            "Finish the current canvas or text edit before editing through MCP",
          );
        let result = mcp.current.handle(
          message.method,
          message.params ?? {},
          c,
          (next) => {
            history.current.push(c.doc);
            current.current = { ...c, doc: next };
            setDoc(next);
          },
        );
        if (message.method === "get_screenshot") {
          const blob = await raster(await svgString(c.doc, c.page, c.selected));
          result = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(Error("PNG conversion failed"));
            reader.readAsDataURL(blob);
          });
        } else if (message.method === "export_svg")
          result = await svgString(c.doc, c.page, c.selected);
        // Async rendering must not release content after a document switch or permission revocation.
        if (socket.current !== ws || current.current.doc.id !== documentId)
          return;
        if (
          ["export_svg", "get_screenshot"].includes(message.method) &&
          !current.current.bridgeExport
        )
          throw new McpError("PERMISSION_DENIED", "Export access was revoked");
        const response = JSON.stringify({ id: message.id, result });
        if (new TextEncoder().encode(response).length > 8 * 1024 * 1024)
          throw new McpError(
            "RESULT_TOO_LARGE",
            "Result exceeds 8 MiB. Read fewer fields/nodes or export a smaller selection.",
          );
        if (ws.readyState === WebSocket.OPEN) ws.send(response);
      } catch (e) {
        const error = e as McpError;
        if (socket.current === ws && ws.readyState === WebSocket.OPEN)
          ws.send(
            JSON.stringify({
              id: message.id,
              error: {
                code: error.code ?? "INVALID_COMMAND",
                message: error.message,
              },
            }),
          );
      }
    };
  }
  function beginLayerDrag(e: React.PointerEvent<HTMLDivElement>, n: Node) {
    suppressLayerClick.current = false;
    if (
      e.button !== 0 ||
      n.locked ||
      ancestors(doc, n).some((p) => p.locked) ||
      (e.target as Element).closest("button,input,select")
    )
      return;
    layerPointer.current = {
      ids: selected.includes(n.id) ? selected : [n.id],
      x: e.clientX,
      y: e.clientY,
      active: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveLayerDrag(e: React.PointerEvent<HTMLDivElement>) {
    const d = layerPointer.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4 && !d.active) return;
    d.active = true;
    const hit = document.elementFromPoint(e.clientX, e.clientY),
      row = hit?.closest<HTMLElement>("[data-layer-id]"),
      target = doc.nodes.find((n) => n.id === row?.dataset.layerId);
    let drop: null | { id: string; position: "before" | "inside" | "after" } =
      null;
    if (row && target) {
      const r = row.getBoundingClientRect(),
        ratio = (e.clientY - r.top) / r.height;
      drop = {
        id: target.id,
        position:
          container(target) && ratio > 0.25 && ratio < 0.75
            ? "inside"
            : ratio < 0.5
              ? "before"
              : "after",
      };
    } else if (hit?.closest(".layer-root-drop"))
      drop = { id: "", position: "inside" };
    layerPointerDrop.current = drop;
    setLayerDrop(drop);
  }
  function endLayerDrag(e: React.PointerEvent<HTMLDivElement>) {
    const d = layerPointer.current,
      drop = layerPointerDrop.current;
    layerPointer.current = null;
    layerPointerDrop.current = null;
    setLayerDrop(null);
    if (!d?.active) return;
    suppressLayerClick.current = true;
    e.preventDefault();
    e.stopPropagation();
    if (drop) {
      const target = doc.nodes.find((n) => n.id === drop.id);
      run({
        type: "reparent",
        ids: d.ids,
        parentId: !target
          ? null
          : drop.position === "inside"
            ? target.id
            : target.parentId,
        targetId: !target || drop.position === "inside" ? undefined : target.id,
        after: drop.position === "before",
      });
    }
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
              style={{ paddingLeft: 12 + depth * 14, touchAction: "none" }}
              data-layer-id={n.id}
              draggable={false}
              onPointerDown={(e) => beginLayerDrag(e, n)}
              onPointerMove={moveLayerDrag}
              onPointerUp={endLayerDrag}
              onPointerCancel={() => {
                layerPointer.current = null;
                layerPointerDrop.current = null;
                setLayerDrop(null);
              }}
              aria-label={t("Layer {name}", { name: n.name })}

              data-drop-position={
                layerDrop?.id === n.id ? layerDrop.position : undefined
              }
              onClick={(e) => {
                if (suppressLayerClick.current) {
                  suppressLayerClick.current = false;
                  return;
                }
                setSelected(
                  e.shiftKey
                    ? selected.includes(n.id)
                      ? selected.filter((s) => s !== n.id)
                      : [...selected, n.id]
                    : [n.id],
                );
              }}
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
              {(n.type === "component" || n.type === "instance") && (
                <span
                  className="component-badge"
                  title={t(
                    n.type === "component" ? "Main component" : "Instance",
                  )}
                  aria-label={t(
                    n.type === "component" ? "Main component" : "Instance",
                  )}
                >
                  {n.type === "component" ? (
                    <Component size={13} />
                  ) : (
                    <span aria-hidden="true">{"◇"}</span>
                  )}
                </span>
              )}
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
  function locateMatch(match: FindMatch) {
    const node = doc.nodes.find((n) => n.id === match.nodeId);
    if (!node) return;
    setPage(match.pageId);
    setSelected([node.id]);
    setCollapsed((previous) => {
      const next = new Set(previous);
      for (const p of ancestors(doc, node)) next.delete(p.id);
      return next;
    });
    const b = bounds(doc, [node]),
      rect = svg.current?.getBoundingClientRect();
    if (rect)
      setView((v) => ({
        ...v,
        x: rect.width / 2 - (b.x + b.width / 2) * v.zoom,
        y: rect.height / 2 - (b.y + b.height / 2) * v.zoom,
      }));
  }
  const title =
    modal === "export"
      ? "Export"
      : modal === "svg-report"
        ? "Editable SVG import"
        : modal === "fonts"
          ? "Font availability and replacement"
          : modal === "branches"
            ? "Design branches"
            : modal === "versions"
              ? "Version history"
              : modal === "fig-report"
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
      {showPerformance && (
        <PerformanceMonitor
          doc={doc}
          history={history.current}
          onClose={() => setShowPerformance(false)}
        />
      )}
      {persistentSaveError && (
        <aside className="save-recovery" role="alert">
          <strong>{t("Your latest work is not saved")}</strong>
          <p>{t(persistentSaveError)}</p>
          <p>
            {t(
              "Keep this tab open until you save a backup or a separate copy.",
            )}
          </p>
          <div className="find-buttons">
            <button onClick={() => void persistCurrent(doc)}>
              {t("Retry save")}
            </button>
            <button onClick={localExport}>{t("Export editable backup")}</button>
            <button
              onClick={() =>
                void saveRecoveryCopy(doc)
                  .then((next) => {
                    history.current = new History();
                    setDoc(next);
                    setSelected([]);
                    setPersistentSaveError("");
                  })
                  .catch((e) => setPersistentSaveError(e.message))
              }
            >
              {t("Save a separate copy")}
            </button>
          </div>
        </aside>
      )}
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
            <button
              className={`rail-item ${leftTab === "file" ? "active" : ""}`}
              onClick={() => {
                setLeftTab("file");
                setModal(null);
              }}
            >
              <span>
                <File size={19} />
              </span>
              {t("File")}
            </button>
            <button
              className={`rail-item ${leftTab === "assets" ? "active" : ""}`}
              onClick={() => setLeftTab("assets")}
              aria-label={t("Assets")}
            >
              <span>
                <Component size={19} />
              </span>
              {t("Assets")}
            </button>
            {[
              { label: "Agents", Icon: Sparkles },

              { label: "Cloud", Icon: Cloud },
              { label: "Variables", Icon: Hexagon },
            ].map(({ label, Icon }) =>
              label === "Cloud" ? (
                <button
                  key={label}
                  className={`rail-item ${leftTab === "cloud" ? "active" : ""}`}
                  aria-label={t("Cloud")}
                  aria-pressed={leftTab === "cloud"}
                  onClick={() => {
                    setLeftTab("cloud");
                    setModal(null);
                  }}
                >
                  <span>
                    <Icon size={19} />
                  </span>
                  {t("Cloud")}
                </button>
              ) : (
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
              ),
            )}
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
                  aria-haspopup="menu"
                  aria-expanded={!!menuAnchor}
                  onClick={(e) =>
                    setMenuAnchor(menuAnchor ? null : e.currentTarget)
                  }
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
            {leftTab === "cloud" ? (
              <CloudPanel
                status={bridgeStatus}
                onConnection={() => setModal("bridge")}
                onLocal={() => {
                  if (bridgeRemote) {
                    setBridgeRemote(false);
                    setBridgeAddress("http://127.0.0.1:4319/mcp");
                    setBridgeToken("");
                  }
                  setModal("bridge");
                }}
              />
            ) : leftTab === "assets" ? (
              <LocalAssets
                key={doc.id}
                doc={doc}
                onLibraries={() => setModal("assets")}
                onPreview={(client) =>
                  setHoverTarget(
                    client
                      ? (assetDestination(
                          doc,
                          page,
                          point({ clientX: client.x, clientY: client.y }),
                        )?.id ?? null)
                      : null,
                  )
                }
                onInsert={(reference, client, values) => {
                  const rect = svg.current?.getBoundingClientRect();
                  if (!rect) return;
                  if (
                    client &&
                    (client.x < rect.left ||
                      client.x > rect.right ||
                      client.y < rect.top ||
                      client.y > rect.bottom)
                  )
                    return;
                  const pos = point({
                    clientX: client?.x ?? rect.left + rect.width / 2,
                    clientY: client?.y ?? rect.top + rect.height / 2,
                  });
                  try {
                    const next = insertAsset(doc, reference, page, pos, values);
                    setEditingText(null);
                    setEditingVector(null);
                    setSelectionScope(null);
                    setTool("move");
                    change(next.doc, [next.id]);
                  } catch (error) {
                    notify((error as Error).message);
                  }
                }}
              />
            ) : (
              <>
                <div className="page-heading">
                  <span>{t("Pages")}</span>
                  <button
                    className="tiny page-search"
                    aria-label={t("Find and replace")}
                    onClick={() => setFindOpen((v) => !v)}
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
                      data-page-id={p.id}
                      data-page-drop={
                        pageDrop?.id === p.id
                          ? pageDrop.after
                            ? "after"
                            : "before"
                          : undefined
                      }
                      style={{ touchAction: "none" }}
                      onPointerDown={(e) => {
                        suppressPageClick.current = false;
                        if (
                          e.button !== 0 ||
                          (e.target as Element).closest(".tiny")
                        )
                          return;
                        pagePointer.current = {
                          id: p.id,
                          x: e.clientX,
                          y: e.clientY,
                          active: false,
                        };
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        const d = pagePointer.current;
                        if (!d) return;
                        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) {
                          d.active = true;
                          const row = document
                            .elementFromPoint(e.clientX, e.clientY)
                            ?.closest<HTMLElement>("[data-page-id]");
                          d.target = row?.dataset.pageId;
                          d.after =
                            !!row &&
                            e.clientY >
                              row.getBoundingClientRect().top +
                                row.getBoundingClientRect().height / 2;
                          setPageDrop(
                            d.target
                              ? { id: d.target, after: !!d.after }
                              : null,
                          );
                        }
                      }}
                      onPointerUp={(e) => {
                        const d = pagePointer.current;
                        pagePointer.current = null;
                        setPageDrop(null);
                        if (!d?.active) return;
                        e.preventDefault();
                        e.stopPropagation();
                        suppressPageClick.current = true;
                        if (d.target && d.target !== d.id) {
                          const pages = doc.pages.filter((a) => a.id !== d.id),
                            moving = doc.pages.find((a) => a.id === d.id);
                          if (moving) {
                            pages.splice(
                              pages.findIndex((a) => a.id === d.target) +
                                (d.after ? 1 : 0),
                              0,
                              moving,
                            );
                            change({ ...doc, pages });
                          }
                        }
                      }}
                      onPointerCancel={() => {
                        pagePointer.current = null;
                        setPageDrop(null);
                      }}
                      onClickCapture={(e) => {
                        if (suppressPageClick.current) {
                          suppressPageClick.current = false;
                          e.stopPropagation();
                        } else if (
                          (e.target as Element).closest(".page") &&
                          !(e.target as Element).closest(".tiny")
                        ) {
                          setPage(p.id);
                          setSelected([]);
                        }
                      }}
                      draggable={false}
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
                                  a.id === p.id
                                    ? { ...a, name: name.trim() }
                                    : a,
                                ),
                              });
                          }}
                        >
                          {p.name}
                        </span>
                      </button>
                      {p.id === page && (
                        <>
                          <button
                            className="tiny"
                            aria-label={t("Move page up")}
                            disabled={doc.pages.indexOf(p) === 0}
                            onClick={() => {
                              const pages = [...doc.pages],
                                i = pages.indexOf(p);
                              [pages[i - 1], pages[i]] = [
                                pages[i],
                                pages[i - 1],
                              ];
                              change({ ...doc, pages });
                            }}
                          >
                            <ChevronDown
                              size={11}
                              style={{ transform: "rotate(180deg)" }}
                            />
                          </button>
                          <button
                            className="tiny"
                            aria-label={t("Move page down")}
                            disabled={
                              doc.pages.indexOf(p) === doc.pages.length - 1
                            }
                            onClick={() => {
                              const pages = [...doc.pages],
                                i = pages.indexOf(p);
                              [pages[i + 1], pages[i]] = [
                                pages[i],
                                pages[i + 1],
                              ];
                              change({ ...doc, pages });
                            }}
                          >
                            <ChevronDown size={11} />
                          </button>
                        </>
                      )}
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
                  <span>
                    {doc.nodes.filter((n) => n.pageId === page).length}
                  </span>
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
                  <div
                    className="layer-root-drop"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      run({ type: "reparent", ids: selected, parentId: null })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        run({
                          type: "reparent",
                          ids: selected,
                          parentId: null,
                        });
                      }
                    }}
                    aria-label={t("Move to page root")}
                  >
                    {t("Drop here to move to page root")}
                  </div>
                  {!doc.nodes.some((n) => n.pageId === page) && (
                    <div className="empty-layers">
                      <Square size={24} />
                      <p>{t("Your next idea starts here.")}</p>
                      <span>{t("Choose a tool and draw on the canvas.")}</span>
                    </div>
                  )}
                </div>
              </>
            )}
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
            onPointerLeave={() => setHoverTarget(null)}
            onPointerUp={pointerUp}
            onPointerCancel={cancelDrag}
            onContextMenu={(e) => {
              if (editingText) return;
              e.preventDefault();
              setContext({ x: e.clientX, y: e.clientY });
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              const el = (e.target as Element).closest("[data-node-id]");
              const hitId =
                el?.getAttribute("data-node-id") ?? lastPointerHit.current;
              if (!hitId) return;
              let n = canvasTarget(
                doc,
                hitId,
                selectionScope,
                e.metaKey || e.ctrlKey,
              );
              if (n && ["group", "component", "instance"].includes(n.type)) {
                setSelectionScope(n.id);
                n = canvasTarget(doc, hitId, n.id);
                if (n) setSelected([n.id]);
                setHoverTarget(null);
                return;
              }
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
              cursor: colorPicking
                ? "crosshair"
                : canvasCursor(tool, spaceHeld, isPanning),
            }}
          >
            <defs>
              <pattern
                id="pixel-grid"
                width={view.zoom * (layoutGrid ? gridStep : 10)}
                height={view.zoom * (layoutGrid ? gridStep : 10)}
                patternUnits="userSpaceOnUse"
                x={view.x}
                y={view.y}
              >
                <path
                  d={`M ${view.zoom * (layoutGrid ? gridStep : 10)} 0 L 0 0 0 ${view.zoom * (layoutGrid ? gridStep : 10)}`}
                  fill="none"
                  stroke="#aeb2ba"
                  strokeWidth=".5"
                />
              </pattern>
            </defs>
            {(grid || layoutGrid) && (
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
                onNode={scenePointerDown}
                outline={outline}
                editingTextId={
                  editingVector ??
                  (editingText?.documentId === doc.id
                    ? editingText.id
                    : undefined)
                }
              />
              <FrameGrid doc={doc} page={page} />
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
                    if (defaultStyles.path)
                      Object.assign(
                        node,
                        propertyPatch(node, defaultStyles.path),
                      );
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
                      onCommit={(text, runs, paragraphs) => {
                        setEditingText(null);
                        if (
                          text !== node.text ||
                          JSON.stringify(runs) !==
                            JSON.stringify(node.textFlow?.runs ?? []) ||
                          JSON.stringify(paragraphs) !==
                            JSON.stringify(node.textFlow?.paragraphs ?? [])
                        )
                          run({
                            type: "update",
                            ids: [node.id],
                            patch: {
                              text,
                              textFlow: {
                                ...(node.textFlow ?? {
                                  autoResize: "height",
                                  verticalAlign: "top",
                                  letterSpacing: 0,
                                }),
                                runs,
                                paragraphs,
                              },
                            },
                          });
                      }}
                    />
                  ) : null;
                })()}
              {editingCrop &&
                (() => {
                  const node = doc.nodes.find(
                    (n) => n.id === editingCrop.id && n.pageId === page,
                  );
                  return node ? (
                    <CropEditor
                      key={`${doc.id}-${node.id}-${editingCrop.paintIndex}`}
                      doc={doc}
                      node={node}
                      paintIndex={editingCrop.paintIndex}
                      point={point}
                      onCancel={() => setEditingCrop(null)}
                      onCommit={(patch) => {
                        run({ type: "update", ids: [node.id], patch });
                        setEditingCrop(null);
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
                      panelTarget={vectorPanel}
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
                      onEmptyClick={() => {
                        setEditingVector(null);
                        setSelected([]);
                        setSelectionScope(null);
                        setHoverTarget(null);
                      }}
                      onCommit={(patch) =>
                        run({ type: "update", ids: [node.id], patch })
                      }
                    />
                  ) : null;
                })()}
              {hoverTarget &&
                !editingVector &&
                !selected.includes(hoverTarget) &&
                (() => {
                  const n = doc.nodes.find(
                    (n) => n.id === hoverTarget && n.pageId === page,
                  );
                  if (!n) return null;
                  const box = bounds(doc, [n]);
                  return (
                    <rect
                      aria-label={t("Selection preview")}
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      fill="none"
                      stroke="#0d99ff"
                      strokeWidth={1 / view.zoom}
                      pointerEvents="none"
                    />
                  );
                })()}
              {selectionBox &&
                !editingVector &&
                !editingCrop &&
                (tool === "move" || tool === "hand" || tool === "scale") && (
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
                    {chosen.length >= 1 &&
                      !chosen.some(
                        (n) =>
                          n.locked || ancestors(doc, n).some((a) => a.locked),
                      ) &&
                      ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => {
                        const localBox =
                            chosen.length === 1 && tool !== "scale"
                              ? nodeSelectionBounds(first)
                              : selectionBox,
                          m =
                            chosen.length === 1 && tool !== "scale"
                              ? worldTransform(doc, first)
                              : ([1, 0, 0, 1, 0, 0] as const),
                          handlePoint = transformPoint(
                            [...m],
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
                    {!chosen.some(
                      (n) =>
                        n.locked || ancestors(doc, n).some((a) => a.locked),
                    ) && (
                      <circle
                        aria-label={t("Rotate selection")}
                        cx={selectionBox.x + selectionBox.width / 2}
                        cy={selectionBox.y - 22 / view.zoom}
                        r={5 / view.zoom}
                        fill="white"
                        stroke="#2487ff"
                        strokeWidth={1 / view.zoom}
                        style={{ cursor: "crosshair" }}
                        onPointerDown={(e) =>
                          pointerDown(e, first.id, "rotate")
                        }
                      />
                    )}
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
              {measure && (
                <MeasureOverlay a={measure.a} b={measure.b} zoom={view.zoom} />
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
            {rulers && (
              <CanvasAids
                guides={doc.guides ?? []}
                page={page}
                view={view}
                width={svg.current?.clientWidth ?? 0}
                height={svg.current?.clientHeight ?? 0}
                onChange={(guides) => change({ ...doc, guides })}
              />
            )}
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
                title={`${t(item.label)}${shortcutLabel(item.label, platform) ? " · " + shortcutLabel(item.label, platform) : ""}`}
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
                    <kbd>{shortcutLabel("Zoom to fit", platform)}</kbd>
                  </button>
                  <button
                    onClick={() => {
                      fit(true);
                      setZoomMenu(false);
                    }}
                  >
                    {t("Zoom to selection")}
                    <kbd>{shortcutLabel("Zoom to selection", platform)}</kbd>
                  </button>
                </div>
              )}
            </div>
            <div
              className={`properties${editingVector ? " is-vector-editing" : ""}`}
            >
              <div id="vector-properties-slot" ref={setVectorPanel} />
              <FontNotice doc={doc} onReplace={() => setModal("fonts")} />
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
                          ...availableLibraryEntries(doc).map((c) => ({
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
                          : first.componentSetId
                            ? t("Component set")
                            : first.type === "component"
                              ? t("Main component")
                              : t(
                                  first.type.charAt(0).toUpperCase() +
                                    first.type.slice(1),
                                )}
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
                    <div className="component-actions">
                      <div className="section-heading">
                        {t("Component")}
                        <Component size={14} />
                      </div>
                      {first.type === "component" && (
                        <div className="component-authoring-actions">
                          {[
                            [
                              "Create independent component",
                              createIndependentMain,
                            ],
                            ["Add new variant", addComponentVariant],
                          ].map(([label, action]) => (
                            <button
                              key={label as string}
                              onClick={() => {
                                try {
                                  const result = (
                                    action as typeof createIndependentMain
                                  )(doc, first.id);
                                  change(result.doc);
                                  setSelected(result.selection ?? []);
                                } catch (e) {
                                  notify((e as Error).message);
                                }
                              }}
                            >
                              {t(label as string)}
                            </button>
                          ))}
                        </div>
                      )}
                      {selected.length > 1 &&
                        !chosen.some(
                          (n) =>
                            n.type === "component" ||
                            n.type === "instance" ||
                            n.componentOwner,
                        ) && (
                          <button
                            onClick={() => {
                              try {
                                const result = createMultipleComponents(
                                  doc,
                                  selected,
                                );
                                change(result.doc);
                                setSelected(result.selection);
                              } catch (e) {
                                notify((e as Error).message);
                              }
                            }}
                          >
                            {t("Create multiple components")}
                          </button>
                        )}
                      {first.type === "component" ? (
                        <button
                          className="resource"
                          onClick={() => createInstance(first)}
                        >
                          <Copy size={14} />
                          {t("Create instance copy")}
                        </button>
                      ) : first.type !== "instance" && !first.componentOwner ? (
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
                      ) : null}
                      {first.type === "instance" && (
                        <>
                          <p className="muted">
                            {t(
                              "Instances follow their main component while preserving local overrides.",
                            )}
                          </p>
                          <button
                            onClick={openMainComponent}
                            title={t(
                              doc.componentLibrary?.some(
                                (c) =>
                                  c.sourceId === first?.componentId &&
                                  c.deleted,
                              )
                                ? "Restore main component"
                                : "Edit main component",
                            )}
                            aria-label={t(
                              doc.componentLibrary?.some(
                                (c) =>
                                  c.sourceId === first?.componentId &&
                                  c.deleted,
                              )
                                ? "Restore main component"
                                : "Edit main component",
                            )}
                          >
                            <Component size={16} />
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
                              {first.componentId &&
                                !availableLibraryEntries(doc).some(
                                  (c) => c.sourceId === first.componentId,
                                ) &&
                                doc.componentLibrary?.some(
                                  (c) => c.sourceId === first.componentId,
                                ) && (
                                  <option value={first.componentId} disabled>
                                    {
                                      doc.componentLibrary.find(
                                        (c) => c.sourceId === first.componentId,
                                      )?.name
                                    }{" "}
                                    · {t("Cached")}
                                  </option>
                                )}
                              {availableLibraryEntries(doc).map((c) => (
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
                            title={t("Reset instance overrides")}
                            aria-label={t("Reset instance overrides")}
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
                            <RotateCcw size={16} />
                          </button>
                          <button
                            title={t("Detach instance")}
                            aria-label={t("Detach instance")}
                            onClick={() =>
                              change(detachComponentInstance(doc, first.id), [
                                first.id,
                              ])
                            }
                          >
                            <Unlink size={16} />
                          </button>
                        </>
                      )}
                    </div>
                    <ComponentOverridesPanel
                      doc={doc}
                      node={first}
                      onChange={change}
                      onError={notify}
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
                    {selected.length > 0 && (
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
                            disabled={mode === "mask" && selected.length < 2}
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
                      <div className="arrange-grid">
                        <button
                          title={t("Flip horizontal")}
                          aria-label={t("Flip horizontal")}
                          onClick={() => transformCommand("flip-x")}
                        >
                          <FlipHorizontal2 size={16} />
                        </button>
                        <button
                          title={t("Flip vertical")}
                          aria-label={t("Flip vertical")}
                          onClick={() => transformCommand("flip-y")}
                        >
                          <FlipVertical2 size={16} />
                        </button>
                        <button
                          title={t("Rotate 90° left")}
                          aria-label={t("Rotate 90° left")}
                          onClick={() => transformCommand("left")}
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          title={t("Rotate 90° right")}
                          aria-label={t("Rotate 90° right")}
                          onClick={() => transformCommand("right")}
                        >
                          <RotateCw size={16} />
                        </button>
                      </div>
                      <label className="setting-row">
                        {t("Parent container")}
                        <select
                          aria-label={t("Parent container")}
                          value={first.parentId ?? ""}
                          onChange={(e) =>
                            run({
                              type: "reparent",
                              ids: selected,
                              parentId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">{t("Page root")}</option>
                          {doc.nodes
                            .filter(
                              (n) =>
                                n.pageId === page &&
                                container(n) &&
                                !descendants(doc, selected).includes(n.id) &&
                                !n.locked,
                            )
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="arrange-grid">
                        <button
                          title={t("Bring forward")}
                          aria-label={t("Bring forward")}
                          onClick={() =>
                            run({
                              type: "order",
                              ids: selected,
                              direction: "forward",
                            })
                          }
                        >
                          <BringToFront size={16} />
                        </button>
                        <button
                          title={t("Send backward")}
                          aria-label={t("Send backward")}
                          onClick={() =>
                            run({
                              type: "order",
                              ids: selected,
                              direction: "backward",
                            })
                          }
                        >
                          <SendToBack size={16} />
                        </button>
                      </div>
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
                            title={t(c.name)}
                            aria-label={t(c.name)}
                            disabled={
                              selected.length <
                              (c.mode === "round"
                                ? 1
                                : ["tidy", "pack-x", "pack-y"].includes(c.mode)
                                  ? 2
                                  : 3)
                            }
                            onClick={() => arrangeSelection(c.mode)}
                          >
                            <ArrangeIcon mode={c.mode} />
                          </button>
                        ))}
                      </div>
                    </details>
                    <div className="vector-actions">
                      <button
                        title={t("Split vector into layers")}
                        aria-label={t("Split vector into layers")}
                        onClick={splitVectorSelection}
                      >
                        <Ungroup size={16} />
                      </button>
                      <button
                        title={t("Edit vector")}
                        aria-label={t("Edit vector")}
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
                        <Spline size={16} />
                      </button>
                      <button
                        title={t("Outline stroke")}
                        aria-label={t("Outline stroke")}
                        onClick={() => vectorOperation("outline")}
                      >
                        <ScanLine size={16} />
                      </button>
                      <button
                        title={t("Flatten")}
                        aria-label={t("Flatten")}
                        onClick={() => vectorOperation("flatten")}
                      >
                        <Combine size={16} />
                      </button>
                    </div>
                    {container(first) && (
                      <details className="arrange-tools">
                        <summary>{t("Frame layout grid")}</summary>
                        <button
                          onClick={() =>
                            patch({
                              frameGrid: first.frameGrid
                                ? undefined
                                : {
                                    axis: "columns",
                                    count: 4,
                                    gap: 8,
                                    margin: 16,
                                    visible: true,
                                  },
                            })
                          }
                        >
                          {t(first.frameGrid ? "Remove grid" : "Add grid")}
                        </button>
                        {first.frameGrid && (
                          <>
                            <label className="setting-row">
                              {t("Grid direction")}
                              <select
                                aria-label={t("Grid direction")}
                                value={first.frameGrid.axis}
                                onChange={(e) =>
                                  patch({
                                    frameGrid: {
                                      ...first.frameGrid!,
                                      axis: e.target.value as
                                        "columns" | "rows",
                                    },
                                  })
                                }
                              >
                                <option value="columns">{t("Columns")}</option>
                                <option value="rows">{t("Rows")}</option>
                              </select>
                            </label>
                            <NumberField
                              label="Grid count"
                              min={1}
                              max={64}
                              value={first.frameGrid.count}
                              onChange={(count) =>
                                patch({
                                  frameGrid: {
                                    ...first.frameGrid!,
                                    count: Math.round(count),
                                  },
                                })
                              }
                            />
                            <NumberField
                              label="Grid gap"
                              min={0}
                              value={first.frameGrid.gap}
                              onChange={(gap) =>
                                patch({
                                  frameGrid: { ...first.frameGrid!, gap },
                                })
                              }
                            />
                            <NumberField
                              label="Grid margin"
                              min={0}
                              value={first.frameGrid.margin}
                              onChange={(margin) =>
                                patch({
                                  frameGrid: { ...first.frameGrid!, margin },
                                })
                              }
                            />
                            <label className="setting-row">
                              {t("Show grid")}
                              <input
                                type="checkbox"
                                checked={first.frameGrid.visible}
                                onChange={(e) =>
                                  patch({
                                    frameGrid: {
                                      ...first.frameGrid!,
                                      visible: e.target.checked,
                                    },
                                  })
                                }
                              />
                            </label>
                          </>
                        )}
                      </details>
                    )}
                    <div className="field-grid">
                      <NumberField
                        label="X"
                        disabled={instanceGeometryRestricted}
                        value={first.x}
                        onChange={(v) => patch({ x: v })}
                      />
                      <NumberField
                        label="Y"
                        disabled={instanceGeometryRestricted}
                        value={first.y}
                        onChange={(v) => patch({ y: v })}
                      />
                      <NumberField
                        label="W"
                        disabled={
                          instanceGeometryRestricted && first.type === "text"
                        }
                        value={
                          first.width *
                          Math.hypot(
                            ...(first.fidelity?.linear?.slice(0, 2) ?? [1, 0]),
                          )
                        }
                        min={1}
                        onChange={(v) =>
                          patch({
                            width:
                              v /
                              Math.hypot(
                                ...(first.fidelity?.linear?.slice(0, 2) ?? [
                                  1, 0,
                                ]),
                              ),
                          })
                        }
                      />
                      <NumberField
                        label="H"
                        disabled={
                          instanceGeometryRestricted && first.type === "text"
                        }
                        value={
                          first.height *
                          Math.hypot(
                            ...(first.fidelity?.linear?.slice(2, 4) ?? [0, 1]),
                          )
                        }
                        min={1}
                        onChange={(v) =>
                          patch({
                            height:
                              v /
                              Math.hypot(
                                ...(first.fidelity?.linear?.slice(2, 4) ?? [
                                  0, 1,
                                ]),
                              ),
                          })
                        }
                      />
                      <NumberField
                        label="↻"
                        aria="Rotation"
                        value={nodeRotation(first)}
                        onChange={(v) => {
                          try {
                            change(setSelectionRotation(doc, selected, v));
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }}
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
                        {canFitContent(doc, first) && (
                          <button
                            className="tiny"
                            title={t("Resize to fit content")}
                            aria-label={t("Resize to fit content")}
                            onClick={() => {
                              try {
                                change(fitContent(doc, first.id));
                              } catch (error) {
                                notify((error as Error).message);
                              }
                            }}
                          >
                            <ScanLine size={14} />
                          </button>
                        )}
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
                            title={t(
                              d === "none"
                                ? "Free"
                                : d === "horizontal"
                                  ? "→ Horizontal"
                                  : d === "vertical"
                                    ? "↓ Vertical"
                                    : "Grid",
                            )}
                            aria-label={t(
                              d === "none"
                                ? "Free"
                                : d === "horizontal"
                                  ? "→ Horizontal"
                                  : d === "vertical"
                                    ? "↓ Vertical"
                                    : "Grid",
                            )}
                            aria-pressed={(first.layout ?? "none") === d}
                            onClick={() =>
                              run({
                                type: "layout",
                                id: first.id,
                                direction: d,
                              })
                            }
                          >
                            {d === "none" ? (
                              <PanelsTopLeft size={16} />
                            ) : d === "horizontal" ? (
                              <ArrowRight size={16} />
                            ) : d === "vertical" ? (
                              <ArrowDown size={16} />
                            ) : (
                              <LayoutGrid size={16} />
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
                  <LayoutProperties
                    key={first.id}
                    doc={doc}
                    node={first}
                    onChange={patch}
                    onSizing={(axis, mode) => {
                      try {
                        change(setDimensionMode(doc, first.id, axis, mode));
                      } catch (error) {
                        notify((error as Error).message);
                      }
                    }}
                  />
                  <ComponentProperties
                    key={first.id + "component"}
                    doc={doc}
                    node={first}
                    selected={selected}
                    onChange={change}
                    onSelect={setSelected}
                  />
                  {first.type === "text" && (
                    <section>
                      <div className="section-heading">
                        <button onClick={() => setModal("fonts")}>
                          {t("Font availability and replacement")}
                        </button>
                        {t("Typography")}
                        <Type size={14} />
                      </div>
                      {first.fidelity?.textPath && (
                        <div>
                          <strong>{t("Text on path")}</strong>
                          <div className="field-grid">
                            <NumberField
                              label="%"
                              aria="Text path position"
                              value={first.fidelity.textPath.offset * 100}
                              min={0}
                              max={100}
                              step={1}
                              onChange={(v) =>
                                patch({
                                  fidelity: {
                                    ...first.fidelity!,
                                    textPath: {
                                      ...first.fidelity!.textPath!,
                                      offset: v / 100,
                                    },
                                    text: first.fidelity!.text
                                      ? {
                                          ...first.fidelity!.text,
                                          glyphs: undefined,
                                        }
                                      : undefined,
                                  },
                                })
                              }
                            />
                            <label>
                              <input
                                type="checkbox"
                                aria-label={t("Reverse text path")}
                                checked={first.fidelity.textPath.reverse}
                                onChange={(e) =>
                                  patch({
                                    fidelity: {
                                      ...first.fidelity!,
                                      textPath: {
                                        ...first.fidelity!.textPath!,
                                        reverse: e.target.checked,
                                        offset:
                                          1 - first.fidelity!.textPath!.offset,
                                      },
                                      text: first.fidelity!.text
                                        ? {
                                            ...first.fidelity!.text,
                                            glyphs: undefined,
                                          }
                                        : undefined,
                                    },
                                  })
                                }
                              />
                              {t("Reverse text path")}
                            </label>
                          </div>
                        </div>
                      )}
                      <div
                        id="text-style-editor-slot"
                        aria-label={t("Text effects panel")}
                      >
                        {(editingText?.id !== first.id ||
                          editingText.documentId !== doc.id) && (
                          <div
                            className="text-sidebar-toolbar text-range-toolbar"
                            role="toolbar"
                            aria-label={t("Text effects")}
                          >
                            {(
                              [
                                ["Bold", "B"],
                                ["Italic", "I"],
                                ["Underline", "U"],
                                ["Strikethrough", "S"],
                                ["Bulleted list", "• ≡"],
                                ["Numbered list", "1. ≡"],
                              ] as const
                            ).map(([name, label]) => (
                              <button
                                key={name}
                                title={t(name)}
                                aria-label={t(name)}
                                onClick={() =>
                                  actions.find((a) => a.name === name)?.run?.()
                                }
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
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
                      <TextProperties
                        node={first}
                        onChange={patch}
                        onCase={(mode) => {
                          try {
                            change(changeDocumentTextCase(doc, selected, mode));
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }}
                      />
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
                    <FillProperties
                      node={first}
                      onChange={patch}
                      onCrop={(paintIndex) => {
                        if (
                          !first.locked &&
                          !ancestors(doc, first).some((p) => p.locked)
                        ) {
                          setEditingText(null);
                          setEditingVector(null);
                          setEditingCrop({ id: first.id, paintIndex });
                        }
                      }}
                    />
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
                        <StrokeProperties node={first} onChange={patch} />
                      </>
                    )}
                  </section>
                  <EffectsProperties node={first} onChange={patch} />
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
                    {["PNG", "JPG", "SVG", "HTML", "PDF"].map((t) => (
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
            <div className="right-footer">
              <span className="green-dot" />
              {t("All changes stay on your device.")}
            </div>
          </aside>
        )}
      </div>
      {menuAnchor && (
        <CommandMenu
          items={menuItems}
          anchor={menuAnchor}
          onClose={() => setMenuAnchor(null)}
        />
      )}
      {context && svg.current && (
        <CommandMenu
          label="Context menu"
          items={[
            ...[
              "Undo",
              "Redo",
              "Cut",
              "Copy",
              "Paste",
              "Paste over selection",
              "Paste to replace",
            ].map(actionItem),
            sub("Copy as", ["Copy as CSS", "Copy as SVG", "Copy as PNG"]),
            ...[
              "Duplicate selection",
              "Delete",
              "Group selection",
              "Ungroup selection",
              "Frame selection",
              "Create component",
              "Add auto layout",
              "Copy properties",
              "Paste properties",
              "Pick color",
            ].map(actionItem),
          ]}
          anchor={svg.current as unknown as HTMLElement}
          point={context}
          onClose={() => setContext(null)}
        />
      )}
      {findOpen && (
        <FindPanel
          key={doc.id}
          doc={doc}
          pageId={page}
          onClose={() => setFindOpen(false)}
          onLocate={locateMatch}
          onReplace={(matches, value) => {
            try {
              const result = replaceMatches(doc, matches, value);
              if (JSON.stringify(result.doc) !== JSON.stringify(doc))
                change(result.doc);
              notify(
                t(
                  "Replaced {count} matches; skipped {skipped} locked matches.",
                  { count: result.count, skipped: result.skipped },
                ),
              );
            } catch (error) {
              notify((error as Error).message);
            }
          }}
        />
      )}
      {figPages && (
        <FigPagePicker
          pages={figPages.pages}
          onChoose={(ids) => {
            figPages.resolve(ids);
            setFigPages(null);
          }}
        />
      )}
      {importBusy && !figPages && (
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
            {modal === "fonts" && (
              <FontManager
                doc={doc}
                onReplace={(next) => {
                  if (JSON.stringify(next) !== JSON.stringify(doc))
                    change(next);
                }}
              />
            )}
            {modal === "branches" && (
              <DesignBranches
                doc={doc}
                onOpen={(next) => {
                  history.current = new History();
                  setDoc(next);
                  setPage(next.pages[0].id);
                  setSelected([]);
                  setCollapsed(new Set());
                  setModal(null);
                }}
              />
            )}
            {modal === "versions" && (
              <VersionHistory
                doc={doc}
                onRestore={(next) => {
                  change(next, []);
                  setPage(next.pages[0].id);
                }}
              />
            )}
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
                <label className="setting-row">
                  {t("Keyboard layout")}
                  <select
                    aria-label={t("Keyboard layout")}
                    value={keyboardLayout}
                    onChange={(e) => {
                      const layout = e.target.value as KeyboardLayout;
                      setKeyboardLayout(layout);
                      try {
                        localStorage.setItem(
                          "baizefig-keyboard-layout",
                          layout,
                        );
                        setKeyboardError(false);
                      } catch {
                        setKeyboardError(true);
                      }
                    }}
                  >
                    <option value="physical">
                      {t("Physical keys (QWERTY positions)")}
                    </option>
                    <option value="character">{t("Typed characters")}</option>
                  </select>
                </label>
                {keyboardError && (
                  <p role="alert">
                    {t("Keyboard preference applies for this session only.")}
                  </p>
                )}
                <h3>{t("Canvas aids")}</h3>
                <label className="setting-row">
                  {t("Rulers and guides")}
                  <input
                    type="checkbox"
                    checked={rulers}
                    onChange={(e) => setRulers(e.target.checked)}
                  />
                </label>
                <label className="setting-row">
                  {t("Canvas grid")}
                  <input
                    type="checkbox"
                    checked={layoutGrid}
                    onChange={(e) => setLayoutGrid(e.target.checked)}
                  />
                </label>
                <NumberField
                  label="Grid spacing"
                  min={1}
                  max={1000}
                  value={gridStep}
                  onChange={setGridStep}
                />
                <p className="muted">
                  {t(
                    "Drag from a ruler to create a guide. Drag it outside the canvas to remove it. Hold Alt over another layer to measure gaps.",
                  )}
                </p>
                <div className="arrange-grid">
                  <button
                    onClick={() =>
                      change({
                        ...doc,
                        guides: [
                          ...(doc.guides ?? []),
                          { id: id(), pageId: page, axis: "x", position: 0 },
                        ],
                      })
                    }
                  >
                    {t("Add vertical guide")}
                  </button>
                  <button
                    onClick={() =>
                      change({
                        ...doc,
                        guides: [
                          ...(doc.guides ?? []),
                          { id: id(), pageId: page, axis: "y", position: 0 },
                        ],
                      })
                    }
                  >
                    {t("Add horizontal guide")}
                  </button>
                </div>
                {(doc.guides ?? [])
                  .filter((g) => g.pageId === page)
                  .map((g) => (
                    <div className="setting-row" key={g.id}>
                      <NumberField
                        label={g.axis.toUpperCase()}
                        value={g.position}
                        onChange={(position) =>
                          change({
                            ...doc,
                            guides: doc.guides!.map((a) =>
                              a.id === g.id ? { ...a, position } : a,
                            ),
                          })
                        }
                      />
                      <button
                        aria-label={t("Delete guide")}
                        onClick={() =>
                          change({
                            ...doc,
                            guides: doc.guides!.filter((a) => a.id !== g.id),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
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
                      setExportRequest({
                        format: "PNG",
                        scope: selected.length ? "selection" : "page",
                      });
                      setModal("export");
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
                        try {
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
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }}
                    >
                      <option value="">{t("Bind property")}</option>
                      {Object.entries(bindingTypes)
                        .filter(
                          ([key, type]) =>
                            type === v.type &&
                            chosen.every((n) => canBindProperty(n, key)),
                        )
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
            {modal === "export" && (
              <ExportDialog
                doc={doc}
                pageId={page}
                selected={selected}
                initialFormat={exportRequest.format}
                initialScope={exportRequest.scope}
                initialScale={exportScale}
              />
            )}
            {modal === "assets" && (
              <>
                <LibraryManager doc={doc} onChange={change} />
                <p className="muted">
                  {t(
                    "Instances follow their main component while preserving local overrides.",
                  )}
                </p>
                <div className="asset-list">
                  {availableLibraryEntries(doc).map((entry) => (
                    <button
                      key={entry.sourceId}
                      aria-label={t("Insert library component {name}", {
                        name: entry.name,
                      })}
                      onClick={() => {
                        try {
                          const result = createComponentInstance(
                            doc,
                            entry.sourceId,
                            page,
                            80,
                            80,
                          );
                          change(result.doc, [result.id]);
                          setModal(null);
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }}
                    >
                      <Component size={18} />
                      <span>{entry.name}</span>
                      <Plus size={14} />
                    </button>
                  ))}
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
            {modal === "svg-report" && svgReport && (
              <>
                <p>
                  {t("Imported {count} editable layers.", {
                    count: svgReport.layers,
                  })}
                </p>
                <p className="muted">
                  {t(
                    "SVG paths and supported styles remain editable. Keep the original file for unsupported features.",
                  )}
                </p>
                {svgReport.warnings.length ? (
                  <>
                    <h3>{t("Import compatibility notes")}</h3>
                    <ul>
                      {svgReport.warnings.map((warning, i) => (
                        <li key={i}>
                          {warning
                            .split(": ")
                            .map((part) => t(part))
                            .join("：")}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>{t("No unsupported SVG features were detected.")}</p>
                )}
                <button className="primary" onClick={() => setModal(null)}>
                  {t("Continue editing")}
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
                  {shortcutRegistry.map(({ name }) => (
                    <div key={name}>
                      <span className="shortcut-group">{t("Shortcut")}</span>
                      <span>{t(name)}</span>
                      <kbd>{shortcutLabel(name, platform)}</kbd>
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
                        disabled={a.disabled}
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
                  <button onClick={() => setModal("versions")}>
                    {t("Version history")}
                  </button>
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
                          void save(doc)
                            .then(async () => {
                              const latest = await getDocument(d.id);
                              setDoc(latest);
                              setPage(latest.pages[0].id);
                              setSelected([]);
                              history.current = new History();
                              setModal(null);
                            })
                            .catch((error) =>
                              setPersistentSaveError((error as Error).message),
                            );
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
              <McpConnectionWizard
                remote={bridgeRemote}
                onRemote={setBridgeRemote}
                address={bridgeAddress}
                token={bridgeToken}
                status={bridgeStatus}
                write={bridgeWrite}
                exporting={bridgeExport}
                onAddress={setBridgeAddress}
                onToken={setBridgeToken}
                onConnect={connectBridge}
                onDisconnect={disconnectBridge}
                notify={notify}
                onWrite={(value) => {
                  current.current = { ...current.current, bridgeWrite: value };
                  setBridgeWrite(value);
                }}
                onExport={(value) => {
                  current.current = { ...current.current, bridgeExport: value };
                  setBridgeExport(value);
                }}
                approvals={oauthApprovals}
                onApproval={(id, approved) => {
                  if (socket.current?.readyState === WebSocket.OPEN)
                    socket.current.send(
                      JSON.stringify({ type: "oauth_decision", id, approved }),
                    );
                  setOauthApprovals((list) =>
                    list.filter((item) => item.id !== id),
                  );
                }}
              />
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
  disabled = false,
}: {
  label: string;
  aria?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
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
    <label
      className="number-field"
      title={
        disabled
          ? t("Edit the main component to change instance layer geometry")
          : undefined
      }
    >
      <span>{t(label)}</span>
      <input
        type="number"
        disabled={disabled}
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
