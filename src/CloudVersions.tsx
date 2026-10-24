import { UserRound, RotateCcw, Trash2 } from "lucide-react";
export type CloudVersion = {
  id: string;
  created_at: string;
  size_bytes?: number | string;
  updater?: string;
  source?: string;
  version_name?: string;
};
export function CloudVersions({
  versions,
  headId,
  onRestore,
  onDelete,
}: {
  versions: CloudVersion[];
  headId: string | null;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const groups = new Map<string, CloudVersion[]>();
  for (const version of versions) {
    const day = new Date(version.created_at).toLocaleDateString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    groups.set(day, [...(groups.get(day) || []), version]);
  }
  return (
    <div className="cloud-versions">
      <p className="muted">
        恢复后在原文件夹创建新文件，原文件与历史版本保持不变。
      </p>
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
          {Array.from(groups).map(([day, items]) => (
            <VersionDay
              key={day}
              day={day}
              items={items}
              headId={headId}
              onRestore={onRestore}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
      {!versions.length && <p>暂无版本记录</p>}
    </div>
  );
}
function VersionDay({
  day,
  items,
  headId,
  onRestore,
  onDelete,
}: {
  day: string;
  items: CloudVersion[];
  headId: string | null;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <>
      <tr className="version-day">
        <td colSpan={6}>{day}</td>
      </tr>
      {items.map((v) => (
        <tr key={v.id}>
          <td>
            {new Date(v.created_at).toLocaleTimeString("zh-CN", {
              timeZone: "Asia/Shanghai",
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
            {v.size_bytes === undefined
              ? "未记录"
              : Number(v.size_bytes) >= 1048576
                ? (Number(v.size_bytes) / 1048576).toFixed(2) + " MB"
                : (Number(v.size_bytes) / 1024).toFixed(1) + " KB"}
          </td>
          <td>{v.source || "未记录"}</td>
          <td>{v.id === headId ? "最新版本" : v.version_name || "历史版本"}</td>
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
