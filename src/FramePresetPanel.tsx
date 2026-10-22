import { useI18n } from "./LanguageContext";
import { NumberField } from "./NumberField";
import "./framePresets.css";

export const framePresets = [
  {
    id: "phone",
    zh: "手机标准",
    en: "Phone",
    width: 390,
    height: 844,
    detail: "390 × 844",
  },
  {
    id: "desktop",
    zh: "桌面标准",
    en: "Desktop",
    width: 1440,
    height: 900,
    detail: "1440 × 900",
  },
  {
    id: "a3",
    zh: "A3",
    en: "A3",
    width: 3508,
    height: 4961,
    detail: "297 × 420 mm",
  },
  {
    id: "a4",
    zh: "A4",
    en: "A4",
    width: 2480,
    height: 3508,
    detail: "210 × 297 mm",
  },
  {
    id: "a5",
    zh: "A5",
    en: "A5",
    width: 1748,
    height: 2480,
    detail: "148 × 210 mm",
  },
  {
    id: "a6",
    zh: "A6",
    en: "A6",
    width: 1240,
    height: 1748,
    detail: "105 × 148 mm",
  },
  {
    id: "card",
    zh: "名片",
    en: "Business card",
    width: 1063,
    height: 638,
    detail: "90 × 54 mm",
  },
  {
    id: "icon",
    zh: "ICON",
    en: "ICON",
    width: 24,
    height: 24,
    detail: "24 × 24",
  },
  {
    id: "slides",
    zh: "幻灯片 16:9",
    en: "Slides 16:9",
    width: 1920,
    height: 1080,
    detail: "1920 × 1080",
  },
] as const;
export interface FrameSize {
  id: string;
  name: string;
  width: number;
  height: number;
}
export function FramePresetPanel({
  value,
  onChange,
  onCreate,
}: {
  value: FrameSize;
  onChange: (value: FrameSize) => void;
  onCreate: () => void;
}) {
  const { language } = useI18n();
  const zh = language === "zh-CN";
  const copy = (a: string, b: string) => (zh ? a : b);
  const custom = (patch: Partial<FrameSize>) =>
    onChange({
      ...value,
      id: "custom",
      name: copy("自定义", "Custom"),
      ...patch,
    });
  return (
    <section
      className="frame-preset-panel"
      aria-label={copy("画板尺寸预设", "Frame size presets")}
    >
      <div className="frame-preset-heading">
        <strong>{copy("画板尺寸", "Frame size")}</strong>
        <span>PX</span>
      </div>
      <p className="frame-preset-hint">
        {copy(
          "选择尺寸，在画布上单击放置。拖动可自由绘制。",
          "Choose a size, then click the canvas to place. Drag to draw freely.",
        )}
      </p>
      <div className="frame-preset-fields">
        <NumberField
          label="W"
          aria={copy("新画板宽度", "New frame width")}
          value={value.width}
          min={1}
          max={100000}
          onChange={(width) => custom({ width })}
        />
        <NumberField
          label="H"
          aria={copy("新画板高度", "New frame height")}
          value={value.height}
          min={1}
          max={100000}
          onChange={(height) => custom({ height })}
        />
        <button
          className="frame-preset-swap"
          title={copy("交换宽高", "Swap dimensions")}
          aria-label={copy("交换宽高", "Swap dimensions")}
          onClick={() =>
            onChange({ ...value, width: value.height, height: value.width })
          }
        >
          ⇄
        </button>
      </div>
      <div
        className="frame-preset-list"
        role="group"
        aria-label={copy("常用尺寸", "Common sizes")}
      >
        {framePresets.map((p) => (
          <button
            key={p.id}
            className={value.id === p.id ? "active" : ""}
            aria-pressed={value.id === p.id}
            onClick={() =>
              onChange({
                id: p.id,
                name: zh ? p.zh : p.en,
                width: p.width,
                height: p.height,
              })
            }
          >
            <span>{zh ? p.zh : p.en}</span>
            <small>{p.detail}</small>
          </button>
        ))}
        <button
          className={value.id === "custom" ? "active" : ""}
          aria-pressed={value.id === "custom"}
          onClick={() => custom({})}
        >
          <span>{copy("自定义", "Custom")}</span>
          <small>{copy("输入宽高", "Set W / H")}</small>
        </button>
      </div>
      <p className="frame-preset-print">
        {copy(
          "打印尺寸按 300 PPI 换算为像素，不含出血。",
          "Print sizes use 300 PPI, without bleed.",
        )}
      </p>
      <button className="frame-preset-create" onClick={onCreate}>
        {copy("在视图中心创建画板", "Create frame at view center")}
      </button>
    </section>
  );
}
