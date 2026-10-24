import { isCloudOffline } from "./cloudConnectivity";
import {
  cacheCloudDraft,
  resolveCloudOpen,
  isRecoveredDocument,
  canEditOffline,
  offlineSessionForDoc,
  hasPendingManual,
  readCloudRecovery,
  markRecoveredDocument,
} from "./cloudRecovery";
import { WebFileStatus } from "./WebFileStatus";
import { CloudVersionHistory } from "./CloudVersionHistory";
import { useCloudSaveState } from "./useCloudSaveState";
import { useExclusiveEdit } from "./useExclusiveEdit";
import { webPrompt } from "./WebDialogs";
import { figmaClipboardBytes, clipboardPlainText } from "./externalClipboard";
import { LocalFiles } from "./LocalFiles";
import { permanentlyDeleteLocalFile } from "./storage";
import { detectShortcutPlatform } from "./deviceEnvironment";
import { CommandPalette } from "./CommandPalette";
import {
  PreferencesLayout,
  type PreferencesSection,
} from "./PreferencesLayout";
import { SaveDestinationDialog } from "./SaveDestinationDialog";
import {
  readSaveDestination,
  storeSaveDestination,
  readCloudBinding,
  rememberCloudBinding,
  isCloudBackedDocument,
  isCloudSnapshotSaved,
  markCloudSnapshotSaved,
  cloudRequest,
  saveCloudDocument,
  type SaveDestination,
} from "./saveDestination";
import { PrototypeNotes } from "./PrototypeNotes";
import { UserRound } from "lucide-react";
import { FramePresetPanel, type FrameSize } from "./FramePresetPanel";
import { createWelcomeDocument } from "./welcomeDocument";
import release from "../package.json";
import { InlineNameInput } from "./InlineNameInput";
import { CloudWorkspace } from "./CloudWorkspace";
import { equalData } from "./equalData";
import { SelectionOverlay } from "./SelectionOverlay";
import { ImageProperties } from "./ImageProperties";
import { PaletteDock } from "./PaletteDock";
import { removeDesignTokens } from "./removeDesignTokens";
import { MultiSelectionProperties } from "./MultiSelectionProperties";
import { NumberField } from "./NumberField";
import { updateSelectionProperties } from "./selectionProperties";
import { PrototypeConnections } from "./PrototypeConnections";
import { navigationPatch } from "./prototypeWires";
import { useUiTheme } from "./uiTheme";
import { InspectPanel } from "./InspectPanel";
import { commonNumber, drawingBox, visualPosition } from "./drawingExperience";
import { ZoomControl } from "./ZoomControl";
import { StrokePaintRow } from "./StrokePaintRow";
import { InspectorPopover } from "./InspectorPopover";
import { FontFamilySelect } from "./FontFamilySelect";
import { arrowGeometry } from "./arrowGeometry";
import {
  cloudBase,
  loginCloud,
  logoutCloud,
  restoreCloudSession,
  type CloudSession,
} from "./cloud";
import { useCloudSession } from "./useCloudSession";
import { CloudPanel } from "./CloudPanel";
import { configuredMcpEndpoint } from "./mcpConnections";
import { McpConnectionWizard, type OAuthApproval } from "./McpConnectionWizard";
import {
  EditorMcp,
  McpError,
  bridgeWebSocketUrl,
  bridgeNeedsNetwork,
} from "./mcp";
import {
  createIndependentMain,
  createMultipleComponents,
  addComponentVariant,
} from "./componentAuthoring";
import { canvasTarget, marqueeTargets } from "./canvasSelection";
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
import {
  CanvasAids,
  CanvasFrame,
  MeasureOverlay,
  type Box,
} from "./CanvasAids";
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
import { splitVectorLayers } from "./vectorSplit";
import { canvasCursor, prepareToolCursors } from "./toolCursor";
import {
  PathDrawingOverlay,
  type PathDrawingHandle,
} from "./PathDrawingOverlay";
import { drawnPath } from "./pathDrawing";
import { ToolDock } from "./ToolDock";
import {
  ConstraintsControl,
  LayerAppearance,
  SelectionColors,
} from "./InspectorControls";
import { nodeSelectionBounds } from "./pathBounds";
import { canFitContent, fitContent } from "./fitContent";
import { VectorEditor } from "./VectorEditor";
import { editableNetwork, convertToPaths } from "./vectorGeometry";
import { BooleanIcon } from "./BooleanIcon";
import { CanvasTextEditor, type TextEditSession } from "./CanvasTextEditor";
import { combineShapes } from "./combine";

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
  CircleDashed,
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
  | "arrow"
  | "text"
  | "pen"
  | "pencil"
  | "star"
  | "polygon";
type Modal =
  | "export"
  | "files"
  | "commands"
  | "ai"
  | "bridge"
  | "assets"
  | "share"
  | "fig-report"
  | "svg-report"
  | "settings"
  | "branches"
  | "versions"
  | null;
