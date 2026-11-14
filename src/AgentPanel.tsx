import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleHelp,
  Layers3,
  MessageSquarePlus,
  MousePointer2,
  PenTool,
  Settings2,
  Sparkles,
  Square,
  Workflow,
} from "lucide-react";
import { useI18n } from "./LanguageContext";
import {
  generate,
  formatAIError,
  chatCompletionsUrl,
  type AIConfig,
} from "./ai";
import {
  agentModes,
  agentInstruction,
  resolveAgentMode,
  validateAgentScope,
  type AgentMode,
  type AgentTurn,
} from "./agentModes";
import type { Command, Document } from "./core";
import type { AgentWorkspace } from "./agentWorkspace";

const examples: Record<AgentMode, [string, string][]> = {
  auto: [
    [
      "Start with an idea",
      "Design a reading app home screen with a continue-reading card and book recommendations.",
    ],
    [
      "Refine this design",
      "Refine the current design: improve hierarchy, spacing and alignment while preserving its style.",
    ],
    [
      "Draw something",
      "Create an editable vector illustration of an open book with a small plant, using warm green and cream colors.",
    ],
  ],
  product: [
    [
      "A reading app",
      "Design a reading app home screen with a continue-reading card and book recommendations.",
    ],
    [
      "An onboarding flow",
      "Create three mobile onboarding wireframes for a reading app: welcome, interests and reading goal.",
    ],
    [
      "Improve the hierarchy",
      "Refine the current design: improve hierarchy, spacing and alignment while preserving its style.",
    ],
  ],
  ui: [
    [
      "A dashboard collection",
      "Create two cohesive dashboard screens, overview and analytics, sharing navigation, typography and card styles.",
    ],
    [
      "Unify the visual style",
      "Unify the current cards: use consistent spacing, typography, corner radius and colors.",
    ],
    [
      "Explore a new palette",
      "Restyle the current design with a calm green and warm neutral palette, maintaining legible contrast.",
    ],
  ],
  vector: [
    [
      "An editorial illustration",
      "Create an editable vector illustration of an open book with a small plant, using warm green and cream colors.",
    ],
    [
      "A geometric landscape",
      "Create an editable geometric landscape illustration with mountains, a rising sun and a lake.",
    ],
    [
      "A set of simple icons",
      "Draw three consistent editable vector icons for a book, bookmark and reading goal using simple shapes.",
    ],
  ],
};
const icons = {
  auto: Sparkles,
  product: Workflow,
  ui: Layers3,
  vector: PenTool,
};
type Proposal = { commands: Command[]; base: string; id: number };

