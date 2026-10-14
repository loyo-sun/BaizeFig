import { ancestors, type Document } from "./core";
import { changePrototypeComponent } from "./components";
import {
  scrollToTarget,
  type ScrollPositions,
  type PrototypeViewports,
} from "./prototypeScroll";
export type PrototypeAction =
  | { type: "changeTo"; componentId: string }
  | {
      type: "scrollTo";
      targetId: string;
      offset?: { x: number; y: number };
      transition?: "instant" | "animate";
      durationMs?: number;
    }
  | {
      type: "navigate" | "overlay" | "swap";
      targetId: string;
      transition?: "instant" | "dissolve";
      durationMs?: number;
    }
  | { type: "back" }
  | { type: "close" };
export interface PrototypeInteraction {
  trigger: "click" | "hover" | "leave" | "press" | "release" | "delay";
  delayMs?: number;
  actions: PrototypeAction[];
}
export interface PrototypeState {
  frameId: string;
  overlays: string[];
  history: string[];
  scrolls?: ScrollPositions;
  scrollDurationMs?: number;
  runtime?: Document;
  transition?: { type: "instant" | "dissolve"; durationMs: number };
}
export function transitionPrototype(
  original: Document,
  state: PrototypeState,
  actions: PrototypeAction[],
  viewports: PrototypeViewports = {},
  sourceId?: string,
): PrototypeState {
  const next = structuredClone(state);
  let doc = next.runtime ?? original;
  for (const action of actions) {
    if (action.type === "changeTo") {
      const source = doc.nodes.find((n) => n.id === sourceId),
        instance =
          source &&
          [source, ...ancestors(doc, source)].find(
            (n) => n.type === "instance" && n.componentId,
          );
      if (!instance) continue;
      doc = changePrototypeComponent(doc, instance.id, action.componentId);
      next.runtime = doc;
      continue;
    }
    if (action.type === "scrollTo") {
      if (!doc.nodes.some((n) => n.id === action.targetId))
        throw Error("Invalid prototype target");
      next.scrolls = scrollToTarget(
        doc,
        next.overlays.at(-1) ?? next.frameId,
        action.targetId,
        next.scrolls,
        viewports,
        action.offset,
      );
      next.scrollDurationMs =
        action.transition === "animate" ? (action.durationMs ?? 300) : 0;
      continue;
    }
    if (action.type === "back") {
      const previous = next.history.pop();
      if (previous) {
        next.frameId = previous;
        next.overlays = [];
        next.scrolls = {};
        next.scrollDurationMs = 0;
      }
      continue;
    }
    if (action.type === "close") {
      next.overlays.pop();
      continue;
    }
    if (
      !doc.nodes.some(
        (n) =>
          n.id === action.targetId &&
          ["frame", "component", "instance"].includes(n.type),
      )
    )
      throw Error("Invalid prototype target");
    next.transition = {
      type: action.transition ?? "instant",
      durationMs: action.durationMs ?? 300,
    };
    if (action.type === "overlay") next.overlays.push(action.targetId);
    else if (action.type === "swap" && next.overlays.length)
      next.overlays[next.overlays.length - 1] = action.targetId;
    else {
      if (action.type === "navigate") next.history.push(next.frameId);
      next.frameId = action.targetId;
      next.overlays = [];
      next.scrolls = {};
      next.scrollDurationMs = 0;
    }
  }
  return next;
}
export function validateInteractions(doc: Document): void {
  for (const n of doc.nodes) {
    if (!n.interactions) continue;
    if (!Array.isArray(n.interactions) || n.interactions.length > 1000)
      throw Error("Invalid prototype interaction");
    for (const i of n.interactions) {
      if (
        !["click", "hover", "leave", "press", "release", "delay"].includes(
          i.trigger,
        ) ||
        (i.delayMs !== undefined &&
          (!Number.isFinite(i.delayMs) ||
            i.delayMs < 0 ||
            i.delayMs > 86400000)) ||
        !Array.isArray(i.actions) ||
        i.actions.length > 1000
      )
        throw Error("Invalid prototype interaction");
      for (const a of i.actions) {
        if (
          ["navigate", "overlay", "swap", "scrollTo"].includes(a.type) &&
          !("targetId" in a)
        )
          throw Error("Invalid prototype target");
        if (
          ![
            "navigate",
            "overlay",
            "swap",
            "scrollTo",
            "changeTo",
            "back",
            "close",
          ].includes(a.type)
        )
          throw Error("Invalid prototype interaction");
        if (
          a.type === "changeTo" &&
          (typeof a.componentId !== "string" ||
            !a.componentId ||
            a.componentId.length > 1000)
        )
          throw Error("Invalid prototype component");
        if (
          "targetId" in a &&
          (!doc.nodes.some(
            (n) =>
              n.id === a.targetId &&
              (a.type === "scrollTo" ||
                ["frame", "component", "instance"].includes(n.type)),
          ) ||
            (a.durationMs !== undefined &&
              (!Number.isFinite(a.durationMs) ||
                a.durationMs < 0 ||
                a.durationMs > 60000)) ||
            (a.transition !== undefined &&
              !(
                a.type === "scrollTo"
                  ? ["instant", "animate"]
                  : ["instant", "dissolve"]
              ).includes(a.transition)))
        )
          throw Error("Invalid prototype target");
        if (
          a.type === "scrollTo" &&
          a.offset &&
          (!Number.isFinite(a.offset.x) || !Number.isFinite(a.offset.y))
        )
          throw Error("Invalid prototype scroll offset");
      }
    }
  }
}
