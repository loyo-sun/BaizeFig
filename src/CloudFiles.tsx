import { rememberCloudBinding, readCloudBinding } from "./saveDestination";
import { CloudThumbnail } from "./CloudThumbnail";
import {
  LayoutGrid,
  List,
  Folder,
  RefreshCw,
  Plus,
  CloudUpload,
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
};
type Folder = { id: string; name: string; parent_id: string | null };
export function CloudFiles({
  session,
  document,
  onOpen,
}: {
  session: CloudSession;
  document: Document;
  onOpen: (doc: Document) => Promise<void>;
}) {
  const [view, setView] = useState<"grid" | "list">(() => {
    try {
      return localStorage.getItem("baizefig.cloud.view") === "list"
        ? "list"
        : "grid";
    } catch {
      return "grid";
    }
  });
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
    if (!r.ok)
      throw Error(
        r.status === 409
          ? "云端已有新版本，请重新打开后保存"
          : "云空间操作失败 (" + r.status + ")",
      );
    return r.json();
  }
  async function load() {
    const d = await api("");
    setFiles(d.files);
    setFolders(d.folders);
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
  }, [session.token]);
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
          <h3>所有云文件</h3>
          <p>在文件夹中整理设计，打开文件继续创作。</p>
        </div>
        <div
          className="cloud-view-switch"
          role="group"
          aria-label="文件显示方式"
        >
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
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy} className="cloud-files-body">
        <div className="cloud-toolbar">
          <input
            type="search"
            aria-label="搜索当前文件夹"
            placeholder="搜索文件或文件夹"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => void run(load)}>
            <RefreshCw size={14} />
            刷新
          </button>
          <button
            onClick={() =>
              void run(async () => {
                const name = prompt("文件夹名称");
                if (name) {
                  await api("/folders", { name, parentId: parent });
                  await load();
                }
              })
            }
          >
            <Plus size={14} />
            新建文件夹
          </button>
          <button
            onClick={() =>
              void run(async () => {
                const preview = await Promise.all(
                  document.pages.map(async (page) => {
                    const blob = await raster(
                      await svgString(document, page.id),
                      0.5,
                    );
                    return await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                  }),
                );
                const d = await api("/files/" + document.id + "/save", {
                  content: document,
                  preview,
                  headId:
                    readCloudBinding(session, document.id)?.headId ||
                    heads[document.id] ||
                    null,
                });
                rememberCloudBinding(
                  session,
                  document.id,
                  d.headId,
                  files.find((f) => f.id === document.id)?.folder_id || null,
                );
                setHeads((h) => ({ ...h, [document.id]: d.headId }));
                await load();
              })
            }
          >
            <CloudUpload size={14} />
            保存当前文件到云端
          </button>
        </div>
        <nav className="cloud-breadcrumb" aria-label="文件路径">
          <button onClick={() => setParent(null)}>云空间</button>
          {(() => {
            const chain: Folder[] = [];
            let cursor = parent;
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
        </nav>
        <table className={`cloud-file-table cloud-file-${view}`}>
          <thead>
            <tr>
              <th>名称</th>
              <th>更新时间</th>
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
                <tr key={f.id}>
                  <td>
                    <button
                      className="cloud-file-open cloud-folder-open"
                      onClick={() => setParent(f.id)}
                    >
                      <span className="cloud-folder-picture">
                        <Folder size={view === "grid" ? 44 : 18} />
                      </span>
                      <strong>{f.name}</strong>
                    </button>
                  </td>
                  <td className="cloud-file-date">文件夹</td>
                  <td className="cloud-file-actions">—</td>
                </tr>
              ))}
            {files
              .filter(
                (f) =>
                  f.folder_id === parent &&
                  f.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((f) => (
                <tr key={f.id}>
                  <td>
                    <button
                      className="cloud-file-open"
                      onClick={() => void run(() => open(f))}
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
                      ? new Date(f.updated_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="cloud-file-actions">
                    <details>
                      <summary>更多操作</summary>
                      <div className="cloud-file-menu">
                        <button onClick={() => void run(() => open(f))}>
                          打开编辑
                        </button>
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
                          属性与版本
                        </button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              const target = prompt(
                                "目标文件夹 ID（留空为根目录）\n" +
                                  folders
                                    .map((x) => x.name + ": " + x.id)
                                    .join("\n"),
                              );
                              if (target !== null) {
                                await api("/files/" + f.id + "/move", {
                                  folderId: target || null,
                                });
                                await load();
                              }
                            })
                          }
                        >
                          移动
                        </button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              const d = await api(
                                "/files/" + f.id + "/share",
                                {},
                              );
                              prompt("只读分享地址", session.base + d.url);
                            })
                          }
                        >
                          分享
                        </button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              await api("/files/" + f.id + "/share", {
                                revoke: true,
                              });
                            })
                          }
                        >
                          撤销分享
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!folders.some(
          (f) =>
            f.parent_id === parent &&
            f.name.toLowerCase().includes(search.toLowerCase()),
        ) &&
          !files.some(
            (f) =>
              f.folder_id === parent &&
              f.name.toLowerCase().includes(search.toLowerCase()),
          ) && (
            <p className="cloud-empty">
              {search
                ? "没有匹配的文件"
                : "此文件夹还没有文件，保存当前设计即可开始。"}
            </p>
          )}
        {selected && (
          <section className="cloud-file-properties">
            <button
              className="cloud-properties-close"
              onClick={() => setSelected(null)}
            >
              关闭详情
            </button>
            <h4>{selected.name}.baizefig</h4>
            <p>
              文件 ID：{selected.id}
              <br />
              更新时间：{selected.updated_at}
            </p>
            {versions.map((v) => (
              <p key={v.id}>
                {v.created_at}{" "}
                <button onClick={() => void run(() => open(selected, v.id))}>
                  打开此版本
                </button>
                <button
                  onClick={() =>
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
                    })
                  }
                >
                  删除历史版本
                </button>
              </p>
            ))}
            <p>打开历史版本后，点击保存会创建新版本，保留原有历史。</p>
          </section>
        )}
      </fieldset>
    </div>
  );
}
