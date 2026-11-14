import { useEffect, useState, type SetStateAction } from "react";
import type { AIConfig } from "./ai";
import type { AgentTurn } from "./agentModes";

export type AgentSource = "cloud" | "custom";
export type SharedTurn = AgentTurn & {
  id: number;
  summary?: string;
  source?: AgentSource;
  agentName?: string;
};
export type AgentProfile = {
  id: string;
  name: string;
  description: string;
  system: string;
  location: "builtin" | "local" | "cloud";
};
export type AgentPolicy = {
  enabled: Record<AgentSource, boolean>;
  order: AgentSource[];
  previewCredits: number;
};
export const defaultPolicy: AgentPolicy = {
  enabled: { cloud: true, custom: true },
  order: ["cloud", "custom"],
  previewCredits: 1200,
};
export const defaultAgent: AgentProfile = {
  id: "baize",
  name: "Baize",
  description: "One assistant for product, UI and vector design.",
  system: "",
  location: "builtin",
};
const emptyTurns: SharedTurn[] = [];
const libraryKey = "baizefig.agent.library.v1";
const contextKey = "baizefig.agent.contexts.v1";

export function resolveAgentSource(
  policy: AgentPolicy,
  config: Pick<AIConfig, "model">,
): AgentSource | null {
  for (const source of policy.order) {
    if (!policy.enabled[source]) continue;
    if (source === "cloud" && policy.previewCredits > 0) return source;
    if (source === "custom" && config.model.trim()) return source;
  }
  return null;
}
export function parseAgentProfile(
  value: unknown,
  location: "local" | "cloud",
): AgentProfile {
  const file = value as {
    format?: unknown;
    agent?: { name?: unknown; description?: unknown; system?: unknown };
  };
  const data = file?.agent;
  if (
    file?.format !== "baize-agent" ||
    !data ||
    typeof data.name !== "string" ||
    !data.name.trim() ||
    typeof data.system !== "string" ||
    typeof data.description !== "string" ||
    data.name.length > 80 ||
    data.system.length > 50000 ||
    data.description.length > 500
  )
    throw Error("Invalid Agent file. Choose an exported .agent.json file.");
  return {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    description: data.description,
    system: data.system,
    location,
  };
}
export function exportAgentProfile(agent: AgentProfile) {
  return {
    format: "baize-agent",
    version: 1,
    agent: {
      name: agent.name,
      description: agent.description,
      system: agent.system,
    },
  };
}
export function parseSharedContext(value: unknown): SharedTurn[] {
  const file = value as { format?: unknown; turns?: unknown };
  if (
    file?.format !== "baize-context" ||
    !Array.isArray(file.turns) ||
    file.turns.length > 500
  )
    throw Error("Invalid context file.");
  return file.turns.map((turn, index) => {
    if (
      !turn ||
      typeof turn.request !== "string" ||
      turn.request.length > 50000 ||
      !["product", "ui", "vector"].includes(turn.mode) ||
      (turn.summary !== undefined && typeof turn.summary !== "string")
    )
      throw Error("Invalid context file.");
    return {
      id: index + 1,
      request: turn.request,
      mode: turn.mode,
      outcome: turn.outcome === "applied" ? "applied" : "discarded",
      summary: turn.summary,
      source: turn.source === "cloud" ? "cloud" : "custom",
      agentName:
        typeof turn.agentName === "string" ? turn.agentName : undefined,
    };
  });
}
export function downloadAgentFile(filename: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useAgentWorkspace(documentId: string, config: AIConfig) {
  const [policy, setPolicy] = useState<AgentPolicy>(defaultPolicy);
  const [profiles, setProfiles] = useState<AgentProfile[]>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(libraryKey) ?? "[]");
      if (!Array.isArray(data)) return [];
      return data.map((value) => parseAgentProfile(value, "local"));
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState("baize");
  const [contexts, setContexts] = useState<Record<string, SharedTurn[]>>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(contextKey) ?? "{}");
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      return Object.fromEntries(
        Object.entries(data).map(([id, value]) => [
          id,
          parseSharedContext(value),
        ]),
      );
    } catch {
      return {};
    }
  });
  const [storageError, setStorageError] = useState("");
  const source = resolveAgentSource(policy, config);
  const preferred = policy.order.find((key) => policy.enabled[key]) ?? "custom";
  const location: "cloud" | "local" =
    (source ?? preferred) === "cloud" ? "cloud" : "local";
  const agents = [
    defaultAgent,
    ...profiles.filter((agent) => agent.location === location),
  ];
  const activeAgent =
    agents.find((agent) => agent.id === activeId) ?? defaultAgent;
  const turns = contexts[documentId] ?? emptyTurns;
  function setTurns(update: SetStateAction<SharedTurn[]>) {
    setContexts((all) => ({
      ...all,
      [documentId]:
        typeof update === "function" ? update(all[documentId] ?? []) : update,
    }));
  }
  useEffect(() => {
    try {
      localStorage.setItem(
        libraryKey,
        JSON.stringify(
          profiles
            .filter((profile) => profile.location === "local")
            .map(exportAgentProfile),
        ),
      );
      setStorageError("");
    } catch {
      setStorageError(
        "Local storage is unavailable. Export a file to keep your work.",
      );
    }
  }, [profiles]);
  useEffect(() => {
    if (location !== "local") return;
    try {
      const old = JSON.parse(localStorage.getItem(contextKey) ?? "{}");
      localStorage.setItem(
        contextKey,
        JSON.stringify({
          ...old,
          [documentId]: { format: "baize-context", version: 1, turns },
        }),
      );
      setStorageError("");
    } catch {
      setStorageError(
        "Local storage is unavailable. Export a file to keep your work.",
      );
    }
  }, [turns, location, documentId]);
  function saveProfile(profile: AgentProfile) {
    setProfiles((all) => [
      ...all.filter((agent) => agent.id !== profile.id),
      profile,
    ]);
    setActiveId(profile.id);
  }
  return {
    policy,
    setPolicy,
    profiles,
    agents,
    activeAgent,
    setActiveId,
    source,
    location,
    turns,
    setTurns,
    saveProfile,
    storageError,
  };
}
export type AgentWorkspace = ReturnType<typeof useAgentWorkspace>;
