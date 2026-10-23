import { useEffect, useState } from "react";
import type { CloudSession } from "./cloud";
import { cloudRequest } from "./saveDestination";
export function SaveDestinationDialog({
  session,
  busy,
  error,
  onSave,
  onCancel,
  initialWhere = "local",
  initialFolderId = null,
}: {
  initialWhere?: "local" | "cloud";
  initialFolderId?: string | null;
  session: CloudSession;
  busy: boolean;
  error: string;
  onSave: (
    where: "local" | "cloud",
    makeDefault: boolean,
    folderId: string | null,
  ) => void;
  onCancel: () => void;
}) {
  const [where, setWhere] = useState<"local" | "cloud">(initialWhere),
    [makeDefault, setMakeDefault] = useState(false),
    [parent, setParent] = useState<string | null>(initialFolderId),
    [folders, setFolders] = useState<
      { id: string; name: string; parent_id: string | null }[]
    >([]),
    [loading, setLoading] = useState(false),
    [folderError, setFolderError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (where !== "cloud") return;
    let stopped = false;
    setLoading(true);
    setFolderError("");
    cloudRequest(session, "")
      .then((d) => {
        if (!stopped) setFolders(d.folders);
      })
      .catch((e) => {
        if (!stopped) setFolderError(e.message);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [session.token, where, retry]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.stopImmediatePropagation();
        onCancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [busy, onCancel]);
  const chain = [];
  let cursor = parent;
  while (cursor) {
    const f = folders.find((x) => x.id === cursor);
    if (!f) break;
    chain.unshift(f);
    cursor = f.parent_id;
  }
  return (
    <div className="modal-backdrop save-destination-backdrop">
      <section
        className="modal save-destination-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="保存文件"
      >
        <h2>保存到哪里？</h2>
        <p className="muted">选择本次保存的位置。</p>
        <fieldset disabled={busy}>
          <div className="save-location-options">
            <label>
              <input
                autoFocus
                type="radio"
                name="destination"
                checked={where === "local"}
                onChange={() => setWhere("local")}
              />
              本地<span>下载 .baizefig 文件</span>
            </label>
            <label>
              <input
                type="radio"
                name="destination"
                checked={where === "cloud"}
                onChange={() => setWhere("cloud")}
              />
              云端<span>保存到 LoyoCloud</span>
            </label>
          </div>
          {where === "cloud" && (
            <section className="save-folder-picker">
              <h3>选择云端文件夹</h3>
              <nav aria-label="保存路径">
                <button onClick={() => setParent(null)}>云空间</button>
                {chain.map((f) => (
                  <span key={f.id}>
                    {" "}
                    / <button onClick={() => setParent(f.id)}>{f.name}</button>
                  </span>
                ))}
              </nav>
              {loading ? (
                <p role="status">正在加载文件夹…</p>
              ) : folderError ? (
                <p role="alert">
                  {folderError}{" "}
                  <button onClick={() => setRetry((x) => x + 1)}>重试</button>
                </p>
              ) : (
                <div className="save-folder-list">
                  {folders
                    .filter((f) => f.parent_id === parent)
                    .map((f) => (
                      <button key={f.id} onClick={() => setParent(f.id)}>
                        📁 {f.name}
                      </button>
                    ))}
                  {!folders.some((f) => f.parent_id === parent) && (
                    <p className="muted">当前文件夹没有子文件夹</p>
                  )}
                </div>
              )}
              <p>
                文件将保存到：云空间{chain.map((f) => " / " + f.name).join("")}
              </p>
            </section>
          )}
          <label className="save-default-check">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
            />
            设为默认保存位置（可在偏好设置中修改）
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="save-dialog-actions">
            <button onClick={onCancel}>取消</button>
            <button
              className="primary"
              disabled={where === "cloud" && (loading || !!folderError)}
              onClick={() => onSave(where, makeDefault, parent)}
            >
              {busy ? "正在保存…" : "保存"}
            </button>
          </div>
        </fieldset>
      </section>
    </div>
  );
}
