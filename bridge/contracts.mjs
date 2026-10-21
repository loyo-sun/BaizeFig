import { z } from "zod";

const id = z.string().min(1).max(200);
const ids = z.array(id).min(1).max(500);
const number = z.number().finite().min(-1e7).max(1e7);
const size = number.min(0);
const color = z.string().regex(/^(none|#[0-9a-fA-F]{3,8})$/);
const fields = {
  name: z.string().max(1000),
  x: number,
  y: number,
  width: size,
  height: size,
  rotation: number,
  fill: color,
  stroke: color,
  strokeWidth: size,
  radius: size,
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
  text: z.string().max(100000),
  fontSize: size.min(1),
  fontFamily: z.string().min(1).max(300),
  fontWeight: z.number().int().min(1).max(1000),
  textAlign: z.enum(["left", "center", "right"]),
  lineHeight: size.min(0.1),
  layout: z.enum(["none", "horizontal", "vertical", "grid"]),
  gap: size,
  padding: size,
  points: z.array(z.object({ x: number, y: number }).strict()).max(10000),
};
export const nodeSchema = z
  .object({
    id,
    pageId: id,
    parentId: id.nullable().optional(),
    type: z.enum([
      "frame",
      "rectangle",
      "ellipse",
      "line",
      "text",
      "polygon",
      "star",
      "path",
      "group",
    ]),
    ...Object.fromEntries(
      Object.entries(fields).map(([key, schema]) => [key, schema.optional()]),
    ),
  })
  .strict();
const patch = z
  .object(fields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Empty patch");
export const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("create"),
      nodes: z.array(nodeSchema).min(1).max(500),
    })
    .strict(),
  z.object({ type: z.literal("update"), ids, patch }).strict(),
  z.object({ type: z.literal("delete"), ids }).strict(),
  z
    .object({
      type: z.literal("group"),
      ids,
      kind: z.enum(["group", "frame", "component"]).optional(),
    })
    .strict(),
  z.object({ type: z.literal("ungroup"), ids }).strict(),
  z
    .object({
      type: z.literal("duplicate"),
      ids,
      offset: number.optional(),
      independentMain: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("order"),
      ids,
      direction: z.enum(["front", "back", "forward", "backward"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("align"),
      ids,
      axis: z.enum(["left", "center", "right", "top", "middle", "bottom"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("layout"),
      id,
      direction: z.enum(["none", "horizontal", "vertical", "grid"]),
      gap: size.optional(),
      padding: size.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("reparent"),
      ids,
      parentId: id.nullable(),
      targetId: id.optional(),
      after: z.boolean().optional(),
    })
    .strict(),
]);
export const targetShape = { documentId: id, editorId: id };
export const writeShape = {
  ...targetShape,
  expectedRevision: id,
  idempotencyKey: id,
  commands: z.array(commandSchema).min(1).max(100),
};
export const toolSchemas = {
  get_capabilities: z.object({}).strict(),
  get_document: z
    .object({
      documentId: id.optional(),
      editorId: id.optional(),
      pageId: id.optional(),
      ids: ids.optional(),
      fields: z
        .array(
          z.enum(["id", "pageId", "parentId", "type", ...Object.keys(fields)]),
        )
        .min(1)
        .max(40)
        .optional(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(500).default(100),
      expectedRevision: id.optional(),
    })
    .strict(),
  get_selection: z.object(targetShape).strict(),
  get_screenshot: z.object(targetShape).strict(),
  export_svg: z.object(targetShape).strict(),
  preview_commands: z.object(writeShape).strict(),
  apply_commands: z.object(writeShape).strict(),
  get_request_status: z.object({ ...targetShape, idempotencyKey: id }).strict(),
};

const batchHelp =
  ' Read get_document first and substitute its documentId, editorId, revision and pages[0].id. Minimal request: {"documentId":"DOCUMENT_ID","editorId":"EDITOR_ID","expectedRevision":"REVISION","idempotencyKey":"UNIQUE_KEY","commands":[{"type":"create","nodes":[{"id":"rect-1","pageId":"PAGE_ID","type":"rectangle","x":0,"y":0,"width":64,"height":64,"fill":"#3366ff"}]}]}. commands, nodes and points must be JSON arrays, never {"item":...}. Coordinates and sizes must be numbers, not strings; width/height do not accept fill_container or hug_contents. Omit parentId for root nodes or use null, never an empty string. Create parents before children. polygon renders a regular triangle by default; custom polygon vertices are not supported by this MCP contract. path uses points as an unfilled polyline, not SVG path data. Unknown fields are rejected.';
export const commandDescriptions = {
  preview_commands:
    "Validate a batch and return changed IDs without committing; this is not a visual preview. Requires editor write permission and the same target/version/key fields as apply_commands." +
    batchHelp,
  apply_commands:
    "Apply one atomic undoable batch. Requires write permission. On timeout query get_request_status before retrying; only retry the identical request with the same key. If editorId changes, read and review the document before any new write." +
    batchHelp,
};
