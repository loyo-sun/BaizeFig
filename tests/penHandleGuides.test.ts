import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PenHandleGuides } from "../src/PathDrawingOverlay";

it("connects each independent handle to its anchor rather than connecting the handles together", () => {
  const html = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(PenHandleGuides, {
        zoom: 2,
        anchor: {
          x: 460,
          y: 370,
          incoming: { x: 140, y: -60 },
          outgoing: { x: 50, y: 150 },
        },
      }),
    ),
  );
  expect(html.match(/<line /g)).toHaveLength(2);
  expect(html).toContain('x1="460" y1="370" x2="600" y2="310"');
  expect(html).toContain('x1="460" y1="370" x2="510" y2="520"');
  expect(html).toContain('stroke-width="0.5"');
});
it("omits a collapsed handle's guide without disconnecting the other side", () => {
  const html = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(PenHandleGuides, {
        zoom: 1,
        anchor: {
          x: 100,
          y: 200,
          incoming: { x: 0, y: 0 },
          outgoing: { x: -20, y: 60 },
        },
      }),
    ),
  );
  expect(html.match(/<line /g)).toHaveLength(1);
  expect(html).toContain('x1="100" y1="200" x2="80" y2="260"');
});
