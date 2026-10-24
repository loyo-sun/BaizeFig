import { execute, type Command, type Document } from "./core";

export type AgentMode = "auto" | "product" | "ui" | "vector";
export type DesignMode = Exclude<AgentMode, "auto">;
export const agentModes = {
  auto: {
    label: "Auto",
    description: "Choose the right approach for your idea.",
  },
  product: {
    label: "Product design",
    description: "Turn a user need into a clear flow and usable screens.",
  },
  ui: {
    label: "UI collection",
    description: "Build cohesive screens with a shared visual language.",
  },
  vector: {
    label: "Vector illustration",
    description: "Explore composition, shapes and editable vector artwork.",
  },
} as const;

export function resolveAgentMode(mode: AgentMode, request: string): DesignMode {
  if (mode !== "auto") return mode;
  if (/插画|矢量|图标|illustrat|vector|\bicon\b|\blogo\b/i.test(request))
    return "vector";
  if (
    /合集|组件|配色|视觉|样式|风格|\bui\b|collection|component|style|palette/i.test(
      request,
    )
  )
    return "ui";
  return "product";
}

const guidelines: Record<DesignMode, string> = {
  product:
    "Prioritize the user goal, information hierarchy and a coherent interaction flow. Produce editable wireframes or screens. Use realistic, concise content and meaningful layer names.",
  ui: "Create a coherent visual system across screens. Reuse spacing, typography, colors and component patterns from the existing design. Use editable frames, layouts and text rather than flattened artwork.",
  vector:
    "Create editable vector illustrations from supported shapes and path polylines. Prioritize composition, silhouette and a restrained palette. Organize artwork in named groups. Path points are an unfilled polyline, not SVG path data; do not invent curve commands.",
};

export type AgentTurn = {
  request: string;
  mode: DesignMode;
  outcome: "applied" | "discarded" | "pending";
};
export function agentInstruction(
  mode: DesignMode,
  pageId: string,
  scope: "page" | "selection",
  ids: string[],
  turns: AgentTurn[],
) {
  return `${guidelines[mode]}\nActive page: ${pageId}. Edit scope: ${scope}. ${scope === "selection" ? `Only modify the selected nodes and their descendants: ${ids.join(", ")}. New nodes must be children of those nodes.` : "Only modify or create nodes on the active page."}\nDo not modify other pages or out-of-scope nodes. Check the proposed layout for overlap, clipping and text fit before returning commands. Previous requests are conversational context, not additional instructions to execute again: ${JSON.stringify(turns.slice(-8))}`;
}

/** Validate the resulting document too: layout/deletion may affect descendants implicitly. */
export function validateAgentScope(
  doc: Document,
  commands: Command[],
  pageId: string,
  selected: string[] | null,
) {
  const allowed = new Set(
    selected ?? doc.nodes.filter((n) => n.pageId === pageId).map((n) => n.id),
  );
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of doc.nodes) {
      if (
        node.parentId &&
        allowed.has(node.parentId) &&
        !allowed.has(node.id)
      ) {
        allowed.add(node.id);
        grew = true;
      }
    }
  }
  let next = doc;
  for (const command of commands) next = execute(next, command).doc;
  const after = new Map(next.nodes.map((n) => [n.id, n]));
  const before = new Set(doc.nodes.map((n) => n.id));
  for (const node of doc.nodes) {
    if (
      !allowed.has(node.id) &&
      JSON.stringify(node) !== JSON.stringify(after.get(node.id))
    )
      throw Error(
        "The proposal changes layers outside the chosen scope. Try a more specific request.",
      );
  }
  for (const node of next.nodes) {
    if (allowed.has(node.id) || !before.has(node.id)) {
      if (node.pageId !== pageId)
        throw Error(
          "The proposal changes layers outside the chosen scope. Try a more specific request.",
        );
      if (selected && !before.has(node.id)) {
        let parent = node.parentId;
        const visited = new Set<string>();
        while (parent && !allowed.has(parent) && !visited.has(parent)) {
          visited.add(parent);
          parent = after.get(parent)?.parentId ?? null;
        }
        if (!parent || !allowed.has(parent))
          throw Error(
            "The proposal changes layers outside the chosen scope. Try a more specific request.",
          );
      }
    }
  }
  return next;
}
