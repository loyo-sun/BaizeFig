import {
  Children,
  cloneElement,
  isValidElement,
  Fragment,
  type ReactElement,
  type ReactNode,
} from "react";
import { Info, FolderInput, Trash2, FolderOpen, RotateCcw } from "lucide-react";
export function FileActions({ children }: { children: ReactNode }) {
  return (
    <div className="workspace-file-actions">
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        if (child.type === Fragment)
          return (
            <FileActions>
              {(child.props as { children: ReactNode }).children}
            </FileActions>
          );
        if (child.type !== "button") return child;
        const button = child as ReactElement<{
          children: ReactNode;
          className?: string;
        }>;
        const label = String(button.props.children).trim();
        const Icon = label.includes("删除")
          ? Trash2
          : label.includes("移动")
            ? FolderInput
            : label.includes("属性")
              ? Info
              : label.includes("恢复")
                ? RotateCcw
                : FolderOpen;
        return cloneElement(
          button,
          {
            className: `${button.props.className || ""} ${label.includes("删除") ? "workspace-danger" : ""}`,
          },
          <>
            <Icon size={14} />
            {button.props.children}
          </>,
        );
      })}
    </div>
  );
}
