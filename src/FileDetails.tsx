import { X, Folder } from "lucide-react";
export type WorkspaceFolder = {
  id: string;
  name: string;
  parent_id: string | null;
};
export function folderPath(
  folders: WorkspaceFolder[],
  id: string | null,
  root: string,
): string {
  const names: string[] = [];
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const f = folders.find((f) => f.id === id);
    if (!f) break;
    names.unshift(f.name);
    id = f.parent_id;
  }
  return [root, ...names].join(" / ");
}
export const fileDate = (value?: string | number) =>
  value ? new Date(value).toLocaleString() : "未知（旧文件未记录）";
export function FileDetails({
  name,
  size,
  created,
  updated,
  location,
  onClose,
  children,
  folder = false,
  versionContent,
  initialTab = "basic",
}: {
  initialTab?: "basic" | "versions";
  versionContent?: import("react").ReactNode;
  folder?: boolean;
  children?: import("react").ReactNode;
  name: string;
  size?: number;
  created?: string | number;
  updated?: string | number;
  location: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"basic" | "versions">(initialTab);
  return (
    <div className="workspace-dialog-overlay" onClick={onClose}>
      <section
        className={`workspace-dialog ${versionContent ? "workspace-version-dialog" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="文件属性"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header>
          <h3>文件属性</h3>
          <button
            className="workspace-dialog-close"
            aria-label="关闭属性"
            title="关闭"
            autoFocus
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {versionContent && (
          <div
            className="workspace-property-tabs"
            role="tablist"
            aria-label="文件属性分类"
          >
            {(
              [
                ["basic", "基础"],
                ["versions", "版本"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {tab === "basic" ? (
          <div role={versionContent ? "tabpanel" : undefined}>
            <div className="workspace-file-summary">
              {folder ? (
                <Folder size={48} />
              ) : (
                <img
                  src="/baize-white.svg"
                  alt="BaizeFig 文件"
                  width={48}
                  height={48}
                />
              )}
              <strong>
                {name}
                {folder ? "" : ".baizefig"}
              </strong>
            </div>
            <dl>
              {[
                ["种类", folder ? "文件夹" : "BaizeFig 设计文件"],
                [
                  "大小",
                  size === undefined
                    ? "未知"
                    : `${size.toLocaleString()} 字节（${(size / 1024).toFixed(1)} KB）`,
                ],
                ["位置", location],
                ["创建时间", fileDate(created)],
                ["最后修改时间", fileDate(updated)],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {children}
          </div>
        ) : (
          <div role="tabpanel">{versionContent}</div>
        )}
      </section>
    </div>
  );
}
export function MoveFileDialog({
  folders,
  root,
  initial,
  onClose,
  onMove,
}: {
  folders: WorkspaceFolder[];
  root: string;
  initial: string | null;
  onClose: () => void;
  onMove: (id: string | null) => void;
}) {
  const [target, setTarget] = useState<string | null>(initial);
  return (
    <div className="workspace-dialog-overlay">
      <section
        className="workspace-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="移动文件"
      >
        <header>
          <h3>移动到</h3>
          <button autoFocus onClick={onClose}>
            取消
          </button>
        </header>
        <nav>{folderPath(folders, target, root)}</nav>
        {target && (
          <button
            onClick={() =>
              setTarget(folders.find((f) => f.id === target)?.parent_id || null)
            }
          >
            上一级
          </button>
        )}
        <div className="workspace-folder-choices">
          {folders
            .filter((f) => f.parent_id === target)
            .map((f) => (
              <button key={f.id} onClick={() => setTarget(f.id)}>
                <Folder size={18} />
                {f.name} /
              </button>
            ))}
        </div>
        <button className="primary" onClick={() => onMove(target)}>
          移动到此处
        </button>
      </section>
    </div>
  );
}
import { useState } from "react";
