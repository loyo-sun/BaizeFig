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
import { save, loadLast, listDocuments, download } from "./storage";
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
const icons: Partial<Record<Kind, typeof Square>> = {
  frame: Frame,
  rectangle: Square,
  ellipse: Circle,
  text: Type,
  group: Layers,
  component: Component,
  instance: Component,
  path: PenTool,
  line: Minus,
  star: Star,
  polygon: Triangle,
};
const clone = <T,>(value: T): T => structuredClone(value);
export default function App() {
  const { language, setLanguage, persistenceError, t } = useI18n();
  const [doc, setDoc] = useState<Document>(() => demoDocument());
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(doc.pages[0].id),
    [selected, setSelected] = useState<string[]>([]),
    [tool, setTool] = useState<Tool>("move");
  const [view, setView] = useState({ x: 100, y: 70, zoom: 0.75 }),
    [modal, setModal] = useState<Modal>(null),
    [tab, setTab] = useState<"design" | "prototype">("design");
  const [toast, setToast] = useState(""),
    [saved, setSaved] = useState("Loading…"),
    [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [outline, setOutline] = useState(false),
    [grid, setGrid] = useState(false),
    [hiddenUI, setHiddenUI] = useState(false);
  const [zoomMenu, setZoomMenu] = useState(false),
    [layerFilter, setLayerFilter] = useState(""),
    [showLayerSearch, setShowLayerSearch] = useState(false);
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
  useEffect(() => {
    socket.current?.close();
    setBridgeWrite(false);
    setCollapsed(
      new Set(doc.nodes.filter((n) => container(n)).map((n) => n.id)),
    );
  }, [doc.id]);
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
  } | null>(null);
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
          .then(() => setSaved("Saved locally"))
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
  const patch = (patch: Partial<Node>) =>
    run({ type: "update", ids: selected, patch });
  const openFiles = async () => {
    setDocuments(await listDocuments());
    setModal("files");
  };
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
  function parentFor(p: { x: number; y: number }) {
    return [...doc.nodes].reverse().find(
      (n) =>
        n.pageId === page &&
        n.type === "frame" &&
        n.visible &&
        !n.locked &&
        (() => {
          const a = absolute(doc, n);
          return (
            p.x >= a.x &&
            p.x <= a.x + n.width &&
            p.y >= a.y &&
            p.y <= a.y + n.height
          );
        })(),
    );
  }
  function pointerDown(e: RPointer, id?: string, handle?: string) {
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
      return;
    }
    if (handle && id) {
      drag.current = { ...base, type: "resize", ids: [id], nodeId: id, handle };
      return;
    }
    if (tool !== "move") {
      const kind: Kind = tool === "pen" || tool === "pencil" ? "path" : tool;
      const parent = kind === "frame" ? undefined : parentFor(p);
      const origin = parent ? absolute(doc, parent) : { x: 0, y: 0 };
      const n = makeNode(kind, page, {
        x: p.x - origin.x,
        y: p.y - origin.y,
        parentId: parent?.id ?? null,
        width: tool === "text" ? 240 : 0,
        height: tool === "text" ? 36 : 0,
        fill:
          kind === "path" || kind === "line"
            ? "none"
            : kind === "frame"
              ? "#ffffff"
              : kind === "text"
                ? "#202a24"
                : "#c5c8d0",
        ...(kind === "path" ? { points: [{ x: 0, y: 0 }] } : {}),
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
        if (selectedParent) n = selectedParent;
        else if (!selected.includes(n.id)) {
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
      drag.current = { ...base, type: "move", ids };
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
    const p = point(e),
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
      // Alt-drag uses the duplicate's initial positions, while retaining the pre-drag undo state.
      setDoc((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (
            !d.ids.includes(n.id) ||
            roots(prev, d.ids).every((r) => r.id !== n.id)
          )
            return n;
          const source = d.before.nodes.find((a) => a.id === n.id);
          const initial = source ?? prev.nodes.find((a) => a.id === n.id)!;
          if (!source) {
            const last = (d as typeof d & { last?: { x: number; y: number } })
              .last ?? { x: 0, y: 0 };
            return { ...n, x: n.x + dx - last.x, y: n.y + dy - last.y };
          }
          let x = initial.x + dx,
            y = initial.y + dy;
          if (e.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) y = initial.y;
            else x = initial.x;
          }
          return { ...n, x: Math.round(x), y: Math.round(y) };
        }),
      }));
      (d as typeof d & { last?: { x: number; y: number } }).last = {
        x: dx,
        y: dy,
      };
      return;
    }
    if (d.type === "resize") {
      const n = d.before.nodes.find((n) => n.id === d.nodeId)!;
      let x = n.x,
        y = n.y,
        w = n.width,
        h = n.height;
      const handle = d.handle!;
      if (handle.includes("e")) w = Math.max(1, n.width + dx);
      if (handle.includes("s")) h = Math.max(1, n.height + dy);
      if (handle.includes("w")) {
        w = Math.max(1, n.width - dx);
        x = n.x + n.width - w;
      }
      if (handle.includes("n")) {
        h = Math.max(1, n.height - dy);
        y = n.y + n.height - h;
      }
      if (e.shiftKey) {
        const ratio = n.width / Math.max(1, n.height);
        h = w / ratio;
      }
      setDoc((prev) => ({
        ...prev,
        nodes: prev.nodes.map((a) =>
          a.id === n.id ? { ...a, x, y, width: w, height: h } : a,
        ),
      }));
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
          const o = parent ? absolute(prev, parent) : { x: 0, y: 0 };
          if (n.type === "path") {
            const pts = [
              ...(n.points ?? []),
              { x: p.x - d.start.x, y: p.y - d.start.y },
            ];
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
          let w = Math.abs(dx),
            h = Math.abs(dy);
          if (e.shiftKey) {
            const side = Math.max(w, h);
            w = side;
            h = side;
          }
          return {
            ...n,
            x: (dx < 0 ? d.start.x - w : d.start.x) - o.x,
            y: (dy < 0 ? d.start.y - h : d.start.y) - o.y,
            width: Math.max(1, w),
            height: Math.max(1, h),
          };
        }),
      }));
    }
  }
  function pointerUp() {
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
            const p = absolute(doc, n);
            return (
              p.x >= marquee.x &&
              p.y >= marquee.y &&
              p.x + n.width <= marquee.x + marquee.width &&
              p.y + n.height <= marquee.y + marquee.height
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
    if (JSON.stringify(next) !== JSON.stringify(d.before)) {
      history.current.push(d.before);
      setDoc(next);
    }
  }
  function cancelDrag() {
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
          ? { ...clone(n), ...absolute(doc, n), parentId: null }
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
    if (!files?.length) return;
    let next = doc;
    const selection: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024)
          throw Error("Files must be smaller than 50 MB");
        if (/\.(baizefig|json)$/i.test(file.name)) {
          const parsed = JSON.parse(await file.text());
          validateDocument(parsed);
          await save(doc);
          history.current = new History();
          setDoc(parsed);
          setPage(parsed.pages[0].id);
          setSelected([]);
          notify("Document imported");
          return;
        }
        if (/\.(fig|sketch|pdf)$/i.test(file.name))
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
    const result = execute(doc, { type: "duplicate", ids: [n.id], offset: 40 });
    const selectedId = result.selection![0];
    const next = {
      ...result.doc,
      nodes: result.doc.nodes.map((a) =>
        a.id === selectedId
          ? {
              ...a,
              type: "instance" as const,
              componentId: n.id,
              name: t("{name} instance", { name: n.name }),
            }
          : a,
      ),
    };
    change(next, [selectedId]);
  }
  const actions = [
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
    { name: "Add auto layout", key: "⇧ A", run: () => autoLayout() },
    { name: "Zoom to fit", key: "⇧ 1", run: () => fit() },
    { name: "Zoom to selection", key: "⇧ 2", run: () => fit(true) },
    { name: "AI design engine", key: "", run: () => setModal("ai") },
    { name: "MCP connection", key: "", run: () => setModal("bridge") },
    { name: "Keyboard shortcuts", key: "?", run: () => setModal("shortcuts") },
  ];
  useEffect(() => {
    function down(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
        el.isContentEditable
      )
        return;
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
      if (mapping[k] && !mod) setTool(mapping[k]);
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") space.current = false;
    };
    const blur = () => {
      space.current = false;
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
        const Icon = icons[n.type] ?? Square;
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
              <Icon
                size={14}
                className={
                  n.type === "component" || n.type === "instance"
                    ? "purple"
                    : ""
                }
              />
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
    modal === "settings"
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
                      : first?.type === "text"
                        ? "Edit text"
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
            <button className="rail-item" onClick={() => setModal("ai")}>
              <span>
                <Sparkles size={19} />
              </span>
              {t("Agents")}
            </button>
            <button className="rail-item" onClick={() => setModal("assets")}>
              <span>
                <Plus size={19} />
              </span>
              {t("Assets")}
            </button>
            <button
              className="rail-item"
              onClick={() => {
                setQuery("");
                setModal("commands");
              }}
            >
              <span>
                <BriefcaseBusiness size={19} />
              </span>
              {t("Tools")}
            </button>
            <span className="rail-separator" />
            <button className="rail-item" onClick={() => setModal("variables")}>
              <span>
                <Hexagon size={19} />
              </span>
              {t("Variables")}
            </button>
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
          className={`canvas-wrap tool-${tool}`}
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
              const el = (e.target as Element).closest("[data-node-id]");
              if (!el) return;
              const n = doc.nodes.find(
                (n) => n.id === el.getAttribute("data-node-id"),
              );
              if (n?.type === "text") {
                setSelected([n.id]);
                setTextValue(n.text);
                setModal("text");
              } else if (n) {
                setSelected([n.id]);
              }
            }}
            style={{ background: doc.background }}
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
              />
              {selectionBox && (
                <g className="selection-overlay">
                  <rect
                    x={selectionBox.x}
                    y={selectionBox.y}
                    width={selectionBox.width}
                    height={selectionBox.height}
                    fill="none"
                    stroke={first?.type === "component" ? "#9b65ef" : "#2487ff"}
                    strokeWidth={1 / view.zoom}
                    pointerEvents="none"
                  />
                  {chosen.length === 1 &&
                    !first.locked &&
                    !first.rotation &&
                    ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => {
                      const x =
                          selectionBox.x +
                          (h.includes("e")
                            ? selectionBox.width
                            : h.includes("w")
                              ? 0
                              : selectionBox.width / 2),
                        y =
                          selectionBox.y +
                          (h.includes("s")
                            ? selectionBox.height
                            : h.includes("n")
                              ? 0
                              : selectionBox.height / 2);
                      return (
                        <rect
                          key={h}
                          aria-label={t("Resize {direction}", { direction: h })}
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
                        selectionBox.x + selectionBox.width / 2 - 40 / view.zoom
                      }
                      y={selectionBox.y + selectionBox.height + 10 / view.zoom}
                      width={80 / view.zoom}
                      height={20 / view.zoom}
                      rx={4 / view.zoom}
                      fill="#2487ff"
                    />
                    <text
                      x={selectionBox.x + selectionBox.width / 2}
                      y={selectionBox.y + selectionBox.height + 24 / view.zoom}
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
                className={tool === item.id ? "active" : ""}
                aria-label={t(item.label)}
                title={`${t(item.label)}${item.key ? " · " + item.key : ""}`}
                onClick={() => setTool(item.id)}
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
              : t("{tool} · Click and drag to draw · Shift to constrain", {
                  tool: t(tools.find((item) => item.id === tool)?.label ?? ""),
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
                    <p className="muted">{t("On click → Navigate to frame")}</p>
                    <select
                      aria-label={t("Prototype destination")}
                      value={first.targetId ?? ""}
                      onChange={(e) =>
                        patch({ targetId: e.target.value || undefined })
                      }
                    >
                      <option value="">{t("None")}</option>
                      {doc.nodes
                        .filter((n) => n.type === "frame" && n.pageId === page)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                    </select>
                    <button className="primary full" onClick={presentStart}>
                      <Play size={14} />
                      {t("Present prototype")}
                    </button>
                  </section>
                  <section>
                    <p className="muted">
                      {t(
                        "This version supports click navigation. Advanced triggers, transitions and smart animation are tracked in the feature matrix.",
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
                        {(["none", "horizontal", "vertical"] as const).map(
                          (d) => (
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
                                    : "↓ Vertical",
                              )}
                            </button>
                          ),
                        )}
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
                      <textarea
                        className="text-content"
                        aria-label={t("Text content")}
                        key={first.id + first.text}
                        defaultValue={first.text}
                        onBlur={(e) => {
                          if (e.target.value !== first.text)
                            patch({ text: e.target.value });
                        }}
                      />
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
                      <p className="muted">
                        {t(
                          "Instance is a snapshot copy in v0.1. Live overrides are planned.",
                        )}
                      </p>
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
                <div className="variables-list">
                  {(doc.variables ?? []).map((v) => (
                    <div className="variable-row" key={v.id}>
                      <input
                        type="color"
                        aria-label={t("Color {name}", { name: v.name })}
                        value={v.value}
                        onChange={(e) =>
                          change({
                            ...doc,
                            variables: doc.variables?.map((a) =>
                              a.id === v.id
                                ? { ...a, value: e.target.value }
                                : a,
                            ),
                            nodes: doc.nodes.map((n) =>
                              n.variableId === v.id
                                ? { ...n, fill: e.target.value }
                                : n,
                            ),
                          })
                        }
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
                        onClick={() =>
                          change({
                            ...doc,
                            variables: doc.variables?.filter(
                              (a) => a.id !== v.id,
                            ),
                            nodes: doc.nodes.map((n) =>
                              n.variableId === v.id
                                ? { ...n, variableId: undefined }
                                : n,
                            ),
                          })
                        }
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
                    "Single collection, single mode. Number, string, boolean variables, aliases and modes are not yet available.",
                  )}
                </p>
              </>
            )}
            {modal === "assets" && (
              <>
                <p className="muted">
                  {t(
                    "Components in this file. Instances are snapshot copies in v0.1.",
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
                  <button onClick={() => fileInput.current?.click()}>
                    <Upload size={16} />
                    {t("Import")}
                  </button>
                </div>
                <div className="file-grid">
                  {documents.map((d) => (
                    <button
                      className="file-card"
                      key={d.id}
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
                      <div className="file-preview">
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
                  ))}
                </div>
              </>
            )}
            {modal === "text" && (
              <>
                <textarea
                  autoFocus
                  aria-label={t(
                    first?.type === "text" ? "Edit text" : "Rename layer",
                  )}
                  className="edit-text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                />
                <button
                  className="primary"
                  onClick={() => {
                    patch(
                      first?.type === "text"
                        ? { text: textValue }
                        : { name: textValue },
                    );
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
      {present &&
        (() => {
          const n = doc.nodes.find((n) => n.id === present);
          if (!n) return null;
          return (
            <div className="presentation">
              <div className="presentation-bar">
                <span>
                  BaizeFig <span>/ {n.name}</span>
                </span>
                <button onClick={() => setPresent(null)}>
                  <X size={18} />
                  {t("Close preview")}
                </button>
              </div>
              <svg
                aria-label={t("Prototype preview")}
                viewBox={`0 0 ${n.width} ${n.height}`}
                onClick={(e) => {
                  const el = (e.target as Element).closest("[data-node-id]");
                  const node = doc.nodes.find(
                    (a) => a.id === el?.getAttribute("data-node-id"),
                  );
                  if (node?.targetId) setPresent(node.targetId);
                }}
              >
                <Scene
                  doc={{
                    ...doc,
                    nodes: doc.nodes.map((a) =>
                      a.id === n.id ? { ...a, x: 0, y: 0 } : a,
                    ),
                  }}
                  pageId={page}
                  rootId={n.id}
                />
              </svg>
              <p>{t("Click linked elements to navigate · Esc to close")}</p>
            </div>
          );
        })()}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
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
