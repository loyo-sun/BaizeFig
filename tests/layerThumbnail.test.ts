import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { LayerThumbnailContent } from "../src/LayerThumbnail";
import { emptyDocument, makeNode, worldTransform } from "../src/core";

it("renders the actual image with its rotated parent's world transform", () => {
  const doc = emptyDocument(),
    pageId = doc.pages[0].id;
  const parent = makeNode("group", pageId, {
    id: "parent",
    x: 80,
    y: 40,
    rotation: 30,
  });
  const image = makeNode("image", pageId, {
    id: "photo",
    parentId: parent.id,
    x: 10,
    y: 20,
    width: 80,
    height: 40,
    image:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZYkAAAAASUVORK5CYII=",
  });
  doc.nodes.push(parent, image);
  const html = renderToStaticMarkup(
    createElement(LayerThumbnailContent, { doc, node: image }),
  );
  expect(html).toContain(`<image href="${image.image}"`);
  expect(html).toContain(`matrix(${worldTransform(doc, parent).join(" ")})`);
  expect(html).not.toContain('data-node-id="parent"');
});

it("previews a hidden group using its real children, excluding hidden children and unrelated layers", () => {
  const doc = emptyDocument(),
    pageId = doc.pages[0].id;
  const group = makeNode("group", pageId, { id: "group", visible: false });
  const shape = makeNode("rectangle", pageId, {
    id: "shape",
    parentId: group.id,
    fill: "#12ab34",
  });
  const hidden = makeNode("ellipse", pageId, {
    id: "hidden",
    parentId: group.id,
    visible: false,
  });
  const other = makeNode("star", pageId, { id: "other" });
  doc.nodes.push(group, shape, hidden, other);
  const html = renderToStaticMarkup(
    createElement(LayerThumbnailContent, { doc, node: group }),
  );
  expect(html).toContain('data-node-id="group"');
  expect(html).toContain('data-node-id="shape"');
  expect(html).toContain('fill="#12ab34"');
  expect(html).not.toContain('data-node-id="hidden"');
  expect(html).not.toContain('data-node-id="other"');
});
