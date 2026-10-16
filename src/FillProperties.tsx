import { Crop } from "lucide-react";
import type { ImportedPaint } from "./appearance";
import type { Node } from "./core";
import { RegionPaintEditor } from "./RegionPaintEditor";
import { useI18n } from "./LanguageContext";
export function editableFills(node: Node): ImportedPaint[] {
  if (node.fidelity?.paints) return node.fidelity.paints;
  if (node.image)
    return [
      {
        type: "image",
        image: node.image,
        imageOptions: node.fidelity?.image,
        opacity: 1,
      },
    ];
  return node.fill === "none"
    ? []
    : [{ type: "solid", color: node.fill, opacity: 1 }];
}
export function fillStackPatch(
  node: Node,
  paints: ImportedPaint[],
): Partial<Node> {
  return {
    fidelity: {
      ...(node.fidelity ?? { size: [node.width, node.height] }),
      paints,
    },
    ...(paints.length ? {} : { fill: "none", image: undefined }),
  };
}
export function FillProperties({
  node,
  onChange,
  onCrop,
}: {
  node: Node;
  onChange: (patch: Partial<Node>) => void;
  onCrop: (index?: number) => void;
}) {
  const { t } = useI18n();
  return (
    <details>
      <summary>{t("Fill layers and image crop")}</summary>
      {node.image && (
        <button
          title={t("Crop image visually")}
          aria-label={t("Crop image visually")}
          onClick={() => onCrop()}
        >
          <Crop size={14} />
        </button>
      )}
      <RegionPaintEditor
        paints={editableFills(node)}
        onChange={(paints) => onChange(fillStackPatch(node, paints))}
        onCrop={(index) => onCrop(node.fidelity?.paints ? index : undefined)}
      />
    </details>
  );
}
