import { expect, it } from "vitest";
import { pixelColor } from "../src/colorPicker";
it("returns exact sampled RGB and alpha without conflating layer opacity with paint color", () => {
  expect(pixelColor(new Uint8Array([197, 200, 208, 255]))).toEqual({
    fill: "#c5c8d0",
    opacity: 1,
  });
  expect(pixelColor([255, 0, 127, 102])).toEqual({
    fill: "#ff007f",
    opacity: 0.4,
  });
  expect(pixelColor([0, 0, 0, 0])).toEqual({ fill: "#000000", opacity: 0 });
});
