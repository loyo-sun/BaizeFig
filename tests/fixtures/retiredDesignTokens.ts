import { emptyDocument, makeNode } from "../../src/core";
export function retiredDesignTokens() {
  const doc = emptyDocument(),
    p = doc.pages[0].id;
  doc.variables = [{ id: "brand", name: "Brand", value: "#8855cc" }];
  doc.typedVariables = [
    { id: "caption", name: "Caption", type: "string", value: "Preserved text" },
    { id: "hidden", name: "Hidden", type: "boolean", value: false },
    { id: "scale", name: "Scale", type: "number", value: 28 },
  ];
  doc.compositeTokens = [
    {
      id: "body",
      name: "Body",
      type: "typography",
      value: {
        fontFamily: "Inter",
        fontSize: { token: "scale" },
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: 1,
      },
    },
    {
      id: "shadow",
      name: "Shadow",
      type: "shadow",
      value: {
        shadows: [
          {
            type: "drop-shadow",
            color: "#00000040",
            x: 0,
            y: 4,
            radius: 8,
            spread: 0,
            visible: true,
          },
        ],
      },
    },
  ];
  doc.nodes = [
    makeNode("text", p, {
      id: "text",
      name: "Text",
      x: 182,
      y: 280,
      width: 200,
      height: 80,
      text: "Preserved text",
      fontSize: 28,
      fontWeight: 600,
      lineHeight: 1.4,
      fill: "#8855cc",
      variableId: "brand",
      bindings: { text: "caption" },
      compositeBindings: { typography: "body" },
    }),
    makeNode("rectangle", p, {
      id: "rect",
      name: "Card",
      x: 482,
      y: 480,
      width: 200,
      height: 120,
      fill: "#8855cc",
      variableId: "brand",
      compositeBindings: { shadow: "shadow" },
      fidelity: {
        size: [200, 120],
        paints: [{ type: "solid", color: "#8855cc", opacity: 1 }],
      },
    }),
    makeNode("rectangle", p, {
      id: "hidden",
      name: "Hidden",
      x: 182,
      y: 580,
      visible: false,
      bindings: { visible: "hidden" },
    }),
  ];
  return doc;
}
