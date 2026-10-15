import type { Node } from "./core";
import { RegionPaintEditor } from "./RegionPaintEditor";
import { useI18n } from "./LanguageProvider";
export function FillProperties({
  node,
  onChange,
  onCrop,
}: {
  node: Node;
  onChange: (patch: Partial<Node>) => void;
  onCrop: (index?: number) => void;
}) {
  const { t } = useI18n(),
    f = node.fidelity ?? {
      size: [node.width, node.height] as [number, number],
    };
  return (
    <details>
      <summary>{t("Fill layers and image crop")}</summary>
      {node.image && (
        <button onClick={() => onCrop()}>{t("Crop image visually")}</button>
      )}
      <RegionPaintEditor
        paints={f.paints ?? []}
        onChange={(paints) => onChange({ fidelity: { ...f, paints } })}
        onCrop={onCrop}
      />
    </details>
  );
}
