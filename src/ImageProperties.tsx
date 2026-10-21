import { useEffect, useRef, useState } from "react";
import { ImagePlus, Crop } from "lucide-react";
import type { Node } from "./core";
import { useI18n } from "./LanguageContext";
export function ImageProperties({
  node,
  onChange,
  onCrop,
}: {
  node: Node;
  onChange: (patch: Partial<Node>) => void;
  onCrop: () => void;
}) {
  const { t } = useI18n(),
    input = useRef<HTMLInputElement>(null),
    [error, setError] = useState("");
  const latest = useRef({ node, onChange }),
    job = useRef(0),
    pendingReader = useRef<FileReader | null>(null);
  latest.current = { node, onChange };
  useEffect(
    () => () => {
      job.current++;
      pendingReader.current?.abort();
    },
    [node.id],
  );
  if (!node.image) return null;
  const options = node.fidelity?.image ?? {
    mode: "fill" as const,
    transform: [1, 0, 0, 1, 0, 0] as [
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    width: node.width,
    height: node.height,
    scale: 1,
    opacity: 1,
  };
  return (
    <section className="image-properties">
      <div className="section-heading">{t("Image")}</div>
      <div className="image-preview">
        <img src={node.image} alt={t("Selected image")} />
        <button
          aria-label={t("Replace image")}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={16} />
          {t("Replace image")}
        </button>
      </div>
      <label>
        {t("Image mode")}
        <select
          aria-label={t("Image mode")}
          value={options.mode}
          onChange={(e) => {
            if (e.target.value === "crop") onCrop();
            else
              onChange({
                fidelity: {
                  ...node.fidelity,
                  size: node.fidelity?.size ?? [node.width, node.height],
                  image: {
                    ...options,
                    mode: e.target.value as "fill" | "fit" | "tile",
                  },
                },
              });
          }}
        >
          {["fill", "fit", "crop", "tile"].map((mode) => (
            <option key={mode} value={mode}>
              {t(
                mode === "fill"
                  ? "Fill image"
                  : mode === "fit"
                    ? "Fit image"
                    : mode === "crop"
                      ? "Crop image"
                      : "Tile image",
              )}
            </option>
          ))}
        </select>
      </label>
      <button aria-label={t("Crop image visually")} onClick={onCrop}>
        <Crop size={16} />
        {t("Crop image visually")}
      </button>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label={t("Replacement image file")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const request = ++job.current;
          pendingReader.current?.abort();
          if (file.size > 30 * 1024 * 1024) {
            setError(t("Image exceeds 30 MiB"));
            return;
          }
          const reader = new FileReader();
          pendingReader.current = reader;
          reader.onerror = () => {
            if (request === job.current)
              setError(t("Image could not be decoded"));
          };
          reader.onload = () => {
            if (request !== job.current) return;
            const image = String(reader.result);
            if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(image)) {
              setError(t("Unsupported file type"));
              return;
            }
            const decoded = new Image();
            decoded.onload = () => {
              if (request !== job.current) return;
              const current = latest.current.node;
              latest.current.onChange({
                image,
                fidelity: {
                  ...current.fidelity,
                  size: current.fidelity?.size ?? [
                    current.width,
                    current.height,
                  ],
                  image: {
                    ...(current.fidelity?.image ?? options),
                    mode: "fill",
                    width: decoded.naturalWidth,
                    height: decoded.naturalHeight,
                  },
                },
              });
              setError("");
            };
            decoded.onerror = () => setError(t("Image could not be decoded"));
            decoded.src = image;
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
