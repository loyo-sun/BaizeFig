import {
  MoreVertical,
  ChevronDown,
  ChevronRight,
  UserRound,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { download } from "./storage";
import { CloudVersions, type CloudVersion } from "./CloudVersions";
import { webPrompt, webConfirm, webAlert } from "./WebDialogs";
import { FileDetails, MoveFileDialog, folderPath } from "./FileDetails";
import { useI18n } from "./LanguageContext";
import { rememberCloudBinding } from "./saveDestination";
import { CloudThumbnail } from "./CloudThumbnail";
import {
  LayoutGrid,
  List,
  Folder,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CloudSession } from "./cloud";
import { type Document, validateDocument } from "./core";
type File = {
  id: string;
  name: string;
  folder_id: string | null;
  head_id: string | null;
  owner?: string;
  updated_at: string;
  created_at?: string;
  deleted_at?: string;
  size_bytes?: number;
};
type Folder = {
  owner?: string;
  id: string;
  name: string;
  parent_id: string | null;
  created_at?: string;
  updated_at?: string;
  size_bytes?: number;
  deleted_at?: string;
};
export function CloudFiles({
  session,
  document,
  onOpen,
}: {
  session: CloudSession;
  document: Document;
  onOpen: (doc: Document) => Promise<void>;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"grid" | "list">(() => {
    try {
      return localStorage.getItem("baizefig.cloud.view") === "list"
        ? "list"
        : "grid";
    } catch {
      return "grid";
    }
  });
  const [selectedTab, setSelectedTab] = useState<"basic" | "versions">("basic");
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: { label: string; run: () => void }[];
  } | null>(null);
  const [sort, setSort] = useState<{
    key: "name" | "owner" | "updated_at" | "size_bytes";
    direction: number;
  }>({ key: "name", direction: 1 });
  const [picked, setPicked] = useState<string | null>(null);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [folderDetails, setFolderDetails] = useState<Folder | null>(null);
  const [folderMoving, setFolderMoving] = useState<Folder | null>(null);
  const [trash, setTrash] = useState(false);
  const [moving, setMoving] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const changeView = (next: "grid" | "list") => {
    setView(next);
    try {
      localStorage.setItem("baizefig.cloud.view", next);
    } catch {}
  };
  const pathKey = "baizefig.cloud.path." + session.base + "." + session.user.id;
  const rememberedPath = () => {
    try {
      return localStorage.getItem(pathKey) || null;
    } catch {
      return null;
    }
  };
  const [files, setFiles] = useState<File[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [parent, setParentState] = useState<string | null>(rememberedPath),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [versions, setVersions] = useState<CloudVersion[]>([]),
    [selected, setSelected] = useState<File | null>(null);
  const setParent = (value: string | null) => {
    setParentState(value);
    try {
      if (value) localStorage.setItem(pathKey, value);
      else localStorage.removeItem(pathKey);
    } catch {}
  };
  async function api(path: string, body?: unknown) {
    const r = await fetch(session.base + "/api/v1/space" + path, {
      headers: {
        Authorization: "Bearer " + session.token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) {
      const detail = await r.json().catch(() => ({}));
      throw Error(
        detail.error_description ||
          detail.error ||
          t("Cloud space request failed ({status})", { status: r.status }),
      );
    }
    return r.json();
  }
  async function load() {
    const d = await api(trash ? "/trash" : "");
    setFiles(d.files);
    setFolders(d.folders || []);
    const savedPath = rememberedPath();
    if (
      !trash &&
      savedPath &&
      !(d.folders || []).some((f: Folder) => f.id === savedPath)
    )
      setParent(null);
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setParentState(rememberedPath());
    void run(load);
  }, [session.token, trash]);
  const openingLock = useRef(false);
  const [opening, setOpening] = useState(false);
  async function open(file: File, version?: string) {
    if (openingLock.current) return;
    openingLock.current = true;
    setOpening(true);
    try {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const d = await api(
      "/files/" + file.id + (version ? "?version=" + version : ""),
    );
    validateDocument(d.content);
    await onOpen(d.content);
    rememberCloudBinding(
      session,
      file.id,
      d.file.head_id,
      d.file.folder_id || null,
    );
    } finally { openingLock.current = false; setOpening(false); }
  }
  type Entry = { folder: boolean; item: File | Folder };
  const entries: Entry[] = [
    ...folders
      .filter(
        (f) =>
          (trash || f.parent_id === parent) &&
          f.name.toLowerCase().includes(search.toLowerCase()),
      )
      .map((item) => ({ folder: true, item })),
    ...files
      .filter(
        (f) =>
          (trash || f.folder_id === parent) &&
          f.name.toLowerCase().includes(search.toLowerCase()),
      )
      .map((item) => ({ folder: false, item })),
  ];
  entries.sort((a, b) => {
    const key = sort.key;
    const value = (e: Entry) =>
      key === "owner"
        ? e.item.owner || session.user.username
        : key === "size_bytes"
          ? Number(e.item.size_bytes || 0)
          : key === "updated_at"
            ? new Date(e.item.updated_at || e.item.created_at || 0).getTime()
            : e.item.name;
    const av = value(a),
      bv = value(b);
    return (
      (typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "zh-CN", { numeric: true })) *
        sort.direction || a.item.id.localeCompare(b.item.id)
    );
  });
  const newFolder = () =>
    void run(async () => {
      const name = await webPrompt("新建文件夹");
      if (name?.trim()) {
        await api("/folders", { name: name.trim(), parentId: parent });
        await load();
      }
    });
  const showMenu = (
    x: number,
    y: number,
    items: { label: string; run: () => void }[],
  ) =>
    setMenu({
      x: Math.min(x, window.innerWidth - 190),
      y: Math.max(8, Math.min(y, window.innerHeight - items.length * 38 - 20)),
      items,
    });
  const properties = (entry: Entry, tab: "basic" | "versions" = "basic") =>
    void run(async () => {
      if (entry.folder)
        setFolderDetails(await api("/folders/" + entry.item.id));
      else {
        setSelectedTab(tab);
        setVersions([]);
        setSelected(entry.item as File);
        setVersions((await api("/files/" + entry.item.id)).versions);
      }
    });
  const actions = (entry: Entry) => {
    const f = entry.item,
      base = (entry.folder ? "/folders/" : "/files/") + f.id;
    if (trash)
      return [
        {
          label: "恢复",
          run: () =>
            void run(async () => {
              await api(base + "/restore", {});
              await load();
            }),
        },
        {
          label: "彻底删除",
          run: () =>
            void run(async () => {
              if (
                await webConfirm("彻底删除「" + f.name + "」？用户将无法恢复。")
              ) {
                await api(base + "/purge", {});
                await load();
              }
            }),
        },
      ];
    return [
      {
        label: "打开",
        run: () =>
          entry.folder ? setParent(f.id) : void run(() => open(f as File)),
      },
      {
        label: "重命名",
        run: () =>
          void run(async () => {
            const name = await webPrompt("重命名", f.name);
            if (name?.trim() && name.trim() !== f.name) {
              await api(base + "/rename", { name: name.trim() });
              await load();
            }
          }),
      },
      {
        label: "下载",
        run: () =>
          void run(async () => {
            const response = await fetch(
              session.base +
                "/api/v1/space" +
                base +
                (entry.folder ? "/download" : "?download=1"),
              { headers: { Authorization: "Bearer " + session.token } },
            );
            if (!response.ok) {
              const error = await response.json();
              throw Error(error.error_description || "下载失败");
            }
            download(
              await response.blob(),
              f.name + (entry.folder ? ".zip" : ".baizefig"),
            );
          }),
      },
      {
        label: "移动",
        run: () =>
          entry.folder ? setFolderMoving(f as Folder) : setMoving(f as File),
      },
      ...(!entry.folder
        ? [{ label: "版本", run: () => properties(entry, "versions") }]
        : []),
      { label: "属性", run: () => properties(entry) },
      {
        label: "移至回收站",
        run: () =>
          void run(async () => {
            if (
              await webConfirm("将「" + f.name + "」移至回收站？保留 30 天。")
            ) {
              await api(base + "/delete", {});
              await load();
            }
          }),
      },
    ];
  };
  const chain: Folder[] = [];
  let cursor = parent;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const f = folders.find((f) => f.id === cursor);
    if (!f) break;
    chain.unshift(f);
    cursor = f.parent_id;
  }
  return (
    <div className="cloud-files drive-workspace" aria-busy={busy}>
      <header className="drive-header">
        <nav aria-label="云端路径">
          <button
            className="drive-root"
            onClick={(e) => {
              if (parent) {
                setParent(null);
                return;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              showMenu(rect.left, rect.bottom, [
                { label: "新建文件夹", run: newFolder },
              ]);
            }}
          >
            {trash ? "回收站" : "LoyoCloud"}
            {!parent && <ChevronDown size={18} />}
          </button>
          {!trash &&
            chain.map((f, i) => (
              <span key={f.id}>
                <ChevronRight size={18} />
                <button
                  onClick={(e) => {
                    if (i < chain.length - 1) setParent(f.id);
                    else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      showMenu(rect.left, rect.bottom, [
                        { label: "新建文件夹", run: newFolder },
                        ...actions({ folder: true, item: f }).filter(
                          (a) => a.label !== "打开",
                        ),
                      ]);
                    }
                  }}
                >
                  {f.name}
                  {i === chain.length - 1 && <ChevronDown size={16} />}
                </button>
              </span>
            ))}
        </nav>
        <div className="drive-tools">
          <input
            type="search"
            aria-label="搜索文件"
            placeholder="搜索文件或文件夹"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            className="cloud-view-switch"
            role="group"
            aria-label="文件显示方式"
          >
            <button
              aria-label="列表模式"
              aria-pressed={view === "list"}
              onClick={() => changeView("list")}
            >
              <List size={17} />
            </button>
            <button
              aria-label="图标模式"
              aria-pressed={view === "grid"}
              onClick={() => changeView("grid")}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
          <button aria-label="刷新" onClick={() => void run(load)}>
            <RefreshCw size={17} />
          </button>
          <button
            className="workspace-trash-button"
            onClick={() => setTrash(!trash)}
          >
            <Trash2 size={16} />
            {trash ? "返回文件" : "回收站"}
          </button>
        </div>
      </header>
      {opening && <div className="workspace-opening" role="status" aria-live="polite">正在打开…</div>}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy} className="drive-body">
        <table className={"drive-table drive-" + view}>
          <thead>
            <tr>
              {(
                [
                  ["name", "名称"],
                  ["owner", "所有人"],
                  ["updated_at", "修改时间"],
                  ["size_bytes", "文件大小"],
                ] as const
              ).map(([key, label]) => (
                <th
                  key={key}
                  aria-sort={
                    sort.key === key
                      ? sort.direction === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    onClick={() =>
                      setSort({
                        key,
                        direction: sort.key === key ? -sort.direction : 1,
                      })
                    }
                  >
                    {label}
                    {sort.key === key &&
                      (sort.direction === 1 ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                </th>
              ))}
              <th aria-label="文件菜单" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const f = entry.item;
              return (
                <tr
                  key={f.id}
                  className={
                    (picked === f.id ? "drive-selected " : "") +
                    (dropFolder === f.id ? "workspace-drop-target" : "")
                  }
                  onClick={() => setPicked(f.id)}
                  onDoubleClick={(e) => {
                    if ((e.target as HTMLElement).closest(".drive-more"))
                      return;
                    if (!trash) actions(entry)[0].run();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setPicked(f.id);
                    showMenu(e.clientX, e.clientY, actions(entry));
                  }}
                  draggable={!trash && !entry.folder}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-baizefig-cloud-file",
                      f.id,
                    );
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDropFolder(null)}
                  onDragLeave={(e) => {
                    if (
                      !e.currentTarget.contains(e.relatedTarget as Node | null)
                    )
                      setDropFolder(null);
                  }}
                  onDragOver={(e) => {
                    if (
                      entry.folder &&
                      !trash &&
                      e.dataTransfer.types.includes(
                        "application/x-baizefig-cloud-file",
                      )
                    ) {
                      e.preventDefault();
                      setDropFolder(f.id);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropFolder(null);
                    const id = e.dataTransfer.getData(
                      "application/x-baizefig-cloud-file",
                    );
                    if (entry.folder && !trash && id)
                      void run(async () => {
                        await api("/files/" + id + "/move", { folderId: f.id });
                        await load();
                      });
                  }}
                >
                  <td className="drive-name">
                    <span className="drive-title">
                      {entry.folder ? (
                        <Folder fill="currentColor" size={22} />
                      ) : (
                        <img src="/baize-design.svg" alt="设计文件" />
                      )}
                      <strong>{f.name.replace(/\.baizefig$/i, "")}</strong>
                    </span>
                    {view === "grid" && !entry.folder && (
                      <CloudThumbnail
                        session={session}
                        id={f.id}
                        head={(f as File).head_id}
                        name={f.name}
                      />
                    )}
                  </td>
                  <td className="drive-owner">
                    <UserRound size={20} />
                    {f.owner || session.user.username}
                  </td>
                  <td>
                    {f.updated_at || f.created_at
                      ? new Date(f.updated_at || f.created_at!).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    {entry.folder
                      ? "—"
                      : Number(f.size_bytes || 0) >= 1048576
                        ? (Number(f.size_bytes) / 1048576).toFixed(2) + " MB"
                        : (Number(f.size_bytes || 0) / 1024).toFixed(1) + " KB"}
                  </td>
                  <td className="drive-more">
                    <button
                      aria-label={"操作 " + f.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPicked(f.id);
                        showMenu(rect.right - 180, rect.bottom, actions(entry));
                      }}
                    >
                      <MoreVertical size={19} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!entries.length && (
          <p className="drive-empty">
            {search
              ? "没有匹配的文件"
              : trash
                ? "回收站为空"
                : "此文件夹为空。点击路径菜单新建文件夹。"}
          </p>
        )}
        {selected && (
          <FileDetails
            key={selected.id + selectedTab}
            initialTab={selectedTab}
            name={selected.name}
            size={
              selected.size_bytes === undefined
                ? undefined
                : Number(selected.size_bytes)
            }
            created={selected.created_at}
            updated={selected.updated_at}
            location={folderPath(folders, selected.folder_id, "LoyoCloud")}
            onClose={() => setSelected(null)}
            versionContent={
              <CloudVersions
                versions={versions}
                headId={selected.head_id}
                onRestore={async (version) => {
                  if (
                    !(await webConfirm(
                      "将此版本恢复为新的云端文件？原文件保持不变。",
                    ))
                  )
                    return;
                  await run(async () => {
                    const copy = await api(
                      "/files/" +
                        selected.id +
                        "/versions/" +
                        version +
                        "/restore",
                      {},
                    );
                    await load();
                    await webAlert("已恢复为新文件：" + copy.name);
                  });
                }}
                onDelete={async (version) => {
                  if (!(await webConfirm("删除这个历史版本？"))) return;
                  await run(async () => {
                    await api(
                      "/files/" +
                        selected.id +
                        "/versions/" +
                        version +
                        "/delete",
                      {},
                    );
                    setVersions((await api("/files/" + selected.id)).versions);
                  });
                }}
              />
            }
          >

          </FileDetails>
        )}
        {moving && (
          <MoveFileDialog
            folders={folders}
            root="LoyoCloud"
            initial={moving.folder_id}
            onClose={() => setMoving(null)}
            onMove={(id) =>
              void run(async () => {
                await api("/files/" + moving.id + "/move", { folderId: id });
                setMoving(null);
                await load();
              })
            }
          />
        )}
        {folderDetails && (
          <FileDetails
            folder
            name={folderDetails.name}
            size={folderDetails.size_bytes}
            created={folderDetails.created_at}
            updated={folderDetails.updated_at}
            location={folderPath(folders, folderDetails.parent_id, "LoyoCloud")}
            onClose={() => setFolderDetails(null)}
          />
        )}
        {folderMoving && (
          <MoveFileDialog
            folders={folders.filter((f) => {
              let cursor: Folder | undefined = f;
              const seen = new Set<string>();
              while (cursor && !seen.has(cursor.id)) {
                if (cursor.id === folderMoving.id) return false;
                seen.add(cursor.id);
                cursor = folders.find((p) => p.id === cursor!.parent_id);
              }
              return true;
            })}
            root="LoyoCloud"
            initial={folderMoving.parent_id}
            onClose={() => setFolderMoving(null)}
            onMove={(id) =>
              void run(async () => {
                await api("/folders/" + folderMoving.id + "/move", {
                  folderId: id,
                });
                setFolderMoving(null);
                await load();
              })
            }
          />
        )}
      </fieldset>
      {menu && (
        <>
          <div
            className="drive-menu-backdrop"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className="drive-context-menu"
            role="menu"
            style={{ left: menu.x, top: menu.y }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setMenu(null);
              }
            }}
          >
            {menu.items.map((item, i) => (
              <button
                autoFocus={i === 0}
                role="menuitem"
                key={item.label}
                onClick={() => {
                  setMenu(null);
                  item.run();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
