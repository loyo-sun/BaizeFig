import type { ReactNode } from "react";
export function FileActions({ children }: { children: ReactNode }) {
  return (
    <details className="workspace-actions">
      <summary>更多操作</summary>
      <div
        className="cloud-file-menu"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button"))
            e.currentTarget.closest("details")?.removeAttribute("open");
        }}
      >
        {children}
      </div>
    </details>
  );
}
