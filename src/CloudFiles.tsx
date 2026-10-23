import { WorkspaceRow } from "./WorkspaceRow";
import { FileActions } from "./FileActions";
import { FileDetails, MoveFileDialog, folderPath } from "./FileDetails";
import { useI18n } from "./LanguageContext";
import { rememberCloudBinding, readCloudBinding } from "./saveDestination";
import { CloudThumbnail } from "./CloudThumbnail";
import {
  LayoutGrid,
  List,
  Folder,
  RefreshCw,
  Plus,
  CloudUpload,
  Trash2,
} from "lucide-react";
import { svgString, raster } from "./Canvas";
import { useEffect, useState } from "react";
import type { CloudSession } from "./cloud";
import { type Document, validateDocument } from "./core";
type File = {
  id: string;
  name: string;
  folder_id: string | null;
  head_id: string | null;
  updated_at: string;
  created_at?: string;
  deleted_at?: string;
  size_bytes?: number;
};
type Folder = {
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
  const [files, setFiles] = useState<File[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [parent, setParent] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [heads, setHeads] = useState<Record<string, string | null>>({}),
    [versions, setVersions] = useState<{ id: string; created_at: string }[]>(
      [],
    ),
    [selected, setSelected] = useState<File | null>(null);
  async function api(path: string, body?: unknown) {
    const r = await fetch(session.base + "/api/v1/space" + path, {
      headers: {
        Authorization: "Bearer " + session.token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) {
      const detail=await r.json().catch(()=>({}));
      throw Error(detail.error_description || detail.error || t("Cloud space request failed ({status})",{status:r.status}));
    }
    return r.json();
  }
  async function load() {
    const d = await api(trash ? "/trash" : "");
    setFiles(d.files);
    setFolders(d.folders || []);
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
    setHeads({});
    setParent(null);
    void run(load);
  }, [session.token, trash]);
  async function open(file: File, version?: string) {
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
    setHeads((h) => ({ ...h, [file.id]: d.file.head_id }));
  }
  return (
    <div className="cloud-files" aria-busy={busy}>
      <div className="cloud-files-heading">
        <div>
          <h3>{trash ? "回收站" : t("All cloud files")}</h3>

          <p>
            {t("Organize designs in folders and open a file to keep creating.")}
          </p>
        </div>
        <div
          className="cloud-view-switch"
          role="group"
          aria-label={t("File view")}
        >
          <button
            aria-label={t("Icon view")}
            aria-pressed={view === "grid"}
            onClick={() => changeView("grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            aria-label={t("List view")}
            aria-pressed={view === "list"}
            onClick={() => changeView("list")}
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {error && <p role="alert">{t(error)}</p>}
      <fieldset disabled={busy} className="cloud-files-body">
        <div className="cloud-toolbar">
          <input
            type="search"
            aria-label={t("Search this folder")}
            placeholder={t("Search files or folders")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => void run(load)}>
            <RefreshCw size={14} />
            {t("Refresh")}
          </button>
          <button
            onClick={() =>
              void run(async () => {
                const name = prompt(t("Folder name"));
                if (name) {
                  await api("/folders", { name, parentId: parent });
                  await load();
                }
              })
            }
          >
            <Plus size={14} />
            {t("New folder")}
          </button>
          <button
            className="workspace-trash-button"
            onClick={() => {
              setTrash(!trash);
              setParent(null);
            }}
          >
            <Trash2 size={14} />
            {trash ? "返回文件" : "回收站"}
          </button>
        </div>
        {parent && <nav className="cloud-breadcrumb" aria-label={t("File path")}>
          <button onClick={() => setParent(null)}>{t("Cloud space")}</button>
          {(() => {
            const chain: Folder[] = [];
            let cursor: string | null = parent;
            while (cursor) {
              const f = folders.find((x) => x.id === cursor);
              if (!f) break;
              chain.unshift(f);
              cursor = f.parent_id;
            }
            return chain.map((f) => (
              <span key={f.id}>
                {" "}
                / <button onClick={() => setParent(f.id)}>{f.name}</button>
              </span>
            ));
          })()}
        </nav>}
        <table className={`cloud-file-table cloud-file-${view}`}>
          <thead>
            <tr>
              <th>{t("Name")}</th>
              <th>{t("Updated")}</th>
              <th>创建时间</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {folders
              .filter(
                (f) =>
                  (trash || f.parent_id === parent) &&
                  f.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((f) => (
                <WorkspaceRow
                  key={f.id}
                  onDragOver={(e) => {
                    if (
                      !trash &&
                      e.dataTransfer.types.includes(
                        "application/x-baizefig-cloud-file",
                      )
                    ) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData(
                      "application/x-baizefig-cloud-file",
                    );
                    if (id && !trash)
                      void run(async () => {
                        await api("/files/" + id + "/move", { folderId: f.id });
                        await load();
                      });
                  }}
                >
                  <td>
                    <button
                      className="cloud-file-open cloud-folder-open"
                      disabled={trash}
                      onDoubleClick={() => setParent(f.id)}
                    >
                      <span className="cloud-folder-picture">
                        <Folder size={view === "grid" ? 44 : 18} />
                      </span>
                      <strong>{f.name}</strong>
                    </button>
                  </td>
                  <td className="cloud-file-date">{t("Folder")}</td>
                  <td>—</td>
                  <td className="cloud-file-actions">
                    <FileActions>
                      {trash ? (
                        <>
                          <button
                            onClick={() =>
                              void run(async () => {
                                await api("/folders/" + f.id + "/restore", {});
                                await load();
                              })
                            }
                          >
                            恢复
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm("彻底删除文件夹及其中内容？无法恢复。")
                              )
                                void run(async () => {
                                  await api("/folders/" + f.id + "/purge", {});
                                  await load();
                                });
                            }}
                          >
                            彻底删除
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              void run(async () =>
                                setFolderDetails(await api("/folders/" + f.id)),
                              )
                            }
                          >
                            属性
                          </button>
                          <button onClick={() => setFolderMoving(f)}>
                            移动
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `删除文件夹「${f.name}」及其中内容？将进入回收站保留 30 天。`,
                                )
                              )
                                void run(async () => {
                                  await api("/folders/" + f.id + "/delete", {});
                                  await load();
                                });
                            }}
                          >
                            删除
                          </button>
                        </>
                      )}
                    </FileActions>
                  </td>
                </WorkspaceRow>
              ))}
            {files
              .filter(
                (f) =>
                  (trash || f.folder_id === parent) &&
                  f.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((f) => (
                <WorkspaceRow
                  key={f.id}
                  draggable={!trash}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-baizefig-cloud-file",
                      f.id,
                    );
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <td>
                    <button
                      className="cloud-file-open"
                      disabled={trash}
                      onDoubleClick={() => void run(() => open(f))}
                    >
                      {view === "grid" && (
                        <CloudThumbnail
                          session={session}
                          id={f.id}
                          head={f.head_id}
                          name={f.name}
                        />
                      )}
                      <strong>{f.name}.baizefig</strong>
                    </button>
                  </td>
                  <td className="cloud-file-date">
                    {f.updated_at
                      ? new Date(f.updated_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="cloud-file-created cloud-file-date">
                    {f.created_at
                      ? new Date(f.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="cloud-file-actions">
                    {trash ? (
                      <>
                        <button
                          onClick={() =>
                            void run(async () => {
                              await api("/files/" + f.id + "/restore", {});
                              await load();
                            })
                          }
                        >
                          恢复
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("彻底删除此文件？此操作无法恢复。"))
                              void run(async () => {
                                await api("/files/" + f.id + "/purge", {});
                                await load();
                              });
                          }}
                        >
                          彻底删除
                        </button>
                        <p>
                          删除于{" "}
                          {f.deleted_at &&
                            new Date(f.deleted_at).toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <FileActions>
                        <button
                          onClick={() =>
                            void run(async () => {
                              setSelected(f);
                              setVersions(
                                (await api("/files/" + f.id)).versions,
                              );
                            })
                          }
                        >
                          属性
                        </button>
                        <button onClick={() => setMoving(f)}>移动</button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `删除「${f.name}」？文件将移入回收站，保留 30 天。`,
                              )
                            )
                              void run(async () => {
                                await api("/files/" + f.id + "/delete", {});
                                await load();
                              });
                          }}
                        >
                          删除
                        </button>
                      </FileActions>
                    )}
                  </td>
                </WorkspaceRow>
              ))}
          </tbody>
        </table>
        {!folders.some(
          (f) =>
            (trash || f.parent_id === parent) &&
            f.name.toLowerCase().includes(search.toLowerCase()),
        ) &&
          !files.some(
            (f) =>
              (trash || f.folder_id === parent) &&
              f.name.toLowerCase().includes(search.toLowerCase()),
          ) && (
            <p className="cloud-empty">
              {search
                ? t("No matching files")
                : t(
                    "This folder is empty. Save the current design to get started.",
                  )}
            </p>
          )}
        {selected && (
          <FileDetails
            name={selected.name}
            size={
              selected.size_bytes === undefined
                ? undefined
                : Number(selected.size_bytes)
            }
            created={selected.created_at}
            updated={selected.updated_at}
            location={folderPath(folders, selected.folder_id, "云工作区")}
            onClose={() => setSelected(null)}
          >
            <details>
              <summary>历史版本与分享</summary>
              {versions.map((v) => (
                <p key={v.id}>
                  {new Date(v.created_at).toLocaleString()}{" "}
                  <button onClick={() => void run(() => open(selected, v.id))}>
                    打开版本
                  </button>
                  {v.id !== selected.head_id && (
                    <button
                      onClick={() => {
                        if (confirm("删除这个历史版本？"))
                          void run(async () => {
                            await api(
                              "/files/" +
                                selected.id +
                                "/versions/" +
                                v.id +
                                "/delete",
                              {},
                            );
                            setVersions(
                              (await api("/files/" + selected.id)).versions,
                            );
                          });
                      }}
                    >
                      删除版本
                    </button>
                  )}
                </p>
              ))}
              <button
                onClick={() =>
                  void run(async () => {
                    const d = await api("/files/" + selected.id + "/share", {});
                    prompt("只读分享地址", session.base + d.url);
                  })
                }
              >
                分享
              </button>
              <button
                onClick={() =>
                  void run(async () => {
                    await api("/files/" + selected.id + "/share", {
                      revoke: true,
                    });
                  })
                }
              >
                撤销分享
              </button>
            </details>
          </FileDetails>
        )}
        {moving && (
          <MoveFileDialog
            folders={folders}
            root="云工作区"
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
            location={folderPath(folders, folderDetails.parent_id, "云工作区")}
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
            root="云工作区"
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
    </div>
  );
}
