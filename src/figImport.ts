import { resolveVariable } from "./variables";
import { commandsPath, networkPaths, type Fidelity } from "./fidelity";
import { Inflate, unzipSync } from "fflate";
import { Decompress } from "fzstd";
import { ByteBuffer, decodeBinarySchema, type Schema } from "kiwi-schema";
import {
  emptyDocument,
  makeNode,
  validateDocument,
  type Document,
  type Kind,
} from "./core";

const LIMIT = 64 * 1024 * 1024;
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
function unpack(data: Uint8Array, zstd = false): Uint8Array {
  const parts: Uint8Array[] = [];
  let size = 0;
  const receive = (part: Uint8Array) => {
    size += part.length;
    if (size > LIMIT) throw Error("Figma file exceeds import limits");
    parts.push(part.slice());
  };
  const stream = zstd ? new Decompress(receive) : new Inflate(receive);
  for (let p = 0; p < data.length; p += 4096)
    stream.push(data.subarray(p, p + 4096), p + 4096 >= data.length);
  const out = new Uint8Array(size);
  let p = 0;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}
// Interpret the embedded schema as data. Never generate/execute code from file contents.
export function decodeFigMessage(schema: Schema, data: Uint8Array): Raw {
  const defs = new Map(schema.definitions.map((d) => [d.name, d]));
  const bb = new ByteBuffer(data);
  let budget = 3000000;
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
    const result = Object.create(null);
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
      const fields = new Map(def.fields.map((f) => [f.value, f]));
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
    return parseFig(input, filename);
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
function parseFig(input: Uint8Array, filename: string): FigImportResult {
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
    unpack(payload, payload[0] === 0x28 && payload[1] === 0xb5),
  );
  if (!Array.isArray(message.nodeChanges) || message.nodeChanges.length > 20000)
    throw fail();
  let meta: Raw = {};
  if (files["meta.json"]) {
    try {
      meta = JSON.parse(new TextDecoder().decode(files["meta.json"]));
    } catch {
      /* optional metadata */
    }
  }
  const source: Raw[] = message.nodeChanges;
  const index = new Map(source.map((n) => [guid(n.guid), n]));
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
  for (const variable of source.filter(
    (n) => n.type === "VARIABLE" && n.variableResolvedType === "COLOR",
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
    const values: Record<string, { color: string } | { alias: string }> = {};
    for (const entry of entries) {
      const value = entry.variableData?.value;
      if (value?.colorValue)
        values[guid(entry.modeID)] = {
          color: color(value.colorValue).slice(0, 7),
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
    BOOLEAN_OPERATION: "group",
    SECTION: "frame",
  };
  function add(
    raw: Raw,
    pageId: string,
    parentId: string | null,
    path: Set<string>,
    inheritedOverrides: Raw[] = [],
    assignments: Raw[] = [],
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
    const base =
      raw.type === "INSTANCE"
        ? index.get(guid(raw.symbolData?.symbolID))
        : undefined;
    let r = { ...base, ...raw };
    if (raw.type === "INSTANCE") {
      instances++;
      warnings.add(
        "Component definitions and source links are retained; live instance synchronization is not yet supported.",
      );
    }
    let kind: Kind | undefined = r.type === "TEXT" ? "text" : mapping[r.type];
    if (!kind) {
      warnings.add("Some unsupported layers were skipped.");
      return;
    }

    if (r.type === "REGULAR_POLYGON" || r.type === "STAR")
      warnings.add("Polygon and star parameters may differ.");
    if (
      r.effects?.length ||
      (r.blendMode &&
        r.blendMode !== "NORMAL" &&
        r.blendMode !== "PASS_THROUGH")
    )
      warnings.add("Effects and non-normal blending are not restored.");
    const paints: Raw[] = (r.fillPaints ?? []).filter(
      (p: Raw) => p.visible !== false,
    );
    if (
      paints.length > 1 ||
      paints.some((p) => !["SOLID", "IMAGE"].includes(p.type))
    )
      warnings.add("Multiple fills and gradients may be simplified.");
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
    const supportedLayout =
      ["HORIZONTAL", "VERTICAL"].includes(r.stackMode) &&
      r.stackWrap !== "WRAP" &&
      ["MIN", "CENTER", "MAX", "SPACE_BETWEEN", undefined].includes(
        r.stackPrimaryAlignItems,
      ) &&
      r.stackCounterAlignItems !== "BASELINE";
    if (
      (r.stackMode && r.stackMode !== "NONE" && !supportedLayout) ||
      r.stackChildPrimaryGrow ||
      r.stackWrap === "WRAP"
    )
      warnings.add(
        "Wrapping, baseline alignment and fill sizing need further layout support.",
      );

    if (r.isMask) warnings.add("Masks are not restored.");
    const size = r.fontSize ?? 16;
    let text = r.textData?.characters ?? "";
    for (const ref of r.componentPropRefs ?? []) {
      const assignment = assignments.find(
        (a) => guid(a.defID) === guid(ref.defID),
      );
      if (
        ref.componentPropNodeField === "TEXT_DATA" &&
        assignment?.value?.textValue?.characters !== undefined
      )
        text = assignment.value.textValue.characters;
    }
    const fidelity: Fidelity = {
      size: [r.size.x ?? 0, r.size.y ?? 0],
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
    if (r.type === "VECTOR") {
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
        fidelity.paths = paths.length
          ? paths
          : networkPaths(
              blob(r.vectorData?.vectorNetworkBlob) ?? new Uint8Array(),
              r.size.x,
              r.size.y,
              r.vectorData?.normalizedSize ?? r.size,
            );
        if (!fidelity.paths.length) throw Error();
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
          letterSpacing:
            r.letterSpacing?.units === "PERCENT"
              ? ((r.letterSpacing.value ?? 0) * size) / 100
              : (r.letterSpacing?.value ?? 0),
        };
    }
    if (fidelity.text) {
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
            start,
            end,
            ...(solid ? { fill: color(solid.color, solid.opacity ?? 1) } : {}),
            ...(style.fontName?.family
              ? { fontFamily: style.fontName.family }
              : {}),
            ...(style.fontSize ? { fontSize: style.fontSize } : {}),
            ...(style.fontName?.style
              ? {
                  italic: /italic/i.test(style.fontName.style),
                  fontWeight: /bold/i.test(style.fontName.style)
                    ? 700
                    : /medium/i.test(style.fontName.style)
                      ? 500
                      : 400,
                }
              : {}),
          });
        }
        start = end;
      }
      if (spans.length) fidelity.text.spans = spans;
    }
    const align = (value: string) =>
      value === "CENTER"
        ? ("center" as const)
        : value === "MAX"
          ? ("end" as const)
          : ("start" as const);
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
              : align(r.stackPrimaryAlignItems),
          align: align(r.stackCounterAlignItems),
          absolute: r.stackPositioning === "ABSOLUTE",
        }
      : undefined;
    const fillVariable = rawRef(paint?.colorVar?.value?.alias);
    const boundVariable =
      fillVariable &&
      doc.variables?.find((v) => v.id === variableId(fillVariable));
    const node = makeNode(kind, pageId, {
      parentId,
      fidelity,
      ...(boundVariable ? { variableId: boundVariable.id } : {}),
      ...(layoutConfig
        ? {
            layout: r.stackMode === "HORIZONTAL" ? "horizontal" : "vertical",
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
      fontWeight:
        r.derivedTextData?.fontMetaData?.[0]?.fontWeight ??
        (/bold/i.test(r.fontName?.style ?? "")
          ? 700
          : /medium/i.test(r.fontName?.style ?? "")
            ? 500
            : 400),
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
    if (kind === "text")
      warnings.add(
        "Saved text line positions are restored; fonts, mixed styles and reflow may differ.",
      );
    doc.nodes.push(node);
    const ownChildren = children.get(key) ?? [];
    const defs =
      base && !ownChildren.length
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
      for (const override of overrides) {
        const guids = override.guidPath?.guids ?? [];
        if (guids.length === 1 && guid(guids[0]) === childKey)
          copy = { ...copy, ...override };
      }
      const nested = overrides
        .filter(
          (o) =>
            o.guidPath?.guids?.length > 1 &&
            guid(o.guidPath.guids[0]) === childKey,
        )
        .map((o) => ({ ...o, guidPath: { guids: o.guidPath.guids.slice(1) } }));
      add(copy, pageId, node.id, nextPath, nested, props);
    }
    if (raw.type === "INSTANCE" && !base && !ownChildren.length)
      warnings.add("Some component definitions are unavailable.");
  }
  for (const page of source.filter(
    (n) => n.type === "CANVAS" && n.visible !== false,
  )) {
    const pageId = crypto.randomUUID();
    doc.pages.push({ id: pageId, name: page.name ?? "Page" });
    for (const root of children.get(guid(page.guid)) ?? [])
      add(root, pageId, null, new Set());
  }
  for (const node of doc.nodes) {
    const sourceNode = index.get(node.fidelity?.sourceId ?? "");
    for (const interaction of sourceNode?.prototypeInteractions ?? []) {
      if (interaction.isDeleted) continue;
      const action = interaction.actions?.[0];
      const target = doc.nodes.find(
        (n) =>
          n.fidelity?.sourceId === guid(action?.transitionNodeID) &&
          n.pageId === node.pageId &&
          n.type === "frame",
      );
      if (
        interaction.event?.interactionType === "ON_CLICK" &&
        interaction.actions?.length === 1 &&
        action?.connectionType === "INTERNAL_NODE" &&
        action.navigationType !== "SWAP_STATE" &&
        target
      )
        node.targetId = target.id;
      else
        warnings.add(
          "Advanced prototype triggers, transitions and component state changes are not restored.",
        );
    }
  }
  if (doc.pages.length) {
    const originalImages = images,
      originalInstances = instances;
    doc.componentLibrary = [];
    for (const definition of source.filter(
      (n) => n.type === "SYMBOL" && n.size,
    )) {
      const start = doc.nodes.length;
      add(definition, doc.pages[0].id, null, new Set());
      const nodes = doc.nodes.splice(start);
      if (nodes.length)
        doc.componentLibrary.push({
          sourceId: guid(definition.guid),
          name: definition.name ?? "Component",
          nodes,
        });
    }
    images = originalImages;
    instances = originalInstances;
  }
  if (!doc.pages.length) throw Error("No supported pages in Figma file");
  if (
    source.some(
      (n) => n.type === "VARIABLE" && n.variableResolvedType !== "COLOR",
    )
  )
    warnings.add(
      "Color variable modes and resolvable aliases are restored; non-color variables remain unsupported.",
    );
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
