/** Editable polyline arrow, including reverse-direction drags. */
export function arrowGeometry(
  start: { x: number; y: number },
  end: { x: number; y: number },
  snap = false,
) {
  let dx = end.x - start.x,
    dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (snap) {
    const angle =
      (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4;
    dx = Math.cos(angle) * length;
    dy = Math.sin(angle) * length;
  }
  const angle = Math.atan2(dy, dx),
    head = Math.min(12, length / 3);
  const tip = { x: dx, y: dy };
  const points = [
    { x: 0, y: 0 },
    tip,
    {
      x: dx - head * Math.cos(angle - Math.PI / 6),
      y: dy - head * Math.sin(angle - Math.PI / 6),
    },
    tip,
    {
      x: dx - head * Math.cos(angle + Math.PI / 6),
      y: dy - head * Math.sin(angle + Math.PI / 6),
    },
  ];
  const minX = Math.min(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y));
  return {
    x: start.x + minX,
    y: start.y + minY,
    width: Math.max(1, ...points.map((p) => p.x - minX)),
    height: Math.max(1, ...points.map((p) => p.y - minY)),
    points: points.map((p) => ({ x: p.x - minX, y: p.y - minY })),
  };
}
