import { reflowText } from "./textLayout";
import { readFigGlyphCache, readFigDecorations } from "./figGlyphCache";
import { figFontSettings } from "./fontSettings";
import {
  resolveFigTypography,
  figFontWeight,
  figTextDecorations,
  figTextLink,
} from "./figTypography";
import { baselineTrail, nearestBaselineOffset } from "./textPath";
import { type PrototypeAction, type PrototypeInteraction } from "./prototype";
import {
  applyTypedBindings,
  resolveTypedVariable,
  type TypedVariable,
  type BindingProperty,
  bindingTypes,
} from "./typedVariables";
import type { ImportedPaint } from "./appearance";
import {
  figPropertyResolver,
  restoreFigComponentModels,
} from "./figComponents";
import { linkImportedComponents } from "./components";
import { resolveVariable } from "./variables";
import { commandsPath, networkPaths, type Fidelity } from "./fidelity";
import { Inflate, unzipSync } from "fflate";
import { Decompress } from "fzstd";
import { ByteBuffer, decodeBinarySchema, type Schema } from "kiwi-schema";
import {
  emptyDocument,
  ancestors,
  makeNode,
  validateDocument,
  type Document,
  type Kind,
} from "./core";

const LIMIT = 64 * 1024 * 1024;
// Separate archive/image and design-message ceilings. A moderately compressed
// design can exceed the archive size while its embedded images remain small.
const MESSAGE_LIMIT = 128 * 1024 * 1024;
type Raw = Record<string, any>;
export interface FigImportResult {
  document: Document;
  report: {
    pages: number;
    layers: number;
    images: number;
    instances: number;
    warnings: string[];
  };
}
const fail = () => Error("Invalid or unsupported Figma file");
function unpack(data: Uint8Array, zstd = false, limit = LIMIT): Uint8Array {
  let parts: Uint8Array[] = [],
    size = 0,
    replay = false;
  const run = (receive: (part: Uint8Array) => void) => {
    const stream = zstd ? new Decompress(receive) : new Inflate(receive);
    for (let p = 0; p < data.length; p += 4096)
      stream.push(data.subarray(p, p + 4096), p + 4096 >= data.length);
  };
  run((part) => {
    size += part.length;
    if (size > limit) throw Error("Figma file exceeds import limits");
    // Small inputs stay single-pass. For large messages retain only the count,
    // then decode into the exact buffer, avoiding two full expanded copies.
    if (size > 16 * 1024 * 1024) {
      replay = true;
      parts = [];
    }
    if (!replay) parts.push(part.slice());
  });
  const out = new Uint8Array(size);
  let offset = 0;
  const append = (part: Uint8Array) => {
    if (offset + part.length > size) throw fail();
    out.set(part, offset);
    offset += part.length;
  };
  if (replay) run(append);
  else parts.forEach(append);
  if (offset !== size) throw fail();
  return out;
}
// Interpret the embedded schema as data. Never generate/execute code from file contents.
export function decodeFigMessage(schema: Schema, data: Uint8Array): Raw {
  const defs = new Map(schema.definitions.map((d) => [d.name, d]));
  const taggedFields = new Map(
    schema.definitions.map((d) => [
      d.name,
      new Map(d.fields.map((f) => [f.value, f])),
    ]),
  );
  const bb = new ByteBuffer(data);
  let budget = Math.min(48000000, Math.max(3000000, data.length * 2));
  let objectBudget = Math.min(
    6500000,
    Math.max(1000000, Math.floor(data.length / 10)),
  );
  function read(type: string, depth: number): any {
    if (--budget < 0 || depth > 100)
      throw Error("Figma file exceeds import limits");
    switch (type) {
      case "bool":
        return !!bb.readByte();
      case "byte":
        return bb.readByte();
      case "int":
        return bb.readVarInt();
      case "uint":
        return bb.readVarUint();
      case "float":
        return bb.readVarFloat();
      case "string":
        return bb.readString();
      case "int64":
        return bb.readVarInt64();
      case "uint64":
        return bb.readVarUint64();
    }
    const def = defs.get(type);
    if (!def) throw fail();
    if (def.kind === "ENUM") {
      const value = bb.readVarUint();
      return def.fields.find((f) => f.value === value)?.name;
    }
    if (--objectBudget < 0) throw Error("Figma file exceeds import limits");
    // Retain null-prototype records without eagerly choosing dictionary storage.
    const result: Raw = Object.setPrototypeOf({}, null);
    const field = (f: (typeof def.fields)[number]) => {
      if (!f.type) throw fail();
      let value: any;
      if (f.isArray) {
        if (f.type === "byte") value = bb.readByteArray();
        else {
          const count = bb.readVarUint();
          if (count > 200000 || count > data.length)
            throw Error("Figma file exceeds import limits");
          value = Array.from({ length: count }, () => read(f.type!, depth + 1));
        }
      } else value = read(f.type, depth + 1);
      if (!f.isDeprecated) result[f.name] = value;
    };
    if (def.kind === "STRUCT") def.fields.forEach(field);
    else {
      const fields = taggedFields.get(type)!;
      for (;;) {
        if (--budget < 0) throw Error("Figma file exceeds import limits");
        const tag = bb.readVarUint();
        if (tag === 0) break;
        const f = fields.get(tag);
        if (!f) throw fail();
        field(f);
      }
    }
    return result;
  }
  return read("Message", 0);
}
const guid = (v?: Raw) =>
  v && Number.isInteger(v.sessionID) && Number.isInteger(v.localID)
    ? `${v.sessionID}:${v.localID}`
    : "";
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const color = (c?: Raw, opacity = 1) =>
  c
    ? "#" +
      [c.r, c.g, c.b, (c.a ?? 1) * opacity]
        .map((v) =>
          Math.round(clamp(v ?? 0) * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    : "none";
function dataURL(bytes: Uint8Array): string | undefined {
  const mime =
    bytes[0] === 137 && bytes[1] === 80
      ? "png"
      : bytes[0] === 255 && bytes[1] === 216
        ? "jpeg"
        : new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
          ? "webp"
          : new TextDecoder().decode(bytes.slice(0, 3)) === "GIF"
            ? "gif"
            : undefined;
  if (!mime) return;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:image/${mime};base64,${btoa(binary)}`;
}
export function importFig(
  input: Uint8Array,
  filename = "Untitled.fig",
): FigImportResult {
  try {
    return importFigArchive(readFigArchive(input), filename);
  } catch (e) {
    if (
      e instanceof Error &&
      [
        "Figma file exceeds import limits",
        "No supported pages in Figma file",
      ].includes(e.message)
    )
      throw e;
    throw fail();
  }
}
export function readFigArchive(input: Uint8Array) {
  if (input.length > 50 * 1024 * 1024)
    throw Error("Figma file exceeds import limits");
  let files: Record<string, Uint8Array> = {},
    bytes = input;
  let total = 0;
  if (input[0] === 80 && input[1] === 75) {
    files = unzipSync(input, {
      filter: (entry) => {
        if (
          !/^(canvas\.fig|meta\.json|images\/[a-f0-9]{40})$/i.test(entry.name)
        )
          return false;
        total += entry.originalSize;
        if (entry.originalSize > LIMIT || total > LIMIT)
          throw Error("Figma file exceeds import limits");
        return true;
      },
    });
    bytes = files["canvas.fig"];
  }
  if (
    !bytes ||
    bytes.length < 20 ||
    new TextDecoder().decode(bytes.slice(0, 8)) !== "fig-kiwi"
  )
    throw fail();
  const chunks: Uint8Array[] = [];
  for (let p = 12; p < bytes.length;) {
    if (p + 4 > bytes.length) throw fail();
    const size = new DataView(bytes.buffer, bytes.byteOffset + p, 4).getUint32(
      0,
      true,
    );
    p += 4;
    if (!size || p + size > bytes.length || chunks.length > 8) throw fail();
    chunks.push(bytes.subarray(p, p + size));
    p += size;
  }
  if (chunks.length < 2) throw fail();
  const schema = decodeBinarySchema(unpack(chunks[0]));
  const payload = chunks[1];
  const message = decodeFigMessage(
    schema,
    unpack(payload, payload[0] === 0x28 && payload[1] === 0xb5, MESSAGE_LIMIT),
  );
  if (
    !Array.isArray(message.nodeChanges) ||
    message.nodeChanges.length > 150000
  )
    throw fail();
  let meta: Raw = {};
  if (files["meta.json"]) {
    try {
      meta = JSON.parse(new TextDecoder().decode(files["meta.json"]));
    } catch {
      /* optional metadata */
    }
  }
  return { files, bytes, chunks, schema, message, meta };
}
export interface FigPageSummary {
  id: string;
  name: string;
  layers: number;
  parts?: { id: string; name: string; layers: number }[];
}
export function figPageSummaries(
  archive: ReturnType<typeof readFigArchive>,
): FigPageSummary[] {
  const source: Raw[] = archive.message.nodeChanges;
  const index = new Map(source.map((n) => [guid(n.guid), n]));
  const pages = new Map<string, FigPageSummary>(
    source
      .filter((n) => n.type === "CANVAS" && n.visible !== false)
      .map((n) => [
        guid(n.guid),
        { id: guid(n.guid), name: n.name ?? "Page", layers: 0 },
      ]),
  );
  const owners = new Map<string, string | undefined>();
  function owner(id: string, seen = new Set<string>()): string | undefined {
    if (owners.has(id)) return owners.get(id);
    if (pages.has(id)) return id;
    if (!id || seen.has(id) || seen.size > 100) return;
    seen.add(id);
    const n = index.get(id);
    const value = n && owner(guid(n.parentIndex?.guid), seen);
    owners.set(id, value);
    return value;
  }
  for (const n of source) {
    if (n.type === "CANVAS" || !n.size) continue;
    const id = owner(guid(n.guid));
    if (id) pages.get(id)!.layers++;
  }
  const partOwners = new Map<string, string | undefined>();
  const parts = new Map<string, { id: string; name: string; layers: number }>();
  for (const n of source)
    if (pages.has(guid(n.parentIndex?.guid)) && n.size) {
      const part = { id: guid(n.guid), name: n.name ?? n.type, layers: 0 };
      parts.set(part.id, part);
      (pages.get(guid(n.parentIndex.guid))!.parts ??= []).push(part);
    }
  function partOwner(id: string, seen = new Set<string>()): string | undefined {
    if (parts.has(id)) return id;
    if (partOwners.has(id)) return partOwners.get(id);
    if (!id || seen.has(id) || seen.size > 100) return;
    seen.add(id);
    const n = index.get(id),
      value = n && partOwner(guid(n.parentIndex?.guid), seen);
    partOwners.set(id, value);
    return value;
  }
  for (const n of source)
    if (n.size) {
      const id = partOwner(guid(n.guid));
      if (id) parts.get(id)!.layers++;
    }
  return [...pages.values()];
}
export function importFigArchive(
  archive: ReturnType<typeof readFigArchive>,
  filename = "Untitled.fig",
  pageIds?: string[],
): FigImportResult {
  const { files, message, meta } = archive;
  const summaries = pageIds ? figPageSummaries(archive) : [];
  const selection = pageIds && new Set(pageIds);
  const allowed = new Set(
    summaries.flatMap((p) => [p.id, ...(p.parts ?? []).map((part) => part.id)]),
  );
  if (
    selection &&
    (!selection.size || [...selection].some((id) => !allowed.has(id)))
  )
    throw Error("No supported pages in Figma file");
  const selectedPages = new Set(
    summaries
      .filter(
        (p) =>
          selection?.has(p.id) ||
          p.parts?.some((part) => selection?.has(part.id)),
      )
      .map((p) => p.id),
  );
  const source: Raw[] = message.nodeChanges;
  const index = new Map(source.map((n) => [guid(n.guid), n]));
  const resolveProperty = figPropertyResolver(source);
  const propertyId = (value: Raw) =>
    resolveProperty(guid(value))?.canonical ?? guid(value);
  for (const node of source) {
    const seen = new Set<string>();
    let current: Raw | undefined = node;
    while (current) {
      const key = guid(current.guid);
      if (seen.has(key) || seen.size > 100) throw fail();
      seen.add(key);
      current = index.get(guid(current.parentIndex?.guid));
    }
  }
  const children = new Map<string, Raw[]>();
  for (const n of source) {
    const parent = guid(n.parentIndex?.guid);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(n);
  }
  for (const list of children.values())
    list.sort((a, b) =>
      (a.parentIndex?.position ?? "") < (b.parentIndex?.position ?? "")
        ? -1
        : (a.parentIndex?.position ?? "") > (b.parentIndex?.position ?? "")
          ? 1
          : 0,
    );
  const doc = emptyDocument();
  doc.name =
    typeof meta.file_name === "string"
      ? meta.file_name
      : filename.replace(/\.fig$/i, "");
  doc.pages = [];
  doc.nodes = [];
  doc.background =
    color(meta.client_meta?.background_color) === "none"
      ? "#f5f5f5"
      : color(meta.client_meta?.background_color);
  const warnings = new Set<string>();
  const rawRef = (ref: Raw | undefined) =>
    ref?.guid
      ? index.get(guid(ref.guid))
      : ref?.assetRef?.key
        ? source.find((n) => n.key === ref.assetRef.key)
        : undefined;
  const variableId = (n: Raw) => "figvar:" + guid(n.guid);
  doc.variableCollections = [];
  doc.variables = [];
  doc.typedVariables = [];
  for (const variable of source.filter(
    (n) =>
      n.type === "VARIABLE" &&
      ["COLOR", "FLOAT", "STRING", "BOOLEAN"].includes(n.variableResolvedType),
  )) {
    const entries: Raw[] = variable.variableDataValues?.entries ?? [];
    const set = rawRef(variable.variableSetID),
      collectionId =
        "figset:" +
        (set
          ? guid(set.guid)
          : (variable.variableSetID?.assetRef?.key ?? guid(variable.guid)));
    if (!doc.variableCollections.some((c) => c.id === collectionId)) {
      const modes = (
        set?.variableSetModes ??
        entries.map((e) => ({ id: e.modeID, name: "Mode " + guid(e.modeID) }))
      ).map((m: Raw) => ({ id: guid(m.id), name: m.name }));
      if (!modes.length) continue;
      doc.variableCollections.push({
        id: collectionId,
        name: set?.name ?? "Imported colors",
        modes,
        activeMode: modes[0].id,
      });
    }
    if (variable.variableResolvedType !== "COLOR") {
      const type =
        variable.variableResolvedType === "FLOAT"
          ? "number"
          : variable.variableResolvedType === "BOOLEAN"
            ? "boolean"
            : "string";
      const values: NonNullable<TypedVariable["values"]> = {};
      for (const entry of entries) {
        const value = entry.variableData?.value,
          alias = rawRef(value?.alias),
          scalar =
            type === "number"
              ? value?.floatValue
              : type === "boolean"
                ? value?.boolValue
                : value?.textValue;
        if (alias) values[guid(entry.modeID)] = { alias: variableId(alias) };
        else if (typeof scalar === type)
          values[guid(entry.modeID)] = { value: scalar };
      }
      if (Object.keys(values).length)
        doc.typedVariables.push({
          id: variableId(variable),
          name: variable.name ?? "Variable",
          type,
          collectionId,
          value: type === "number" ? 0 : type === "boolean" ? false : "",
          values,
        });
      continue;
    }
    const values: Record<string, { color: string } | { alias: string }> = {};
    for (const entry of entries) {
      const value = entry.variableData?.value;
      if (value?.colorValue)
        values[guid(entry.modeID)] = {
          color: color(value.colorValue),
        };
      else if (value?.alias) {
        const alias = rawRef(value.alias);
        if (alias) values[guid(entry.modeID)] = { alias: variableId(alias) };
      }
    }
    if (Object.keys(values).length)
      doc.variables.push({
        id: variableId(variable),
        name: variable.name ?? "Color",
        value: "#000000",
        collectionId,
        values,
      });
  }
  for (const variable of doc.typedVariables) {
    for (const [mode, entry] of Object.entries(variable.values ?? {}))
      if (
        "alias" in entry &&
        !doc.typedVariables.some(
          (v) => v.id === entry.alias && v.type === variable.type,
        )
      ) {
        delete variable.values![mode];
        warnings.add("Some variable aliases could not be resolved.");
      }
  }
  for (const variable of doc.typedVariables) {
    try {
      variable.value = resolveTypedVariable(doc, variable.id);
    } catch {
      delete variable.values;
      warnings.add("Some variable aliases could not be resolved.");
    }
  }
  // Preserve unresolved references as a reported limitation rather than inventing a color.
  for (const variable of doc.variables) {
    for (const [mode, value] of Object.entries(variable.values ?? {}))
      if (
        "alias" in value &&
        !doc.variables.some((v) => v.id === value.alias)
      ) {
        delete variable.values![mode];
        warnings.add(
          "Some variable aliases or non-color variables could not be restored.",
        );
      }
  }
  for (const variable of doc.variables) {
    try {
      variable.value = resolveVariable(doc, variable.id);
    } catch {
      delete variable.values;
      warnings.add(
        "Some variable aliases or non-color variables could not be restored.",
      );
    }
  }

  if (source.some((n) => n.type === "CANVAS" && n.visible === false))
    warnings.add(
      "Hidden page component definitions are retained in the document library.",
    );
  let images = 0,
    instances = 0;
  const glyphContourCache = new Map<number, string>();
  const imageCache = new Map<string, string | undefined>();
  const mapping: Record<string, Kind> = {
    FRAME: "frame",
    GROUP: "group",
    SYMBOL: "component",
    INSTANCE: "group",
    RECTANGLE: "rectangle",
    ROUNDED_RECTANGLE: "rectangle",
    ELLIPSE: "ellipse",
    LINE: "line",
    STAR: "star",
    REGULAR_POLYGON: "polygon",
    VECTOR: "path",
    BRUSH: "path",
    TEXT_PATH: "text",
    BOOLEAN_OPERATION: "group",
    SECTION: "frame",
  };
  function parseTracks(
    positions: Raw | undefined,
    sizing: Raw | undefined,
  ): import("./layout").Track[] {
    return [...(positions?.entries ?? [])]
      .sort((a, b) => (a.position < b.position ? -1 : 1))
      .map((entry: Raw) => {
        const size =
          sizing?.entries?.find((e: Raw) => guid(e.id) === guid(entry.id))
            ?.trackSize?.maxSizing ?? {};
        return {
          kind:
            size.type === "FIXED"
              ? "fixed"
              : size.type === "HUG"
                ? "hug"
                : "fr",
          value: Math.max(0, size.value ?? 1),
        };
      });
  }
  function add(
    raw: Raw,
    pageId: string,
    parentId: string | null,
    path: Set<string>,
    inheritedOverrides: Raw[] = [],
    assignments: Raw[] = [],
    explicitFields = new Set<string>(),
  ) {
    const key = guid(raw.guid);
    if (path.has(key) || path.size > 60) throw fail();
    if (doc.nodes.length >= 20000)
      throw Error("Figma file exceeds import limits");
    if (
      !raw.size ||
      raw.styleType ||
      ["VARIABLE", "VARIABLE_SET", "DOCUMENT", "CANVAS"].includes(raw.type)
    )
      return;
    const nextPath = new Set(path).add(key);
    let swapped = false;
    for (const ref of raw.componentPropRefs ?? []) {
      const assigned = [...assignments]
        .reverse()
        .find((a) => propertyId(a.defID) === propertyId(ref.defID))?.value;
      if (
        ref.componentPropNodeField === "VISIBLE" &&
        typeof assigned?.boolValue === "boolean"
      )
        raw = { ...raw, visible: assigned.boolValue };
      if (
        ref.componentPropNodeField === "OVERRIDDEN_SYMBOL_ID" &&
        raw.type === "INSTANCE" &&
        index.get(guid(assigned?.guidValue))?.type === "SYMBOL"
      ) {
        swapped = guid(raw.symbolData?.symbolID) !== guid(assigned.guidValue);
        raw = {
          ...raw,
          symbolData: { ...raw.symbolData, symbolID: assigned.guidValue },
        };
      }
    }
    const base =
      raw.type === "INSTANCE"
        ? index.get(guid(raw.symbolData?.symbolID))
        : undefined;
    let r = resolveFigTypography(
      { ...base, ...raw },
      rawRef,
      warnings,
      explicitFields,
    );
    if (raw.type === "INSTANCE") {
      instances++;
      warnings.add(
        "Component instances preserve saved overrides and can synchronize with the main component.",
      );
    }
    let kind: Kind | undefined = r.type === "TEXT" ? "text" : mapping[r.type];
    if (!kind) {
      warnings.add("Some unsupported layers were skipped.");
      return;
    }

    const paints: Raw[] = (r.fillPaints ?? []).filter(
      (p: Raw) => p.visible !== false,
    );
    const paint = paints[0];
    let image: string | undefined;
    if (paint?.type === "IMAGE") {
      const hash = Array.from(paint.image?.hash ?? ([] as number[]), (v: any) =>
        Number(v).toString(16).padStart(2, "0"),
      ).join("");
      if (!imageCache.has(hash))
        imageCache.set(
          hash,
          files["images/" + hash]
            ? dataURL(files["images/" + hash])
            : undefined,
        );
      image = imageCache.get(hash);
      if (image) {
        if (!["frame", "group", "component"].includes(kind)) kind = "image";
        images++;
      } else warnings.add("Some image resources are missing or unsupported.");
    }
    const stroke: Raw | undefined = (r.strokePaints ?? []).find(
      (p: Raw) => p.visible !== false && p.type === "SOLID",
    );
    const transform = r.transform ?? {};
    const supportedLayout = ["HORIZONTAL", "VERTICAL", "GRID"].includes(
      r.stackMode,
    );
    const size = r.fontSize ?? 16;
    const letterSpacing =
      r.letterSpacing?.units === "PERCENT"
        ? ((r.letterSpacing.value ?? 0) * size) / 100
        : (r.letterSpacing?.value ?? 0);
    let text = r.textData?.characters ?? "";
    for (const ref of r.componentPropRefs ?? []) {
      const assignment = [...assignments]
        .reverse()
        .find((a) => propertyId(a.defID) === propertyId(ref.defID));
      if (
        ref.componentPropNodeField === "TEXT_DATA" &&
        assignment?.value?.textValue?.characters !== undefined
      )
        text = assignment.value.textValue.characters;
    }
    // Serialized float geometry can undershoot zero by a few millionths.
    // Normalize only that tolerance, never accept materially negative sizes.
    const dimension = (v: number | undefined) =>
      v !== undefined && v < 0 && v >= -0.0001 ? 0 : (v ?? 0);
    const fidelity: Fidelity = {
      size: [dimension(r.size.x), dimension(r.size.y)],
      linear: [
        transform.m00 ?? 1,
        transform.m10 ?? 0,
        transform.m01 ?? 0,
        transform.m11 ?? 1,
      ],
      sourceId: key,
    };
    if (base) fidelity.componentSourceId = guid(base.guid);
    fidelity.clipsContent = r.frameMaskDisabled !== true;
    fidelity.corners = [
      r.rectangleTopLeftCornerRadius ?? r.cornerRadius ?? 0,
      r.rectangleTopRightCornerRadius ?? r.cornerRadius ?? 0,
      r.rectangleBottomRightCornerRadius ?? r.cornerRadius ?? 0,
      r.rectangleBottomLeftCornerRadius ?? r.cornerRadius ?? 0,
    ];
    const blend =
      r.blendMode && r.blendMode !== "PASS_THROUGH"
        ? r.blendMode.toLowerCase().replace(/_/g, "-")
        : "normal";
    if (
      [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
        "hue",
        "saturation",
        "color",
        "luminosity",
      ].includes(blend)
    )
      fidelity.blendMode = blend;
    else warnings.add("Some blend modes are not supported.");
    if (r.type === "REGULAR_POLYGON" || r.type === "STAR") {
      fidelity.pointCount = Math.max(
        3,
        Math.min(1000, r.count ?? (r.type === "STAR" ? 5 : 3)),
      );
      if (r.type === "STAR")
        fidelity.innerRatio = Math.max(
          0,
          Math.min(1, r.starInnerScale ?? 0.44),
        );
    }
    if (r.type === "BOOLEAN_OPERATION")
      fidelity.booleanOperation =
        r.booleanOperation === "SUBTRACT"
          ? "subtract"
          : r.booleanOperation === "INTERSECT"
            ? "intersect"
            : r.booleanOperation === "EXCLUDE"
              ? "exclude"
              : "union";
    if (r.isMask)
      fidelity.mask = r.maskType === "LUMINANCE" ? "luminance" : "alpha";
    if (r.effects?.length)
      fidelity.effects = r.effects
        .filter((e: Raw) => e.visible !== false)
        .flatMap((e: Raw) => {
          const type =
            e.type === "DROP_SHADOW"
              ? "drop-shadow"
              : e.type === "INNER_SHADOW"
                ? "inner-shadow"
                : (e.type === "LAYER_BLUR" || e.type === "FOREGROUND_BLUR")
                  ? "blur"
                  : e.type === "BACKGROUND_BLUR"
                    ? "background-blur"
                    : undefined;
          if (!type) {
            warnings.add("Some effect types are not supported.");
            return [];
          }
          return [
            {
              type,
              color: color(e.color ?? { r: 0, g: 0, b: 0, a: 1 }),
              radius: Math.max(0, e.radius ?? 0),
              spread: e.spread ?? 0,
              x: e.offset?.x ?? 0,
              y: e.offset?.y ?? 0,
              visible: e.visible !== false,
            },
          ];
        });
    fidelity.strokeCap =
      r.strokeCap === "ROUND"
        ? "round"
        : r.strokeCap === "SQUARE"
          ? "square"
          : "butt";
    fidelity.strokeJoin =
      r.strokeJoin === "ROUND"
        ? "round"
        : r.strokeJoin === "BEVEL"
          ? "bevel"
          : "miter";
    if (image) {
      const t = paint?.transform ?? {};
      fidelity.image = {
        mode:
          paint?.imageScaleMode === "FIT"
            ? "fit"
            : paint?.imageScaleMode === "TILE"
              ? "tile"
              : paint?.imageScaleMode === "STRETCH"
                ? "crop"
                : "fill",
        transform: [
          t.m00 ?? 1,
          t.m10 ?? 0,
          t.m01 ?? 0,
          t.m11 ?? 1,
          t.m02 ?? 0,
          t.m12 ?? 0,
        ],
        width: paint?.originalImageWidth || r.size.x || 1,
        height: paint?.originalImageHeight || r.size.y || 1,
        scale: paint?.scale > 0 ? paint.scale : 1,
        opacity: clamp(paint?.opacity ?? 1),
      };
    }
    fidelity.strokeAlign =
      r.strokeAlign === "INSIDE"
        ? "inside"
        : r.strokeAlign === "OUTSIDE"
          ? "outside"
          : "center";
    if (Number.isFinite(r.strokeMiterLimit) && r.strokeMiterLimit >= 1)
      fidelity.strokeMiterLimit = r.strokeMiterLimit;
    if (
      Array.isArray(r.dashPattern) &&
      r.dashPattern.length &&
      r.dashPattern.every(
        (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0,
      )
    )
      fidelity.strokeDash = r.dashPattern;
    if (r.type === "VECTOR" || r.type === "BRUSH") {
      const blob = (i: number) =>
        message.blobs?.[i]?.bytes as Uint8Array | undefined;
      try {
        const paths = [];
        for (const [entries, strokeOutline] of [
          [r.fillGeometry ?? [], false],
          [r.strokeGeometry ?? [], true],
        ] as const) {
          for (const entry of entries) {
            const data = blob(entry.commandsBlob);
            if (!data) throw Error();
            const d = commandsPath(data);
            if (!d) continue;
            const override = r.vectorData?.styleOverrideTable?.find(
              (o: Raw) => o.styleID === entry.styleID,
            );
            const paints = strokeOutline
              ? override?.strokePaints
              : override?.fillPaints;
            const p = paints?.find((p: Raw) => p.visible !== false);
            paths.push({
              d,
              rule:
                entry.windingRule === "ODD"
                  ? ("evenodd" as const)
                  : ("nonzero" as const),
              strokeOutline,
              ...(paints
                ? {
                    color:
                      p?.type === "SOLID"
                        ? color(p.color, p.opacity ?? 1)
                        : "none",
                  }
                : {}),
            });
          }
        }
        if (r.type === "BRUSH" && !paths.length) throw Error();
        fidelity.paths = paths.length
          ? paths
          : networkPaths(
              blob(r.vectorData?.vectorNetworkBlob) ?? new Uint8Array(),
              r.size.x,
              r.size.y,
              r.vectorData?.normalizedSize ?? r.size,
            );
        if (r.type === "BRUSH")
          warnings.add(
            "Brush strokes use editable outline paths; brush dynamics are not retained.",
          );
      } catch {
        kind = "rectangle";
        warnings.add(
          "Some vector geometry could not be decoded and uses bounds.",
        );
      }
    }
    if (kind === "text") {
      const lines = r.derivedTextData?.baselines ?? r.textData?.baselines;
      if (
        lines?.length &&
        lines.every(
          (l: Raw) =>
            Number.isInteger(l.firstCharacter) &&
            Number.isInteger(l.endCharacter) &&
            l.endCharacter <= text.length,
        )
      )
        fidelity.text = {
          characters: text,
          lines: lines.map((l: Raw) => ({
            start: l.firstCharacter,
            end: l.endCharacter,
            x: l.position.x,
            y: l.position.y,
          })),
          letterSpacing,
        };
    }
    let importedRuns: NonNullable<NonNullable<Fidelity["text"]>["spans"]> = [];
    if (kind === "text") {
      const ids: number[] = r.textData?.characterStyleIDs ?? [],
        table: Raw[] = r.textData?.styleOverrideTable ?? [];
      const spans: NonNullable<NonNullable<Fidelity["text"]>["spans"]> = [];
      for (let start = 0; start < Math.min(ids.length, text.length);) {
        let end = start + 1;
        while (
          end < Math.min(ids.length, text.length) &&
          ids[end] === ids[start]
        )
          end++;
        const style = table.find((t) => t.styleID === ids[start]);
        if (style) {
          const solid = style.fillPaints?.find(
            (p: Raw) => p.visible !== false && p.type === "SOLID",
          );
          spans.push({
            ...(style.hyperlink !== undefined
              ? { href: figTextLink(style.hyperlink) }
              : {}),
            fontSettings: figFontSettings(style),
            start,
            end,
            ...(solid ? { fill: color(solid.color, solid.opacity ?? 1) } : {}),
            ...(style.fontName?.family
              ? { fontFamily: style.fontName.family }
              : {}),
            ...(style.fontSize ? { fontSize: style.fontSize } : {}),
            ...(style.textDecoration !== undefined
              ? {
                  underline: style.textDecoration === "UNDERLINE",
                  strikethrough: style.textDecoration === "STRIKETHROUGH",
                }
              : {}),
            ...(style.fontName?.style
              ? {
                  italic: /italic/i.test(style.fontName.style),
                  fontWeight: figFontWeight(
                    style.fontName.style,
                    r.derivedTextData?.fontMetaData,
                    style.fontName.family,
                  ),
                }
              : {}),
          });
        }
        start = end;
      }
      const decorated = figTextDecorations(text, r, spans);
      importedRuns = decorated as typeof spans;
      if (decorated.length && fidelity.text) fidelity.text.spans = importedRuns;
    }
    function convertPaints(source: Raw[]): ImportedPaint[] {
      return source
        .filter((p) => p.visible !== false)
        .flatMap<ImportedPaint>((p) => {
          if (p.type === "SOLID")
            return [
              {
                type: "solid" as const,
                color: color(p.color),
                opacity: clamp(p.opacity ?? 1),
              },
            ];
          if (
            ["GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_DIAMOND"].includes(
              p.type,
            )
          ) {
            const t = p.transform ?? {};
            return [
              {
                type:
                  p.type === "GRADIENT_LINEAR"
                    ? ("linear" as const)
                    : p.type === "GRADIENT_RADIAL"
                      ? ("radial" as const)
                      : ("diamond" as const),
                opacity: clamp(p.opacity ?? 1),
                transform: [
                  t.m00 ?? 1,
                  t.m10 ?? 0,
                  t.m01 ?? 0,
                  t.m11 ?? 1,
                  t.m02 ?? 0,
                  t.m12 ?? 0,
                ] as [number, number, number, number, number, number],
                stops: (p.stops ?? []).map((s: Raw) => ({
                  position: clamp(s.position),
                  color: color(s.color),
                })),
              },
            ];
          }
          if (p.type === "IMAGE") {
            const hash = Array.from(p.image?.hash ?? [], (v: any) =>
                Number(v).toString(16).padStart(2, "0"),
              ).join(""),
              url = files["images/" + hash]
                ? dataURL(files["images/" + hash])
                : undefined,
              t = p.transform ?? {};
            if (url)
              return [
                {
                  type: "image" as const,
                  image: url,
                  opacity: clamp(p.opacity ?? 1),
                  imageOptions: {
                    mode:
                      p.imageScaleMode === "FIT"
                        ? ("fit" as const)
                        : p.imageScaleMode === "TILE"
                          ? ("tile" as const)
                          : p.imageScaleMode === "STRETCH"
                            ? ("crop" as const)
                            : ("fill" as const),
                    transform: [
                      t.m00 ?? 1,
                      t.m10 ?? 0,
                      t.m01 ?? 0,
                      t.m11 ?? 1,
                      t.m02 ?? 0,
                      t.m12 ?? 0,
                    ] as [number, number, number, number, number, number],
                    width: p.originalImageWidth || r.size.x || 1,
                    height: p.originalImageHeight || r.size.y || 1,
                    scale: p.scale > 0 ? p.scale : 1,
                    opacity: 1,
                  },
                },
              ];
          }
          warnings.add("Some fill types are not supported.");
          return [];
        });
    }
    if (paints.length > 1 || paints.some((p) => p.type.startsWith("GRADIENT")))
      fidelity.paints = convertPaints(paints);
    for (const path of fidelity.paths ?? []) {
      const entries = path.strokeOutline ? r.strokeGeometry : r.fillGeometry;
      const index = (fidelity.paths ?? [])
        .filter((p) => !!p.strokeOutline === !!path.strokeOutline)
        .indexOf(path);
      const override = r.vectorData?.styleOverrideTable?.find(
        (o: Raw) => o.styleID === entries?.[index]?.styleID,
      );
      const source = path.strokeOutline
        ? (override?.strokePaints ?? r.strokePaints)
        : override?.fillPaints;
      if (source) {
        path.paints = convertPaints(source);
        if (path.paints.length) delete path.color;
        else path.color = "none";
      }
    }
    if (r.type === "VECTOR" && r.vectorData?.vectorNetworkBlob !== undefined) {
      try {
        networkPaths(
          message.blobs?.[r.vectorData.vectorNetworkBlob]?.bytes ??
            new Uint8Array(),
          r.size.x,
          r.size.y,
          r.vectorData.normalizedSize ?? r.size,
          (network, styles) => {
            network.regions.forEach((region, index) => {
              const override = r.vectorData.styleOverrideTable?.find(
                (o: Raw) => o.styleID === styles[index],
              );
              if (override?.fillPaints) {
                region.paints = convertPaints(override.fillPaints);
                if (!region.paints.length) region.color = "none";
              }
            });
            fidelity.network = network;
          },
        );
      } catch {
        warnings.add(
          "Some vector networks retain editable path contours instead of shared topology.",
        );
      }
    }
    if (
      r.type === "TEXT" &&
      r.derivedTextData?.glyphs?.length &&
      text === r.textData?.characters &&
      (![
        "textData",
        "fontName",
        "fontSize",
        "fontVariations",
        "styleIdForText",
        "textDecoration",
        "textDecorationStyle",
        "textDecorationFillPaints",
      ].some((field) => explicitFields.has(field)) ||
        explicitFields.has("derivedTextData"))
    ) {
      try {
        const glyphCache = readFigGlyphCache(
          text,
          r.derivedTextData.glyphs,
          (index) => message.blobs?.[index]?.bytes,
          glyphContourCache,
        );
        const decorations = readFigDecorations(r, (p) =>
          color(p.color, p.opacity ?? 1),
        );
        if (
          fidelity.text ||
          decorations ||
          !importedRuns.some((s) => s.underline || s.strikethrough)
        ) {
          fidelity.text ??= {
            characters: text,
            lines: [],
            letterSpacing,
            spans: importedRuns,
          };
          fidelity.text.glyphCache = glyphCache;
          fidelity.text.decorations = decorations;
          warnings.add(
            "Saved glyph outlines preserve unchanged text where available; editing uses available fonts.",
          );
        }
      } catch {
        warnings.add(
          "Some saved text outlines are unavailable; the available font is used.",
        );
      }
    }
    if (r.type === "TEXT_PATH") {
      try {
        networkPaths(
          message.blobs?.[r.vectorData?.vectorNetworkBlob]?.bytes ??
            new Uint8Array(),
          r.size.x,
          r.size.y,
          r.vectorData?.normalizedSize ?? r.size,
          (network) => {
            baselineTrail(network);
            fidelity.textPath = {
              network,
              offset: 0,
              reverse: r.textPathStart?.forward === false,
            };
          },
        );
        if (!fidelity.textPath) throw Error();
        const saved: Raw[] = r.derivedTextData?.glyphs ?? [];
        fidelity.text ??= {
          characters: text,
          lines: [],
          letterSpacing: r.letterSpacing?.value ?? 0,
        };
        if (saved.length) {
          fidelity.text.glyphs = saved.map((g) => ({
            d: commandsPath(
              message.blobs?.[g.commandsBlob]?.bytes ?? new Uint8Array(),
            ),
            x: g.position.x,
            y: g.position.y,
            size: g.fontSize,
            rotation: g.rotation ?? 0,
            start: g.firstCharacter,
          }));
          const advances = saved.map((g) => (g.advance ?? 0) * g.fontSize),
            total = advances.reduce((a, b) => a + b, 0);
          let remaining =
            r.textAlignHorizontal === "CENTER"
              ? total / 2
              : r.textAlignHorizontal === "RIGHT"
                ? total
                : 0;
          let chosen = 0;
          while (chosen < saved.length - 1 && remaining > advances[chosen]) {
            remaining -= advances[chosen++];
          }
          const glyph = saved[chosen],
            angle = -(glyph.rotation ?? 0);
          fidelity.textPath.offset = nearestBaselineOffset(fidelity.textPath, {
            x: glyph.position.x + Math.cos(angle) * remaining,
            y: glyph.position.y + Math.sin(angle) * remaining,
          });
        } else if (!text) fidelity.text.glyphs = [];
        fidelity.text.spans = figTextDecorations(
          text,
          r,
          fidelity.text.spans ?? importedRuns,
        ) as typeof fidelity.text.spans;
        warnings.add(
          "Curved text preserves saved glyph outlines; edited text uses the available font along its baseline.",
        );
      } catch {
        delete fidelity.textPath;
        if (fidelity.text) delete fidelity.text.glyphs;
        warnings.add("Some curved text baselines could not be restored.");
      }
    }
    const align = (value: string) =>
      value === "CENTER"
        ? ("center" as const)
        : value === "MAX"
          ? ("end" as const)
          : ("start" as const);
    if (
      supportedLayout &&
      r.stackWrap === "WRAP" &&
      r.stackCounterSpacing !== undefined &&
      !Number.isFinite(r.stackCounterSpacing)
    )
      warnings.add(
        "An unspecified wrapping gap uses zero; saved layer positions are preserved until layout changes.",
      );
    const layoutConfig = supportedLayout
      ? {
          padding: [
            r.stackVerticalPadding ?? 0,
            r.stackPaddingRight ?? r.stackHorizontalPadding ?? 0,
            r.stackPaddingBottom ?? r.stackVerticalPadding ?? 0,
            r.stackHorizontalPadding ?? 0,
          ] as [number, number, number, number],
          primary:
            !r.stackPrimarySizing || r.stackPrimarySizing === "FIXED"
              ? ("fixed" as const)
              : ("hug" as const),
          counter:
            !r.stackCounterSizing || r.stackCounterSizing === "FIXED"
              ? ("fixed" as const)
              : ("hug" as const),
          justify:
            r.stackPrimaryAlignItems === "SPACE_BETWEEN"
              ? ("space-between" as const)
              : r.stackPrimaryAlignItems === "SPACE_AROUND"
                ? ("space-around" as const)
                : ["SPACE_EVENLY", "SPACE_EVENLY_CSS"].includes(
                      r.stackPrimaryAlignItems,
                    )
                  ? ("space-evenly" as const)
                  : align(r.stackPrimaryAlignItems),
          align:
            r.stackCounterAlignItems === "BASELINE"
              ? ("baseline" as const)
              : align(r.stackCounterAlignItems),
          wrap: r.stackWrap === "WRAP",
          counterGap: Number.isFinite(r.stackCounterSpacing)
            ? Math.max(0, r.stackCounterSpacing)
            : 0,
          ...(r.stackMode === "GRID"
            ? {
                grid: {
                  columns: parseTracks(r.gridColumns, r.gridColumnsSizing),
                  rows: parseTracks(r.gridRows, r.gridRowsSizing),
                  columnGap: Math.max(0, r.gridColumnGap ?? 0),
                  rowGap: Math.max(0, r.gridRowGap ?? 0),
                },
              }
            : {}),
          absolute: r.stackPositioning === "ABSOLUTE",
        }
      : undefined;
    const parentRaw = index.get(guid(raw.parentIndex?.guid));
    const columnEntries = [...(parentRaw?.gridColumns?.entries ?? [])].sort(
        (a, b) => (a.position < b.position ? -1 : 1),
      ),
      rowEntries = [...(parentRaw?.gridRows?.entries ?? [])].sort((a, b) =>
        a.position < b.position ? -1 : 1,
      );
    const min = r.minSize ?? {},
      max = r.maxSize ?? {};
    const constraint = (value: string) =>
      value === "MAX" || value === "FIXED_MAX"
        ? ("max" as const)
        : value === "CENTER"
          ? ("center" as const)
          : value === "STRETCH"
            ? ("stretch" as const)
            : value === "SCALE"
              ? ("scale" as const)
              : ("min" as const);
    const fillVariable = rawRef(paint?.colorVar?.value?.alias);
    const boundVariable =
      fillVariable &&
      doc.variables?.find((v) => v.id === variableId(fillVariable));
    const node = makeNode(kind, pageId, {
      parentId,
      fidelity,
      variableModes: Object.fromEntries(
        (r.variableModeBySetMap?.entries ?? []).flatMap((entry: Raw) => {
          const set = rawRef(entry.variableSetID),
            setId =
              "figset:" +
              (set ? guid(set.guid) : entry.variableSetID?.assetRef?.key),
            mode = guid(entry.variableModeID);
          return doc.variableCollections?.some(
            (c) => c.id === setId && c.modes.some((m) => m.id === mode),
          )
            ? [[setId, mode]]
            : [];
        }),
      ),
      bindings: Object.fromEntries(
        (r.variableConsumptionMap?.entries ?? []).flatMap((entry: Raw) => {
          const fields: Record<string, BindingProperty> = {
            WIDTH: "width",
            HEIGHT: "height",
            X_POSITION: "x",
            Y_POSITION: "y",
            ROTATION: "rotation",
            OPACITY: "opacity",
            CORNER_RADIUS: "radius",
            STROKE_WEIGHT: "strokeWidth",
            FONT_SIZE: "fontSize",
            FONT_FAMILY: "fontFamily",
            MIN_WIDTH: "minWidth",
            MAX_WIDTH: "maxWidth",
            MIN_HEIGHT: "minHeight",
            MAX_HEIGHT: "maxHeight",
            FONT_WEIGHT: "fontWeight",
            LINE_HEIGHT: "lineHeight",
            LETTER_SPACING: "letterSpacing",
            PARAGRAPH_SPACING: "paragraphSpacing",
            STACK_PADDING_TOP: "paddingTop",
            STACK_PADDING_RIGHT: "paddingRight",
            STACK_PADDING_BOTTOM: "paddingBottom",
            STACK_PADDING_LEFT: "paddingLeft",
            RECTANGLE_TOP_LEFT_CORNER_RADIUS: "cornerTopLeft",
            RECTANGLE_TOP_RIGHT_CORNER_RADIUS: "cornerTopRight",
            RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS: "cornerBottomRight",
            RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS: "cornerBottomLeft",
            STACK_COUNTER_SPACING: "counterGap",
            TEXT_DATA: "text",
            VISIBLE: "visible",
            STACK_SPACING: "gap",
          };
          const field = fields[entry.variableField],
            alias = rawRef(entry.variableData?.value?.alias),
            v =
              alias &&
              doc.typedVariables?.find((v) => v.id === variableId(alias));
          if (field && v && v.type === bindingTypes[field])
            return [[field, v.id]];
          warnings.add(
            "Some variable property bindings could not be restored.",
          );
          return [];
        }),
      ),
      constraints: {
        horizontal: constraint(r.horizontalConstraint),
        vertical: constraint(r.verticalConstraint),
      },
      layoutItem: {
        grow: Math.max(0, r.stackChildPrimaryGrow ?? 0),
        align:
          r.stackChildAlignSelf === "STRETCH"
            ? "stretch"
            : r.stackChildAlignSelf === "BASELINE"
              ? "baseline"
              : r.stackChildAlignSelf && r.stackChildAlignSelf !== "AUTO"
                ? align(r.stackChildAlignSelf)
                : undefined,
        absolute: r.stackPositioning === "ABSOLUTE",
        ...(Number.isFinite(min.x) ? { minWidth: Math.max(0, min.x) } : {}),
        ...(Number.isFinite(min.y) ? { minHeight: Math.max(0, min.y) } : {}),
        ...(Number.isFinite(max.x) ? { maxWidth: Math.max(0, max.x) } : {}),
        ...(Number.isFinite(max.y) ? { maxHeight: Math.max(0, max.y) } : {}),
        ...(r.gridColumnAnchor
          ? {
              column: Math.max(
                0,
                columnEntries.findIndex(
                  (e) => guid(e.id) === guid(r.gridColumnAnchor),
                ),
              ),
            }
          : {}),
        ...(r.gridRowAnchor
          ? {
              row: Math.max(
                0,
                rowEntries.findIndex(
                  (e) => guid(e.id) === guid(r.gridRowAnchor),
                ),
              ),
            }
          : {}),
        columnSpan: r.gridColumnSpan ?? 1,
        rowSpan: r.gridRowSpan ?? 1,
      },
      ...(kind === "text"
        ? {
            textFlow: {
              fontSettings: figFontSettings(r),
              autoResize:
                r.textAutoResize === "WIDTH_AND_HEIGHT"
                  ? "both"
                  : r.textAutoResize === "HEIGHT"
                    ? "height"
                    : "fixed",
              verticalAlign:
                r.textAlignVertical === "CENTER"
                  ? "center"
                  : r.textAlignVertical === "BOTTOM"
                    ? "bottom"
                    : "top",
              letterSpacing,
              paragraphSpacing: Math.min(
                10000,
                Math.max(0, r.paragraphSpacing ?? 0),
              ),
              runs:
                fidelity.text?.spans ??
                (importedRuns.length ? importedRuns : undefined),
            },
          }
        : {}),
      ...(boundVariable ? { variableId: boundVariable.id } : {}),
      ...(layoutConfig
        ? {
            layout:
              r.stackMode === "GRID"
                ? "grid"
                : r.stackMode === "HORIZONTAL"
                  ? "horizontal"
                  : "vertical",
            gap: Math.max(0, r.stackSpacing ?? 0),
            padding: r.stackHorizontalPadding ?? 0,
            importedLayout: layoutConfig,
          }
        : r.stackPositioning === "ABSOLUTE"
          ? {
              importedLayout: {
                padding: [0, 0, 0, 0],
                primary: "fixed",
                counter: "fixed",
                justify: "start",
                align: "start",
                absolute: true,
              },
            }
          : {}),
      name: r.name ?? r.type,
      x: transform.m02 ?? 0,
      y: transform.m12 ?? 0,
      width: Math.max(0, r.size.x ?? 0),
      height: Math.max(0, r.size.y ?? 0),
      fill: boundVariable
        ? boundVariable.value
        : paint?.type === "SOLID"
          ? color(paint.color, paint.opacity ?? 1)
          : "none",
      stroke: color(stroke?.color, stroke?.opacity ?? 1),
      strokeWidth: stroke ? (r.strokeWeight ?? 1) : 0,
      opacity: clamp(r.opacity ?? 1),
      visible: r.visible !== false,
      locked: !!r.locked,
      radius: r.cornerRadius ?? r.rectangleTopLeftCornerRadius ?? 0,
      text,
      fontSize: size,
      fontFamily: r.fontName?.family ?? "Inter, Arial, sans-serif",
      fontWeight: figFontWeight(
        r.fontName?.style ?? "",
        r.derivedTextData?.fontMetaData,
        r.fontName?.family,
      ),
      textAlign:
        r.textAlignHorizontal === "CENTER"
          ? "center"
          : r.textAlignHorizontal === "RIGHT"
            ? "right"
            : "left",
      lineHeight:
        r.lineHeight?.units === "PIXELS"
          ? r.lineHeight.value / size
          : r.lineHeight?.units === "PERCENT"
            ? r.lineHeight.value / 100
            : r.lineHeight?.value || 1.2,
      ...(image ? { image } : {}),
    });
    if (kind === "text" && fidelity.textPath && node.textFlow)
      node.textFlow.autoResize = "fixed";
    if (kind === "text")
      warnings.add(
        "Saved text line positions are restored; fonts, mixed styles and reflow may differ.",
      );
    for (const ref of r.componentPropRefs ?? []) {
      if (ref.isDeleted) continue;
      const property = resolveProperty(guid(ref.defID));
      const assignment = [...assignments]
        .reverse()
        .find((a) => propertyId(a.defID) === propertyId(ref.defID));
      const data = assignment ? assignment.varValue : property?.varValue;
      const field =
        ref.componentPropNodeField === "TEXT_DATA" && kind === "text"
          ? "text"
          : ref.componentPropNodeField === "VISIBLE"
            ? "visible"
            : undefined;
      if (data === undefined) {
        if (field && assignment?.value) delete node.bindings?.[field];
        continue;
      }
      const alias = rawRef(data.value?.alias),
        variable =
          alias && doc.typedVariables?.find((v) => v.id === variableId(alias));
      if (field && variable?.type === bindingTypes[field]) {
        node.bindings = { ...node.bindings, [field]: variable.id };
      } else if (
        field &&
        typeof (field === "text"
          ? data.value?.textValue
          : data.value?.boolValue) === bindingTypes[field]
      ) {
        const value =
          field === "text" ? data.value.textValue : data.value.boolValue;
        delete node.bindings?.[field];
        if (field === "text" && node.text !== value) {
          node.text = value;
          reflowText(node);
        }
        if (field === "visible") node.visible = value;
      } else
        warnings.add(
          "Some component property variable bindings could not be restored.",
        );
    }
    doc.nodes.push(node);
    const ownChildren = children.get(key) ?? [];
    const defs =
      base && (swapped || !ownChildren.length)
        ? (children.get(guid(base.guid)) ?? [])
        : ownChildren;
    const overrides = [
      ...inheritedOverrides,
      ...(raw.symbolData?.symbolOverrides ?? []),
      ...(raw.derivedSymbolData ?? []),
    ];
    const props = [...assignments, ...(raw.componentPropAssignments ?? [])];
    for (const child of defs) {
      const childKey = guid(child.overrideKey ?? child.guid);
      let copy = { ...child };
      const explicit = new Set<string>();
      for (const override of overrides) {
        const guids = override.guidPath?.guids ?? [];
        if (guids.length === 1 && guid(guids[0]) === childKey) {
          copy = { ...copy, ...override };
          for (const key of Object.keys(override)) explicit.add(key);
        }
      }
      const nested = overrides
        .filter(
          (o) =>
            o.guidPath?.guids?.length > 1 &&
            guid(o.guidPath.guids[0]) === childKey,
        )
        .map((o) => ({ ...o, guidPath: { guids: o.guidPath.guids.slice(1) } }));
      add(copy, pageId, node.id, nextPath, nested, props, explicit);
    }
    if (raw.type === "INSTANCE" && !base && !ownChildren.length)
      warnings.add("Some component definitions are unavailable.");
  }
  for (const page of source.filter(
    (n) =>
      n.type === "CANVAS" &&
      n.visible !== false &&
      (!selection || selectedPages.has(guid(n.guid))),
  )) {
    const pageId = crypto.randomUUID();
    doc.pages.push({ id: pageId, name: page.name ?? "Page" });
    for (const root of children.get(guid(page.guid)) ?? [])
      if (
        !selection ||
        selection.has(guid(page.guid)) ||
        selection.has(guid(root.guid))
      )
        add(root, pageId, null, new Set());
  }
  if (
    selection &&
    summaries.some((p) => selectedPages.has(p.id) && !selection.has(p.id))
  )
    warnings.add(
      "Only selected top-level layers were imported; other content remains in the original file.",
    );
  if (doc.pages.length) {
    const originalImages = images,
      originalInstances = instances;
    doc.componentLibrary = [];
    const definitions = new Map(
      source
        .filter((n) => n.type === "SYMBOL" && n.size)
        .map((n) => [guid(n.guid), n]),
    );
    const pending = new Set<string>(
      pageIds
        ? doc.nodes.flatMap((n) =>
            n.fidelity?.componentSourceId
              ? [n.fidelity.componentSourceId]
              : n.type === "component" && n.fidelity?.sourceId
                ? [n.fidelity.sourceId]
                : [],
          )
        : definitions.keys(),
    );
    for (const id of pending) {
      const definition = definitions.get(id);
      if (!definition) continue;
      if (
        pageIds &&
        index.get(guid(definition.parentIndex?.guid))?.isStateGroup
      )
        for (const sibling of children.get(
          guid(definition.parentIndex?.guid),
        ) ?? [])
          if (sibling.type === "SYMBOL") pending.add(guid(sibling.guid));
      const start = doc.nodes.length;
      add(definition, doc.pages[0].id, null, new Set());
      const nodes = doc.nodes.splice(start);
      if (nodes.length) {
        doc.componentLibrary.push({
          sourceId: id,
          name: definition.name ?? "Component",
          nodes,
        });
        for (const n of nodes)
          if (n.fidelity?.componentSourceId)
            pending.add(n.fidelity.componentSourceId);
      }
    }
    images = originalImages;
    instances = originalInstances;
  }
  for (const pool of [
    doc.nodes,
    ...(doc.componentLibrary ?? []).map((c) => c.nodes),
  ])
    for (const node of pool) {
      const sourceNode = index.get(node.fidelity?.sourceId ?? "");
      const prototypeSource = sourceNode?.prototypeInteractions
        ? sourceNode
        : (index.get(node.fidelity?.componentSourceId ?? "") ?? sourceNode);
      if (
        ["NONE", "HORIZONTAL", "VERTICAL", "BOTH"].includes(
          sourceNode?.scrollDirection,
        )
      )
        node.prototypeScroll = sourceNode!.scrollDirection.toLowerCase();
      for (const interaction of prototypeSource?.prototypeInteractions ?? []) {
        if (interaction.isDeleted) continue;
        const triggerMap: Record<string, PrototypeInteraction["trigger"]> = {
          ON_CLICK: "click",
          ON_HOVER: "hover",
          MOUSE_IN: "hover",
          MOUSE_ENTER: "hover",
          MOUSE_OUT: "leave",
          MOUSE_LEAVE: "leave",
          MOUSE_DOWN: "press",
          ON_PRESS: "press",
          MOUSE_UP: "release",
          AFTER_TIMEOUT: "delay",
        };
        const trigger = triggerMap[interaction.event?.interactionType],
          actions: PrototypeAction[] = [];
        let supported = !!trigger;
        for (const action of interaction.actions ?? []) {
          if (
            action.connectionType === "INTERNAL_NODE" &&
            action.navigationType === "SWAP_STATE" &&
            index.get(guid(action.transitionNodeID))?.type === "SYMBOL" &&
            !action.transitionShouldSmartAnimate &&
            (!action.transitionType ||
              action.transitionType === "INSTANT_TRANSITION")
          ) {
            actions.push({
              type: "changeTo",
              componentId: guid(action.transitionNodeID),
            });
            continue;
          }
          if (pool !== doc.nodes) {
            supported = false;
            break;
          }

          if (action.connectionType === "BACK") {
            actions.push({ type: "back" });
            continue;
          }
          if (action.connectionType === "CLOSE") {
            actions.push({ type: "close" });
            continue;
          }
          const targets = doc.nodes.filter(
            (n) =>
              n.fidelity?.sourceId === guid(action.transitionNodeID) &&
              (action.navigationType === "SCROLL_TO" ||
                ["frame", "component", "instance"].includes(n.type)),
          );
          const root = ancestors(doc, node).at(-1)?.id ?? node.id;
          const target =
            action.navigationType === "SCROLL_TO"
              ? (targets.find(
                  (n) =>
                    (ancestors(doc, n).at(-1)?.id ?? n.id) === root &&
                    (!node.componentOwner ||
                      n.componentOwner === node.componentOwner),
                ) ??
                targets.find(
                  (n) => (ancestors(doc, n).at(-1)?.id ?? n.id) === root,
                ) ??
                targets[0])
              : targets[0];
          if (
            action.connectionType === "INTERNAL_NODE" &&
            action.navigationType === "SCROLL_TO" &&
            target &&
            !action.transitionShouldSmartAnimate &&
            (!action.transitionType ||
              ["INSTANT_TRANSITION", "SCROLL_ANIMATE"].includes(
                action.transitionType,
              ))
          ) {
            if (
              action.transitionType === "SCROLL_ANIMATE" &&
              (action.easingType || action.easingVar || action.easingFunction)
            )
              warnings.add(
                "Scroll animation uses a standard easing curve; custom easing is not restored.",
              );
            actions.push({
              type: "scrollTo",
              targetId: target.id,
              offset: {
                x: action.extraScrollOffset?.x ?? 0,
                y: action.extraScrollOffset?.y ?? 0,
              },
              transition:
                action.transitionType === "SCROLL_ANIMATE"
                  ? "animate"
                  : "instant",
              durationMs: Math.max(
                0,
                Math.min(60000, (action.transitionDuration ?? 0.3) * 1000),
              ),
            });
            continue;
          }
          if (
            action.connectionType !== "INTERNAL_NODE" ||
            !target ||
            !["NAVIGATE", "OVERLAY", "SWAP"].includes(
              action.navigationType ?? "NAVIGATE",
            ) ||
            action.transitionShouldSmartAnimate ||
            (action.transitionType &&
              !["INSTANT_TRANSITION", "DISSOLVE", "FADE"].includes(
                action.transitionType,
              ))
          ) {
            supported = false;
            break;
          }
          actions.push({
            type:
              action.navigationType === "OVERLAY"
                ? "overlay"
                : action.navigationType === "SWAP"
                  ? "swap"
                  : "navigate",
            targetId: target.id,
            transition: ["DISSOLVE", "FADE"].includes(action.transitionType)
              ? "dissolve"
              : "instant",
            durationMs: Math.max(
              0,
              Math.min(60000, (action.transitionDuration ?? 0.3) * 1000),
            ),
          });
        }
        if (supported && actions.length) {
          node.interactions ??= [];
          node.interactions.push({
            trigger,
            actions,
            ...(trigger === "delay"
              ? {
                  delayMs: Math.max(
                    0,
                    Math.min(
                      86400000,
                      (interaction.event?.transitionTimeout ?? 0) * 1000,
                    ),
                  ),
                }
              : {}),
          });
          if (
            trigger === "click" &&
            actions.length === 1 &&
            actions[0].type === "navigate"
          )
            node.targetId = actions[0].targetId;
        } else
          warnings.add(
            "Some advanced prototype actions or transitions could not be restored.",
          );
      }
    }
  if (!doc.pages.length) throw Error("No supported pages in Figma file");
  if (
    source.some(
      (n) =>
        n.type === "VARIABLE" &&
        !["COLOR", "FLOAT", "STRING", "BOOLEAN"].includes(
          n.variableResolvedType,
        ),
    )
  )
    warnings.add("Some advanced variable types are not supported.");
  applyTypedBindings(doc);
  for (const node of doc.nodes)
    if (node.variableId)
      node.fill = resolveVariable(doc, node.variableId, new Set(), node);
  linkImportedComponents(doc);
  restoreFigComponentModels(doc, source, warnings);
  validateDocument(doc);
  return {
    document: doc,
    report: {
      pages: doc.pages.length,
      layers: doc.nodes.length,
      images,
      instances,
      warnings: [...warnings],
    },
  };
}
