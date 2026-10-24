import { useRef, useState } from "react";
import { UserRound, RotateCcw, Trash2 } from "lucide-react";
export type CloudVersion = {
  id: string;
  created_at: string;
  size_bytes?: number | string;
  preview_bytes?: number | string;
  total_bytes?: number | string;
  updater?: string;
  source?: string;
  version_name?: string;
};
export function CloudVersions({
  versions,
  headId,
  onRestore,
  onDelete,
  onRename,
  onDeleteUnnamed,
}: {
  versions: CloudVersion[];
  headId: string | null;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDeleteUnnamed?: () => Promise<void>;
}) {
  const [namedOnly, setNamedOnly] = useState(false);
  const web = !window.baizefigDesktop;
  const unnamed = versions.filter(
    (v) => v.id !== headId && !v.version_name?.trim(),
  );
  const formatSize = (bytes: number) =>
    bytes >= 1048576
      ? (bytes / 1048576).toFixed(2) + " MB"
      : (bytes / 1024).toFixed(1) + " KB";
  const total = versions.reduce(
    (sum, v) => sum + Number(v.total_bytes ?? v.size_bytes ?? 0),
    0,
  );
  const visibleVersions = namedOnly
    ? versions.filter((v) => v.version_name?.trim())
    : versions;
  return (
    <div className="cloud-versions">
      <p className="muted">
        恢复后在原文件夹创建新文件，原文件与历史版本保持不变。
      </p>
      <label className="version-named-filter">
        <input
          type="checkbox"
          checked={namedOnly}
          onChange={(e) => setNamedOnly(e.target.checked)}
        />
        只显示已命名版本
      </label>
      {web && (
        <div className="cloud-version-summary">
          <span>
            共 {versions.length} 个云端版本 · 占用 {formatSize(total)}
            （按完整文件计量）
          </span>
          {onDeleteUnnamed && (
            <button
              className="workspace-danger"
              disabled={!unnamed.length}
              onClick={() => void onDeleteUnnamed()}
            >
              删除未命名历史版本（{unnamed.length}）
            </button>
          )}
        </div>
      )}
      <table>
        <thead>
          <tr>
            {["时间", "更新者", "大小", "版本来源", "版本名称", "操作"].map(
              (label) => (
                <th key={label}>{label}</th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          <VersionDay
            key="versions"
            items={visibleVersions}
            headId={headId}
            onRestore={onRestore}
            onDelete={onDelete}
            onRename={onRename}
          />
        </tbody>
      </table>
      {!visibleVersions.length && (
        <p>{namedOnly ? "暂无已命名版本" : "暂无版本记录"}</p>
      )}
    </div>
  );
}
function VersionDay({
  items,
  headId,
  onRestore,
  onDelete,
  onRename,
}: {
  items: CloudVersion[];
  headId: string | null;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  return (
    <>
      {items.map((v) => (
        <tr key={v.id}>
          <td>
            {new Date(v.created_at).toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              second: "2-digit",
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })}
          </td>
          <td>
            <span className="version-updater">
              <UserRound size={22} />
              {v.updater || "未记录"}
            </span>
          </td>
          <td>
            {(window.baizefigDesktop
              ? v.size_bytes
              : (v.total_bytes ?? v.size_bytes)) === undefined
              ? "未记录"
              : Number(
                    window.baizefigDesktop
                      ? v.size_bytes
                      : (v.total_bytes ?? v.size_bytes),
                  ) >= 1048576
                ? (
                    Number(
                      window.baizefigDesktop
                        ? v.size_bytes
                        : (v.total_bytes ?? v.size_bytes),
                    ) / 1048576
                  ).toFixed(2) + " MB"
                : (
                    Number(
                      window.baizefigDesktop
                        ? v.size_bytes
                        : (v.total_bytes ?? v.size_bytes),
                    ) / 1024
                  ).toFixed(1) + " KB"}
          </td>
          <td>{v.source || "未记录"}</td>
          <td>
            <VersionName version={v} headId={headId} onRename={onRename} />
          </td>
          <td>
            <div className="workspace-file-actions">
              <button onClick={() => void onRestore(v.id)}>
                <RotateCcw size={14} />
                恢复
              </button>
              {v.id !== headId && (
                <button
                  className="workspace-danger"
                  onClick={() => void onDelete(v.id)}
                >
                  <Trash2 size={14} />
                  删除
                </button>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function VersionName({
  version,
  headId,
  onRename,
}: {
  version: CloudVersion;
  headId: string | null;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const finished = useRef(false);
  const displayedName =
    version.version_name?.trim() ||
    (version.id === headId ? "最新版本" : "历史版本");
  const commit = async () => {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const name = value.trim();
    if (name && name !== (version.version_name || ""))
      await onRename(version.id, name);
  };
  return (
    <input
      className="version-name-input"
      data-version-edit
      aria-label="版本名称"
      title="点击编辑版本名称"
      maxLength={100}
      value={editing ? value : displayedName}
      onFocus={(e) => {
        finished.current = false;
        setValue(version.version_name || "");
        setEditing(true);
        e.currentTarget.select();
      }}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          e.stopPropagation();
          void commit();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          finished.current = true;
          setEditing(false);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
