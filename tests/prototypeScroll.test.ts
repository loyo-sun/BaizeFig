import { it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import {
  emptyDocument,
  makeNode,
  validateDocument,
  execute,
} from "../src/core";
import {
  scrollToTarget,
  scrollLimits,
  scrolledDocument,
} from "../src/prototypeScroll";
import { transitionPrototype } from "../src/prototype";
function fixture() {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.name = "滚动原型验收";
  d.nodes = [
    makeNode("frame", p, {
      id: "screen",
      name: "滚动画板",
      width: 500,
      height: 400,
      fill: "#ffffff",
    }),
    makeNode("frame", p, {
      id: "button",
      parentId: "screen",
      name: "滚动到底部",
      x: 30,
      y: 30,
      width: 200,
      height: 60,
      fill: "#0d99ff",
      interactions: [
        {
          trigger: "click",
          actions: [
            {
              type: "scrollTo",
              targetId: "destination",
              offset: { x: 0, y: -20 },
            },
          ],
        },
      ],
    }),
    makeNode("text", p, {
      id: "hint",
      parentId: "button",
      x: 10,
      y: 15,
      text: "点击滚动到底部",
      fontSize: 20,
      fill: "#ffffff",
      width: 200,
      height: 40,
    }),
    makeNode("frame", p, {
      id: "destination",
      parentId: "screen",
      name: "目标区域",
      x: 30,
      y: 700,
      width: 300,
      height: 100,
      fill: "#35a968",
      interactions: [
        {
          trigger: "click",
          actions: [
            {
              type: "scrollTo",
              targetId: "button",
              transition: "animate",
              durationMs: 250,
            },
          ],
        },
      ],
    }),
    makeNode("text", p, {
      id: "bottom-label",
      parentId: "destination",
      x: 20,
      y: 35,
      text: "已到目标 · 点击返回",
      fontSize: 20,
      width: 260,
      height: 40,
      fill: "#ffffff",
    }),
    makeNode("rectangle", p, {
      id: "extent",
      parentId: "screen",
      x: 0,
      y: 1100,
      width: 500,
      height: 10,
      fill: "#e5e5e5",
    }),
  ];
  return d;
}
it("scrolls to any layer, applies offsets, preserves navigation history and does not mutate the design", () => {
  const d = fixture(),
    before = JSON.stringify(d),
    s = transitionPrototype(
      d,
      { frameId: "screen", overlays: [], history: ["previous"] },
      [{ type: "scrollTo", targetId: "destination", offset: { x: 0, y: -20 } }],
    );
  expect(s.scrolls?.screen).toEqual({ x: 0, y: 680 });
  expect(s.history).toEqual(["previous"]);
  expect(s.frameId).toBe("screen");
  expect(JSON.stringify(d)).toBe(before);
  const rendered = scrolledDocument(d, s.scrolls!);
  expect(rendered.nodes.find((n) => n.id === "destination")!.y).toBe(20);
  validateDocument(d);
  if (process.env.SCROLL_FIXTURE_PATH)
    writeFileSync(process.env.SCROLL_FIXTURE_PATH, JSON.stringify(d));
});
it("clamps to content bounds, supports both axes and top-level viewport dimensions", () => {
  const d = fixture();
  d.nodes.find((n) => n.id === "destination")!.x = 900;
  expect(
    scrollToTarget(
      d,
      "screen",
      "destination",
      {},
      { screen: { width: 500, height: 300 } },
    ).screen,
  ).toEqual({ x: 700, y: 700 });
  expect(
    scrollToTarget(
      d,
      "screen",
      "button",
      { screen: { x: 700, y: 700 } },
      {},
      { x: -1000, y: -1000 },
    ).screen,
  ).toEqual({ x: 0, y: 0 });
});
it("scrolls nested containers independently, respecting their allowed axes and clipping", () => {
  const d = fixture(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("frame", p, {
      id: "nested",
      parentId: "screen",
      x: 20,
      y: 100,
      width: 300,
      height: 200,
      prototypeScroll: "vertical",
      fidelity: { size: [300, 200], clipsContent: true },
    }),
    makeNode("rectangle", p, {
      id: "nested-target",
      parentId: "nested",
      x: 100,
      y: 900,
      width: 50,
      height: 50,
    }),
  );
  expect(scrollLimits(d, "nested")).toEqual({ x: 0, y: 750 });
  const s = scrollToTarget(d, "screen", "nested-target");
  expect(s.nested).toEqual({ x: 0, y: 750 });
  expect(s.screen).toEqual({ x: 0, y: 250 });
  expect(scrollLimits(d, "screen").y).toBe(710);
});
it("uses affine target geometry in container coordinates", () => {
  const d = fixture(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("group", p, {
      id: "rotated",
      parentId: "screen",
      x: 100,
      y: 500,
      width: 100,
      height: 100,
      rotation: 90,
    }),
    makeNode("rectangle", p, {
      id: "rotated-target",
      parentId: "rotated",
      x: 30,
      y: 20,
      width: 40,
      height: 60,
    }),
  );
  const s = scrollToTarget(d, "screen", "rotated-target");
  expect(s.screen.x).toBe(0);
  expect(s.screen.y).toBeCloseTo(530);
});
it("does not scroll to another screen or hidden targets; overlay scrolling leaves the base screen alone", () => {
  const d = fixture(),
    p = d.pages[0].id;
  d.nodes.push(
    makeNode("frame", p, { id: "other" }),
    makeNode("rectangle", p, {
      id: "overlay-target",
      parentId: "other",
      y: 600,
      width: 100,
      height: 100,
    }),
  );
  expect(scrollToTarget(d, "screen", "overlay-target")).toEqual({});
  const s = transitionPrototype(
    d,
    { frameId: "screen", overlays: ["other"], history: [] },
    [{ type: "scrollTo", targetId: "overlay-target" }],
  );
  expect(s.scrolls?.screen).toBeUndefined();
  expect(s.scrolls?.other).toBeDefined();
  d.nodes.find((n) => n.id === "destination")!.visible = false;
  expect(scrollToTarget(d, "screen", "destination")).toEqual({});
});
it("round-trips, remaps duplicate scroll targets and removes deleted targets", () => {
  const d = fixture();
  const configured = execute(d, {
    type: "update",
    ids: ["screen"],
    patch: { prototypeScroll: "vertical" },
  }).doc;
  expect(configured.nodes[0].prototypeScroll).toBe("vertical");
  expect(scrolledDocument(configured, {}).nodes[0].fidelity?.clipsContent).toBe(
    true,
  );
  validateDocument(JSON.parse(JSON.stringify(d)));
  const dup = execute(d, { type: "duplicate", ids: ["screen"] }).doc;
  expect(
    dup.nodes.find((n) => n.id !== "button" && n.name.includes("滚动到底部"))!
      .interactions![0].actions[0],
  ).not.toMatchObject({ targetId: "destination" });
  const del = execute(d, { type: "delete", ids: ["destination"] }).doc;
  expect(del.nodes.find((n) => n.id === "button")!.interactions).toEqual([]);
  validateDocument(del);
});
it("rejects invalid offsets, missing targets, timers and scroll modes", () => {
  const d = fixture();
  d.nodes[1].interactions![0].actions = [
    {
      type: "scrollTo",
      targetId: "destination",
      offset: { x: Infinity, y: 0 },
    },
  ];
  expect(() => validateDocument(d)).toThrow("Invalid prototype scroll offset");
  d.nodes[1].interactions![0].actions = [
    { type: "scrollTo", targetId: "missing" },
  ];
  expect(() => validateDocument(d)).toThrow("Invalid prototype target");
  d.nodes[1].interactions![0].actions = [
    { type: "scrollTo", targetId: "destination", durationMs: -1 },
  ];
  expect(() => validateDocument(d)).toThrow();
});
