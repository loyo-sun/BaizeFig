import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  Pipette,
  Droplet,
  Hexagon,
  Square,
  CircleDot,
  SlidersHorizontal,
} from "lucide-react";
import { hexRgba, rgbaHex, rgbHsv, hsvRgb } from "./colorSpace";
import { useI18n } from "./LanguageContext";
export type StyleGesture = (phase: "start" | "end" | "cancel") => void;
export type PaletteColor = { name: string; color: string; id?: string };
export function ColorSwatch({
  value,
  onChange,
  label,
  onGesture,
  paintType,
  onPaintType,
  children,
  palette = [],
  onPickPalette,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  onGesture?: StyleGesture;
  paintType?: string;
  onPaintType?: (type: string) => void;
  children?: ReactNode;
  palette?: PaletteColor[];
  onPickPalette?: (color: PaletteColor) => void;
}) {
  const { t } = useI18n(),
    id = useId(),
    dialog = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null),
    active = useRef(false),
    current = useRef(value);
  const [color, setColor] = useState(value),
    [hue, setHue] = useState(() => {
      const c = hexRgba(value);
      return rgbHsv(c.r, c.g, c.b).h;
    }),
    [error, setError] = useState(""),
    [mode, setMode] = useState<"square" | "wheel" | "sliders">("square"),
    [panel, setPanel] = useState<"picker" | "colors">("picker");
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("baizefig.recent-colors") ?? "[]")
        .filter(
          (s: unknown) => typeof s === "string" && /^#[a-f\d]{6,8}$/i.test(s),
        )
        .slice(0, 20);
    } catch {
      return [];
    }
  });
  useEffect(() => {
    current.current = value;
    setColor(value);
    const c = hexRgba(value),
      h = rgbHsv(c.r, c.g, c.b);
    if (h.s > 0) setHue(h.h);
  }, [value]);
  const rgba = hexRgba(color),
    hsv = rgbHsv(rgba.r, rgba.g, rgba.b),
    solid = hsvRgb(hue, 1, 1);
  function remember(v: string) {
    const next = [v, ...recent.filter((c) => c !== v)].slice(0, 20);
    setRecent(next);
    try {
      localStorage.setItem("baizefig.recent-colors", JSON.stringify(next));
    } catch {}
  }
  function update(v: string) {
    setColor(v);
    current.current = v;
    onChange(v);
    if (!active.current) remember(v);
  }
  function begin() {
    if (active.current) return;
    active.current = true;
    onGesture?.("start");
  }
  function finish(cancel = false) {
    if (!active.current) return;
    active.current = false;
    onGesture?.(cancel ? "cancel" : "end");
    if (!cancel) remember(current.current);
  }
  function plane(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect(),
      s = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)),
      v = 1 - Math.max(0, Math.min(1, (e.clientY - box.top) / box.height));
    const c = hsvRgb(hue, s, v);
    update(rgbaHex(c.r, c.g, c.b, rgba.a));
  }
  function position() {
    const b = button.current!.getBoundingClientRect(),
      row = button.current!.closest(".paint-row")?.getBoundingClientRect(),
      el = dialog.current!;
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - 292, row ? row.left - 307 : b.left - 316))}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - 608, (row?.top ?? b.top) - 54))}px`;
  }
  return (
    <>
      <button
        type="button"
        ref={button}
        className="color-swatch"
        aria-label={label}
        title={label}
        popoverTarget={id}
        onClick={position}
      >
        <span style={{ background: value }} />
      </button>
      <div
        ref={dialog}
        id={id}
        popover="auto"
        className="inspector-popover color-picker"
        role="dialog"
        aria-label={t("Color picker")}
        onKeyDown={(e) => {
          if (e.key === "Escape" && active.current) {
            e.preventDefault();
            e.stopPropagation();
            finish(true);
          }
        }}
        onToggle={(e) => {
          if (e.newState === "closed") finish();
        }}
      >
        <div className="color-picker-header">
          <button
            type="button"
            aria-label={t("Pick screen color")}
            onClick={() => {
              const EyeDropper = (
                window as unknown as {
                  EyeDropper?: new () => {
                    open: () => Promise<{ sRGBHex: string }>;
                  };
                }
              ).EyeDropper;
              if (!EyeDropper) {
                setError(t("Screen eyedropper is unavailable in this browser"));
                return;
              }
              void new EyeDropper()
                .open()
                .then((r) => update(r.sRGBHex))
                .catch(() => {});
            }}
          >
            <Pipette size={16} />
          </button>
          {onPaintType ? (
            <select
              aria-label={t("Fill type")}
              value={paintType}
              onChange={(e) => onPaintType(e.target.value)}
            >
              {["solid", "linear", "radial", "diamond"].map((type) => (
                <option key={type} value={type}>
                  {t(
                    type === "solid"
                      ? "Solid"
                      : type === "linear"
                        ? "Linear gradient"
                        : type === "radial"
                          ? "Radial gradient"
                          : "Diamond gradient",
                  )}
                </option>
              ))}
            </select>
          ) : (
            <span>{t("Solid")}</span>
          )}
          <button
            type="button"
            className="color-view-picker"
            aria-label={t("Color picker controls")}
            aria-pressed={panel === "picker"}
            onClick={() => setPanel("picker")}
          >
            <Droplet size={16} />
          </button>
          <button
            type="button"
            className="color-view-library"
            aria-label={t("Document colors")}
            aria-pressed={panel === "colors"}
            onClick={() => setPanel("colors")}
          >
            <Hexagon size={16} />
          </button>
        </div>
        {panel === "colors" ? (
          <div className="color-library">
            {palette.map((item, i) => (
              <button
                type="button"
                key={item.id ?? i}
                aria-label={t("Apply color") + " " + item.name}
                onClick={() => {
                  if (onPickPalette) onPickPalette(item);
                  else update(item.color);
                }}
              >
                <span style={{ background: item.color }} />
                {item.name}
              </button>
            ))}
            {!palette.length && <p>{t("No document colors")}</p>}
          </div>
        ) : (
          <>
            <div
              className="color-picker-tabs"
              role="tablist"
              aria-label={t("Color controls")}
            >
              {(["square", "wheel", "sliders"] as const).map((value, i) => (
                <button
                  type="button"
                  key={value}
                  role="tab"
                  aria-label={t(
                    value === "square"
                      ? "Color square"
                      : value === "wheel"
                        ? "Color wheel"
                        : "Color sliders",
                  )}
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                >
                  {i === 0 ? (
                    <Square size={16} />
                  ) : i === 1 ? (
                    <CircleDot size={16} />
                  ) : (
                    <SlidersHorizontal size={16} />
                  )}
                </button>
              ))}
            </div>
            {mode === "square" && (
              <>
                <div
                  className="color-plane"
                  role="slider"
                  tabIndex={0}
                  aria-label={t("Saturation and brightness")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(hsv.s * 100)}
                  style={{
                    background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent),rgb(${solid.r} ${solid.g} ${solid.b})`,
                  }}
                  onPointerDown={(e) => {
                    begin();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    plane(e);
                  }}
                  onPointerMove={(e) => {
                    if (active.current && e.buttons === 1) plane(e);
                  }}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                  onKeyDown={(e) => {
                    if (!e.key.startsWith("Arrow")) return;
                    e.preventDefault();
                    const s = Math.min(
                        1,
                        Math.max(
                          0,
                          hsv.s +
                            (e.key === "ArrowRight"
                              ? 0.01
                              : e.key === "ArrowLeft"
                                ? -0.01
                                : 0),
                        ),
                      ),
                      v = Math.min(
                        1,
                        Math.max(
                          0,
                          hsv.v +
                            (e.key === "ArrowUp"
                              ? 0.01
                              : e.key === "ArrowDown"
                                ? -0.01
                                : 0),
                        ),
                      ),
                      c = hsvRgb(hue, s, v);
                    update(rgbaHex(c.r, c.g, c.b, rgba.a));
                  }}
                >
                  <span
                    style={{
                      left: `${hsv.s * 100}%`,
                      top: `${(1 - hsv.v) * 100}%`,
                    }}
                  />
                </div>
              </>
            )}
            {mode === "wheel" && (
              <div
                className="color-wheel"
                role="slider"
                tabIndex={0}
                aria-label={t("Color wheel")}
                aria-valuemin={0}
                aria-valuemax={359}
                aria-valuenow={Math.round(hue)}
                onPointerDown={(e) => {
                  begin();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const box = e.currentTarget.getBoundingClientRect(),
                    dx = e.clientX - box.left - box.width / 2,
                    dy = e.clientY - box.top - box.height / 2,
                    h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
                  setHue(h);
                  const c = hsvRgb(
                    h,
                    Math.min(1, Math.hypot(dx, dy) / (box.width / 2)),
                    hsv.v,
                  );
                  update(rgbaHex(c.r, c.g, c.b, rgba.a));
                }}
                onPointerMove={(e) => {
                  if (!active.current || e.buttons !== 1) return;
                  const box = e.currentTarget.getBoundingClientRect(),
                    dx = e.clientX - box.left - box.width / 2,
                    dy = e.clientY - box.top - box.height / 2,
                    h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
                  setHue(h);
                  const c = hsvRgb(
                    h,
                    Math.min(1, Math.hypot(dx, dy) / (box.width / 2)),
                    hsv.v,
                  );
                  update(rgbaHex(c.r, c.g, c.b, rgba.a));
                }}
                onPointerUp={() => finish()}
                onPointerCancel={() => finish(true)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                  e.preventDefault();
                  const h = (hue + (e.key === "ArrowRight" ? 1 : 359)) % 360;
                  setHue(h);
                  const c = hsvRgb(h, hsv.s, hsv.v);
                  update(rgbaHex(c.r, c.g, c.b, rgba.a));
                }}
              >
                <span
                  style={{
                    left: `${50 + Math.cos((hue * Math.PI) / 180) * hsv.s * 50}%`,
                    top: `${50 + Math.sin((hue * Math.PI) / 180) * hsv.s * 50}%`,
                  }}
                />
              </div>
            )}
            {mode === "sliders" && (
              <div className="color-channel-sliders">
                {(["r", "g", "b"] as const).map((key) => (
                  <label key={key}>
                    {key.toUpperCase()}
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={rgba[key]}
                      aria-label={
                        t("Color channel slider") + " " + key.toUpperCase()
                      }
                      onPointerDown={begin}
                      onPointerUp={() => finish()}
                      onPointerCancel={() => finish(true)}
                      onChange={(e) => {
                        const c = { ...rgba, [key]: e.target.valueAsNumber };
                        update(rgbaHex(c.r, c.g, c.b, c.a));
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
            <div className="color-picker-sliders">
              <span className="color-preview" style={{ background: color }} />
              <div>
                <input
                  aria-label={t("Hue")}
                  type="range"
                  min={0}
                  max={359}
                  value={hue}
                  className="hue-slider"
                  onPointerDown={begin}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setHue(h);
                    const c = hsvRgb(h, hsv.s, hsv.v);
                    update(rgbaHex(c.r, c.g, c.b, rgba.a));
                  }}
                />
                <input
                  aria-label={t("Color alpha")}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(rgba.a * 100)}
                  className="alpha-slider"
                  onPointerDown={begin}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                  onChange={(e) =>
                    update(
                      rgbaHex(
                        rgba.r,
                        rgba.g,
                        rgba.b,
                        Number(e.target.value) / 100,
                      ),
                    )
                  }
                />
              </div>
            </div>
            <div className="color-rgb">
              {(["r", "g", "b"] as const).map((key) => (
                <label key={key}>
                  {key.toUpperCase()}
                  <input
                    key={color + key}
                    aria-label={t("Color channel") + " " + key.toUpperCase()}
                    type="number"
                    min={0}
                    max={255}
                    defaultValue={rgba[key]}
                    onBlur={(e) => {
                      const v = e.target.valueAsNumber;
                      if (Number.isFinite(v) && v !== rgba[key]) {
                        const c = {
                          ...rgba,
                          [key]: Math.max(0, Math.min(255, v)),
                        };
                        update(rgbaHex(c.r, c.g, c.b, c.a));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="color-hex-row">
              <label>
                HEX
                <input
                  key={color}
                  aria-label={t("Color HEX")}
                  defaultValue={color.toUpperCase()}
                  onBlur={(e) => {
                    if (/^#?[a-f\d]{6}([a-f\d]{2})?$/i.test(e.target.value)) {
                      const v = "#" + e.target.value.replace("#", "");
                      if (v.toLowerCase() !== color.toLowerCase()) update(v);
                    } else e.target.value = color.toUpperCase();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </label>
              <label>
                A
                <input
                  aria-label={t("Color alpha percentage")}
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(rgba.a * 100)}
                  onChange={(e) => {
                    const a = e.target.valueAsNumber;
                    if (Number.isFinite(a))
                      update(rgbaHex(rgba.r, rgba.g, rgba.b, a / 100));
                  }}
                />
              </label>
            </div>
            {children}
            <div className="color-recents">
              <label>{t("Recent colors")}</label>
              <div>
                {recent.map((c) => (
                  <button
                    type="button"
                    key={c}
                    aria-label={t("Apply color") + " " + c}
                    style={{ background: c }}
                    onClick={() => update(c)}
                  />
                ))}
              </div>
              {!recent.length && (
                <div className="color-empty">
                  <Droplet size={32} />
                  <p>{t("There are no recent colors yet")}</p>
                </div>
              )}
            </div>
          </>
        )}
        {error && <p role="status">{error}</p>}
      </div>
    </>
  );
}
