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
    setHeads((h) => ({ ...h, [file.id]: d.file.head_id }));
  }
  return (
    <div aria-busy={busy}>
      <p>云文件 · 列表模式</p>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <button onClick={() => void run(load)}>刷新</button>
        <button onClick={() => setParent(null)}>根目录</button>
        {parent && (
          <button
            onClick={() =>
              setParent(folders.find((f) => f.id === parent)?.parent_id || null)
            }
          >
            上一级
          </button>
        )}
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
                headId: heads[document.id] || null,
              });
              setHeads((h) => ({ ...h, [document.id]: d.headId }));
              await load();
            })
          }
        >
          保存当前文件到云端
        </button>
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {folders
              .filter((f) => f.parent_id === parent)
              .map((f) => (
                <tr key={f.id}>
                  <td>
                    <button onClick={() => setParent(f.id)}>📁 {f.name}</button>
                  </td>
                  <td>文件夹</td>
                </tr>
              ))}
            {files
              .filter((f) => f.folder_id === parent)
              .map((f) => (
                <tr key={f.id}>
                  <td>{f.name}.baizefig</td>
                  <td>
                    <button onClick={() => void run(() => open(f))}>
                      打开编辑
                    </button>
                    <button
                      onClick={() =>
                        void run(async () => {
                          setSelected(f);
                          setVersions((await api("/files/" + f.id)).versions);
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
                          const d = await api("/files/" + f.id + "/share", {});
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
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {selected && (
          <section>
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