export function AgentPanel(p: {
  doc: Document;
  pageId: string;
  selected: string[];
  config: AIConfig;
  workspace: AgentWorkspace;
  onOpenSettings: () => void;
  onApply: (commands: Command[], base: string) => void;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<AgentMode>("auto");
  const [modeOpen, setModeOpen] = useState(false);
  const [scope, setScope] = useState<"page" | "selection">("selection");
  const [draft, setDraft] = useState("");
  const { turns, setTurns, activeAgent, source, location } = p.workspace;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const Icon = icons[mode];
  const ready = source !== null;
  const stale = proposal !== null && proposal.base !== JSON.stringify(p.doc);
  const validSelection = p.selected.filter((id) =>
    p.doc.nodes.some((n) => n.id === id && n.pageId === p.pageId),
  );
  const effectiveScope =
    scope === "selection" && validSelection.length ? "selection" : "page";
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );
  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, busy, error]);

  function finish(id: number, outcome: AgentTurn["outcome"], summary: string) {
    setTurns((all) =>
      all.map((turn) =>
        turn.id === id ? { ...turn, outcome, summary } : turn,
      ),
    );
  }
  function discard() {
    if (proposal) finish(proposal.id, "discarded", "Proposal discarded.");
    setProposal(null);
    setError("");
  }
  async function submit() {
    if (busy || !draft.trim() || !p.canEdit) return;
    if (!ready) {
      p.onOpenSettings();
      setError(t("Connect a model to start designing."));
      return;
    }
    if (proposal) discard();
    const request = draft.trim();
    const resolved = resolveAgentMode(mode, request);
    const id =
      Math.max(sequence.current, ...turns.map((turn) => turn.id), 0) + 1;
    sequence.current = id;
    const base = JSON.stringify(p.doc);
    const controller = new AbortController();
    abort.current = controller;
    setTurns((all) => [
      ...all,
      {
        id,
        request,
        mode: resolved,
        outcome: "pending",
        source: source ?? "custom",
        agentName: t(activeAgent.name),
      },
    ]);
    setDraft("");
    setError("");
    if (source === "cloud") {
      finish(
        id,
        "discarded",
        "Cloud preview: this request shares your Agent context. Cloud execution is not connected; no credits were charged and the canvas is unchanged.",
      );
      return;
    }
    setBusy(true);
    try {
      const commands = await generate(
        {
          ...p.config,
          system: `${activeAgent.system}\n${p.config.system}\n${agentInstruction(resolved, p.pageId, effectiveScope, validSelection, turns)}`,
        },
        request,
        p.doc,
        effectiveScope === "selection" ? validSelection : [],
        controller.signal,
      );
      if (controller.signal.aborted) {
        finish(
          id,
          "discarded",
          "Generation stopped. Your canvas is unchanged.",
        );
        return;
      }
      validateAgentScope(
        p.doc,
        commands,
        p.pageId,
        effectiveScope === "selection" ? validSelection : null,
      );
      if (!commands.length) {
        finish(
          id,
          "discarded",
          "The model returned no changes. Try adding more detail.",
        );
        return;
      }
      setProposal({ commands, base, id });
      finish(
        id,
        "pending",
        "Your proposal is ready. Review the changes before applying.",
      );
    } catch (e) {
      const cancelled = controller.signal.aborted;
      finish(
        id,
        "discarded",
        cancelled
          ? "Generation stopped. Your canvas is unchanged."
          : "The proposal could not be generated.",
      );
      if (!cancelled) setError(formatAIError(e, t));
    } finally {
      setBusy(false);
    }
  }
  function apply() {
    if (!proposal || stale || !p.canEdit) return;
    try {
      p.onApply(proposal.commands, proposal.base);
      finish(
        proposal.id,
        "applied",
        "Applied to canvas. You can undo this change.",
      );
      setProposal(null);
      setError("");
    } catch (e) {
      setError(formatAIError(e, t));
    }
  }
  const pageName =
    p.doc.pages.find((page) => page.id === p.pageId)?.name ?? p.doc.name;
  return (
    <section className="agent-panel" aria-label={t("Baize assistant")}>
      <div className="agent-identity">
        <Sparkles size={14} />
        <select
          aria-label={t("Current Agent")}
          value={activeAgent.id}
          disabled={busy}
          onChange={(e) => p.workspace.setActiveId(e.target.value)}
        >
          {p.workspace.agents.map((agent) => (
            <option value={agent.id} key={agent.id}>
              {t(agent.name)}
            </option>
          ))}
        </select>
        <span>{t(location === "cloud" ? "Cloud preview" : "Local")}</span>
      </div>
      <div className="agent-toolbar">
        <div
          className="agent-mode-wrap"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setModeOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setModeOpen(false);
          }}
        >
          <button
            className="agent-mode-trigger"
            aria-expanded={modeOpen}
            aria-controls="agent-modes"
            onClick={() => setModeOpen(!modeOpen)}
            disabled={busy}
          >
            <Icon size={14} />
            <span>{t(agentModes[mode].label)}</span>
            <ChevronDown size={12} />
          </button>
          {modeOpen && (
            <div
              className="agent-mode-menu"
              id="agent-modes"
              role="group"
              aria-label={t("Design mode")}
            >
              {(Object.keys(agentModes) as AgentMode[]).map((key) => {
                const ModeIcon = icons[key];
                return (
                  <button
                    key={key}
                    aria-pressed={mode === key}
                    onClick={() => {
                      setMode(key);
                      setModeOpen(false);
                    }}
                  >
                    <ModeIcon size={16} />
                    <span>
                      <strong>{t(agentModes[key].label)}</strong>
                      <small>{t(agentModes[key].description)}</small>
                    </span>
                    {mode === key && <Check size={13} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="agent-toolbar-actions">
          <button
            className="agent-icon-button"
            title={t("New conversation")}
            aria-label={t("New conversation")}
            disabled={busy || !turns.length}
            onClick={() => {
              setTurns([]);
              setProposal(null);
              setError("");
              setDraft("");
            }}
          >
            <MessageSquarePlus size={15} />
          </button>
          <button
            className="agent-icon-button"
            aria-label={t("AI Agent settings")}
            title={t("AI Agent settings")}
            onClick={p.onOpenSettings}
          >
            <Settings2 size={15} />
          </button>
        </div>
      </div>
      <div className="agent-scroll" ref={log}>
        {!turns.length ? (
          <>
            <div className="agent-welcome">
              <div className="agent-mark">
                <img src="/baize.svg" alt="" />
              </div>
              <span className="agent-eyebrow">{t("CREATE WITH BAIZE")}</span>
              <h2>{t("What shall we create?")}</h2>
              <p>
                {t(
                  "One assistant, different ways to create. Start with an idea or a selection.",
                )}
              </p>
            </div>
            <div className="agent-examples">
              <div className="agent-section-label">
                {t("Try a starting point")}
              </div>
              {examples[mode].map(([label, text], i) => (
                <button
                  key={label}
                  className="agent-example"
                  onClick={() => {
                    setDraft(t(text));
                    composer.current?.focus();
                  }}
                >
                  <span className={`agent-example-icon example-${i}`}>
                    {i === 0 ? (
                      <Workflow size={15} />
                    ) : i === 1 ? (
                      <Layers3 size={15} />
                    ) : (
                      <PenTool size={15} />
                    )}
                  </span>
                  <span>{t(label)}</span>
                  <ArrowUp size={13} />
                </button>
              ))}
            </div>
            <div className="agent-tip">
              <CircleHelp size={13} />
              <span>
                {t(
                  "Select layers on the canvas to give Baize a focused starting point.",
                )}
              </span>
            </div>
          </>
        ) : (
          <div
            className="agent-log"
            role="log"
            aria-label={t("Design conversation")}
            aria-live="polite"
          >
            {turns.map((turn) => (
              <article key={turn.id} className="agent-turn">
                <div className="agent-user-message">{turn.request}</div>
                <div className="agent-reply">
                  <span className="agent-reply-avatar">
                    <Sparkles size={12} />
                  </span>
                  <div>
                    <strong>
                      {turn.agentName ?? t("Baize")}
                      <span>{t(agentModes[turn.mode].label)}</span>
                    </strong>
                    <p>
                      {turn.summary
                        ? t(turn.summary)
                        : t("Preparing an editable proposal…")}
                    </p>
                    {turn.outcome === "applied" && (
                      <small className="agent-applied">
                        <Check size={12} />
                        {t("Applied")}
                      </small>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {busy && (
          <div className="agent-progress" role="status">
            <span />
            {t("Generating an editable proposal…")}
          </div>
        )}
        {proposal && (
          <div className="agent-proposal">
            <div className="agent-section-label">
              {t("Proposed changes")}
              <span>
                {t("{count} operations", {
                  count: proposal.commands.length,
                })}
              </span>
            </div>
            <details>
              <summary>{t("View change details")}</summary>
              <ul>
                {proposal.commands.map((c, i) => (
                  <li key={i}>
                    <code>
                      {t(
                        (
                          {
                            create: "Create layers",
                            update: "Update layers",
                            delete: "Delete layers",
                            layout: "Adjust layout",
                          } as Record<string, string>
                        )[c.type] ?? c.type,
                      )}
                    </code>
                    <span>
                      {"ids" in c
                        ? c.ids
                            .map(
                              (id) =>
                                p.doc.nodes.find((n) => n.id === id)?.name ??
                                id,
                            )
                            .join(", ")
                        : "nodes" in c
                          ? t("{count} new layers", {
                              count: c.nodes.length,
                            })
                          : "id" in c
                            ? (p.doc.nodes.find((n) => n.id === c.id)?.name ??
                              c.id)
                            : ""}
                      {c.type === "update" && (
                        <small className="agent-change-values">
                          {Object.entries(c.patch)
                            .map(
                              ([field, value]) =>
                                `${t(({ text: "Text", fill: "Fill", name: "Name", width: "Width", height: "Height", fontSize: "Font size", fontFamily: "Font family", fontWeight: "Font weight", radius: "Corner radius", opacity: "Opacity", x: "X", y: "Y", visible: "Visible", locked: "Locked", stroke: "Stroke", strokeWidth: "Stroke width", rotation: "Rotation", textAlign: "Text align", lineHeight: "Line height" } as Record<string, string>)[field] ?? field)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
                            )
                            .join(" · ")}
                        </small>
                      )}
                      {c.type === "create" && (
                        <small className="agent-change-values">
                          {c.nodes.map((node) => node.name).join(" · ")}
                        </small>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
            {stale && (
              <p className="agent-error" role="alert">
                {t(
                  "The canvas has changed. Discard this proposal and generate again.",
                )}
              </p>
            )}
            <div className="agent-proposal-actions">
              <button onClick={discard}>{t("Discard")}</button>
              <button
                className="agent-apply"
                onClick={apply}
                disabled={stale || !p.canEdit}
              >
                <Check size={13} />
                {t("Apply to canvas")}
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="agent-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="agent-compose-area">
        <div className="agent-shared-context-label">
          <span>
            {t("Shared context")} · {turns.length}
          </span>
          <span>
            {t(location === "cloud" ? "Cloud preview" : "Local storage")}
          </span>
        </div>
        <div className="agent-context">
          <span>
            <MousePointer2 size={12} />
            {t("Context")}
          </span>
          <select
            aria-label={t("Edit scope")}
            value={effectiveScope}
            disabled={busy}
            onChange={(e) => setScope(e.target.value as "page" | "selection")}
          >
            <option value="page">{pageName}</option>
            <option value="selection" disabled={!validSelection.length}>
              {t("Selected layers ({count})", {
                count: validSelection.length,
              })}
            </option>
          </select>
        </div>
        <div className="agent-composer">
          <textarea
            ref={composer}
            aria-label={t("Message Baize")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("Describe your idea, or what to change…")}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <div className="agent-composer-bottom">
            <button
              className="agent-model-status"
              onClick={p.onOpenSettings}
              title={t("AI Agent settings")}
            >
              <span className={ready ? "ready" : ""} />
              {source === "cloud"
                ? t("LoyoCloud · credits (preview)")
                : source === "custom"
                  ? `${p.config.model} · Token`
                  : t("Connect a model")}
              <ChevronDown size={10} />
            </button>
            {busy ? (
              <button
                className="agent-send"
                aria-label={t("Stop generation")}
                onClick={() => abort.current?.abort()}
              >
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                className="agent-send"
                aria-label={t("Send to Baize")}
                disabled={!draft.trim() || !p.canEdit}
                onClick={() => void submit()}
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
        <p className="agent-footnote">
          {!p.canEdit
            ? t("Start editing this document before applying AI changes.")
            : source === "cloud"
              ? t(
                  "Cloud preview keeps context in this page. No request is sent.",
                )
              : t(
                  "The document is sent to your model. Changes need your review.",
                )}
        </p>
      </div>
    </section>
  );
}
