import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "./LanguageContext";
export interface MenuItem {
  name: string;
  run?: () => void;
  disabled?: boolean;
  checked?: boolean;
  reason?: string;
  key?: string;
  children?: MenuItem[];
}
export function menuPosition(
  anchor: { left: number; right: number; top: number; bottom: number },
  width: number,
  height: number,
  viewport: { width: number; height: number },
  submenu = false,
) {
  let x = submenu ? anchor.right - 2 : anchor.left,
    y = submenu ? anchor.top : anchor.bottom + 4;
  if (x + width > viewport.width - 8)
    x = submenu ? anchor.left - width + 2 : viewport.width - width - 8;
  return {
    left: Math.max(8, x),
    top: Math.max(8, Math.min(y, viewport.height - height - 8)),
  };
}
export function CommandMenu({
  items,
  anchor,
  onClose,
  label = "Main menu",
  point,
}: {
  items: MenuItem[];
  anchor: HTMLElement;
  onClose: () => void;
  label?: string;
  point?: { x: number; y: number };
}) {
  const { t } = useI18n(),
    root = useRef<HTMLDivElement>(null),
    [path, setPath] = useState<number[]>([]),
    [focus, setFocus] = useState({ level: 0, index: 0 }),
    [positions, setPositions] = useState<{ left: number; top: number }[]>([]);
  const columns = [items];
  for (let l = 0; l < path.length; l++) {
    const children = columns[l]?.[path[l]]?.children;
    if (!children) break;
    columns.push(children);
  }
  useLayoutEffect(() => {
    const next = [];
    for (let level = 0; level < columns.length; level++) {
      const panel = root.current?.querySelector<HTMLElement>(
          `[data-menu-level="${level}"]`,
        ),
        parent = level
          ? root.current?.querySelector<HTMLElement>(
              `[data-level="${level - 1}"][data-index="${path[level - 1]}"]`,
            )
          : anchor;
      if (!panel || !parent) continue;
      next.push(
        menuPosition(
          level === 0 && point
            ? { left: point.x, right: point.x, top: point.y, bottom: point.y }
            : parent.getBoundingClientRect(),
          panel.offsetWidth,
          panel.offsetHeight,
          { width: innerWidth, height: innerHeight },
          level > 0,
        ),
      );
    }
    if (JSON.stringify(next) !== JSON.stringify(positions)) setPositions(next);
  });
  useEffect(() => {
    root.current
      ?.querySelector<HTMLElement>(
        `[data-level="${focus.level}"][data-index="${focus.index}"]`,
      )
      ?.focus();
  }, [focus, positions.length]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (
        !root.current?.contains(e.target as globalThis.Node) &&
        !anchor.contains(e.target as globalThis.Node)
      )
        onClose();
    };
    const resize = () => onClose();
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", resize);
    };
  }, [anchor, onClose]);
  function close() {
    onClose();
    anchor.focus();
  }
  return (
    <div
      ref={root}
      className="command-menu-root"
      onKeyDown={(e) => {
        e.stopPropagation();
        const level = Number(
            (e.target as HTMLElement).dataset.level ?? focus.level,
          ),
          index = Number(
            (e.target as HTMLElement).dataset.index ?? focus.index,
          ),
          list = columns[level],
          item = list?.[index];
        if (!item) return;
        const n = list.length;
        let next = index;
        if (e.key === "Escape" || e.key === "Tab") {
          e.preventDefault();
          close();
          return;
        }
        if (e.key === "ArrowDown") next = (index + 1) % n;
        else if (e.key === "ArrowUp") next = (index + n - 1) % n;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = n - 1;
        else if (e.key === "ArrowRight") {
          e.preventDefault();
          if (item.children) {
            setPath([...path.slice(0, level), index]);
            setFocus({ level: level + 1, index: 0 });
          }
          return;
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (level) {
            setPath(path.slice(0, level - 1));
            setFocus({ level: level - 1, index: path[level - 1] });
          } else close();
          return;
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (item.children) {
            setPath([...path.slice(0, level), index]);
            setFocus({ level: level + 1, index: 0 });
          } else if (!item.disabled && item.run) {
            close();
            item.run();
          }
          return;
        } else if (e.key.length === 1) {
          next = list.findIndex(
            (a, i) =>
              i > index &&
              t(a.name).toLowerCase().startsWith(e.key.toLowerCase()),
          );
          if (next < 0)
            next = list.findIndex((a) =>
              t(a.name).toLowerCase().startsWith(e.key.toLowerCase()),
            );
          if (next < 0) return;
        } else return;
        e.preventDefault();
        setFocus({ level, index: next });
      }}
    >
      {columns.map((list, level) => (
        <div
          role="menu"
          aria-label={t(
            level ? columns[level - 1][path[level - 1]].name : label,
          )}
          data-menu-level={level}
          key={level}
          className="command-menu-panel"
          onScroll={() => {
            if (path.length > level) setPath(path.slice(0, level));
          }}
          style={positions[level] ?? { left: 8, top: 8, visibility: "hidden" }}
        >
          {list.map((item, index) => (
            <button
              key={item.name}
              role={
                item.checked === undefined ? "menuitem" : "menuitemcheckbox"
              }
              aria-checked={item.checked}
              aria-disabled={item.disabled || undefined}
              aria-haspopup={item.children ? "menu" : undefined}
              aria-expanded={item.children ? path[level] === index : undefined}
              data-level={level}
              data-index={index}
              tabIndex={focus.level === level && focus.index === index ? 0 : -1}
              title={
                item.disabled
                  ? t(item.reason ?? "Unavailable in current context")
                  : undefined
              }
              className={path[level] === index ? "active" : ""}
              onPointerEnter={() => {
                setPath(
                  item.children
                    ? [...path.slice(0, level), index]
                    : path.slice(0, level),
                );
              }}
              onFocus={() => setFocus({ level, index })}
              onClick={() => {
                if (item.children) {
                  setPath([...path.slice(0, level), index]);
                  setFocus({ level: level + 1, index: 0 });
                } else if (!item.disabled && item.run) {
                  close();
                  item.run();
                }
              }}
            >
              <span className="menu-check">{item.checked ? "✓" : ""}</span>
              <span>{t(item.name)}</span>
              <kbd>{item.key}</kbd>
              {item.children && <span>›</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
