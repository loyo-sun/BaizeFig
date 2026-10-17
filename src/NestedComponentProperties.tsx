import { execute, type Document, type Node } from "./core";
import {
  componentTargets,
  componentDefinitions,
  setComponentValue,
} from "./components";
import { useI18n } from "./LanguageContext";
export function NestedComponentProperties({
  doc,
  root,
  onChange,
  onError,
}: {
  doc: Document;
  root: Node;
  onChange: (doc: Document) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const definitions = componentDefinitions(doc);
  const main =
    root.type === "component"
      ? root
      : definitions.find((d) => d.reference === root.componentId)?.root;
  if (!main) return null;
  const targets = componentTargets(
    doc,
    root.type === "component" ? root.id : root.componentId!,
  ).filter((e) => e.path && e.node.type === "instance");
  const apply = (fn: () => Document) => {
    try {
      onChange(fn());
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return (
    <>
      {root.type === "component" && targets.length > 0 && (
        <details>
          <summary>{t("Expose nested instance properties")}</summary>
          {targets.map((e) => (
            <label key={e.path}>
              <input
                type="checkbox"
                checked={main.exposedNestedInstances?.includes(e.path) ?? false}
                onChange={(event) =>
                  apply(
                    () =>
                      execute(doc, {
                        type: "update",
                        ids: [root.id],
                        patch: {
                          exposedNestedInstances: event.target.checked
                            ? [...(main.exposedNestedInstances ?? []), e.path]
                            : (main.exposedNestedInstances ?? []).filter(
                                (p) => p !== e.path,
                              ),
                        },
                      }).doc,
                  )
                }
              />
              {e.node.name}
            </label>
          ))}
        </details>
      )}
      {root.type === "instance" &&
        (main.exposedNestedInstances ?? []).map((path) => {
          const nested = doc.nodes.find(
            (n) =>
              n.componentOwner === root.id &&
              n.componentPath === path &&
              n.type === "instance",
          );
          const definition =
            nested &&
            definitions.find((d) => d.reference === nested.componentId);
          if (!nested || !definition)
            return (
              <p key={path} className="muted">
                {t("Nested instance unavailable")}
              </p>
            );
          return (
            <fieldset key={path}>
              <legend>{nested.name}</legend>
              {(definition.root.componentProperties ?? [])
                .filter((p) => p.type !== "slot")
                .map((p) => (
                  <label key={p.id}>
                    {p.name}
                    {p.type === "boolean" ? (
                      <input
                        aria-label={t("Nested property {name}", {
                          name: nested.name + " / " + p.name,
                        })}
                        type="checkbox"
                        checked={Boolean(
                          nested.componentValues?.[p.id] ?? p.defaultValue,
                        )}
                        onChange={(e) =>
                          apply(() =>
                            setComponentValue(
                              doc,
                              nested.id,
                              p.id,
                              e.target.checked,
                            ),
                          )
                        }
                      />
                    ) : p.type === "instance" ? (
                      <select
                        aria-label={t("Nested property {name}", {
                          name: nested.name + " / " + p.name,
                        })}
                        value={String(
                          nested.componentValues?.[p.id] ?? p.defaultValue,
                        )}
                        onChange={(e) =>
                          apply(() =>
                            setComponentValue(
                              doc,
                              nested.id,
                              p.id,
                              e.target.value,
                            ),
                          )
                        }
                      >
                        {definitions.map((d) => (
                          <option key={d.reference} value={d.reference}>
                            {d.name}
                            {p.preferred?.includes(d.reference) ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        aria-label={t("Nested property {name}", {
                          name: nested.name + " / " + p.name,
                        })}
                        key={
                          nested.id +
                          p.id +
                          String(
                            nested.componentValues?.[p.id] ?? p.defaultValue,
                          )
                        }
                        defaultValue={String(
                          nested.componentValues?.[p.id] ?? p.defaultValue,
                        )}
                        onBlur={(e) =>
                          apply(() =>
                            setComponentValue(
                              doc,
                              nested.id,
                              p.id,
                              e.target.value,
                            ),
                          )
                        }
                      />
                    )}
                  </label>
                ))}
            </fieldset>
          );
        })}
    </>
  );
}
