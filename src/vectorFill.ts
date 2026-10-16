import type { Node } from "./core";
/** Explicit whole-layer fill edits replace local region styles, not stroke outlines. */
export function clearVectorFillOverrides(node: Node) {
  for (const path of node.fidelity?.paths ?? []) {
    if (path.strokeOutline) continue;
    delete path.color;
    delete path.paints;
  }
  for (const region of node.fidelity?.network?.regions ?? []) {
    delete region.color;
    delete region.paints;
  }
}
