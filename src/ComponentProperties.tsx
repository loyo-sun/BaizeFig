import { ArrowUp, ArrowDown } from "lucide-react";
import { NestedComponentProperties } from "./NestedComponentProperties";
import { useState } from "react";
import { ancestors, execute, id, type Document, type Node } from "./core";
import {
  componentTargets,
  componentPropertyState,
  bindComponentProperty,
  componentDefinitions,
  setComponentProperty,
  setComponentValue,
  resetComponentSlot,
  setComponentSet,
  switchVariant,
  swapComponentInstance,
  propagatePropertiesToVariants,
} from "./components";
import type { ComponentProperty, ComponentSet } from "./componentModel";
import { useI18n } from "./LanguageContext";
export function ComponentProperties({
  doc,
  node,
  selected,
  onChange,
  onSelect,
}: {
  doc: Document;
  node: Node;
  selected: string[];
  onChange: (doc: Document) => void;
  onSelect: (ids: string[]) => void;
}) {
  const { t } = useI18n(),
    [error, setError] = useState(""),
    [propertyType, setPropertyType] =
      useState<ComponentProperty["type"]>("text"),
    [target, setTarget] = useState(""),
    [name, setName] = useState(""),
    [newVariant, setNewVariant] = useState("");
  const main =
      node.type === "component"
        ? node
        : node.componentSetId
          ? doc.nodes.find(
              (n) =>
                n.id ===
                doc.componentSets?.find((s) => s.id === node.componentSetId)
                  ?.variants[0]?.componentId,
            )
          : ancestors(doc, node).find((n) => n.type === "component"),
    owner =
      node.type === "instance" &&
      (!node.componentOwner || node.componentOwner === node.id)
        ? node
        : doc.nodes.find((n) => n.id === node.componentOwner),
    reference = main?.id ?? owner?.componentId,
    definition = componentDefinitions(doc).find(
      (d) => d.reference === reference,
    ),
    root = main ?? owner;
  const set = doc.componentSets?.find((s) =>
      s.variants.some((v) => v.componentId === reference),
    ),
    variant = set?.variants.find((v) => v.componentId === reference),
    targets = reference ? componentTargets(doc, reference) : [],
    definitions = componentDefinitions(doc);
  const act = (fn: () => Document) => {
    try {
      onChange(fn());
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const selectedMains = doc.nodes.filter(
    (n) => selected.includes(n.id) && n.type === "component",
  );
  const editSet = (value: ComponentSet) =>
    act(() => setComponentSet(doc, value));
  const updateProperty = (property: ComponentProperty) => {
    if (reference) act(() => setComponentProperty(doc, reference, property));
  };
  if (!root && selectedMains.length < 2) return null;
  return (
    <section className="component-properties text-properties">
      <div className="section-heading">{t("Component properties")}</div>
      {error && <p role="alert">{t(error)}</p>}
      {root && (
        <NestedComponentProperties
          doc={doc}
          root={root}
          onChange={onChange}
          onError={setError}
        />
      )}
      {main && (
        <details>
          <summary>{t("Component documentation")}</summary>
          <label>
            {t("Description")}
            <textarea
              aria-label={t("Component description")}
              key={main.id + "description"}
              defaultValue={main.componentDescription ?? ""}
              onBlur={(e) =>
                act(
                  () =>
                    execute(doc, {
                      type: "update",
                      ids: [main.id],
                      patch: { componentDescription: e.target.value },
                    }).doc,
                )
              }
            />
          </label>
          <label>
            {t("Documentation URL")}
            <input
              type="url"
              aria-label={t("Documentation URL")}
              key={main.id + "url"}
              defaultValue={main.componentDocumentation ?? ""}
              onBlur={(e) =>
                act(
                  () =>
                    execute(doc, {
                      type: "update",
                      ids: [main.id],
                      patch: { componentDocumentation: e.target.value },
                    }).doc,
                )
              }
            />
          </label>
        </details>
      )}
      {main && set && (
        <label>
          {t("Default variant")}
          <select
            aria-label={t("Default variant")}
            value={set.defaultComponentId ?? set.variants[0].componentId}
            onChange={(e) =>
              editSet({ ...set, defaultComponentId: e.target.value })
            }
          >
            {set.variants.map((v) => (
              <option key={v.componentId} value={v.componentId}>
                {definitions.find((d) => d.reference === v.componentId)?.name ??
                  v.componentId}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedMains.length > 1 && (
        <button
          disabled={selectedMains.some((n) =>
            doc.componentSets?.some((s) =>
              s.variants.some((v) => v.componentId === n.id),
            ),
          )}
          onClick={() => {
            const values = selectedMains.map((n, i) => n.name + " " + (i + 1));
            const variants = selectedMains.map((n, i) => ({
              componentId: n.id,
              values: { State: values[i] },
            }));
            editSet({
              id: id(),
              name: "Component set",
              axes: { State: values },
              variants,
            });
          }}
        >
          {t("Combine selected components as variants")}
        </button>
      )}
      {root && definition && (
        <>
          {set &&
            variant &&
            owner &&
            Object.entries(set.axes).map(([axis, values]) => (
              <label key={axis}>
                {axis}
                <select
                  aria-label={t("Variant {name}", { name: axis })}
                  value={variant.values[axis]}
                  onChange={(e) =>
                    act(() =>
                      switchVariant(doc, owner.id, axis, e.target.value),
                    )
                  }
                >
                  {values.map((v) => (
                    <option key={v} value={v}>
                      {v || t("Empty value")}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          {set &&
            variant &&
            owner &&
            set.variants.some((a, i) =>
              set.variants
                .slice(i + 1)
                .some((b) =>
                  Object.keys(set.axes).every(
                    (k) => a.values[k] === b.values[k],
                  ),
                ),
            ) && (
              <label>
                {t("Specific variant")}
                <select
                  aria-label={t("Specific variant")}
                  value={owner.componentId}
                  onChange={(e) =>
                    act(() =>
                      swapComponentInstance(doc, owner.id, e.target.value),
                    )
                  }
                >
                  {set.variants.map((v, i) => (
                    <option key={v.componentId} value={v.componentId}>
                      {`${i + 1}. ${definitions.find((d) => d.reference === v.componentId)?.root.name ?? v.componentId}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          {(definition.root.componentProperties ?? []).map((property) => {
            const { value, variableId } = componentPropertyState(
              doc,
              reference!,
              property,
              main ? undefined : owner?.id,
            );
            return (
              <div className="property-definition" key={property.id}>
                {main && (
                  <div className="property-order">
                    {[-1, 1].map((direction) => {
                      const properties = main.componentProperties ?? [],
                        index = properties.findIndex(
                          (p) => p.id === property.id,
                        ),
                        label = t(
                          direction < 0
                            ? "Move property up"
                            : "Move property down",
                        );
                      return (
                        <button
                          key={direction}
                          aria-label={label + " " + property.name}
                          title={label}
                          disabled={
                            index + direction < 0 ||
                            index + direction >= properties.length
                          }
                          onClick={() =>
                            act(() => {
                              const ordered = [...properties];
                              [ordered[index], ordered[index + direction]] = [
                                ordered[index + direction],
                                ordered[index],
                              ];
                              return execute(doc, {
                                type: "update",
                                ids: [main.id],
                                patch: { componentProperties: ordered },
                              }).doc;
                            })
                          }
                        >
                          {direction < 0 ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {main ? (
                  <input
                    aria-label={t("Property name {name}", {
                      name: property.name,
                    })}
                    key={property.name}
                    defaultValue={property.name}
                    onBlur={(e) => {
                      if (e.target.value !== property.name)
                        updateProperty({ ...property, name: e.target.value });
                    }}
                  />
                ) : (
                  <strong>{property.name}</strong>
                )}
                {["text", "boolean"].includes(property.type) && (
                  <select
                    aria-label={t("Property variable {name}", {
                      name: property.name,
                    })}
                    value={variableId ?? ""}
                    onChange={(e) =>
                      act(() =>
                        bindComponentProperty(
                          doc,
                          reference!,
                          property.id,
                          e.target.value || undefined,
                          main ? undefined : owner?.id,
                        ),
                      )
                    }
                  >
                    <option value="">{t("Fixed property value")}</option>
                    {(doc.typedVariables ?? [])
                      .filter(
                        (v) =>
                          v.type ===
                          (property.type === "text" ? "string" : "boolean"),
                      )
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                )}
                {property.type === "text" && (
                  <input
                    aria-label={t("Component text {name}", {
                      name: property.name,
                    })}
                    key={String(value)}
                    defaultValue={String(value)}
                    onBlur={(e) => {
                      if (e.target.value !== value) {
                        if (main)
                          updateProperty({
                            ...property,
                            defaultValue: e.target.value,
                          });
                        else
                          act(() =>
                            setComponentValue(
                              doc,
                              owner!.id,
                              property.id,
                              e.target.value,
                            ),
                          );
                      }
                    }}
                  />
                )}
                {property.type === "boolean" && (
                  <label>
                    <input
                      aria-label={t("Component visibility {name}", {
                        name: property.name,
                      })}
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) =>
                        main
                          ? updateProperty({
                              ...property,
                              defaultValue: e.target.checked,
                            })
                          : act(() =>
                              setComponentValue(
                                doc,
                                owner!.id,
                                property.id,
                                e.target.checked,
                              ),
                            )
                      }
                    />
                    {t("Visible")}
                  </label>
                )}
                {property.type === "instance" && (
                  <>
                    <select
                      aria-label={t("Component swap {name}", {
                        name: property.name,
                      })}
                      value={String(value)}
                      onChange={(e) =>
                        main
                          ? updateProperty({
                              ...property,
                              defaultValue: e.target.value,
                            })
                          : act(() =>
                              setComponentValue(
                                doc,
                                owner!.id,
                                property.id,
                                e.target.value,
                              ),
                            )
                      }
                    >
                      {[...definitions]
                        .sort(
                          (a, b) =>
                            Number(
                              property.preferred?.includes(b.reference) ??
                                false,
                            ) -
                            Number(
                              property.preferred?.includes(a.reference) ??
                                false,
                            ),
                        )
                        .map((d) => (
                          <option
                            key={d.reference}
                            value={d.reference}
                            disabled={
                              !!doc.componentLibrary?.some(
                                (c) =>
                                  c.sourceId === d.reference &&
                                  c.libraryId &&
                                  (c.missing ||
                                    doc.libraries?.find(
                                      (s) => s.id === c.libraryId,
                                    )?.enabled === false),
                              )
                            }
                          >
                            {property.preferred?.includes(d.reference)
                              ? "★ "
                              : ""}
                            {d.name}
                          </option>
                        ))}
                    </select>
                    {main && (
                      <details>
                        <summary>{t("Preferred instances")}</summary>
                        {definitions.map((d) => (
                          <label key={d.reference}>
                            <input
                              type="checkbox"
                              checked={
                                property.preferred?.includes(d.reference) ??
                                false
                              }
                              onChange={(e) =>
                                updateProperty({
                                  ...property,
                                  preferred: e.target.checked
                                    ? [
                                        ...(property.preferred ?? []),
                                        d.reference,
                                      ]
                                    : (property.preferred ?? []).filter(
                                        (v) => v !== d.reference,
                                      ),
                                })
                              }
                            />
                            {d.name}
                          </label>
                        ))}
                      </details>
                    )}
                  </>
                )}
                {property.type === "slot" && (
                  <>
                    <p className="muted">
                      {t(
                        "Add, edit and rearrange layers inside this slot without detaching the instance.",
                      )}
                    </p>
                    {owner && (
                      <>
                        <button
                          onClick={() => {
                            const target = doc.nodes.find(
                              (n) =>
                                n.componentOwner === owner.id &&
                                n.componentPath === property.targetPath,
                            );
                            if (target) onSelect([target.id]);
                          }}
                        >
                          {t("Select slot")}
                        </button>
                        <button
                          onClick={() =>
                            act(() =>
                              resetComponentSlot(
                                doc,
                                owner.id,
                                property.targetPath,
                              ),
                            )
                          }
                        >
                          {t("Reset slot content")}
                        </button>
                      </>
                    )}
                  </>
                )}
                {main && (
                  <button
                    onClick={() =>
                      act(() =>
                        setComponentProperty(
                          doc,
                          reference!,
                          undefined,
                          property.id,
                        ),
                      )
                    }
                  >
                    {t("Remove property")}
                  </button>
                )}
              </div>
            );
          })}
          {main && (
            <details>
              <summary>{t("Add component property")}</summary>
              <label>
                {t("Property type")}
                <select
                  aria-label={t("Property type")}
                  value={propertyType}
                  onChange={(e) => {
                    setPropertyType(
                      e.target.value as ComponentProperty["type"],
                    );
                    setTarget("");
                  }}
                >
                  {(["text", "boolean", "instance", "slot"] as const).map(
                    (v) => (
                      <option key={v} value={v}>
                        {t(
                          v === "text"
                            ? "Text"
                            : v === "boolean"
                              ? "Boolean"
                              : v === "instance"
                                ? "Instance swap"
                                : "Slot",
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                {t("Property target")}
                <select
                  aria-label={t("Property target")}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">{t("Choose layer")}</option>
                  {targets
                    .filter(({ node: n, path }) =>
                      propertyType === "text"
                        ? n.type === "text"
                        : propertyType === "instance"
                          ? n.type === "instance"
                          : propertyType === "slot"
                            ? ["frame", "group"].includes(n.type) && path !== ""
                            : true,
                    )
                    .map(({ node: n, path }) => (
                      <option key={path} value={path || "$root"}>
                        {n.name} · {n.type}
                      </option>
                    ))}
                </select>
              </label>
              {!targets.some(({ node: n, path }) =>
                propertyType === "text"
                  ? n.type === "text"
                  : propertyType === "instance"
                    ? n.type === "instance"
                    : propertyType === "slot"
                      ? ["frame", "group"].includes(n.type) && path !== ""
                      : true,
              ) && (
                <p role="status" className="muted">
                  {t(
                    propertyType === "text"
                      ? "Add a text layer inside this component before creating a text property."
                      : propertyType === "instance"
                        ? "Add a nested instance before creating an instance swap property."
                        : "Add a frame or group inside this component before creating a slot.",
                  )}
                </p>
              )}
              <input
                aria-label={t("New property name")}
                value={name}
                placeholder={t("New property name")}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                disabled={!target || !name.trim()}
                onClick={() => {
                  const path = target === "$root" ? "" : target,
                    n = targets.find((a) => a.path === path)?.node;
                  if (n) {
                    updateProperty({
                      id: id(),
                      name: name.trim(),
                      type: propertyType,
                      targetPath: path,
                      defaultValue:
                        propertyType === "text"
                          ? n.text
                          : propertyType === "boolean"
                            ? n.visible
                            : propertyType === "instance"
                              ? (n.componentId ?? "")
                              : "",
                    });
                    setName("");
                  }
                }}
              >
                {t("Add property")}
              </button>
            </details>
          )}
          {main && set && (
            <details>
              <summary>{t("Edit variant set")}</summary>
              <input
                aria-label={t("Variant set name")}
                defaultValue={set.name}
                key={set.name}
                onBlur={(e) => editSet({ ...set, name: e.target.value })}
              />
              {Object.keys(set.axes).map((axis) => (
                <div key={axis}>
                  <input
                    aria-label={t("Variant axis name {name}", { name: axis })}
                    defaultValue={axis}
                    key={axis}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name === axis) return;
                      if (!name || set.axes[name]) {
                        setError("Variant axis names must be unique");
                        return;
                      }
                      const axes = Object.fromEntries(
                        Object.entries(set.axes).map(([k, v]) => [
                          k === axis ? name : k,
                          v,
                        ]),
                      );
                      editSet({
                        ...set,
                        axes,
                        variants: set.variants.map((v) => ({
                          ...v,
                          values: Object.fromEntries(
                            Object.entries(v.values).map(([k, value]) => [
                              k === axis ? name : k,
                              value,
                            ]),
                          ),
                        })),
                      });
                    }}
                  />
                  {set.variants.map((v) => (
                    <label key={v.componentId}>
                      {definitions.find((d) => d.reference === v.componentId)
                        ?.name ?? v.componentId}
                      <input
                        aria-label={t("Variant value {name}", {
                          name: v.componentId + " " + axis,
                        })}
                        key={v.values[axis]}
                        defaultValue={v.values[axis]}
                        onBlur={(e) => {
                          const variants = set.variants.map((a) =>
                            a.componentId === v.componentId
                              ? {
                                  ...a,
                                  values: {
                                    ...a.values,
                                    [axis]: e.target.value,
                                  },
                                }
                              : a,
                          );
                          editSet({
                            ...set,
                            variants,
                            axes: {
                              ...set.axes,
                              [axis]: [
                                ...new Set(variants.map((a) => a.values[axis])),
                              ],
                            },
                          });
                        }}
                      />
                    </label>
                  ))}
                  <button
                    disabled={Object.keys(set.axes).length <= 1}
                    onClick={() => {
                      const axes = { ...set.axes };
                      delete axes[axis];
                      const variants = set.variants.map((v) => {
                        const values = { ...v.values };
                        delete values[axis];
                        return { ...v, values };
                      });
                      editSet({ ...set, axes, variants });
                    }}
                  >
                    {t("Remove variant axis")}
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const axis = window.prompt(t("New variant axis"));
                  if (axis && !set.axes[axis])
                    editSet({
                      ...set,
                      axes: { ...set.axes, [axis]: ["Default"] },
                      variants: set.variants.map((v) => ({
                        ...v,
                        values: { ...v.values, [axis]: "Default" },
                      })),
                    });
                }}
              >
                {t("Add variant axis")}
              </button>
              <label>
                {t("Add component to variant set")}
                <select
                  aria-label={t("Add component to variant set")}
                  value={newVariant}
                  onChange={(e) => setNewVariant(e.target.value)}
                >
                  <option value="">{t("Choose component")}</option>
                  {definitions
                    .filter(
                      (d) =>
                        !set.variants.some(
                          (v) => v.componentId === d.reference,
                        ),
                    )
                    .map((d) => (
                      <option key={d.reference} value={d.reference}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                disabled={!newVariant}
                onClick={() => {
                  const axes = structuredClone(set.axes),
                    first = Object.keys(axes)[0],
                    label =
                      definitions.find((d) => d.reference === newVariant)
                        ?.name ?? newVariant;
                  let value = label,
                    index = 1;
                  while (axes[first].includes(value))
                    value = label + " " + index++;
                  axes[first].push(value);
                  editSet({
                    ...set,
                    axes,
                    variants: [
                      ...set.variants,
                      {
                        componentId: newVariant,
                        values: Object.fromEntries(
                          Object.entries(axes).map(([axis, values]) => [
                            axis,
                            axis === first ? value : values[0],
                          ]),
                        ),
                      },
                    ],
                  });
                  setNewVariant("");
                }}
              >
                {t("Add variant")}
              </button>
              {set.variants.map((v) => (
                <button
                  disabled={set.variants.length <= 1}
                  key={v.componentId}
                  onClick={() => {
                    const variants = set.variants.filter(
                      (a) => a.componentId !== v.componentId,
                    );
                    editSet({
                      ...set,
                      variants,
                      defaultComponentId:
                        set.defaultComponentId === v.componentId
                          ? variants[0]?.componentId
                          : set.defaultComponentId,
                      axes: Object.fromEntries(
                        Object.keys(set.axes).map((axis) => [
                          axis,
                          [...new Set(variants.map((v) => v.values[axis]))],
                        ]),
                      ),
                    });
                  }}
                >
                  {t("Remove variant {name}", {
                    name:
                      definitions.find((d) => d.reference === v.componentId)
                        ?.name ?? v.componentId,
                  })}
                </button>
              ))}
              <button
                onClick={() =>
                  act(() => propagatePropertiesToVariants(doc, reference!))
                }
              >
                {t("Expose matching properties in all variants")}
              </button>
              <button
                onClick={() =>
                  onChange({
                    ...doc,
                    componentSets: doc.componentSets?.filter(
                      (s) => s.id !== set.id,
                    ),
                    nodes: doc.nodes.map((n) =>
                      n.componentSetId === set.id
                        ? { ...n, componentSetId: undefined }
                        : n,
                    ),
                  })
                }
              >
                {t("Remove variant set")}
              </button>
              <p className="muted">
                {t(
                  "Every variant combination must be unique. Shared property names preserve overrides when switching.",
                )}
              </p>
            </details>
          )}
        </>
      )}
    </section>
  );
}
