import { expect, it } from "vitest";
import {
  emptyDocument,
  makeNode,
  execute,
  validateDocument,
} from "../src/core";
import { transitionPrototype } from "../src/prototype";
import {writeFileSync} from 'node:fs';
it('provides a browser fixture for cross-page navigation, overlays and return actions',()=>{
 const d=emptyDocument(),p=d.pages[0].id;d.name='原型兼容验收';d.pages.push({id:'page-2',name:'Page 2'});
 d.nodes=[makeNode('frame',p,{id:'start',name:'Start',x:0,y:0,width:600,height:400,fill:'#eef3ff'}),makeNode('text',p,{id:'start-label',parentId:'start',x:40,y:40,width:400,height:50,text:'跨页原型 / Prototype',fontSize:28}),makeNode('rectangle',p,{id:'next',parentId:'start',name:'Next',x:40,y:140,width:220,height:80,fill:'#0d99ff',interactions:[{trigger:'click',actions:[{type:'navigate',targetId:'end',transition:'dissolve',durationMs:200}]}]}),makeNode('frame','page-2',{id:'end',name:'Destination',x:0,y:0,width:600,height:400,fill:'#e8f8ed'}),makeNode('text','page-2',{id:'end-label',parentId:'end',x:40,y:40,width:450,height:50,text:'跨页跳转成功 / Arrived',fontSize:28}),makeNode('rectangle','page-2',{id:'open',parentId:'end',name:'Open overlay',x:40,y:140,width:220,height:80,fill:'#35a968',interactions:[{trigger:'click',actions:[{type:'overlay',targetId:'overlay'}]}]}),makeNode('rectangle','page-2',{id:'back',parentId:'end',name:'Back',x:300,y:140,width:220,height:80,fill:'#79808c',interactions:[{trigger:'click',actions:[{type:'back'}]}]}),makeNode('frame','page-2',{id:'overlay',name:'Overlay',x:700,y:0,width:300,height:180,fill:'#ffffff',interactions:[{trigger:'click',actions:[{type:'close'}]}]}),makeNode('text','page-2',{id:'overlay-label',parentId:'overlay',x:20,y:40,text:'点击关闭 / Close',width:270,height:60,fontSize:24})];
 validateDocument(d);if(process.env.PROTOTYPE_FIXTURE_PATH)writeFileSync(process.env.PROTOTYPE_FIXTURE_PATH,JSON.stringify(d));
});
it("navigates across pages, opens/swaps/closes overlays, and retains history", () => {
  const d = emptyDocument();
  d.pages.push({ id: "second", name: "Second" });
  d.nodes = [
    makeNode("frame", d.pages[0].id, { id: "a" }),
    makeNode("frame", "second", { id: "b" }),
    makeNode("frame", "second", { id: "overlay" }),
  ];
  let s = transitionPrototype(d, { frameId: "a", overlays: [], history: [] }, [
    {
      type: "navigate",
      targetId: "b",
      transition: "dissolve",
      durationMs: 200,
    },
  ]);
  expect(s).toMatchObject({
    frameId: "b",
    history: ["a"],
    transition: { type: "dissolve", durationMs: 200 },
  });
  s = transitionPrototype(d, s, [
    { type: "overlay", targetId: "overlay" },
    { type: "swap", targetId: "a" },
  ]);
  expect(s.overlays).toEqual(["a"]);
  expect(s.frameId).toBe("b");
  s = transitionPrototype(d, s, [{ type: "close" }, { type: "back" }]);
  expect(s).toMatchObject({ frameId: "a", history: [], overlays: [] });
});
it("retains triggers on save/reload, remaps duplicated links and removes deleted destinations", () => {
  const d = emptyDocument(),
    p = d.pages[0].id;
  d.nodes = [
    makeNode("frame", p, { id: "board" }),
    makeNode("frame", p, { id: "target", parentId: "board" }),
    makeNode("rectangle", p, {
      id: "button",
      parentId: "board",
      interactions: [
        {
          trigger: "hover",
          actions: [{ type: "navigate", targetId: "target" }],
        },
        {
          trigger: "delay",
          delayMs: 100,
          actions: [{ type: "overlay", targetId: "target" }],
        },
      ],
    }),
  ];
  validateDocument(JSON.parse(JSON.stringify(d)));
  const copied = execute(d, { type: "duplicate", ids: ["board"] }).doc,
    newButton = copied.nodes.find((n) => n.name === "Rectangle copy")!;
  expect(newButton.interactions?.[0].actions[0]).not.toMatchObject({
    targetId: "target",
  });
  const deleted = execute(d, { type: "delete", ids: ["target"] }).doc;
  expect(deleted.nodes.find((n) => n.id === "button")?.interactions).toEqual(
    [],
  );
  validateDocument(deleted);
});
it("rejects broken destinations and invalid timer values", () => {
  const d = emptyDocument();
  d.nodes = [
    makeNode("rectangle", d.pages[0].id, {
      interactions: [
        { trigger: "delay", delayMs: Infinity, actions: [{ type: "back" }] },
      ],
    }),
  ];
  expect(() => validateDocument(d)).toThrow("Invalid prototype interaction");
});
