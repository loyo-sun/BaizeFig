import {webConfirm} from "./WebDialogs";
import {isCloudBackedDocument} from "./saveDestination";
import { WorkspaceRow } from "./WorkspaceRow";
import { FileActions } from "./FileActions";
import { LayoutGrid, List, Folder, RefreshCw } from "lucide-react";
import { Scene } from "./Canvas";
import { useEffect, useRef, useState } from "react";
import type { Document } from "./core";
import {
  listDocuments,
  localFileMetadata,
  localFolders,
  type LocalFileMetadata,
} from "./storage";
import {
  FileDetails,
  folderPath,
  fileDate,
  type WorkspaceFolder,
} from "./FileDetails";
export function LocalFiles({
  onOpen,
  onDelete,
  actions,
}: {
  actions?: import("react").ReactNode;
  onOpen: (d: Document) => void | Promise<void>;
  onDelete: (d: Document) => Promise<void>;
}) {
  const [files, setFiles] = useState<Document[]>([]),
    [folders, setFolders] = useState<WorkspaceFolder[]>([]),
    [meta, setMeta] = useState<Record<string, LocalFileMetadata>>({}),
    [parent, setParent] = useState<string | null>(null),
    [view, setView] = useState<"grid" | "list">(() => {
      try {
        return localStorage.getItem("baizefig.local.view") === "grid"
          ? "grid"
          : "list";
      } catch {
        return "list";
      }
    }),
    [search, setSearch] = useState(""),
    [details, setDetails] = useState<Document | null>(null),
    [error, setError] = useState("");
  const openingLock = useRef(false);
  const [opening, setOpening] = useState(false);
  async function openFile(d: Document) {
    if (openingLock.current) return;
    openingLock.current = true;
    setOpening(true);
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await onOpen(d);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { openingLock.current = false; setOpening(false); }
  }
  const changeView = (next: "grid" | "list") => {
    setView(next);
    try {
      localStorage.setItem("baizefig.local.view", next);
    } catch {}
  };
  async function load() {
    const docs = (await listDocuments()).filter(d=>!isCloudBackedDocument(d.id));
    setFiles(docs);
    setFolders(await localFolders());
    setMeta(
      Object.fromEntries(
        await Promise.all(
          docs.map(async (d) => [d.id, await localFileMetadata(d.id)]),
        ),
      ),
    );
  }
  async function run(fn: () => Promise<void>) {
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void run(load);
  }, []);
  return (
    <div className="cloud-files">
      <div className="cloud-files-heading">
        <div>
          <h3>所有本地文件</h3>
          <p>在文件夹中整理设计，打开文件继续创作。</p>
        </div>
        <div className="cloud-view-switch" role="group" aria-label="文件视图">
          <button
            aria-label="图标模式"
            aria-pressed={view === "grid"}
            onClick={() => changeView("grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            aria-label="列表模式"
            aria-pressed={view === "list"}
            onClick={() => changeView("list")}
          >
            <List size={16} />
          </button>
        </div>
      </div>
      <div className="cloud-toolbar">
        {actions}
        <input
          type="search"
          aria-label="搜索文件或文件夹"
          placeholder="搜索文件或文件夹"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => void run(load)}>
          <RefreshCw size={14} />
          刷新
        </button>
      </div>
      {opening && <div className="workspace-opening" role="status" aria-live="polite">正在打开…</div>}
      {error && <p role="alert">{error}</p>}
      <table className={`cloud-file-table cloud-file-${view}`}>
        <thead>
          <tr>
            <th>名称</th>
            <th>文件类型</th><th>更新时间</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {folders
            .filter(
              (f) =>
                f.parent_id === parent &&
                f.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((f) => (
              <WorkspaceRow key={f.id}>
                <td>
                  <button
                    className="cloud-file-open cloud-folder-open"
                    onDoubleClick={() => setParent(f.id)}
                  >
                    <span className="cloud-folder-picture">
                      <Folder fill="currentColor" size={view === "grid" ? 44 : 18} />
                    </span>
                    <strong>{f.name}</strong>
                  </button>
                </td>
                <td className="cloud-file-type">文件夹</td><td className="cloud-file-date">—</td>
                <td className="cloud-file-date">—</td>
                <td>—</td>
              </WorkspaceRow>
            ))}
          {files
            .filter(
              (d) =>
                (meta[d.id]?.folderId || null) === parent &&
                d.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((d) => (
              <WorkspaceRow key={d.id}>
                <td>
                  <button
                    className="cloud-file-open"
                    onDoubleClick={() => void openFile(d)}
                  >
                    {view === "grid" && (
                      <div
                        className="local-workspace-preview"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 1200 850">
                          <Scene doc={d} pageId={d.pages[0].id} />
                        </svg>
                      </div>
                    )}
                    <strong>{d.name.replace(/\.baizefig$/i, "")}</strong>
                  </button>
                </td>
                <td className="cloud-file-type">设计文件</td>
                <td className="cloud-file-date">
                  {fileDate(meta[d.id]?.updatedAt)}
                </td>
                <td className="cloud-file-created cloud-file-date">
                  {fileDate(meta[d.id]?.createdAt)}
                </td>
                <td className="cloud-file-actions">
                  <FileActions>
                    <button onClick={() => setDetails(d)}>属性</button>
                    <button
                      onClick={async () => {
                        if (
                          await webConfirm(
                            `删除「${d.name}」？本地文件将直接删除，无法恢复。`,
                          )
                        )
                          void run(() => onDelete(d));
                      }}
                    >
                      删除
                    </button>
                  </FileActions>
                </td>
              </WorkspaceRow>
            ))}
        </tbody>
      </table>
      {details && (
        <FileDetails
          name={details.name}
          size={new Blob([JSON.stringify(details)]).size}
          created={meta[details.id]?.createdAt}
          updated={meta[details.id]?.updatedAt}
          location={folderPath(
            folders,
            meta[details.id]?.folderId || null,
            "本地工作区",
          )}
          onClose={() => setDetails(null)}
        />
      )}{" "}

    </div>
  );
}
