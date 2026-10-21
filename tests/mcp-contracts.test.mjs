import { test } from "node:test";
import assert from "node:assert/strict";
import { toolSchemas, commandDescriptions } from "../bridge/contracts.mjs";

test("published minimal example validates for both batch tools", () => {
  const description = commandDescriptions.apply_commands;
  const example = JSON.parse(
    description.split("Minimal request: ")[1].split(". commands,")[0],
  );
  for (const name of ["apply_commands", "preview_commands"]) {
    assert.equal(toolSchemas[name].safeParse(example).success, true);
    const path = structuredClone(example);
    path.commands[0].nodes[0].type = "path";
    path.commands[0].nodes[0].points = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ];
    assert.equal(toolSchemas[name].safeParse(path).success, true);
    for (const mutate of [
      (p) => {
        p.commands = { item: p.commands };
      },
      (p) => {
        p.commands[0].nodes = { item: p.commands[0].nodes };
      },
      (p) => {
        p.commands[0].nodes[0].width = "64";
      },
      (p) => {
        p.commands[0].nodes[0].parentId = "";
      },
      (p) => {
        p.commands[0].nodes[0].points = { item: [] };
      },
    ]) {
      const invalid = structuredClone(example);
      mutate(invalid);
      assert.equal(toolSchemas[name].safeParse(invalid).success, false);
    }
  }
});
