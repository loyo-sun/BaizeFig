export function pixelColor(pixel: ArrayLike<number>) {
  return {
    fill:
      "#" +
      [pixel[0], pixel[1], pixel[2]]
        .map((v) =>
          Math.max(0, Math.min(255, Math.round(v)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join(""),
    opacity: Math.max(0, Math.min(1, pixel[3] / 255)),
  };
}
export async function sampleSvgColor(
  source: string,
  point: { x: number; y: number },
  background: string,
) {
  await document.fonts.ready;
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml"),
    root = parsed.documentElement;
  root.setAttribute("width", "1");
  root.setAttribute("height", "1");
  root.setAttribute("viewBox", `${point.x - 0.5} ${point.y - 0.5} 1 1`);
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(parsed)], {
      type: "image/svg+xml",
    }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    return pixel[3] ? pixelColor(pixel) : { fill: background, opacity: 1 };
  } finally {
    URL.revokeObjectURL(url);
  }
}
