import type { Document, Node } from "./core";
import type { ImportedEffect } from "./appearance";
import {
  inheritedModes,
  resolveTypedVariable,
  applyTypedBindings,
  reflowVariableGeometry,
} from "./typedVariables";
import { resolveVariable } from "./variables";
import { reflowText, type TextRun } from "./textLayout";
import type { FontSettings } from "./fontSettings";
import { equalData } from "./equalData";
export type TokenRef = { token: string };
export type NumberTokenValue = number | TokenRef;
export type StringTokenValue = string | TokenRef;
export interface ShadowTokenValue {
  shadows: {
    type: "drop-shadow" | "inner-shadow";
    color: StringTokenValue;
    x: NumberTokenValue;
    y: NumberTokenValue;
    radius: NumberTokenValue;
    spread: NumberTokenValue;
    visible: boolean;
  }[];
}
export interface TypographyTokenValue {
  fontFamily: StringTokenValue;
  fontSize: NumberTokenValue;
  fontWeight: NumberTokenValue;
  lineHeight: NumberTokenValue;
  letterSpacing: NumberTokenValue;
}
export interface CompositeToken {
  id: string;
  name: string;
  type: "shadow" | "typography";
  collectionId?: string;
  value: ShadowTokenValue | TypographyTokenValue;
  values?: Record<
    string,
    { value: ShadowTokenValue | TypographyTokenValue } | { alias: string }
  >;
}
export interface TokenTheme {
  id: string;
  name: string;
  modes: Record<string, string>;
}
export function resolveCompositeToken(
  doc: Document,
  id: string,
  modes: Record<string, string> = {},
  seen = new Set<string>(),
): ShadowTokenValue | TypographyTokenValue {
  if (seen.has(id) || seen.size > 100) throw Error("Cyclic token alias");
  seen.add(id);
  const token = doc.compositeTokens?.find((t) => t.id === id);
  if (!token) throw Error("Missing composite token");
  const collection = doc.variableCollections?.find(
      (c) => c.id === token.collectionId,
    ),
    mode = modes[token.collectionId ?? ""] ?? collection?.activeMode;
  const entry =
    token.values?.[mode ?? ""] ?? Object.values(token.values ?? {})[0];
  if (entry && "alias" in entry) {
    const other = doc.compositeTokens?.find((t) => t.id === entry.alias);
    if (other?.type !== token.type) throw Error("Token alias type mismatch");
    return resolveCompositeToken(doc, entry.alias, modes, seen);
  }
  const value = structuredClone(
    entry && "value" in entry ? entry.value : token.value,
  );
  const resolve = (
    v: unknown,
    expected: "number" | "string",
  ): number | string => {
    let result = v;
    if (v && typeof v === "object" && "token" in v) {
      const ref = (v as TokenRef).token;
      result =
        expected === "string" && doc.variables?.some((c) => c.id === ref)
          ? resolveVariable(
              {
                ...doc,
                variableCollections: doc.variableCollections?.map((c) => ({
                  ...c,
                  activeMode: modes[c.id] ?? c.activeMode,
                })),
              },
              ref,
            )
          : resolveTypedVariable(doc, ref, modes);
    }
    if (
      typeof result !== expected ||
      (typeof result === "number" && !Number.isFinite(result))
    )
      throw Error("Invalid composite token value");
    return result as number | string;
  };
  if (token.type === "shadow") {
    if (
      !("shadows" in value) ||
      !Array.isArray(value.shadows) ||
      value.shadows.length > 100
    )
      throw Error("Invalid shadow token");
    return {
      shadows: value.shadows.map((shadow) => {
        if (
          !["drop-shadow", "inner-shadow"].includes(shadow.type) ||
          typeof shadow.visible !== "boolean"
        )
          throw Error("Invalid shadow token");
        const color = String(resolve(shadow.color, "string")),
          radius = Number(resolve(shadow.radius, "number")),
          spread = Number(resolve(shadow.spread, "number"));
        if (!/^#[a-f\d]{3,8}$/i.test(color) || radius < 0)
          throw Error("Invalid shadow token");
        return {
          ...shadow,
          color,
          radius,
          spread,
          x: Number(resolve(shadow.x, "number")),
          y: Number(resolve(shadow.y, "number")),
        };
      }),
    };
  }
  if (!("fontFamily" in value)) throw Error("Invalid typography token");
  const result = {
    fontFamily: String(resolve(value.fontFamily, "string")),
    fontSize: Number(resolve(value.fontSize, "number")),
    fontWeight: Number(resolve(value.fontWeight, "number")),
    lineHeight: Number(resolve(value.lineHeight, "number")),
    letterSpacing: Number(resolve(value.letterSpacing, "number")),
  };
  if (
    !result.fontFamily ||
    result.fontSize <= 0 ||
    result.fontWeight < 1 ||
    result.fontWeight > 1000 ||
    result.lineHeight <= 0
  )
    throw Error("Invalid typography token");
  return result;
}
export function applyCompositeBindings(doc: Document) {
  for (const node of [
    ...doc.nodes,
    ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
  ]) {
    const binding = node.compositeBindings;
    if (!binding?.shadow && !binding?.typography) continue;
    const modes = inheritedModes(doc, node);
    if (binding?.shadow) {
      const value = resolveCompositeToken(doc, binding.shadow, modes);
      if (!("shadows" in value)) throw Error("Invalid shadow binding");
      const effects = [
        ...(value.shadows as ImportedEffect[]),
        ...(node.fidelity?.effects ?? []).filter(
          (e) => e.type === "blur" || e.type === "background-blur",
        ),
      ];
      node.fidelity = {
        ...node.fidelity,
        size: node.fidelity?.size ?? [node.width, node.height],
        effects,
      };
    }
    if (binding?.typography) {
      if (node.type !== "text")
        throw Error("Typography tokens require text layers");
      const value = resolveCompositeToken(doc, binding.typography, modes);
      if (!("fontFamily" in value)) throw Error("Invalid typography binding");
      const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } =
        value as {
          fontFamily: string;
          fontSize: number;
          fontWeight: number;
          lineHeight: number;
          letterSpacing: number;
        };
      const runs = node.textFlow?.runs ?? node.fidelity?.text?.spans;
      const styledRuns = runs?.map(
        ({
          fontFamily: _family,
          fontSize: _size,
          fontWeight: _weight,
          ...rest
        }) => ({ ...rest, fontSettings: withoutWeight(rest.fontSettings) }),
      );
      const fontSettings = withoutWeight(node.textFlow?.fontSettings);
      const changed =
        node.fontFamily !== fontFamily ||
        node.fontSize !== fontSize ||
        node.fontWeight !== fontWeight ||
        node.lineHeight !== lineHeight ||
        (node.textFlow?.letterSpacing ?? 0) !== letterSpacing ||
        !equalData(runs, styledRuns) ||
        !equalData(fontSettings, node.textFlow?.fontSettings);
      Object.assign(node, { fontFamily, fontSize, fontWeight, lineHeight });
      node.textFlow = {
        autoResize: "fixed",
        verticalAlign: "top",
        ...node.textFlow,
        letterSpacing,
        runs: styledRuns,
        fontSettings,
      };
      if (changed) {
        if (node.fidelity?.text) delete node.fidelity.text;
        reflowText(node);
      }
    }
  }
}
export function validateCompositeTokens(doc: Document) {
  if (
    doc.compositeTokens !== undefined &&
    (!Array.isArray(doc.compositeTokens) ||
      doc.compositeTokens.length > 10000 ||
      doc.compositeTokens.some((t) => !t || typeof t !== "object") ||
      new Set(doc.compositeTokens.map((t) => t.id)).size !==
        doc.compositeTokens.length)
  )
    throw Error("Invalid composite tokens");
  for (const token of doc.compositeTokens ?? []) {
    if (
      !token ||
      typeof token.id !== "string" ||
      !token.id ||
      [...(doc.variables ?? []), ...(doc.typedVariables ?? [])].some(
        (v) => v.id === token.id,
      ) ||
      typeof token.name !== "string" ||
      !["shadow", "typography"].includes(token.type)
    )
      throw Error("Invalid composite token");
    const collection = doc.variableCollections?.find(
      (c) => c.id === token.collectionId,
    );
    if (token.collectionId && !collection)
      throw Error("Invalid token collection");
    if (
      token.values &&
      (typeof token.values !== "object" ||
        Array.isArray(token.values) ||
        Object.keys(token.values).some(
          (k) => !collection?.modes.some((m) => m.id === k),
        ))
    )
      throw Error("Invalid token mode");
    resolveCompositeToken(
      {
        ...doc,
        compositeTokens: doc.compositeTokens?.map((t) =>
          t.id === token.id ? { ...t, values: undefined } : t,
        ),
      },
      token.id,
    );
    for (const mode of collection?.modes ?? [{ id: "", name: "" }])
      resolveCompositeToken(
        doc,
        token.id,
        collection ? { [collection.id]: mode.id } : {},
      );
  }
  if (
    doc.tokenThemes !== undefined &&
    (!Array.isArray(doc.tokenThemes) ||
      new Set(doc.tokenThemes.map((t) => t?.id)).size !==
        doc.tokenThemes.length)
  )
    throw Error("Invalid token themes");
  for (const theme of doc.tokenThemes ?? []) {
    if (
      !theme ||
      typeof theme.id !== "string" ||
      typeof theme.name !== "string" ||
      !theme.modes ||
      typeof theme.modes !== "object" ||
      Array.isArray(theme.modes) ||
      Object.entries(theme.modes).some(
        ([c, m]) =>
          !doc.variableCollections?.some(
            (v) => v.id === c && v.modes.some((mode) => mode.id === m),
          ),
      )
    )
      throw Error("Invalid token theme");
  }
  for (const n of doc.nodes)
    for (const [kind, id] of Object.entries(n.compositeBindings ?? {}))
      if (
        !["shadow", "typography"].includes(kind) ||
        !doc.compositeTokens?.some((t) => t.id === id && t.type === kind) ||
        (kind === "typography" && n.type !== "text")
      )
        throw Error("Invalid composite binding");
}
export function releaseCompositeBindings(node: Node, patch: Partial<Node>) {
  if (!node.compositeBindings || "compositeBindings" in patch) return;
  if (
    patch.fidelity &&
    "effects" in patch.fidelity &&
    !equalData(
      patch.fidelity.effects?.filter((e) => e.type.endsWith("shadow")),
      node.fidelity?.effects?.filter((e) => e.type.endsWith("shadow")),
    )
  )
    delete node.compositeBindings.shadow;
  if (
    ["fontFamily", "fontSize", "fontWeight", "lineHeight"].some(
      (key) => key in patch,
    ) ||
    (patch.textFlow &&
      "letterSpacing" in patch.textFlow &&
      patch.textFlow.letterSpacing !== node.textFlow?.letterSpacing) ||
    (patch.textFlow &&
      "runs" in patch.textFlow &&
      !equalData(
        fontOverrides(patch.textFlow.runs),
        fontOverrides(node.textFlow?.runs ?? node.fidelity?.text?.spans),
      )) ||
    (patch.textFlow &&
      "fontSettings" in patch.textFlow &&
      patch.textFlow.fontSettings?.variations?.wght !==
        node.textFlow?.fontSettings?.variations?.wght)
  )
    delete node.compositeBindings.typography;
}
function withoutWeight(settings?: FontSettings) {
  if (settings?.variations?.wght === undefined) return settings;
  const next = { ...settings, variations: { ...settings.variations } };
  delete next.variations.wght;
  return next;
}
function fontOverrides(runs: TextRun[] | undefined) {
  return (runs ?? [])
    .filter(
      (r) =>
        r.fontFamily !== undefined ||
        r.fontSize !== undefined ||
        r.fontWeight !== undefined ||
        r.fontSettings?.variations?.wght !== undefined,
    )
    .map(({ fontFamily, fontSize, fontWeight, fontSettings }) => ({
      fontFamily,
      fontSize,
      fontWeight,
      wght: fontSettings?.variations?.wght,
    }));
}
export function refreshCompositeTokens(original: Document): Document {
  const doc = structuredClone(original);
  for (const variable of doc.variables ?? [])
    variable.value = resolveVariable(doc, variable.id);
  for (const node of [
    ...doc.nodes,
    ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
  ])
    if (node.variableId)
      node.fill = resolveVariable(doc, node.variableId, new Set(), node);
  applyCompositeBindings(doc);
  applyTypedBindings(doc);
  reflowVariableGeometry(original, doc);
  return doc;
}
export function setTokenTheme(original: Document, themeId: string): Document {
  const doc = structuredClone(original),
    theme = doc.tokenThemes?.find((t) => t.id === themeId);
  if (!theme) throw Error("Missing token theme");
  for (const [c, m] of Object.entries(theme.modes)) {
    const collection = doc.variableCollections?.find((v) => v.id === c);
    if (!collection?.modes.some((mode) => mode.id === m))
      throw Error("Invalid token mode");
    collection.activeMode = m;
  }
  return refreshCompositeTokens(doc);
}
export function removeCompositeToken(original: Document, id: string): Document {
  const doc = structuredClone(original);
  for (const token of doc.compositeTokens ?? [])
    for (const [mode, entry] of Object.entries(token.values ?? {}))
      if ("alias" in entry && entry.alias === id)
        token.values![mode] = {
          value: resolveCompositeToken(
            doc,
            token.id,
            token.collectionId ? { [token.collectionId]: mode } : {},
          ),
        };
  for (const node of [
    ...doc.nodes,
    ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
  ])
    for (const kind of ["shadow", "typography"] as const)
      if (node.compositeBindings?.[kind] === id)
        delete node.compositeBindings[kind];
  doc.compositeTokens = doc.compositeTokens?.filter((t) => t.id !== id);
  return doc;
}
export function freezeCompositeReferences(doc: Document, id: string) {
  const bound = [
    ...doc.nodes,
    ...(doc.componentLibrary ?? []).flatMap((c) => c.nodes),
  ].flatMap((node) =>
    Object.entries(node.compositeBindings ?? {}).map(([kind, token]) => ({
      node,
      kind: kind as "shadow" | "typography",
      value: resolveCompositeToken(doc, token, inheritedModes(doc, node)),
    })),
  );
  function freeze(value: unknown, modes: Record<string, string> = {}): unknown {
    if (
      value &&
      typeof value === "object" &&
      "token" in value &&
      (value as TokenRef).token === id
    )
      return doc.variables?.some((v) => v.id === id)
        ? resolveVariable(
            {
              ...doc,
              variableCollections: doc.variableCollections?.map((c) => ({
                ...c,
                activeMode: modes[c.id] ?? c.activeMode,
              })),
            },
            id,
          )
        : resolveTypedVariable(doc, id, modes);
    if (Array.isArray(value)) return value.map((v) => freeze(v, modes));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, freeze(v, modes)]),
      );
    return value;
  }
  doc.compositeTokens = doc.compositeTokens?.map((t) => ({
    ...t,
    value: freeze(t.value) as CompositeToken["value"],
    values: t.collectionId
      ? Object.fromEntries(
          (
            doc.variableCollections?.find((c) => c.id === t.collectionId)
              ?.modes ?? []
          ).map(({ id: m }) => {
            const v = t.values?.[m] ??
              Object.values(t.values ?? {})[0] ?? { value: t.value };
            return [
              m,
              "value" in v
                ? {
                    value: freeze(
                      v.value,
                      t.collectionId ? { [t.collectionId]: m } : {},
                    ) as CompositeToken["value"],
                  }
                : v,
            ];
          }),
        )
      : undefined,
  }));
  // A cross-set node override may not be representable by a literal in one set.
  // Keep its resolved appearance rather than silently recoloring it on deletion.
  for (const { node, kind, value } of bound) {
    const token = node.compositeBindings?.[kind];
    if (
      token &&
      !equalData(
        value,
        resolveCompositeToken(doc, token, inheritedModes(doc, node)),
      )
    )
      delete node.compositeBindings![kind];
  }
}