const tools: { id: Tool; label: string; key: string; icon: typeof Square }[] = [
  { id: "move", label: "Move", key: "V", icon: MousePointer2 },
  { id: "scale", label: "Scale", key: "K", icon: Maximize },
  { id: "frame", label: "Frame", key: "B", icon: Frame },
  { id: "rectangle", label: "Rectangle", key: "R", icon: Square },
  { id: "ellipse", label: "Ellipse", key: "E", icon: Circle },
  { id: "line", label: "Line", key: "L", icon: Minus },
  { id: "arrow", label: "Arrow", key: "⇧ L", icon: ArrowRight },
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
      rulers: v.rulers !== false,
      grid: v.grid === true,
      step:
        typeof v.step === "number" && v.step >= 1 && v.step <= 1000
          ? v.step
          : 8,
    };
  } catch {
    return { rulers: true, grid: false, step: 8 };
  }
}
export default function App() {
  const { language, setLanguage, persistenceError, t } = useI18n();
  const { theme, setTheme } = useUiTheme();
  const [hoverSidebar, setHoverSidebar] = useState<"left" | "right" | null>(
    null,
  );
  const [settingsSection, setSettingsSection] =
    useState<PreferencesSection>("general");
  function openPreferences(section: PreferencesSection = "general") {
    setSettingsSection(section);
    setModal("settings");
  }
  const [saveDestination, setSaveDestination] =
    useState<SaveDestination>(readSaveDestination);
  const [savePrompt, setSavePrompt] = useState<"local" | "cloud" | null>(null);
  const [destinationError, setDestinationError] = useState("");
  const [destinationBusy, setDestinationBusy] = useState(false);
  const destinationSaving = useRef(false);
  const [localFileView, setLocalFileView] = useState<"grid" | "list">("grid");
  const [workspaceTab, setWorkspaceTab] = useState<"local" | "cloud">("local");
  const [pagesExpanded, setPagesExpanded] = useState(true);
  const [doc, setDocumentState] = useState<Document>(() =>
    createWelcomeDocument(),
  );
  const editGuard = useRef<(id: string) => boolean>(() => true);
  const setDoc = useCallback(
    (next: Document | ((previous: Document) => Document), trusted = false) => {
      setDocumentState((previous) => {
        const value = typeof next === "function" ? next(previous) : next;
        if (
          !trusted &&
          value.id === previous.id &&
          !editGuard.current(previous.id)
        )
          return previous;
        return removeDesignTokens(value);
      });
    },
    [],
  );
  const [leftTab, setLeftTab] = useState<"file" | "assets" | "smart">("file");
  const [smartDeployment, setSmartDeployment] = useState<"cloud" | "self">(
    "cloud",
  );
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
  const newDocumentInFlight = useRef(false);
  const latestDocument = useRef(doc);
  latestDocument.current = doc;
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
  const platform = detectShortcutPlatform();
  const [ready, setReady] = useState(false);
  const [fitWelcomeOnReady, setFitWelcomeOnReady] = useState(false);
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
  const [frameSize, setFrameSize] = useState<FrameSize>({
    id: "desktop",
    name: "桌面标准",
    width: 1440,
    height: 900,
  });
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 }),
    [modal, setModal] = useState<Modal>(null),
    [tab, setTab] = useState<"design" | "prototype" | "inspect">("design");
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
  const [renaming, setRenaming] = useState<{
    kind: "page" | "layer";
    id: string;
    documentId: string;
  } | null>(null);
  useEffect(() => setRenaming(null), [doc.id, page]);

  const [layerFilter, setLayerFilter] = useState(""),
    [showLayerSearch, setShowLayerSearch] = useState(false);
  const [trashedFiles, setTrashedFiles] = useState<TrashRecord[]>([]);
  const [fileBusy, setFileBusy] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]),
    [query, setQuery] = useState(""),
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
  const cloudLogin = useCloudSession(ready);
  const {
    session: cloudSession,
    active: cloudActive,
    setActive: setCloudActive,
  } = cloudLogin;
  useEffect(() => {
    setSavePrompt(null);
    setDestinationError("");
  }, [cloudSession?.token]);
  const [cloudSigningIn, setCloudSigningIn] = useState(false);
  const [bridgeRemote, setBridgeRemote] = useState(true);
  const [oauthApprovals, setOauthApprovals] = useState<OAuthApproval[]>([]);
  const [bridgeToken, setBridgeToken] = useState(""),
    [bridgeAddress, setBridgeAddress] = useState(() =>
      configuredMcpEndpoint(import.meta.env.VITE_BAIZEFIG_MCP_URL),
    ),
    [bridgeExport, setBridgeExport] = useState(false),
    [bridgeStatus, setBridgeStatus] = useState("Disconnected"),
    [bridgeWrite, setBridgeWrite] = useState(false);
  const bridgeIntent = useRef<{
    address: string;
    token?: string;
    automatic: boolean;
    cloud?: CloudSession;
  } | null>(null);
  const bridgeRetry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bridgeAttempt = useRef(0);
  const bridgeDeadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const history = useRef(new History()),
    svg = useRef<SVGSVGElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    clipboard = useRef<NodeClipboard | null>(null),
    space = useRef(false),
    socket = useRef<WebSocket | null>(null),
    mcp = useRef(new EditorMcp()),
    abort = useRef<AbortController | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth,
        height = element.clientHeight;
      setCanvasSize((old) =>
        old.width === width && old.height === height ? old : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
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
    if (cloudActive && cloudSession && Date.now() < cloudSession.expiresAt) {
      connectBridge(false, cloudSession);
    } else if (bridgeIntent.current?.cloud) {
      disconnectBridge();
    } else if (bridgeIntent.current) {
      reconnectBridge();
    }
    setCollapsed(
      new Set(doc.nodes.filter((n) => container(n)).map((n) => n.id)),
    );
  }, [doc.id, cloudActive, cloudSession?.token]);
  useEffect(() => {
    const offline = () => {
      if (
        !bridgeIntent.current ||
        !bridgeNeedsNetwork(bridgeIntent.current.address)
      )
        return;
      disconnectBridge(false);
      setBridgeStatus("Waiting for network");
    };
    const online = () => {
      if (bridgeIntent.current) reconnectBridge();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      bridgeIntent.current = null;
      if (bridgeRetry.current) clearTimeout(bridgeRetry.current);
      if (bridgeDeadline.current) clearTimeout(bridgeDeadline.current);
      const ws = socket.current;
      socket.current = null;
      ws?.close();
    };
  }, []);
  const lastPointerHit = useRef<string | undefined>(undefined);
  const lastCanvasPointer = useRef<{ x: number; y: number } | null>(null);
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
    selectionBefore?: string[];
    targets?: SnapTarget[];
    moveBase?: Document;
    selectionScope?: string | null;
    marqueeSelection?: string[];
    marqueeInitialSelection?: string[];
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
  const editSnapshots = useRef(new Map<string, Document>());
  editSnapshots.current.set(doc.id, doc);
  const exclusive = useExclusiveEdit(
    cloudSession,
    doc.id,
    mcp.current.editorId,
    (latest) => {
      validateDocument(latest);
      if (
        !window.baizefigDesktop &&
        cloudSession &&
        !isRecoveredDocument(latest)
      )
        markCloudSnapshotSaved(cloudSession, removeDesignTokens(latest));
      history.current = new History();
      current.current.doc = latest;
      setDoc(latest, true);
      setPage(latest.pages[0].id);
      setSelected([]);
    },
    async (s, id, token, kind, checkpoint) => {
      const snapshot =
          current.current.doc.id === id
            ? current.current.doc
            : editSnapshots.current.get(id),
        binding = readCloudBinding(s, id);
      if (
        !snapshot ||
        (!hasPendingManual(id) &&
          isCloudSnapshotSaved(s, snapshot) &&
          (!checkpoint || !binding?.draftRevision))
      )
        return;
      return saveCloudDocument(
        s,
        snapshot,
        binding?.folderId || null,
        binding?.headId || null,
        {
          editorId: mcp.current.editorId,
          lockToken: token,
          ...(!window.baizefigDesktop
            ? {
                ...(checkpoint ? {} : { saveMode: "autosave" as const }),
                ...(kind === "ai" ? { source: "ai" as const } : {}),
              }
            : {}),
        },
      );
    },
  );
  const exclusiveRef = useRef(exclusive);
  exclusiveRef.current = exclusive;
  const webEditor = !window.baizefigDesktop;
  const cloudBacked = isCloudBackedDocument(doc.id);
  const cloudSaveState = useCloudSaveState(cloudSession, doc);
  const cloudSaveError = webEditor && cloudBacked ? cloudSaveState.error : "";
  const displayedSaveError = cloudSaveError || persistentSaveError;
  useEffect(() => {
    if (
      !cloudSession ||
      !isCloudBackedDocument(doc.id) ||
      !exclusive.editing ||
      (webEditor &&
        isCloudSnapshotSaved(cloudSession, doc) &&
        !hasPendingManual(doc.id))
    )
      return;
    const timer = setTimeout(
      () => {
        const l = exclusiveRef.current.lease.current;
        if (!l || l.kind !== "human" || l.ending) return;
        const binding = readCloudBinding(cloudSession, doc.id);
        void saveCloudDocument(
          cloudSession,
          doc,
          binding?.folderId || null,
          binding?.headId || null,
          {
            editorId: mcp.current.editorId,
            lockToken: l.token,
            ...(webEditor ? { saveMode: "autosave" as const } : {}),
          },
        ).catch((e) => {
          if (!webEditor) setPersistentSaveError(e.message);
        });
      },
      webEditor ? 10000 : 800,
    );
    return () => clearTimeout(timer);
  }, [doc, cloudSession?.token, exclusive.editing]);
  useEffect(() => {
    if (!webEditor || !cloudBacked || !exclusive.editing) return;
    const s = cloudSession || offlineSessionForDoc(doc.id);
    if (!s) return;
    const store = () => {
      const latest = current.current.doc;
      if (latest.id !== doc.id) return Promise.resolve();
      return cacheCloudDraft(
        s,
        latest,
        readCloudBinding(s, doc.id) || { headId: null, folderId: null },
        { editing: true },
      ).catch((e) => setPersistentSaveError("本机缓存尚未保存：" + e.message));
    };
    const timer = setTimeout(() => void store(), 250),
      archive = setInterval(() => void store(), 15 * 60 * 1000);
    const hide = () => {
      if (document.visibilityState === "hidden") void store();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(timer);
      clearInterval(archive);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [doc, webEditor, cloudBacked, exclusive.editing, cloudSession?.token]);
  useEffect(() => {
    if (!webEditor || !cloudSession || !cloudBacked || !exclusive.editing)
      return;
    // Continuous drawing is synchronized at least every 30 seconds, even without a pause.
    const timer = setInterval(() => {
      const l = exclusiveRef.current.lease.current,
        latest = current.current.doc;
      if (
        !l ||
        l.kind !== "human" ||
        l.ending ||
        isCloudOffline() ||
        (isCloudSnapshotSaved(cloudSession, latest) &&
          !hasPendingManual(latest.id))
      )
        return;
      const binding = readCloudBinding(cloudSession, latest.id);
      void saveCloudDocument(
        cloudSession,
        latest,
        binding?.folderId || null,
        binding?.headId || null,
        {
          editorId: mcp.current.editorId,
          lockToken: l.token,
          saveMode: "autosave",
        },
      ).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [webEditor, cloudSession?.token, cloudBacked, exclusive.editing]);
  useEffect(() => {
    if (!webEditor) return;
    const recover = (event: Event) =>
      notify(
        "发现本机与云端修改分叉，已保留 " +
          (event as CustomEvent).detail.name +
          "，可在本地文件中打开比较。",
      );
    window.addEventListener("baizefig-cloud-recovery", recover);
    return () => window.removeEventListener("baizefig-cloud-recovery", recover);
  }, [webEditor]);
  editGuard.current = exclusive.canEdit;
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      const latest = current.current.doc;
      if (
        cloudSession &&
        exclusiveRef.current.lease.current?.kind === "human" &&
        !isCloudSnapshotSaved(cloudSession, latest)
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [cloudSession?.token]);
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
        } else if (alive) {
          setFitWelcomeOnReady(true);
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
    if (!ready || !window.baizefigDesktop) return;
    return window.baizefigDesktop.onSave(async () => {
      (document.activeElement as HTMLElement | null)?.blur();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const snapshot = current.current.doc;
      await persistCurrent(snapshot);
      return committedDocument.current === current.current.doc;
    });
  }, [ready, persistCurrent]);
  useEffect(() => {
    if (!ready || !window.baizefigDesktop) return;
    return window.baizefigDesktop.onOpenFile(async (file) => {
      try {
        if (file.error) throw Error(file.error);
        const parsed = removeDesignTokens(JSON.parse(file.content!));
        validateDocument(parsed);
        // Persist the active design before switching, including pending edits.
        (document.activeElement as HTMLElement | null)?.blur();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (!(await save(current.current.doc)))
          throw Error("Unable to save current document");
        parsed.id = id();
        await save(parsed);
        committedDocument.current = parsed;
        current.current.doc = parsed;
        history.current = new History();
        setDoc(parsed);
        setPage(parsed.pages[0].id);
        setSelected([]);
        setCollapsed(new Set());
        setModal(null);
        setSaved("Saved locally");
        setPersistentSaveError("");
        notify("Document imported");
      } catch (error) {
        notify(`${file.name}: ${(error as Error).message}`);
      }
    });
  }, [ready, notify]);
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
  const styleGesture = useRef<{
    before: Document;
    next: Document;
    selection: string[];
  } | null>(null);
  function onStyleGesture(phase: "start" | "end" | "cancel") {
    if (phase === "start") {
      if (!styleGesture.current)
        styleGesture.current = {
          before: doc,
          next: doc,
          selection: [...selected],
        };
      return;
    }
    const gesture = styleGesture.current;
    if (!gesture) return;
    styleGesture.current = null;
    if (phase === "cancel") {
      setDoc(gesture.before);
      return;
    }
    if (JSON.stringify(gesture.before) !== JSON.stringify(gesture.next)) {
      history.current.push(gesture.before, gesture.selection);
      setDoc(gesture.next);
    }
  }
  const change = (next: Document, selection?: string[]) => {
    next = removeDesignTokens(next);
    validateDocument(next);
    if (equalData(doc, next)) {
      if (selection) setSelected(selection);
      return;
    }
    if (styleGesture.current) styleGesture.current.next = next;
    else history.current.push(doc, selected);
    setDoc(next);
    if (selection) setSelected(selection);
  };
  const run = (command: Command) => {
    try {
      const result = execute(doc, command);
      change(result.doc, result.selection);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const undo = () => {
    restoreHistory("undo");
  };
  const redo = () => {
    restoreHistory("redo");
  };
  function restoreHistory(direction: "undo" | "redo") {
    const next = history.current[direction](doc, selected);
    setDoc(next);
    const ids = history.current.selection ?? selected;
    setSelected(
      ids.filter((id) =>
        next.nodes.some(
          (n) =>
            n.id === id &&
            n.pageId === page &&
            n.visible &&
            !n.locked &&
            !ancestors(next, n).some((a) => a.locked || !a.visible),
        ),
      ),
    );
  }
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
  const patch = (patch: Partial<Node>) => {
    try {
      change(updateSelectionProperties(doc, selected, patch));
    } catch (error) {
      notify((error as Error).message);
    }
  };
  const prototypeDescription = (
    <section>
      <div className="section-heading">{t("Prototype description")}</div>
      <PrototypeNotes
        key={first?.id ?? page}
        value={
          (first ?? doc.pages.find((p) => p.id === page))?.prototypeNotes ?? ""
        }
        label={t("Prototype description")}
        onChange={(prototypeNotes) =>
          first
            ? patch({ prototypeNotes })
            : change({
                ...doc,
                pages: doc.pages.map((p) =>
                  p.id === page ? { ...p, prototypeNotes } : p,
                ),
              })
        }
      />
    </section>
  );
  function setVisualPosition(axis: "x" | "y", value: number) {
    try {
      let next = doc;
      for (const node of chosen) {
        next = execute(next, {
          type: "update",
          ids: [node.id],
          patch: { [axis]: node[axis] + value - visualPosition(node)[axis] },
        }).doc;
      }
      change(next);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function setVisualDimension(axis: "width" | "height", value: number) {
    try {
      let next = doc;
      for (const node of chosen) {
        const linear = node.fidelity?.linear ?? [1, 0, 0, 1];
        const scale =
          axis === "width"
            ? Math.hypot(linear[0], linear[1])
            : Math.hypot(linear[2], linear[3]);
        if (scale < 1e-8) throw Error("Cannot resize a collapsed transform");
        next = execute(next, {
          type: "update",
          ids: [node.id],
          patch: {
            [axis]: value / scale,
            ...(node.constrainProportions && node[axis] > 0
              ? {
                  [axis === "width" ? "height" : "width"]:
                    (node[axis === "width" ? "height" : "width"] * value) /
                    scale /
                    node[axis],
                }
              : {}),
          },
        }).doc;
      }
      change(next);
    } catch (error) {
      notify((error as Error).message);
    }
  }
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
      await permanentlyDeleteLocalFile(target.id);
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
        setView({ x: 0, y: 0, zoom: 1 });
      }
      setDocuments(remaining);
      setTrashedFiles(await listTrash());
      notify("文件已删除");
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
  const openingCloudLink = useRef(false);
  useEffect(() => {
    const fileId = new URLSearchParams(window.location.search).get("cloudFile");
    if (!fileId || !ready || openingCloudLink.current) return;
    if (!cloudSession) {
      if (!cloudLogin.restoring) {
        setWorkspaceTab("cloud");
        setModal("files");
      }
      return;
    }
    openingCloudLink.current = true;
    void (async () => {
      try {
        let result;
        if (!window.baizefigDesktop && isCloudOffline()) {
          const cached = await readCloudRecovery(cloudSession, fileId);
          if (!cached) throw Error("此文件尚未缓存到本机，请联网后打开");
          result = {
            file: {
              id: fileId,
              head_id: cached.headId,
              folder_id: cached.folderId,
            },
            content: markRecoveredDocument(cached.doc),
            draft: cached.cloudRevision
              ? { revision: cached.cloudRevision }
              : null,
          };
        } else {
          result = await cloudRequest(
            cloudSession,
            "/files/" + encodeURIComponent(fileId),
          );
          if (!window.baizefigDesktop)
            result = await resolveCloudOpen(cloudSession, result);
        }
        validateDocument(result.content);
        if (!(await save(current.current.doc))) throw Error("无法保存当前文件");
        if (!(await save(result.content))) throw Error("无法缓存云端文件");
        rememberCloudBinding(
          cloudSession,
          result.file.id,
          result.file.head_id,
          result.file.folder_id,
          !window.baizefigDesktop ? result.draft?.revision || null : undefined,
        );
        if (!window.baizefigDesktop && !isRecoveredDocument(result.content))
          markCloudSnapshotSaved(
            cloudSession,
            removeDesignTokens(result.content),
          );
        committedDocument.current = result.content;
        current.current.doc = result.content;
        history.current = new History();
        setDoc(result.content, true);
        setPage(result.content.pages[0].id);
        setSelected([]);
        setCollapsed(new Set());
        setModal(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("cloudFile");
        window.history.replaceState(null, "", url);
      } catch (error) {
        notify((error as Error).message);
      }
    })();
  }, [ready, cloudSession?.token, cloudLogin.restoring]);
  const localExport = () => {
    download(JSON.stringify(doc, null, 2), `${doc.name}.baizefig`);
    notify("Local copy exported");
  };
  const configureSaveDestination = (value: SaveDestination) => {
    try {
      storeSaveDestination(value);
      setSaveDestination(value);
    } catch {
      notify(
        "Unable to remember the save location. Check browser storage permissions.",
      );
    }
  };
  async function saveToDestination(
    where: "local" | "cloud",
    makeDefault = false,
    folderId: string | null = null,
  ) {
    if (destinationSaving.current) return;
    destinationSaving.current = true;
    setDestinationBusy(true);
    setDestinationError("");
    try {
      if (where === "local") localExport();
      else {
        if (!cloudSession || cloudSession.expiresAt <= Date.now())
          throw Error("Sign in to your cloud account again before saving.");
        const binding = readCloudBinding(cloudSession, doc.id);
        let headId = binding?.headId || null;
        if (!binding) {
          try {
            headId = (await cloudRequest(cloudSession, "/files/" + doc.id)).file
              .head_id;
          } catch (e) {
            if ((e as { status?: number }).status !== 404) throw e;
          }
        }
        if (!exclusive.canSave()) {
          if (binding) throw Error("请先开始编辑，再保存云文件");
          await exclusive.begin();
        }
        await saveCloudDocument(
          cloudSession,
          current.current.doc,
          folderId,
          headId,
          {
            editorId: mcp.current.editorId,
            lockToken: exclusive.lease.current?.token || "",
          },
        );
        notify(
          isCloudOffline() && webEditor
            ? "已保存到本机，联网后同步为正式版本"
            : "Saved to cloud",
        );
      }
      if (makeDefault) configureSaveDestination(where);
      setSavePrompt(null);
    } catch (e) {
      const message = (e as Error).message;
      setDestinationError(message);
      notify(message);
    } finally {
      destinationSaving.current = false;
      setDestinationBusy(false);
    }
  }
  const requestSave = () => {
    if (destinationSaving.current || savePrompt) return;
    setDestinationError("");
    if (
      webEditor &&
      cloudBacked &&
      isCloudOffline() &&
      canEditOffline(doc.id)
    ) {
      const s = cloudSession || offlineSessionForDoc(doc.id);
      if (s)
        void cacheCloudDraft(
          s,
          doc,
          readCloudBinding(s, doc.id) || { headId: null, folderId: null },
          { manual: true, editing: true, archive: true },
        )
          .then(() => persistCurrent(doc))
          .then(() => notify("已保存到本机，联网后同步为正式版本"))
          .catch((e) => notify(e.message));
      return;
    }
    if (webEditor && cloudBacked) {
      if (!cloudSession) {
        notify("请登录乐悦云后重试云端保存");
        return;
      }
      const binding = readCloudBinding(cloudSession, doc.id);
      void saveToDestination("cloud", false, binding?.folderId || null);
      return;
    }
    if (!cloudSession || saveDestination === "local") {
      void saveToDestination("local");
      return;
    }
    if (saveDestination === "cloud") {
      const binding = readCloudBinding(cloudSession, doc.id);
      if (binding) {
        void saveToDestination("cloud", false, binding.folderId);
        return;
      }
      setSavePrompt("cloud");
      return;
    }
    setSavePrompt("local");
  };
  const saveMenuName =
    saveDestination === "ask"
      ? "Save"
      : saveDestination === "cloud" && cloudSession
        ? "Save to cloud"
        : "Save to local";
  const zoomTo = (
    value: number | ((current: number) => number),
    anchor: "center" | "pointer" = "center",
  ) => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const at =
      anchor === "pointer" && lastCanvasPointer.current
        ? {
            x: lastCanvasPointer.current.x - rect.left,
            y: lastCanvasPointer.current.y - rect.top,
          }
        : { x: rect.width / 2, y: rect.height / 2 };
    setView((v) => {
      const zoom = Math.min(
        8,
        Math.max(0.05, typeof value === "function" ? value(v.zoom) : value),
      );
      return {
        zoom,
        x: at.x - ((at.x - v.x) * zoom) / v.zoom,
        y: at.y - ((at.y - v.y) * zoom) / v.zoom,
      };
    });
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
  useEffect(() => {
    if (!ready || !fitWelcomeOnReady) return;
    const frame = requestAnimationFrame(() => {
      fit();
      setFitWelcomeOnReady(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, fitWelcomeOnReady]);
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
    const openPopover = document.querySelector<HTMLElement>(
      ".inspector-popover:popover-open",
    );
    if (openPopover) {
      e.preventDefault();
      e.stopPropagation();
      openPopover.hidePopover();
      return;
    }
    if (editingText || editingCrop) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
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
      const target = id
        ? canvasTarget(doc, id, selectionScope, e.metaKey || e.ctrlKey)
        : undefined;
      if (target && !selected.includes(target.id)) setSelected([target.id]);
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
      selectionBefore: [...selected],
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
      const kind: Kind = tool === "arrow" ? "path" : tool;
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
        width: 0,
        height: 0,
        fill:
          kind === "line" || tool === "arrow"
            ? "none"
            : kind === "frame"
              ? "#ffffff"
              : kind === "text"
                ? "#202a24"
                : "#b1b2b5",
      });
      if (tool === "arrow") {
        n.name = t("Arrow");
        Object.assign(
          n,
          arrowGeometry(origin, { x: origin.x + 100, y: origin.y }),
        );
      }
      if (defaultStyles[n.type])
        Object.assign(n, propertyPatch(n, defaultStyles[n.type]!));
      if (kind === "text") {
        n.text = "";
        n.width = 1;
        n.height = n.fontSize * n.lineHeight;
        n.textFlow = { ...n.textFlow!, autoResize: "both" };
        n.layoutItem = {
          ...n.layoutItem,
          horizontalSizing: "hug",
          verticalSizing: "hug",
        };
      }
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
    }
    setMarquee({ x: p.x, y: p.y, width: 0, height: 0 });
    drag.current = {
      ...base,
      type: "marquee",
      ids: e.shiftKey ? selected : [],
      selectionScope,
      marqueeInitialSelection: selected,
    };
  }
  function pointerMove(e: RPointer) {
    lastCanvasPointer.current = { x: e.clientX, y: e.clientY };
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
      const box = {
        x: Math.min(p.x, d.start.x),
        y: Math.min(p.y, d.start.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };
      setMarquee(box);
      d.marqueeSelection =
        Math.hypot(dx, dy) * view.zoom < 4
          ? d.ids
          : [
              ...new Set([
                ...d.ids,
                ...marqueeTargets(doc, page, box, d.selectionScope ?? null),
              ]),
            ];
      setSelected(d.marqueeSelection);
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
                e.altKey,
              )
            : resizeInWorld(
                d.before,
                d.nodeId!,
                d.handle!,
                dx,
                dy,
                e.shiftKey,
                e.altKey,
              ),
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
          if (n.id !== d.nodeId) return n;
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
          if (n.type === "text") {
            if (Math.hypot(p.x - d.start.x, p.y - d.start.y) * view.zoom < 4)
              return {
                ...n,
                x: start.x,
                y: start.y,
                width: 1,
                height: n.fontSize * n.lineHeight,
                textFlow: { ...n.textFlow!, autoResize: "both" },
                layoutItem: {
                  ...n.layoutItem,
                  horizontalSizing: "hug",
                  verticalSizing: "hug",
                },
              };
            return {
              ...n,
              x: Math.min(start.x, end.x),
              y: Math.min(start.y, end.y),
              width: Math.max(1, Math.abs(localDx)),
              height: Math.max(n.fontSize * n.lineHeight, Math.abs(localDy)),
              textFlow: { ...n.textFlow!, autoResize: "fixed" },
              layoutItem: {
                ...n.layoutItem,
                horizontalSizing: "fixed",
                verticalSizing: "fixed",
              },
            };
          }
          if (tool === "arrow")
            return { ...n, ...arrowGeometry(start, end, e.shiftKey) };
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
          return { ...n, ...drawingBox(start, end, e.shiftKey, e.altKey) };
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
      setSelected(d.marqueeSelection ?? d.ids);
      if (!d.marqueeSelection?.length && !d.ids.length) setSelectionScope(null);
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
            ? n.type === "frame"
              ? {
                  ...n,
                  width: frameSize.width,
                  height: frameSize.height,
                  name: frameSize.name,
                }
              : { ...n, width: 160, height: 100 }
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
      history.current.push(d.before, d.selectionBefore);
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
      setSelected(
        d.type === "marquee"
          ? (d.marqueeInitialSelection ?? [])
          : (d.selectionBefore ?? []),
      );
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
  const presentationFullscreen = useRef(false);
  useEffect(() => {
    const changed = () => {
      if (presentationFullscreen.current && !document.fullscreenElement) {
        presentationFullscreen.current = false;
        setPresent(null);
      }
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!present && presentationFullscreen.current) {
      presentationFullscreen.current = false;
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    }
  }, [present]);
  function presentStart() {
    const containingFrame =
      first &&
      ancestors(doc, first).find(
        (n) => n.type === "frame" && !n.componentSetId,
      );
    const frame =
      first?.type === "frame" && !first.componentSetId
        ? first
        : (containingFrame ??
          doc.nodes.find(
            (n) =>
              n.pageId === page &&
              n.type === "frame" &&
              !n.parentId &&
              !n.componentSetId &&
              n.visible,
          ));
    if (frame) {
      setPresent(frame.id);
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        presentationFullscreen.current = true;
        void document.documentElement.requestFullscreen().catch(() => {
          presentationFullscreen.current = false;
        });
      }
    } else notify("Create a frame to start a prototype");
  }
  async function importFiles(
    files: FileList | File[] | null,
    pastedSvg = false,
  ) {
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
          const parsed = removeDesignTokens(JSON.parse(await file.text()));
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
          if (pastedSvg) {
            const root = result.nodes.find((n) => n.id === result.rootId)!;
            root.type = "group";
            if (root.fidelity) root.fidelity.clipsContent = false;
          }
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
    setPagesExpanded(true);
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
  async function newDoc() {
    if (newDocumentInFlight.current) return;
    newDocumentInFlight.current = true;
    try {
      const source = current.current.doc;
      if (!(await save(source))) throw Error("File is in trash");
      const next = emptyDocument();
      next.name = t("Untitled");
      next.pages[0].name = t("Page {number}", { number: 1 });
      if (!(await save(next))) throw Error("Unable to save the new file");
      committedDocument.current = next;
      history.current = new History();
      setDoc(next);
      setPage(next.pages[0].id);
      setSelected([]);
      setModal(null);
      setMenuAnchor(null);
      setContext(null);
      setView({ x: 0, y: 0, zoom: 1 });
    } catch (error) {
      setPersistentSaveError((error as Error).message);
    } finally {
      newDocumentInFlight.current = false;
    }
  }
  useEffect(() => {
    const shortcut = shortcutRegistry.find(
      (s) => s.name === "New design file",
    )!;
    const onNewFile = (event: KeyboardEvent) => {
      if (!shortcutMatches(event, shortcut, "physical", platform)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (
        event.repeat ||
        !ready ||
        importInFlight.current ||
        newDocumentInFlight.current
      )
        return;
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      requestAnimationFrame(() => void newDoc());
    };
    window.addEventListener("keydown", onNewFile, true);
    return () => window.removeEventListener("keydown", onNewFile, true);
  });
  function createPresetFrame() {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    run({
      type: "create",
      nodes: [
        makeNode("frame", page, {
          name: frameSize.name,
          x: Math.round(
            (rect.width / 2 - view.x) / view.zoom - frameSize.width / 2,
          ),
          y: Math.round(
            (rect.height / 2 - view.y) / view.zoom - frameSize.height / 2,
          ),
          width: frameSize.width,
          height: frameSize.height,
        }),
      ],
    });
    setTool("move");
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
  const selectionKey = selected.join("|");
  useEffect(() => {
    if (!selected.length) return;
    const parents = new Set(
      selected.flatMap((id) => {
        const node = doc.nodes.find((n) => n.id === id);
        return node ? ancestors(doc, node).map((a) => a.id) : [];
      }),
    );
    setCollapsed((previous) => {
      const next = new Set(previous);
      parents.forEach((id) => next.delete(id));
      return next;
    });
    setLayerFilter("");
    const frame = requestAnimationFrame(() => {
      const rows = document.querySelectorAll<HTMLElement>("[data-layer-id]");
      const row = [...rows].find((el) => el.dataset.layerId === selected[0]);
      row?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectionKey, leftTab]);
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
      run: () => openPreferences("fonts"),
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
    { name: "Preferences", key: "", run: () => openPreferences() },
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
      name: "Import",
      key: "⌘ O",
      run: () => fileInput.current?.click(),
    },
    { name: "Save", key: "⌘ S", run: requestSave },
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
      key: "⌘ K",
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
    {
      name: "Help documentation",
      run: () =>
        window.open(
          `${import.meta.env.BASE_URL}help/index.html`,
          "_blank",
          "noopener,noreferrer",
        ),
    },
    {
      name: "Keyboard shortcuts",
      key: "?",
      run: () => openPreferences("keyboard"),
    },
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
      run: togglePanels,
    },
    {
      name: "Zoom in",
      run: () => zoomTo((z) => z * 1.3, "pointer"),
    },
    {
      name: "Zoom out",
      run: () => zoomTo((z) => z / 1.3, "pointer"),
    },
    { name: "Zoom to 100%", run: () => setView({ x: 0, y: 0, zoom: 1 }) },
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
      run: async () => {
        const value = await webPrompt(t("Link URL (empty to remove)"), "");
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
    { name: "Keyboard layout", run: () => openPreferences("keyboard") },
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
      (a.name === "Create component" &&
        chosen.some(
          (n) =>
            ["component", "instance"].includes(n.type) || !!n.componentOwner,
        )) ||
      (a.name === "Paste properties" && !styleClipboard.current),
    checked: "checked" in a ? Boolean(a.checked) : undefined,
  }));
  const hideCreateComponent = chosen.some(
    (n) =>
      n.type === "component" || n.type === "instance" || !!n.componentOwner,
  );
  const actionItem = (name: string): MenuItem =>
    actions.find((a) => a.name === name) ?? {
      name,
      disabled: true,
      reason: "Research in progress",
    };
  const sub = (name: string, names: (string | MenuItem)[]): MenuItem => ({
    name,
    children: names
      .filter(
        (n) =>
          !(
            hideCreateComponent &&
            (typeof n === "string" ? n : n.name) === "Create component"
          ),
      )
      .map((n) => (typeof n === "string" ? actionItem(n) : n)),
  });
  const menuItems: MenuItem[] = [
    { ...actionItem("Open file browser"), name: "Workspace" },
    { ...actionItem("Actions"), name: "Search commands" },
    sub("File", [
      "New design file",
      "Import",
      { ...actionItem("Save"), name: saveMenuName },
      "Version history",
      "Create branch",
      "Export",
    ]),
    sub("Edit", [
      "Undo",
      "Redo",
      "Cut",
      "Copy",
      "Paste",
      sub("Paste special", ["Paste over selection", "Paste to replace"]),
      sub("Copy as", ["Copy as CSS", "Copy as SVG", "Copy as PNG"]),
      "Duplicate selection",
      "Delete",
      "Find and replace",
      sub("Selection", [
        "Select all",
        "Select none",
        "Select inverse",
        "Select all text",
        "Select all frames",
        "Select all images",
      ]),
      sub("Properties", [
        "Copy properties",
        "Paste properties",
        "Set default properties",
        "Pick color",
      ]),
    ]),
    sub("View", [
      "Zoom in",
      "Zoom out",
      "Zoom to 100%",
      "Zoom to fit",
      "Zoom to selection",
      sub("Page navigation", ["Previous page", "Next page"]),
      "Pixel grid",
      "Layout guides",
      "Rulers",
      "Layer outlines",
      "Show/Hide UI",
    ]),
    sub("Object", [
      "Frame selection",
      "Group selection",
      "Ungroup selection",
      sub("Auto layout", [
        "Add auto layout",
        "Remove auto layout",
        "Layout rules",
      ]),
      sub("Components", [
        "Create component",
        "Manage slots",
        "Go to main component",
        "Reset instance",
        "Detach instance",
      ]),
      sub("Layer order", [
        "Bring to front",
        "Bring forward",
        "Send backward",
        "Send to back",
      ]),
      sub("Transform", [
        "Flip horizontal",
        "Flip vertical",
        "Rotate 90° left",
        "Rotate 90° right",
        "Rotate 180°",
      ]),
      sub("Vector", [
        "Edit vector",
        "Split vector into layers",
        "Flatten",
        "Outline stroke",
      ]),
      sub("Boolean groups", [
        "Union",
        "Subtract",
        "Intersect",
        "Exclude",
        "Use as mask",
      ]),
      "Show/Hide selection",
      "Lock/Unlock selection",
      "Collapse layers",
      sub("Appearance", [
        "Remove fill",
        "Remove stroke",
        "Swap fill and stroke",
      ]),
      "Remove interactions",
    ]),
    sub("Arrange", [
      "Align left",
      "Align horizontal centers",
      "Align right",
      "Align top",
      "Align vertical centers",
      "Align bottom",
      sub("Spacing", [
        "Distribute horizontal spacing",
        "Distribute vertical spacing",
        "Pack horizontal",
        "Pack vertical",
      ]),
      sub("Distribute", [
        "Distribute left",
        "Distribute horizontal centers",
        "Distribute right",
        "Distribute top",
        "Distribute vertical centers",
        "Distribute bottom",
      ]),
      "Tidy up",
      "Round to pixel",
    ]),
    sub("Text", [
      "Font availability and replacement",
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
    actionItem("Preferences"),
    sub("Help", [
      "Help documentation",
      "Keyboard shortcuts",
      "Performance diagnostics",
    ]),
  ];

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (
        importInFlight.current ||
        e.defaultPrevented ||
        document.querySelector(".inspector-popover:popover-open") ||
        document.querySelector(".workspace-dialog-overlay,.web-dialog-backdrop")
      )
        return;
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
        if (e.repeat) return;
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
        if (drag.current) {
          if (drag.current.type === "move") pointerUp();
          else cancelDrag();
          e.preventDefault();
          return;
        }
        if (context) {
          setContext(null);
          return;
        }
        setContext(null);
        setSelected([]);
        setTool("move");
        return;
      }
      if (savePrompt || modal || present || menuAnchor || editingCrop) return;
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
      const data = e.clipboardData;
      if (!data) return;
      const plain = data.getData("text/plain");
      const html = data.getData("text/html");
      try {
        const parsed = JSON.parse(plain);
        if (
          parsed?.format === "baizefig-clipboard" &&
          Array.isArray(parsed.nodes)
        ) {
          e.preventDefault();
          clipboard.current = parsed;
          void paste("normal", parsed);
          return;
        }
      } catch {
        /* External text is not our internal layer format. */
      }
      const svgText = data.getData("image/svg+xml") || plain;
      const svgMatch = svgText.match(
        /^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i,
      );
      if (svgMatch) {
        e.preventDefault();
        void importFiles(
          [
            new window.File([svgText], "粘贴的图形.svg", {
              type: "image/svg+xml",
            }),
          ],
          true,
        );
        return;
      }
      const images = Array.from(data.items)
        .filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
        .map((item) => item.getAsFile())
        .filter((f): f is globalThis.File => !!f);
      if (html.includes("<!--(figma)")) {
        e.preventDefault();
        void (async () => {
          const sourceId = doc.id;
          try {
            const bytes = figmaClipboardBytes(html);
            if (!bytes) throw Error("未读取到 Figma 图层");
            const imported = await importFigFile(
              new window.File([bytes as BlobPart], "clipboard.fig"),
            );
            if (latestDocument.current.id !== sourceId) return;
            const result = pasteNodes(
              latestDocument.current,
              page,
              { nodes: imported.document.nodes },
              [],
              "normal",
            );
            change(result.doc, result.selection);
            if (imported.report.warnings.length)
              notify(imported.report.warnings.join("；"));
          } catch (error) {
            if (images.length) {
              void importFiles(images, true);
              notify("该设计暂不能完整解析，已粘贴为图片");
            } else notify((error as Error).message);
          }
        })();
        return;
      }
      if (images.length) {
        e.preventDefault();
        void importFiles(images, true);
        return;
      }
      if (html) {
        const svg = new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector("svg");
        if (svg) {
          e.preventDefault();
          void importFiles(
            [
              new window.File([svg.outerHTML], "粘贴的图形.svg", {
                type: "image/svg+xml",
              }),
            ],
            true,
          );
          return;
        }
      }
      const text = plain || (html ? clipboardPlainText(html) : "");
      if (text) {
        e.preventDefault();
        if (text.length > 1000000) {
          notify("粘贴文字过长");
          return;
        }
        const node = makeNode("text", page, {
          name: text.slice(0, 40),
          text,
          x: 80,
          y: 80,
          width: Math.min(600, Math.max(160, text.split("\n")[0].length * 14)),
          height: Math.max(34, text.split("\n").length * 34),
          fontSize: 24,
          fill: "#202020",
          textFlow: {
            autoResize: "height",
            verticalAlign: "top",
            letterSpacing: 0,
          },
        });
        const result = execute(doc, { type: "create", nodes: [node] });
        change(result.doc, [node.id]);
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
  function disconnectBridge(stopRetry = true, revoke = true) {
    if (stopRetry) {
      setCloudActive(false);
      bridgeIntent.current = null;
      bridgeAttempt.current = 0;
    }
    if (bridgeRetry.current) clearTimeout(bridgeRetry.current);
    bridgeRetry.current = null;
    if (bridgeDeadline.current) clearTimeout(bridgeDeadline.current);
    bridgeDeadline.current = null;
    const ws = socket.current;
    socket.current = null;
    ws?.close();
    if (revoke && current.current)
      current.current = {
        ...current.current,
        bridgeWrite: false,
        bridgeExport: false,
      };
    if (revoke) {
      setBridgeWrite(false);
      setBridgeExport(false);
    }
    setBridgeStatus("Disconnected");
    setOauthApprovals([]);
  }
  function reconnectBridge() {
    const intent = bridgeIntent.current;
    if (!intent) return;
    disconnectBridge(false);
    if (intent.cloud && Date.now() >= intent.cloud.expiresAt) {
      disconnectBridge();
      cloudLogin.forget();
      notify("Cloud session expired. Please sign in again.");
      return;
    }
    if (!navigator.onLine && bridgeNeedsNetwork(intent.address)) {
      setBridgeStatus("Waiting for network");
      return;
    }
    setBridgeStatus("Reconnecting…");
    const delay = Math.min(
      1000 * 2 ** Math.min(bridgeAttempt.current++, 5),
      30000,
    );
    bridgeRetry.current = setTimeout(() => {
      bridgeRetry.current = null;
      if (bridgeIntent.current === intent)
        connectBridge(intent.automatic, intent.cloud, intent);
    }, delay);
  }
  function connectBridge(
    automatic = false,
    cloud?: CloudSession,
    saved?: NonNullable<typeof bridgeIntent.current>,
  ) {
    let address: string;
    try {
      address =
        saved?.address ??
        (cloud
          ? cloud.base.replace(/^http/, "ws") + "/api/v1/bridge/baizefig"
          : bridgeWebSocketUrl(bridgeAddress.trim()));
    } catch (e) {
      notify((e as Error).message);
      return;
    }
    const intent = saved ?? {
      address,
      token: cloud ? cloud.token : automatic ? undefined : bridgeToken,
      automatic,
      cloud,
    };
    if (!saved) bridgeAttempt.current = 0;
    disconnectBridge(false, !!saved || !!socket.current);
    bridgeIntent.current = intent;
    if (!navigator.onLine && bridgeNeedsNetwork(intent.address)) {
      setBridgeStatus("Waiting for network");
      return;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocket(intent.address);
    } catch {
      reconnectBridge();
      return;
    }
    const documentId = current.current.doc.id;
    socket.current = ws;
    setBridgeStatus("Connecting…");
    bridgeDeadline.current = setTimeout(() => {
      if (socket.current === ws) reconnectBridge();
    }, 10000);
    ws.onopen = () => {
      if (socket.current !== ws || current.current.doc.id !== documentId) {
        ws.close();
        return;
      }
      ws.send(
        JSON.stringify({
          type: "pair",
          token: intent.token,
          auto: automatic,
          documentId,
          editorId: mcp.current.editorId,
          name: current.current.doc.name,
          platform: window.baizefigDesktop ? "desktop" : "web",
          clientLabel: window.baizefigDesktop
            ? "Mac"
            : navigator.userAgent.includes("Edg/")
              ? "Edge"
              : navigator.userAgent.includes("Firefox/")
                ? "Firefox"
                : navigator.userAgent.includes("Chrome/")
                  ? "Chrome"
                  : "Safari",
        }),
      );
    };
    ws.onclose = (event) => {
      if (socket.current !== ws) return;
      if (
        (event.code === 1008 && !event.reason.includes("Another editor")) ||
        (event.code === 1000 && event.reason === "Disconnected")
      ) {
        disconnectBridge();
        if (intent.cloud) {
          const rejected = intent.cloud;
          void restoreCloudSession(rejected).catch((error) => {
            if (error.invalidSession) cloudLogin.forget(rejected.token);
          });
        }
        notify(
          "Pairing rejected. Check the token and disconnect any other paired editor.",
        );
      } else reconnectBridge();
    };
    ws.onerror = () => {
      if (socket.current === ws) reconnectBridge();
    };
    let messageQueue = Promise.resolve();
    const receiveMessage = async (event: MessageEvent) => {
      if (socket.current !== ws || current.current.doc.id !== documentId)
        return;
      let message: {
        id: string;
        type?: string;
        method: string;
        params?: Record<string, unknown>;
        request?: OAuthApproval;
        permissions?: { write?: boolean; export?: boolean };
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
        if (bridgeDeadline.current) clearTimeout(bridgeDeadline.current);
        bridgeDeadline.current = null;
        bridgeAttempt.current = 0;
        setBridgeStatus("Connected");
        return;
      }
      try {
        if (cloud && message.method === "begin_edit") {
          await exclusiveRef.current.begin(
            "ai",
            String(message.params?.lockToken),
          );
          ws.send(
            JSON.stringify({ id: message.id, result: { editing: true } }),
          );
          return;
        }
        if (cloud && message.method === "end_edit") {
          await exclusiveRef.current.end(String(message.params?.lockToken));
          ws.send(
            JSON.stringify({ id: message.id, result: { released: true } }),
          );
          return;
        }
        const c = current.current;
        const cloudFile = isCloudBackedDocument(c.doc.id);
        if (message.method === "apply_commands" && cloudFile && !cloud)
          throw new McpError(
            "EDIT_LOCK_REQUIRED",
            "云文件请通过乐悦云连接并先调用 begin_edit",
          );
        if (cloud && message.method === "apply_commands") {
          const l = exclusiveRef.current.lease.current;
          if (
            !l ||
            l.kind !== "ai" ||
            l.documentId !== c.doc.id ||
            l.token !== message.params?.lockToken
          )
            throw new McpError("EDIT_LOCK_REQUIRED", "请先调用 begin_edit");
          await cloudRequest(cloud, "/files/" + c.doc.id + "/edit/validate", {
            editorId: mcp.current.editorId,
            lockToken: l.token,
          });
        }
        if (
          (drag.current || c.editing) &&
          ["apply_commands", "preview_commands"].includes(message.method)
        )
          throw new McpError(
            "EDITOR_BUSY",
            "Finish the current canvas or text edit before editing through MCP",
          );
        if (socket.current !== ws || current.current.doc.id !== documentId)
          return;
        let result = mcp.current.handle(
          message.method,
          Object.fromEntries(
            Object.entries(message.params ?? {}).filter(
              ([key]) => key !== "lockToken",
            ),
          ),
          cloud
            ? {
                ...c,
                bridgeWrite: message.permissions?.write === true,
                bridgeExport: message.permissions?.export === true,
              }
            : c,
          (next) => {
            next = removeDesignTokens(next);
            history.current.push(c.doc, c.selected);
            current.current = { ...c, doc: next };
            setDoc(next, true);
          },
        );
        if (cloud && message.method === "apply_commands") {
          const binding = readCloudBinding(cloud, c.doc.id);
          try {
            await saveCloudDocument(
              cloud,
              current.current.doc,
              binding?.folderId || null,
              binding?.headId || null,
              {
                editorId: mcp.current.editorId,
                lockToken: String(message.params?.lockToken),
                ...(!window.baizefigDesktop
                  ? { saveMode: "autosave" as const, source: "ai" as const }
                  : {}),
              },
            );
          } catch (error) {
            if (
              (error as { status?: number }).status &&
              socket.current === ws &&
              current.current.doc.id === documentId
            ) {
              mcp.current.forgetReceipt(
                c.doc.id,
                String(message.params?.idempotencyKey),
              );
              current.current = { ...current.current, doc: c.doc };
              setDoc(c.doc, true);
              if (!window.baizefigDesktop)
                await cacheCloudDraft(
                  cloud,
                  c.doc,
                  binding || { headId: null, folderId: null },
                  { editing: false },
                );
            }
            setPersistentSaveError(
              "AI 修改尚未确认保存：" + (error as Error).message,
            );
            throw error;
          }
        }
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
          !(cloud
            ? message.permissions?.export === true
            : current.current.bridgeExport)
        )
          throw new McpError("PERMISSION_DENIED", "Export access was revoked");
        const response = JSON.stringify({ id: message.id, result });
        if (
          new TextEncoder().encode(response).length >
          (cloud ? 3 : 8) * 1024 * 1024
        )
          throw new McpError(
            "RESULT_TOO_LARGE",
            "Result exceeds the service limit. Read fewer fields/nodes or export a smaller selection.",
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
    ws.onmessage = (event) => {
      messageQueue = messageQueue
        .then(() => receiveMessage(event))
        .catch(() => {});
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
              className={`layer ${selected.includes(n.id) ? "selected" : ""} ${ancestors(doc, n).some((a) => selected.includes(a.id)) ? "in-selection" : ""} ${[n, ...ancestors(doc, n)].some((a) => a.type === "component" || a.type === "instance") ? "component-layer" : ""} ${!n.visible ? "dim" : ""}`}
              style={{ paddingLeft: 12 + depth * 14, touchAction: "none" }}
              aria-selected={selected.includes(n.id)}
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
              onDoubleClick={(e) => {
                if ((e.target as Element).closest("button,input")) return;
                setSelected([n.id]);
                setRenaming({ kind: "layer", id: n.id, documentId: doc.id });
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
              {(() => {
                const Icon =
                  (n.type === "path"
                    ? Spline
                    : tools.find((tool) => tool.id === n.type)?.icon) ??
                  (n.type === "component" || n.type === "instance"
                    ? Component
                    : Layers);
                return (
                  <Icon
                    size={12}
                    strokeWidth={1.25}
                    className="layer-kind-icon"
                  />
                );
              })()}
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
              {renaming?.kind === "layer" &&
              renaming.id === n.id &&
              renaming.documentId === doc.id ? (
                <InlineNameInput
                  key={n.id}
                  name={n.name}
                  label={t("Layer name")}
                  onCancel={() => setRenaming(null)}
                  onCommit={(name) => {
                    run({ type: "update", ids: [n.id], patch: { name } });
                    setRenaming(null);
                  }}
                />
              ) : (
                <span className="layer-name">{n.name}</span>
              )}
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
  function togglePanels() {
    const width = hiddenUI
      ? 318
      : (document.querySelector(".left-panel")?.getBoundingClientRect().width ??
        318);
    setView((view) => ({ ...view, x: view.x + (hiddenUI ? -width : width) }));
    setHoverSidebar(null);
    setHiddenUI((value) => !value);
  }
  function signInCloud() {
    setCloudSigningIn(true);
    void loginCloud(
      cloudBase(import.meta.env.VITE_LOYOCLOUD_URL),
      cloudLogin.durationDays,
    )
      .then((session) => {
        if (!cloudLogin.accept(session))
          notify(
            "Browser storage is unavailable. Sign-in will not be remembered.",
          );
      })
      .catch((error) => notify(error.message))
      .finally(() => setCloudSigningIn(false));
  }
  function signOutCloud() {
    if (!cloudSession) return;
    void logoutCloud(cloudSession)
      .then(() => {
        if (cloudActive) disconnectBridge();
        setCloudActive(false);
        cloudLogin.forget();
      })
      .catch((error) => notify(error.message));
  }
  const title =
    modal === "export"
      ? "Export"
      : modal === "svg-report"
        ? "Editable SVG import"
        : modal === "branches"
          ? "Design branches"
          : modal === "versions"
            ? "Version history"
            : modal === "fig-report"
              ? "Figma import result"
              : modal === "settings"
                ? "Preferences"
                : modal === "share"
                  ? "Share this design"
                  : modal === "assets"
                    ? "Components & assets"
                    : modal === "files"
                      ? "Workspace"
                      : modal === "commands"
                        ? "Actions"
                        : modal === "ai"
                          ? "Create with Baize"
                          : modal === "bridge"
                            ? "Connect external AI"
                            : "Rename layer";
  return (
    <div
      className={`app ${hiddenUI ? "ui-hidden" : ""}`}
      onPointerMove={(e) => {
        if (!hiddenUI || drag.current) return;
        const target = e.target as Element;
        if (target.closest(".left-panel")) setHoverSidebar("left");
        else if (target.closest(".right-panel")) setHoverSidebar("right");
        else if (target.closest('[role="menu"], [popover], .modal-backdrop'))
          return;
        else if (e.clientX <= 10) setHoverSidebar("left");
        else if (e.clientX >= window.innerWidth - 10) setHoverSidebar("right");
        else setHoverSidebar(null);
      }}
      onPointerLeave={() => {
        if (hiddenUI && !menuAnchor && !document.querySelector(":popover-open"))
          setHoverSidebar(null);
      }}
    >
      <small className="release-version" title={`BaizeFig ${release.version}`}>
        <span>{release.displayVersion}</span>
        <a
          href={`${import.meta.env.BASE_URL}help/index.html`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("Help center")}
        </a>
      </small>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept=".baizefig,.json,.fig,.sketch,.pdf,.svg,.png,.jpg,.jpeg,.webp,.gif"
        onChange={(e) => void importFiles(e.target.files)}
      />
      {showPerformance && (
        <PerformanceMonitor
          doc={doc}
          history={history.current}
          onClose={() => setShowPerformance(false)}
        />
      )}
      {displayedSaveError && (
        <aside className="save-recovery" role="alert">
          <strong>{t("Your latest work is not saved")}</strong>
          <p>{t(displayedSaveError)}</p>
          <p>
            {t(
              "Keep this tab open until you save a backup or a separate copy.",
            )}
          </p>
          <div className="find-buttons">
            <button
              onClick={() => {
                if (cloudSaveError) requestSave();
                else void persistCurrent(doc);
              }}
            >
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
        <aside
          className="left-panel"
          aria-hidden={hiddenUI && hoverSidebar !== "left"}
          inert={hiddenUI && hoverSidebar !== "left"}
        >
          <div
            className={
              "file-panel-header" + (webEditor ? " web-file-header" : "")
            }
          >
            <div className="file-title-row">
              <button
                className="workspace-brand"
                aria-label={t("Main menu")}
                aria-haspopup="menu"
                aria-expanded={!!menuAnchor}
                onClick={(e) =>
                  setMenuAnchor(menuAnchor ? null : e.currentTarget)
                }
              >
                <img src="/baize.svg" alt="BaizeFig" />
              </button>

              <input
                readOnly={!exclusive.canEdit(doc.id)}
                className="document-title"
                aria-label={t("Document name")}
                value={doc.name}
                onChange={(e) => setDoc({ ...doc, name: e.target.value })}
              />
              {!webEditor && (
                <span
                  className="file-save-indicator"
                  title={t(saved)}
                  aria-label={t(saved)}
                  data-save-state={saved}
                  style={{
                    background:
                      saved === "Saved locally"
                        ? "#2d9f8f"
                        : saved === "Save failed"
                          ? "#d44"
                          : "#e6b343",
                  }}
                />
              )}
              <button
                className="tiny sidebar-toggle"
                aria-label={t(
                  hiddenUI ? "Expand sidebars" : "Collapse sidebars",
                )}
                title={
                  t(hiddenUI ? "Expand sidebars" : "Collapse sidebars") +
                  " · Tab"
                }
                onClick={togglePanels}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
            <div className="file-subtitle">
              {webEditor ? (
                <WebFileStatus
                  cloud={cloudBacked}
                  checking={
                    cloudBacked && (exclusive.checking || cloudLogin.restoring)
                  }
                  occupant={exclusive.occupant}
                  readOnly={
                    cloudBacked &&
                    !exclusive.canEdit(doc.id) &&
                    !exclusive.lease.current?.ending
                  }
                  modified={
                    cloudBacked
                      ? !cloudSaveState.saved ||
                        cloudSaveState.saving ||
                        !!cloudSaveError
                      : saved !== "Saved locally"
                  }
                  busy={
                    exclusive.busy ||
                    exclusive.checking ||
                    destinationBusy ||
                    cloudSaveState.saving
                  }
                  title={
                    cloudSaveError ||
                    (cloudBacked && !exclusive.canEdit(doc.id)
                      ? exclusive.status
                      : "") ||
                    (isCloudOffline()
                      ? "本机保存，待联网同步"
                      : cloudSaveState.draft
                        ? "云端草稿已同步；点击保存生成正式版本。每 15 分钟滚动存档，连续 2 小时未保存时自动保留历史。"
                        : exclusive.status)
                  }
                  draft={cloudSaveState.draft}
                  onEdit={() =>
                    void exclusive.begin().catch((e) => notify(e.message))
                  }
                  onSave={requestSave}
                  onFinish={() =>
                    void exclusive.end().catch((e) => notify(e.message))
                  }
                />
              ) : (
                <>
                  <span>{t("Drafts")}</span>
                  <span className="local-plan">{t("Local")}</span>
                  <span className="save-state">{t(saved)}</span>
                </>
              )}
            </div>
          </div>
          {!webEditor && isCloudBackedDocument(doc.id) && (
            <div className="exclusive-edit-controls" role="status">
              <span>{exclusive.status}</span>
              <button
                disabled={exclusive.busy}
                onClick={() =>
                  void (async () => {
                    try {
                      if (exclusive.editing) {
                        await exclusive.end();
                      } else await exclusive.begin();
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  })()
                }
              >
                {exclusive.lease.current?.ending
                  ? "正在保存并结束编辑"
                  : exclusive.editing
                    ? "保存并结束编辑"
                    : "开始编辑"}
              </button>
            </div>
          )}
          <div
            className="workspace-tabs"
            role="tablist"
            aria-label={t("Workspace tools")}
          >
            {(
              [
                ["file", "Layers"],
                ["assets", "Assets"],
                ["smart", "Smart"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={leftTab === id}
                className={leftTab === id ? "active" : ""}
                onClick={() => setLeftTab(id)}
              >
                {t(label)}
              </button>
            ))}
          </div>
          {leftTab === "smart" ? (
            <CloudPanel
              deployment={smartDeployment}
              onDeploymentChange={setSmartDeployment}
              status={bridgeStatus}
              session={cloudSession}
              serviceAddress={bridgeAddress}
              signingIn={cloudSigningIn || cloudLogin.restoring}
              restoring={cloudLogin.restoring}
              restoreError={cloudLogin.restoreError}
              onRetryRestore={cloudLogin.retryRestore}
              durationDays={cloudLogin.durationDays}
              onDurationChange={cloudLogin.setDurationDays}
              cloudActive={cloudActive}
              onSignIn={signInCloud}
              onSignOut={signOutCloud}
              onCloudConnect={() => {
                if (!cloudSession) return;
                if (Date.now() >= cloudSession.expiresAt) {
                  cloudLogin.forget();
                  notify("Cloud session expired. Please sign in again.");
                  return;
                }
                if (cloudActive) connectBridge(false, cloudSession);
                else setCloudActive(true);
              }}
              onCloudDisconnect={() => {
                setCloudActive(false);
                disconnectBridge();
              }}
              onCopy={(address) => {
                void navigator.clipboard
                  .writeText(address)
                  .then(() => notify("Copied"))
                  .catch(() =>
                    notify("Copy failed. Select and copy the displayed text."),
                  );
              }}
              onConnection={() => setModal("bridge")}
              onLocal={() => {
                disconnectBridge();
                setCloudActive(false);
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
                <button
                  className="pages-collapse"
                  aria-label={t("Pages")}
                  aria-expanded={pagesExpanded}
                  onClick={() => setPagesExpanded((v) => !v)}
                >
                  <ChevronDown
                    size={10}
                    style={{
                      transform: pagesExpanded ? undefined : "rotate(-90deg)",
                    }}
                  />
                  <span>{t("Pages")}</span>
                </button>
                <button
                  className="tiny"
                  aria-label={t("Add page")}
                  onClick={addPage}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="pages" hidden={!pagesExpanded}>
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
                        (e.target as Element).closest(".tiny,input")
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
                          d.target ? { id: d.target, after: !!d.after } : null,
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
                        !(e.target as Element).closest(".tiny,input")
                      ) {
                        setPage(p.id);
                        setSelected([]);
                      }
                    }}
                    onDoubleClick={(e) => {
                      if ((e.target as Element).closest(".tiny,input")) return;
                      e.stopPropagation();
                      setRenaming({
                        kind: "page",
                        id: p.id,
                        documentId: doc.id,
                      });
                    }}
                    draggable={false}
                  >
                    {renaming?.kind === "page" &&
                    renaming.id === p.id &&
                    renaming.documentId === doc.id ? (
                      <div className="page-title-edit">
                        <File size={12} />
                        <InlineNameInput
                          key={p.id}
                          name={p.name}
                          label={t("Page name")}
                          onCancel={() => setRenaming(null)}
                          onCommit={(name) => {
                            change({
                              ...doc,
                              pages: doc.pages.map((a) =>
                                a.id === p.id ? { ...a, name } : a,
                              ),
                            });
                            setRenaming(null);
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setPage(p.id);
                          setSelected([]);
                        }}
                      >
                        <span>
                          <File size={12} />
                        </span>
                        <span className="page-name">{p.name}</span>
                      </button>
                    )}
                    {p.id === page && (
                      <>
                        <button
                          className="tiny"
                          aria-label={t("Move page up")}
                          disabled={doc.pages.indexOf(p) === 0}
                          onClick={() => {
                            const pages = [...doc.pages],
                              i = pages.indexOf(p);
                            [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]];
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
                            [pages[i + 1], pages[i]] = [pages[i], pages[i + 1]];
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
                {doc.pages.find((p) => p.id === page)?.name}{" "}
                <span>{doc.nodes.filter((n) => n.pageId === page).length}</span>
                <button
                  className="tiny"
                  aria-label={t("Find and replace")}
                  onClick={() => setFindOpen((v) => !v)}
                >
                  <Search size={16} />
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
                onClick={() => openPreferences("keyboard")}
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
                  (n) =>
                    n.pageId === page &&
                    !n.parentId &&
                    n.type === "frame" &&
                    n.visible,
                )
                .map((n) => (
                  <text
                    key={n.id}
                    x={n.x}
                    y={n.y - 12 / view.zoom}
                    fontSize={11 / view.zoom}
                    fill={selected.includes(n.id) ? "#9747ff" : "#69716b"}
                    data-frame-label={n.id}
                    aria-label={`${t("Select frame")} ${n.name}`}
                    pointerEvents={
                      tool === "move" || tool === "scale"
                        ? "bounding-box"
                        : "none"
                    }
                    style={{ cursor: n.locked ? "default" : "move" }}
                    onPointerDown={(e) => {
                      setSelectionScope(null);
                      pointerDown(e, n.id);
                    }}
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
                      onCommit={(text, runs, paragraphs) => {
                        setEditingText(null);
                        if (!text && !node.text) {
                          run({ type: "delete", ids: [node.id] });
                          return;
                        }
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
                      stroke="#287F71"
                      strokeWidth={1 / view.zoom}
                      pointerEvents="none"
                    />
                  );
                })()}
              {selectionBox &&
                !editingText &&
                !editingVector &&
                !editingCrop &&
                (tool === "move" ||
                  tool === "hand" ||
                  tool === "scale" ||
                  (tool === "text" &&
                    first?.textFlow?.autoResize === "fixed")) && (
                  <SelectionOverlay
                    doc={doc}
                    nodes={chosen}
                    box={selectionBox}
                    zoom={view.zoom}
                    scaleMode={tool === "scale"}
                    textMode={tool === "text"}
                    onPointerDown={pointerDown}
                  />
                )}
              {tab === "prototype" && (
                <PrototypeConnections
                  doc={doc}
                  page={page}
                  selected={selected}
                  zoom={view.zoom}
                  point={point}
                  onSelect={(id) => setSelected([id])}
                  onConnect={(source, target) => {
                    run({
                      type: "update",
                      ids: [source.id],
                      patch: navigationPatch(source, target),
                    });
                    setPrototypeTrigger("click");
                  }}
                />
              )}
              {measure && (
                <MeasureOverlay a={measure.a} b={measure.b} zoom={view.zoom} />
              )}
              <SnapOverlay guides={snapGuides} zoom={view.zoom} />
              {marquee && (
                <rect
                  {...marquee}
                  fill="#9747ff22"
                  stroke="#9747ff"
                  strokeWidth={1 / view.zoom}
                  pointerEvents="none"
                />
              )}
            </g>
            {rulers && (
              <CanvasAids
                guides={doc.guides ?? []}
                selection={selectionBox ?? undefined}
                page={page}
                view={view}
                width={canvasSize.width}
                height={canvasSize.height}
                onChange={(guides) => change({ ...doc, guides })}
              />
            )}
            <CanvasFrame
              width={canvasSize.width}
              height={canvasSize.height}
              inset={rulers ? 22 : 0}
            />
          </svg>
          <div className="zoom-controls">
            <button
              title={t("Zoom out")}
              aria-label={t("Zoom out")}
              onClick={() => zoomTo((z) => z / 1.25)}
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
              onClick={() => zoomTo((z) => z * 1.25)}
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
          <ToolDock
            items={tools}
            active={effectiveTool}
            onImage={() => fileInput.current?.click()}
            onSelect={(id) => {
              pathDrawing.current?.finish();
              if (id !== "move" && id !== "hand") setEditingVector(null);
              setTool(id as Tool);
            }}
          >
            <PaletteDock doc={doc} selected={selected} onChange={change} />
          </ToolDock>
          <button
            className="help-fab"
            aria-label={t("Keyboard shortcuts and help")}
            onClick={() => openPreferences("keyboard")}
          >
            <HelpCircle size={21} />
          </button>
          <div className="canvas-bottom-note">
            {tool === "move"
              ? t("V to select · Space to pan · {modifier} + scroll to zoom", {
                  modifier: platform === "mac" ? "⌘" : "Ctrl",
                })
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
        <aside
          className="right-panel"
          aria-hidden={hiddenUI && hoverSidebar !== "right"}
          inert={hiddenUI && hoverSidebar !== "right"}
        >
          <div className="inspector-top">
            <button
              className="profile-button"
              aria-label={t("Workspace")}
              onClick={() => void openFiles()}
            >
              <span
                className="profile-avatar user-initial-avatar"
                aria-label={cloudSession?.user.username ?? t("Local")}
              >
                {cloudSession?.user.username ? (
                  Array.from(
                    cloudSession.user.username.trim(),
                  )[0]?.toUpperCase()
                ) : (
                  <UserRound size={15} />
                )}
              </span>
              <ChevronDown size={12} />
            </button>
            <div className="inspector-top-actions">
              <ZoomControl
                zoom={view.zoom}
                onZoom={zoomTo}
                onFit={() => fit()}
                onSelection={() => fit(true)}
                hasSelection={chosen.length > 0}
                fitShortcut={shortcutLabel("Zoom to fit", platform)}
                selectionShortcut={shortcutLabel("Zoom to selection", platform)}
              />
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
              className={tab === "inspect" ? "active" : ""}
              onClick={() => setTab("inspect")}
            >
              {t("Inspect")}
            </button>
          </div>
          <div
            className={`properties${editingVector ? " is-vector-editing" : ""}`}
          >
            <div id="vector-properties-slot" ref={setVectorPanel} />
            <FontNotice doc={doc} onReplace={() => openPreferences("fonts")} />
            {tool === "frame" ? (
              <FramePresetPanel
                value={frameSize}
                onChange={setFrameSize}
                onCreate={createPresetFrame}
              />
            ) : tab === "inspect" ? (
              <InspectPanel doc={doc} nodes={chosen} />
            ) : !first ? (
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
                    <span>{doc.background.toUpperCase().replace("#", "")}</span>
                    <span>100%</span>
                  </label>
                </section>
                {tab === "prototype" && prototypeDescription}
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
                            transition: e.target.value as "instant" | "animate",
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
                  {["frame", "component", "instance"].includes(first.type) && (
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
                {prototypeDescription}
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
                <section className="geometry-section">
                  <div className="alignment">
                    {(
                      ["union", "subtract", "intersect", "exclude"] as const
                    ).map((mode) => (
                      <button
                        key={mode}
                        title={t(
                          {
                            union: "Union",
                            subtract: "Subtract",
                            intersect: "Intersect",
                            exclude: "Exclude",
                          }[mode],
                        )}
                        aria-label={t(
                          {
                            union: "Union",
                            subtract: "Subtract",
                            intersect: "Intersect",
                            exclude: "Exclude",
                          }[mode],
                        )}
                        disabled={selected.length < 2}
                        onClick={() => {
                          try {
                            const result = combineShapes(doc, selected, mode);
                            change(result.doc, [result.id]);
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }}
                      >
                        <BooleanIcon operation={mode} />
                      </button>
                    ))}
                    <button
                      aria-label={t("Flatten")}
                      title={t("Flatten")}
                      onClick={() => vectorOperation("flatten")}
                    >
                      <Combine size={16} />
                    </button>
                    <InspectorPopover
                      key={first.id + "more"}
                      title={t("More actions")}
                      iconOnly
                    >
                      <div className="alignment-extra">
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
                            aria-label={t("Align {axis}", {
                              axis: t(a.axis),
                            })}
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
                      <div className="component-actions">
                        {" "}
                        <div className="section-heading">
                          <span>
                            {selected.length > 1
                              ? t("{count} selected", {
                                  count: selected.length,
                                })
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
                        ) : first.type !== "instance" &&
                          !first.componentOwner ? (
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
                                          (c) =>
                                            c.sourceId === first.componentId,
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
                                  change(
                                    resetComponentInstance(doc, first.id),
                                    [first.id],
                                  );
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
                                  const next = combineShapes(
                                    doc,
                                    selected,
                                    mode,
                                  );
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
                                  : ["tidy", "pack-x", "pack-y"].includes(
                                        c.mode,
                                      )
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
                                  <option value="columns">
                                    {t("Columns")}
                                  </option>
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
                                    frameGrid: {
                                      ...first.frameGrid!,
                                      margin,
                                    },
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
                    </InspectorPopover>
                  </div>
                  <LayerAppearance
                    node={first}
                    nodes={chosen}
                    onChange={patch}
                  />
                  <InspectorPopover
                    title={t("Geometry options")}
                    iconOnly
                    icon={<CircleDashed size={16} />}
                  >
                    <ConstraintsControl
                      doc={doc}
                      node={first}
                      onChange={patch}
                      disabled={instanceGeometryRestricted}
                    />
                    <div className="position-transforms">
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
                    </div>{" "}
                    <InspectorPopover
                      key={first.id + "corners"}
                      title={t("Independent corners")}
                      iconOnly
                    >
                      <div className="field-grid">
                        {(
                          [
                            "Top left",
                            "Top right",
                            "Bottom right",
                            "Bottom left",
                          ] as const
                        ).map((label, index) => (
                          <NumberField
                            key={label}
                            label={label}
                            aria={label}
                            min={0}
                            value={
                              first.fidelity?.corners?.[index] ?? first.radius
                            }
                            onChange={(value) => {
                              const corners: [number, number, number, number] =
                                [
                                  ...(first.fidelity?.corners ?? [
                                    first.radius,
                                    first.radius,
                                    first.radius,
                                    first.radius,
                                  ]),
                                ];
                              corners[index] = value;
                              patch({
                                fidelity: {
                                  ...(first.fidelity ?? {
                                    size: [first.width, first.height],
                                  }),
                                  corners,
                                },
                              });
                            }}
                          />
                        ))}
                      </div>
                    </InspectorPopover>{" "}
                  </InspectorPopover>
                  <ComponentProperties
                    key={first.id + "component"}
                    doc={doc}
                    node={first}
                    selected={selected}
                    onChange={change}
                    onSelect={setSelected}
                  />
                  <button
                    className="geometry-ratio tiny"
                    aria-label={t("Lock aspect ratio")}
                    aria-pressed={chosen.every((n) => !!n.constrainProportions)}
                    title={t("Lock aspect ratio")}
                    onClick={() =>
                      patch({
                        constrainProportions: !chosen.every(
                          (n) => !!n.constrainProportions,
                        ),
                      })
                    }
                  >
                    {chosen.every((n) => !!n.constrainProportions) ? (
                      <Lock size={16} />
                    ) : (
                      <Unlock size={16} />
                    )}
                  </button>
                  <div className="field-grid">
                    <NumberField
                      label="W"
                      disabled={
                        instanceGeometryRestricted && first.type === "text"
                      }
                      value={commonNumber(
                        chosen,
                        (n) =>
                          n.width *
                          Math.hypot(
                            ...(n.fidelity?.linear?.slice(0, 2) ?? [1, 0]),
                          ),
                      )}
                      min={1}
                      onChange={(v) => setVisualDimension("width", v)}
                    />
                    <NumberField
                      label="H"
                      disabled={
                        instanceGeometryRestricted && first.type === "text"
                      }
                      value={commonNumber(
                        chosen,
                        (n) =>
                          n.height *
                          Math.hypot(
                            ...(n.fidelity?.linear?.slice(2, 4) ?? [0, 1]),
                          ),
                      )}
                      min={1}
                      onChange={(v) => setVisualDimension("height", v)}
                    />
                  </div>

                  <div className="field-grid">
                    <NumberField
                      label="X"
                      disabled={instanceGeometryRestricted}
                      value={commonNumber(chosen, (n) => visualPosition(n).x)}
                      onChange={(v) => setVisualPosition("x", v)}
                    />
                    <NumberField
                      label="Y"
                      disabled={instanceGeometryRestricted}
                      value={commonNumber(chosen, (n) => visualPosition(n).y)}
                      onChange={(v) => setVisualPosition("y", v)}
                    />
                  </div>
                  <div className="field-grid">
                    <NumberField
                      label="↻"
                      icon={
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth=".8"
                        >
                          <path d="M3 4v9h9M3 8a5 5 0 0 1 5 5" />
                        </svg>
                      }
                      aria="Rotation"
                      value={commonNumber(chosen, nodeRotation)}
                      onChange={(v) => {
                        try {
                          change(setSelectionRotation(doc, selected, v));
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }}
                    />

                    {![
                      "text",
                      "ellipse",
                      "line",
                      "path",
                      "star",
                      "polygon",
                    ].includes(first.type) && (
                      <>
                        <NumberField
                          label="⌜"
                          icon={
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth=".8"
                            >
                              <path
                                d="M3 12V8a5 5 0 0 1 5-5h4"
                                strokeDasharray="4 2"
                              />
                            </svg>
                          }
                          aria="Corner radius"
                          value={commonNumber(chosen, (n) => n.radius)}
                          min={0}
                          onChange={(v) => patch({ radius: v })}
                        />
                      </>
                    )}
                  </div>
                </section>
                <section className="inspector-dimensions">
                  <div className="section-heading">{t("Layout")}</div>
                  {container(first) && (
                    <div className="auto-layout-controls">
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
                    </div>
                  )}
                  <details className="layout-options">
                    <summary>{t("Layout options")}</summary>
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
                  </details>
                  {container(first) && (
                    <label className="clip-control">
                      <input
                        type="checkbox"
                        aria-label={t("Clip content")}
                        checked={
                          first.fidelity?.clipsContent ?? first.type === "frame"
                        }
                        onChange={(e) =>
                          patch({
                            fidelity: {
                              ...(first.fidelity ?? {
                                size: [first.width, first.height],
                              }),
                              clipsContent: e.target.checked,
                            },
                          })
                        }
                      />
                      {t("Clip content")}
                    </label>
                  )}
                </section>
                {chosen.length === 1 && first.type === "text" && (
                  <section className="typography-section">
                    <div className="section-heading typography-heading">
                      {t("Text")}
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
                    <InspectorPopover title={t("Text formatting")} iconOnly>
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
                    </InspectorPopover>
                    <FontFamilySelect
                      doc={doc}
                      value={first.fontFamily}
                      onChange={(fontFamily) => patch({ fontFamily })}
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
                      <NumberField
                        label="Letter spacing"
                        value={
                          first.textFlow?.letterSpacing ??
                          first.fidelity?.text?.letterSpacing ??
                          0
                        }
                        step={0.1}
                        onChange={(value) =>
                          patch({
                            textFlow: {
                              ...(first.textFlow ?? {
                                autoResize: "fixed",
                                verticalAlign: "top",
                                letterSpacing: 0,
                                runs: first.fidelity?.text?.spans,
                              }),
                              letterSpacing: value,
                            },
                          })
                        }
                      />
                    </div>
                    <TextProperties
                      key={first.id + "text-properties"}
                      node={first}
                      doc={doc}
                      onReplaceFonts={change}
                      onChange={patch}
                      onCase={(mode) => {
                        try {
                          change(changeDocumentTextCase(doc, selected, mode));
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }}
                    />
                  </section>
                )}

                {chosen.length === 1 && first.image && (
                  <ImageProperties
                    node={first}
                    onChange={patch}
                    onCrop={() => {
                      setEditingText(null);
                      setEditingVector(null);
                      setEditingCrop({ id: first.id });
                    }}
                  />
                )}
                {chosen.length > 1 ? (
                  <MultiSelectionProperties
                    palette={[
                      ...new Set(
                        doc.nodes
                          .map((n) => n.fill)
                          .filter((color) => color !== "none"),
                      ),
                    ].map((color) => ({ name: color.toUpperCase(), color }))}
                    nodes={chosen}
                    onChange={patch}
                    onGesture={onStyleGesture}
                  />
                ) : (
                  <>
                    <FillProperties
                      palette={[
                        ...new Set(
                          doc.nodes
                            .map((n) => n.fill)
                            .filter((color) => color !== "none"),
                        ),
                      ].map((color) => ({
                        name: color.toUpperCase(),
                        color,
                      }))}
                      key={first.id + "fills"}
                      onGesture={onStyleGesture}
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
                    <section className="stroke-properties">
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
                          <StrokePaintRow
                            node={first}
                            onChange={patch}
                            onGesture={onStyleGesture}
                          />
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
                    {(container(first) || selected.length > 1) && (
                      <SelectionColors
                        selectedIds={selected}
                        doc={doc}
                        node={first}
                        onChange={change}
                        onError={notify}
                      />
                    )}
                    <EffectsProperties
                      key={first.id + "shadow"}
                      node={first}
                      group="shadow"
                      onGesture={onStyleGesture}
                      onChange={patch}
                    />
                    <EffectsProperties
                      key={first.id + "blur"}
                      node={first}
                      group="blur"
                      onGesture={onStyleGesture}
                      onChange={patch}
                    />
                  </>
                )}
              </>
            )}
            <section className="export-section">
              <details>
                <summary>
                  {t("Export")}
                  <Plus size={14} />
                </summary>
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
              </details>
            </section>
          </div>
          <div className="right-footer">
            <span className="green-dot" />
            {t("All changes stay on your device.")}
          </div>
        </aside>
        {hiddenUI && (
          <>
            <button
              className="sidebar-edge sidebar-edge-left"
              aria-label={t("Expand sidebars")}
              title={t("Expand sidebars") + " · Tab"}
              onClick={togglePanels}
              onPointerEnter={() => setHoverSidebar("left")}
              onFocus={() => setHoverSidebar("left")}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="sidebar-edge sidebar-edge-right"
              aria-label={t("Expand sidebars")}
              title={t("Expand sidebars") + " · Tab"}
              onClick={togglePanels}
              onPointerEnter={() => setHoverSidebar("right")}
              onFocus={() => setHoverSidebar("right")}
            >
              <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
          </>
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
            ]
              .filter(
                (name) => !(hideCreateComponent && name === "Create component"),
              )
              .map(actionItem),
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
            ]
              .filter(
                (name) => !(hideCreateComponent && name === "Create component"),
              )
              .map(actionItem),
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
      {savePrompt && cloudSession && (
        <SaveDestinationDialog
          initialFolderId={
            readCloudBinding(cloudSession, doc.id)?.folderId || null
          }
          initialWhere={savePrompt}
          session={cloudSession}
          busy={destinationBusy}
          error={destinationError}
          onCancel={() => {
            if (!destinationBusy) setSavePrompt(null);
          }}
          onSave={(where, makeDefault, folderId) =>
            void saveToDestination(where, makeDefault, folderId)
          }
        />
      )}
      {modal && (
        <div
          className={`modal-backdrop ${modal === "files" ? "workspace-fullscreen" : ""}`}
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
                {modal !== "files" && (
                  <span className="eyebrow">BAIZEFIG / 白泽</span>
                )}
                <h2>{modal === "files" ? "工作区" : t(title)}</h2>
              </div>
              <button
                className="icon-button"
                aria-label={t("Close dialog")}
                onClick={() => setModal(null)}
              >
                <X size={19} />
              </button>
            </div>
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
            {modal === "versions" &&
              (webEditor && cloudBacked ? (
                cloudSession ? (
                  <CloudVersionHistory
                    session={cloudSession}
                    documentId={doc.id}
                  />
                ) : (
                  <p>{t("Sign in to LoyoCloud")}</p>
                )
              ) : (
                <VersionHistory
                  doc={doc}
                  onRestore={(next) => {
                    change(next, []);
                    setPage(next.pages[0].id);
                  }}
                />
              ))}
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
              <PreferencesLayout
                active={settingsSection}
                onChange={setSettingsSection}
                onClose={() => setModal(null)}
                sections={[
                  {
                    id: "general",
                    title: "General",
                    description: "Choose where your design files are saved.",
                    keywords:
                      "保存 默认 本地 云端 文件 save default local cloud",
                    content: (
                      <>
                        <label className="setting-row">
                          {t("Default save location")}
                          <select
                            aria-label={t("Default save location")}
                            value={saveDestination}
                            onChange={(e) =>
                              configureSaveDestination(
                                e.target.value as SaveDestination,
                              )
                            }
                          >
                            <option value="ask">{t("Ask every time")}</option>
                            <option value="local">{t("Local")}</option>
                            <option value="cloud">{t("Cloud")}</option>
                          </select>
                        </label>
                        <p className="muted">
                          {t(
                            "Choose a folder for the first cloud save. Later saves replace the current cloud version; local saves download a file.",
                          )}
                        </p>
                      </>
                    ),
                  },
                  {
                    id: "appearance",
                    title: "Appearance",
                    description: "Set the theme and interface language.",
                    keywords:
                      "主题 外观 语言 深色 浅色 theme language dark light",
                    content: (
                      <>
                        <label className="setting-row">
                          {t("Theme")}
                          <select
                            aria-label={t("Theme")}
                            value={theme}
                            onChange={(e) =>
                              setTheme(
                                e.target.value as "light" | "dark" | "system",
                              )
                            }
                          >
                            <option value="light">{t("Light")}</option>
                            <option value="dark">{t("Dark")}</option>
                            <option value="system">{t("Follow system")}</option>
                          </select>
                        </label>
                        <div className="setting-row">
                          <label htmlFor="interface-language">
                            {t("Interface language")}
                          </label>
                          <select
                            id="interface-language"
                            value={language}
                            onChange={(e) =>
                              setLanguage(e.target.value as Language)
                            }
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
                      </>
                    ),
                  },
                  {
                    id: "canvas",
                    title: "Canvas aids",
                    description:
                      "Manage grids, rulers and guides for this document.",
                    keywords:
                      "画布 标尺 网格 参考线 间距 canvas grid guides rulers spacing",
                    content: (
                      <>
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
                                  {
                                    id: id(),
                                    pageId: page,
                                    axis: "x",
                                    position: 0,
                                  },
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
                                  {
                                    id: id(),
                                    pageId: page,
                                    axis: "y",
                                    position: 0,
                                  },
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
                                    guides: doc.guides!.filter(
                                      (a) => a.id !== g.id,
                                    ),
                                  })
                                }
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                      </>
                    ),
                  },
                  {
                    id: "snapping",
                    title: "Snapping",
                    description: "Control how layers snap while moving.",
                    keywords: "吸附 对象 几何 像素 snap objects geometry pixel",
                    content: (
                      <>
                        {(["objects", "geometry", "pixel"] as const).map(
                          (key) => (
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
                          ),
                        )}
                        <p className="muted">
                          {t(
                            "Hold {modifier} while dragging to temporarily disable snapping.",
                            { modifier: platform === "mac" ? "⌘" : "Ctrl" },
                          )}
                        </p>
                        {snapSaveError && (
                          <p role="alert">
                            {t(
                              "Snapping preferences apply for this session only.",
                            )}
                          </p>
                        )}
                      </>
                    ),
                  },
                  {
                    id: "keyboard",
                    title: "Keyboard shortcuts",
                    description:
                      "Choose your keyboard layout and look up shortcuts.",
                    keywords: "键盘 布局 快捷键 keyboard shortcuts layout",
                    content: (
                      <>
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
                            <option value="character">
                              {t("Typed characters")}
                            </option>
                          </select>
                        </label>
                        {keyboardError && (
                          <p role="alert">
                            {t(
                              "Keyboard preference applies for this session only.",
                            )}
                          </p>
                        )}

                        <p className="muted">
                          {t("Shortcuts use {modifier} on this device.", {
                            modifier: platform === "mac" ? "⌘" : "Ctrl",
                          })}
                        </p>
                        <div className="shortcut-list">
                          {shortcutRegistry.map(({ name }) => (
                            <div key={name}>
                              <span className="shortcut-group">
                                {t("Shortcut")}
                              </span>
                              <span>{t(name)}</span>
                              <kbd>{shortcutLabel(name, platform)}</kbd>
                            </div>
                          ))}
                        </div>
                      </>
                    ),
                  },
                  {
                    id: "fonts",
                    title: "Fonts",
                    description:
                      "Check available fonts and replace missing fonts.",
                    keywords: "字体 管理 缺失 替换 fonts missing replace",
                    content: (
                      <>
                        <FontManager
                          doc={doc}
                          onReplace={(next) => {
                            if (JSON.stringify(next) !== JSON.stringify(doc))
                              change(next);
                          }}
                        />
                      </>
                    ),
                  },
                ]}
              />
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
                        "Select layers and create a component with {shortcut}.",
                        {
                          shortcut: shortcutLabel("Create component", platform),
                        },
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
            {modal === "commands" && (
              <CommandPalette
                actions={actions}
                query={query}
                onQueryChange={setQuery}
                onClose={() => setModal(null)}
              />
            )}
            {modal === "files" && (
              <>
                {workspaceTab === "cloud" && (
                  <div className="personal-workspace-account">
                    {cloudSession ? (
                      <>
                        <span>{t("Signed in")}</span>
                        <strong>{cloudSession.user.username}</strong>
                        <a
                          href={cloudSession.base + "/console"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("Console")}
                        </a>
                        <button onClick={signOutCloud}>{t("Sign out")}</button>
                      </>
                    ) : (
                      <button onClick={signInCloud}>
                        {t("Sign in to LoyoCloud")}
                      </button>
                    )}
                  </div>
                )}
                <div
                  className="workspace-switcher"
                  role="tablist"
                  aria-label={t("Workspace")}
                >
                  {(["local", "cloud"] as const).map((value) => (
                    <button
                      key={value}
                      role="tab"
                      aria-selected={workspaceTab === value}
                      onClick={() => setWorkspaceTab(value)}
                    >
                      {value === "local" ? "本地" : "云"}
                    </button>
                  ))}
                </div>
                {workspaceTab === "cloud" ? (
                  <CloudWorkspace
                    document={doc}
                    onOpen={async (next) => {
                      if (!(await save(current.current.doc)))
                        throw Error("Unable to save the current file");
                      validateDocument(next);
                      if (!(await save(next)))
                        throw Error("Unable to save the cloud file locally");
                      if (
                        !window.baizefigDesktop &&
                        cloudSession &&
                        !isRecoveredDocument(next)
                      )
                        markCloudSnapshotSaved(
                          cloudSession,
                          removeDesignTokens(next),
                        );
                      committedDocument.current = next;
                      current.current.doc = next;
                      history.current = new History();
                      setDoc(next, true);
                      setPage(next.pages[0].id);
                      setSelected([]);
                      setCollapsed(new Set());
                      setModal(null);
                    }}
                    session={cloudSession}
                    signingIn={cloudSigningIn || cloudLogin.restoring}
                    restoring={cloudLogin.restoring}
                    restoreError={cloudLogin.restoreError}
                    onRetryRestore={cloudLogin.retryRestore}
                    durationDays={cloudLogin.durationDays}
                    onDurationChange={cloudLogin.setDurationDays}
                    onSignIn={signInCloud}
                    onSignOut={signOutCloud}
                  />
                ) : (
                  <>
                    <LocalFiles
                      actions={
                        <>
                          <button
                            className="primary"
                            onClick={newDoc}
                            title={shortcutLabel("New design file", platform)}
                            aria-keyshortcuts="Control+Alt+N"
                          >
                            <FilePlus2 size={16} />
                            {t("New design file")}
                          </button>
                          <button onClick={() => fileInput.current?.click()}>
                            <Upload size={16} />
                            {t("Import")}
                          </button>
                        </>
                      }
                      onDelete={deleteLocalFile}
                      onOpen={(d) => {
                        return save(doc)
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
                    />
                  </>
                )}
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
                onDesktopConnect={
                  window.baizefigDesktop
                    ? async () => {
                        try {
                          const local = await window.baizefigDesktop!.status();
                          if (!local.running) {
                            await window.baizefigDesktop!.manage();
                            notify(
                              "Install and start local MCP in desktop settings first.",
                            );
                            return;
                          }
                          setBridgeRemote(false);
                          setBridgeAddress(local.endpoint);
                          setBridgeToken(local.pairingToken);
                          connectBridge(false, undefined, {
                            address: bridgeWebSocketUrl(local.endpoint),
                            token: local.pairingToken,
                            automatic: false,
                          });
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }
                    : undefined
                }
                onDisconnect={() => disconnectBridge()}
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
