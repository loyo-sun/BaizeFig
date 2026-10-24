import { useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  Cloud,
  Download,
  FolderOpen,
  HardDrive,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { chatCompletionsUrl, type AIConfig } from "./ai";
import { useI18n } from "./LanguageContext";
import {
  defaultAgent,
  downloadAgentFile,
  exportAgentProfile,
  parseAgentProfile,
  parseSharedContext,
  type AgentProfile,
  type AgentSource,
  type AgentWorkspace,
} from "./agentWorkspace";

export function AIAgentSettings({
  config,
  onChange,
  workspace: w,
}: {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
  workspace: AgentWorkspace;
}) {
  const { t } = useI18n();
  const [section, setSection] = useState<"sources" | "agents" | "context">(
    "sources",
  );
  const [sourceTab, setSourceTab] = useState<AgentSource>("cloud");
  const [editing, setEditing] = useState<AgentProfile | null>(null);
  const [message, setMessage] = useState("");
  const agentInput = useRef<HTMLInputElement>(null);
  const contextInput = useRef<HTMLInputElement>(null);
  const sourceName = (source: AgentSource) =>
    source === "cloud" ? "LoyoCloud" : t("Custom model");
  const library = [
    defaultAgent,
    ...w.profiles.filter((agent) => agent.location === w.location),
  ];
  let endpoint = "";
  try {
    const url = new URL(chatCompletionsUrl(config.baseUrl));
    endpoint = url.origin + url.pathname;
  } catch {
    /* Incomplete input is expected. */
  }
  async function importFile(file: File | undefined, kind: "agent" | "context") {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw Error("The file is too large. Choose a file smaller than 2 MB.");
      const json = JSON.parse(await file.text());
      if (kind === "agent") {
        w.saveProfile(parseAgentProfile(json, w.location));
        setMessage(
          t(
            w.location === "cloud"
              ? "Agent imported into the cloud preview. No server was contacted."
              : "Agent imported and saved locally.",
          ),
        );
      } else {
        const imported = parseSharedContext(json);
        w.setTurns((previous) => {
          const nextId = Math.max(0, ...previous.map((turn) => turn.id));
          return [
            ...previous,
            ...imported.map((turn, index) => ({
              ...turn,
              id: nextId + index + 1,
            })),
          ];
        });
        setMessage(
          t(
            "Context imported. Both model sources can continue this conversation.",
          ),
        );
      }
    } catch (e) {
      setMessage(t((e as Error).message));
    }
  }
  return (
    <div className="agent-workspace-settings">
      <div className="agent-preview-notice">
        <Sparkles size={15} />
        <div>
          <strong>{t("Frontend preview")}</strong>
          <span>
            {t(
              "Cloud balances, execution and sync are demonstrations. No credits are charged or cloud data written.",
            )}
          </span>
        </div>
      </div>
      <div
        className="agent-settings-tabs"
        role="tablist"
        aria-label={t("AI Agent sections")}
      >
        {(
          [
            ["sources", "Model sources"],
            ["agents", "Agent library"],
            ["context", "Shared context"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={section === id}
            onClick={() => {
              setSection(id);
              setMessage("");
            }}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {section === "sources" && (
        <div className="agent-source-settings">
          <div className="agent-policy-header">
            <div>
              <strong>{t("Two sources, one Agent workspace")}</strong>
              <p>
                {t(
                  "Enable either source or both. The first available source in your priority order is used.",
                )}
              </p>
            </div>
          </div>
          <div className="agent-source-cards">
            {w.policy.order.map((source, index) => (
              <article
                key={source}
                className={`agent-source-card ${sourceTab === source ? "selected" : ""}`}
              >
                <div className="agent-source-card-head">
                  <span className="agent-source-number">{index + 1}</span>
                  {source === "cloud" ? (
                    <Cloud size={17} />
                  ) : (
                    <HardDrive size={17} />
                  )}
                  <strong>{sourceName(source)}</strong>
                  <label className="agent-enable-toggle">
                    <input
                      type="checkbox"
                      aria-label={t(
                        source === "cloud"
                          ? "Enable LoyoCloud AI"
                          : "Enable custom AI",
                      )}
                      checked={w.policy.enabled[source]}
                      onChange={(e) =>
                        w.setPolicy((policy) => ({
                          ...policy,
                          enabled: {
                            ...policy.enabled,
                            [source]: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span>{t("Enabled")}</span>
                  </label>
                </div>
                <p>
                  {t(
                    source === "cloud"
                      ? "Cloud credits · cloud Agent storage"
                      : "Your API tokens · local Agent storage",
                  )}
                </p>
                <div className="agent-source-card-footer">
                  <span
                    className={
                      w.source === source ? "agent-source-current" : ""
                    }
                  >
                    {t(
                      w.source === source
                        ? "Next request"
                        : !w.policy.enabled[source]
                          ? "Disabled"
                          : source === "custom" && !config.model.trim()
                            ? "Not configured"
                            : source === "cloud" &&
                                w.policy.previewCredits === 0
                              ? "No preview credits"
                              : "Standby",
                    )}
                  </span>
                  <button onClick={() => setSourceTab(source)}>
                    {t("Configure")}
                    <ArrowRight size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="agent-priority-bar">
            <div>
              <span>{t("Consumption order")}</span>
              <strong>
                {w.policy.order
                  .filter((source) => w.policy.enabled[source])
                  .map(sourceName)
                  .join(" → ") || t("No source enabled")}
              </strong>
            </div>
            <button
              aria-label={t("Reverse source priority")}
              onClick={() =>
                w.setPolicy((policy) => ({
                  ...policy,
                  order: [...policy.order].reverse(),
                }))
              }
            >
              <ArrowDownUp size={14} />
              {t("Change priority")}
            </button>
          </div>
          <p className="agent-policy-hint">
            {t(
              "When the first source has no credits or is not configured, use the next available source. Provider errors do not trigger automatic paid retries.",
            )}
          </p>
          {sourceTab === "cloud" ? (
            <div className="agent-cloud-config">
              <div className="agent-config-title">
                <Cloud size={17} />
                <strong>LoyoCloud</strong>
                <span>{t("Preview only")}</span>
              </div>
              <div className="agent-credit-row">
                <div>
                  <span>{t("Simulated credit balance")}</span>
                  <strong>
                    {w.policy.previewCredits.toLocaleString()}{" "}
                    <small>{t("credits")}</small>
                  </strong>
                </div>
                <button
                  onClick={() =>
                    w.setPolicy((policy) => ({
                      ...policy,
                      previewCredits: policy.previewCredits ? 0 : 1200,
                    }))
                  }
                >
                  {t(
                    w.policy.previewCredits
                      ? "Simulate depleted credits"
                      : "Restore preview credits",
                  )}
                </button>
              </div>
              <div className="agent-storage-facts">
                <div>
                  <Cloud size={15} />
                  <span>{t("Agent and context")}</span>
                  <strong>{t("Cloud storage")}</strong>
                </div>
                <div>
                  <FolderOpen size={15} />
                  <span>{t("Local files")}</span>
                  <strong>{t("Import and export supported")}</strong>
                </div>
              </div>
              <p>
                {t(
                  "Cloud execution and storage are not connected in this preview. Demonstration data stays in this page until it is closed.",
                )}
              </p>
            </div>
          ) : (
            <div className="ai-agent-settings agent-custom-config">
              <div className="agent-config-title">
                <HardDrive size={17} />
                <strong>{t("Custom model")}</strong>
                <span>{t("Key · session only")}</span>
              </div>
              <label>
                {t("API base URL")}
                <input
                  aria-label={t("Agent API URL")}
                  value={config.baseUrl}
                  onChange={(e) =>
                    onChange({ ...config, baseUrl: e.target.value })
                  }
                  placeholder="https://api.example.com/v1"
                />
              </label>
              <p className="ai-agent-settings-help">
                {t(
                  "Enter an API base URL, such as https://example.com/v1. A bare domain uses /v1 automatically.",
                )}
              </p>
              <div className="ai-agent-settings-fields">
                <label>
                  {t("Model")}
                  <input
                    aria-label={t("Agent model")}
                    value={config.model}
                    onChange={(e) =>
                      onChange({ ...config, model: e.target.value })
                    }
                    placeholder={t("Your model name")}
                  />
                </label>
                <label>
                  {t("API key")}
                  <input
                    type="password"
                    autoComplete="off"
                    aria-label={t("Agent API key")}
                    value={config.key}
                    onChange={(e) =>
                      onChange({ ...config, key: e.target.value })
                    }
                    placeholder={t("Optional for local models")}
                  />
                </label>
              </div>
              {endpoint && (
                <div className="ai-agent-endpoint">
                  <span>{t("Request endpoint")}</span>
                  <code>{endpoint}</code>
                </div>
              )}
              <div className="agent-storage-facts">
                <div>
                  <HardDrive size={15} />
                  <span>{t("Agent and context")}</span>
                  <strong>{t("Local storage")}</strong>
                </div>
                <div>
                  <Check size={15} />
                  <span>{t("Usage")}</span>
                  <strong>{t("Your provider's tokens")}</strong>
                </div>
              </div>
              <p className="ai-agent-settings-help">
                {t(
                  "Use the default Agent or import a local Agent. Custom credentials are never included in Agent or context exports.",
                )}
              </p>
            </div>
          )}
        </div>
      )}
      {section === "agents" && (
        <div className="agent-library-settings">
          <div className="agent-library-header">
            <div>
              <strong>{t("One Agent library, all design modes")}</strong>
              <p>
                {t(
                  w.location === "cloud"
                    ? "Current destination: cloud preview. Local import and export are available."
                    : "Current destination: this browser. Agents are saved locally.",
                )}
              </p>
            </div>
            <span className="agent-location-badge">
              {w.location === "cloud" ? (
                <Cloud size={12} />
              ) : (
                <HardDrive size={12} />
              )}
              {t(w.location === "cloud" ? "Cloud preview" : "Local")}
            </span>
          </div>
          <div className="agent-library-actions">
            <button
              onClick={() => {
                setEditing({
                  id: crypto.randomUUID(),
                  name: "",
                  description: "",
                  system: "",
                  location: w.location,
                });
                setMessage("");
              }}
            >
              <Plus size={14} />
              {t("New Agent")}
            </button>
            <button onClick={() => agentInput.current?.click()}>
              <Upload size={14} />
              {t("Import Agent")}
            </button>
          </div>
          <div className="agent-profile-list">
            {library.map((agent) => (
              <article
                key={agent.id}
                className={`agent-profile-row ${w.activeAgent.id === agent.id ? "active" : ""}`}
              >
                <span className="agent-profile-avatar">
                  <Sparkles size={18} />
                </span>
                <div>
                  <strong>
                    {t(agent.name)}
                    <small>
                      {t(
                        agent.location === "builtin"
                          ? "Default"
                          : agent.location === "cloud"
                            ? "Cloud preview"
                            : "Local",
                      )}
                    </small>
                  </strong>
                  <p>{t(agent.description)}</p>
                </div>
                <div className="agent-profile-actions">
                  <button
                    aria-label={t("Export Agent") + ": " + t(agent.name)}
                    title={t("Export Agent")}
                    onClick={() =>
                      downloadAgentFile(
                        "baize.agent.json",
                        exportAgentProfile(agent),
                      )
                    }
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setEditing(
                        agent.location === "builtin"
                          ? {
                              ...agent,
                              id: crypto.randomUUID(),
                              name: t("My Baize"),
                              location: w.location,
                            }
                          : { ...agent },
                      )
                    }
                  >
                    {t(agent.location === "builtin" ? "Duplicate" : "Edit")}
                  </button>
                  <button onClick={() => w.setActiveId(agent.id)}>
                    {t(w.activeAgent.id === agent.id ? "In use" : "Use Agent")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {editing && (
            <div className="agent-profile-editor">
              <strong>{t("Agent details")}</strong>
              <label>
                {t("Name")}
                <input
                  aria-label={t("Agent name")}
                  maxLength={80}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder={t("Give your Agent a name")}
                />
              </label>
              <label>
                {t("Description")}
                <input
                  maxLength={500}
                  aria-label={t("Agent description")}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </label>
              <label>
                {t("Design guidelines")}
                <textarea
                  aria-label={t("Agent instructions")}
                  value={editing.system}
                  maxLength={50000}
                  onChange={(e) =>
                    setEditing({ ...editing, system: e.target.value })
                  }
                  rows={5}
                  placeholder={t("Your component, color and typography rules")}
                />
              </label>
              <div>
                <button onClick={() => setEditing(null)}>{t("Cancel")}</button>
                <button
                  className="primary"
                  disabled={!editing.name.trim()}
                  onClick={() => {
                    w.saveProfile({
                      ...editing,
                      name: editing.name.trim(),
                      location: w.location,
                    });
                    setEditing(null);
                    setMessage(
                      t(
                        w.location === "cloud"
                          ? "Saved to the cloud preview only. No server was contacted."
                          : "Agent saved locally.",
                      ),
                    );
                  }}
                >
                  {t(
                    w.location === "cloud"
                      ? "Save to cloud preview"
                      : "Save locally",
                  )}
                </button>
              </div>
            </div>
          )}
          <p className="agent-policy-hint">
            {t(
              "Default and locally imported Agents are available with custom models. Export a cloud Agent and import it locally to use a local copy.",
            )}
          </p>
        </div>
      )}
      {section === "context" && (
        <div className="agent-context-settings">
          <div className="agent-context-visual">
            <span>
              <Cloud size={22} />
              LoyoCloud
            </span>
            <ArrowRight size={17} />
            <div>
              <Sparkles size={23} />
              <strong>{t("One shared conversation")}</strong>
            </div>
            <ArrowRight size={17} />
            <span>
              <HardDrive size={22} />
              {t("Custom model")}
            </span>
          </div>
          <h4>{t("Switch models, keep your context")}</h4>
          <p>
            {t(
              "Design modes and model sources share the same conversation in this document. Changing the source does not start a new conversation.",
            )}
          </p>
          <div className="agent-context-stats">
            <div>
              <span>{t("Conversation turns")}</span>
              <strong>{w.turns.length}</strong>
            </div>
            <div>
              <span>{t("Current Agent")}</span>
              <strong>{t(w.activeAgent.name)}</strong>
            </div>
            <div>
              <span>{t("Save destination")}</span>
              <strong>
                {t(w.location === "cloud" ? "Cloud preview" : "Local storage")}
              </strong>
            </div>
          </div>
          <div className="agent-context-actions">
            <button onClick={() => contextInput.current?.click()}>
              <Upload size={14} />
              {t("Import context")}
            </button>
            <button
              onClick={() =>
                downloadAgentFile("baize.context.json", {
                  format: "baize-context",
                  version: 1,
                  turns: w.turns,
                })
              }
            >
              <Download size={14} />
              {t("Export context")}
            </button>
            {w.location === "cloud" && (
              <button
                onClick={() =>
                  setMessage(
                    t(
                      "Context kept in the current cloud preview. Cloud sync is not connected.",
                    ),
                  )
                }
              >
                <Cloud size={14} />
                {t("Preview cloud save")}
              </button>
            )}
          </div>
          <p className="agent-policy-hint">
            {t(
              w.location === "cloud"
                ? "Cloud contexts are held in page memory in this preview. Export a local file to keep them."
                : "Local conversations are saved in this browser. You can export them and import them into another source.",
            )}
          </p>
          <div className="agent-context-recent">
            <strong>{t("Recent context")}</strong>
            {w.turns.length ? (
              w.turns.slice(-3).map((turn) => (
                <p key={turn.id}>
                  <span>{sourceName(turn.source ?? "custom")}</span>
                  {turn.request}
                </p>
              ))
            ) : (
              <p>
                {t(
                  "No conversation yet. Start a design request in Create, or import a context file.",
                )}
              </p>
            )}
          </div>
        </div>
      )}
      {(message || w.storageError) && (
        <p className="agent-settings-message" role="status">
          {message || t(w.storageError)}
        </p>
      )}
      <input
        ref={agentInput}
        type="file"
        accept=".json,.agent.json"
        hidden
        onChange={(e) => {
          void importFile(e.target.files?.[0], "agent");
          e.target.value = "";
        }}
      />
      <input
        ref={contextInput}
        type="file"
        accept=".json,.context.json"
        hidden
        onChange={(e) => {
          void importFile(e.target.files?.[0], "context");
          e.target.value = "";
        }}
      />
    </div>
  );
}
