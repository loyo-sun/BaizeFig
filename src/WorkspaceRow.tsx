import { useEffect, useRef, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
export function WorkspaceRow({ children, ...props }: ComponentProps<"tr">) {
  const row = useRef<HTMLTableRowElement>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    buttons: HTMLButtonElement[];
  } | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);
  return (
    <>
      <tr
        {...props}
        ref={row}
        onContextMenu={(e) => {
          e.preventDefault();
          const buttons = Array.from(
            row.current?.querySelectorAll<HTMLButtonElement>(
              ".workspace-file-actions button",
            ) || [],
          );
          setMenu({
            x: Math.min(e.clientX, window.innerWidth - 180),
            y: Math.min(
              e.clientY,
              window.innerHeight - buttons.length * 40 - 20,
            ),
            buttons,
          });
        }}
      >
        {children}
      </tr>
      {menu &&
        createPortal(
          <div
            className="workspace-context-menu"
            role="menu"
            style={{ left: menu.x, top: Math.max(8, menu.y) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!menu.buttons.some((b) => b.textContent?.trim() === "打开") && (
              <button
                role="menuitem"
                onClick={() => {
                  row.current
                    ?.querySelector(".cloud-file-open:not(:disabled)")
                    ?.dispatchEvent(
                      new MouseEvent("dblclick", { bubbles: true }),
                    );
                  setMenu(null);
                }}
              >
                打开
              </button>
            )}
            {menu.buttons.map((b, i) => (
              <button
                autoFocus={i === 0}
                role="menuitem"
                key={i}
                disabled={b.disabled}
                onClick={() => {
                  b.click();
                  setMenu(null);
                }}
              >
                <span>{b.textContent}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
