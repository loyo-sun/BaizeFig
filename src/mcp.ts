import { toolSchemas } from "../bridge/contracts.mjs";
import {
  execute,
  makeNode,
  ancestors,
  type Command,
  type Document,
  type Node,
} from "./core";

export class McpError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function bridgeWebSocketUrl(address: string) {
  const url = new URL(address);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new McpError(
      "INVALID_ADDRESS",
      "Enter an HTTP or HTTPS MCP address without credentials, query or fragment",
    );
  if (
    url.protocol === "http:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new McpError(
      "INVALID_ADDRESS",
      "Remote MCP connections require HTTPS",
    );
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname =
    url.pathname.replace(/\/mcp\/?$/, "").replace(/\/$/, "") + "/bridge";
  return url.href;
}

/** Loopback MCP works even when the operating system reports no internet. */
export function bridgeNeedsNetwork(address: string) {
  try {
    return !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(address).hostname,
    );
  } catch {
    return true;
  }
}

type Context = {
  doc: Document;
  page: string;
  selected: string[];
  bridgeWrite: boolean;
  bridgeExport: boolean;
};
type Receipt = { fingerprint: string; result: unknown };
/** Application state is explicit; no MCP transport session is used as document identity. */
export class EditorMcp {
  readonly editorId = crypto.randomUUID();
  private document?: Document;
  private revision = crypto.randomUUID();
  private receipts = new Map<string, Receipt>();
  forgetReceipt(documentId:string,key:string) {this.receipts.delete(JSON.stringify([documentId,key]));}
  private sync(doc: Document) {
    if (this.document !== doc) {
      this.document = doc;
      this.revision = crypto.randomUUID();
    }
    return this.revision;
  }
  handle(
    method: string,
    raw: unknown,
    c: Context,
    commit: (doc: Document) => void,
  ) {
    const schema = toolSchemas[method];
    if (!schema) throw new McpError("UNKNOWN_METHOD", "Unknown MCP method");
    const parsed = schema.safeParse(raw);
    if (!parsed.success)
      throw new McpError("INVALID_PARAMS", parsed.error.message);
    const p = parsed.data as Record<string, any>;
    const revision = this.sync(c.doc);
    if (
      (p.documentId && p.documentId !== c.doc.id) ||
      (p.editorId && p.editorId !== this.editorId)
    )
      throw new McpError(
        "TARGET_CHANGED",
        "Editor or document changed. Read the document again.",
      );
    const meta = { documentId: c.doc.id, editorId: this.editorId, revision };
    if (method === "get_request_status") {
      const receipt = this.receipts.get(
        JSON.stringify([c.doc.id, p.idempotencyKey]),
      );
      return {
        ...meta,
        status: receipt ? "applied" : "not_found",
        result: receipt?.result,
      };
    }
    if (method === "get_document") {
      if (p.expectedRevision && p.expectedRevision !== revision)
        throw new McpError(
          "REVISION_CONFLICT",
          "Document changed during pagination. Restart reading.",
        );
      if (p.pageId && !c.doc.pages.some((page) => page.id === p.pageId))
        throw new McpError("NOT_FOUND", "Page not found");
      const nodes = c.doc.nodes.filter(
        (n) =>
          (!p.pageId || n.pageId === p.pageId) &&
          (!p.ids || p.ids.includes(n.id)),
      );
      return {
        ...meta,
        name: c.doc.name,
        pages: c.doc.pages,
        background: c.doc.background,
        nodes: nodes
          .slice(p.offset, p.offset + p.limit)
          .map((n) =>
            p.fields
              ? Object.fromEntries(
                  p.fields.map((key: string) => [key, n[key as keyof Node]]),
                )
              : n,
          ),
        total: nodes.length,
        nextOffset:
          p.offset + p.limit < nodes.length ? p.offset + p.limit : null,
      };
    }
    if (method === "get_selection")
      return {
        ...meta,
        ids: c.selected,
        nodes: c.doc.nodes.filter((n) => c.selected.includes(n.id)),
      };
    if (method === "apply_commands" || method === "preview_commands") {
      if (!c.bridgeWrite)
        throw new McpError(
          "PERMISSION_DENIED",
          "Write access is disabled in the editor",
        );
      const fingerprint = JSON.stringify({
        expectedRevision: p.expectedRevision,
        commands: p.commands,
      });
      const key = JSON.stringify([c.doc.id, p.idempotencyKey]);
      const receipt = this.receipts.get(key);
      if (receipt) {
        if (receipt.fingerprint !== fingerprint)
          throw new McpError(
            "IDEMPOTENCY_CONFLICT",
            "This key was used for different commands",
          );
        return receipt.result;
      }
      if (p.expectedRevision !== revision)
        throw new McpError(
          "REVISION_CONFLICT",
          "Document changed. Read and review the new revision before writing.",
        );
      if (this.receipts.size >= 500)
        throw new McpError(
          "RECEIPT_LIMIT",
          "Receipt limit reached. Reload and pair the editor again.",
        );
      let next = c.doc;
      for (const operation of p.commands) {
        const command =
          operation.type === "create"
            ? {
                ...operation,
                nodes: operation.nodes.map((n: Node) =>
                  makeNode(n.type, n.pageId, n),
                ),
              }
            : operation;
        const targets: string[] =
          command.ids ??
          (command.id
            ? [command.id]
            : command.nodes.map((n: Node) => n.parentId).filter(Boolean));
        if (
          command.type !== "create" &&
          targets.some((id) => !next.nodes.some((n) => n.id === id))
        )
          throw new McpError("NOT_FOUND", "Target node not found");
        if (
          next.nodes.some(
            (n) =>
              targets.includes(n.id) &&
              (n.locked || ancestors(next, n).some((a) => a.locked)),
          )
        )
          throw new McpError("LOCKED", "Target node or ancestor is locked");
        next = execute(next, command as Command).doc;
      }
      if (method === "preview_commands") {
        const before = new Map(c.doc.nodes.map((n) => [n.id, n]));
        const after = new Map(next.nodes.map((n) => [n.id, n]));
        return {
          ...meta,
          preview: true,
          created: next.nodes.filter((n) => !before.has(n.id)).map((n) => n.id),
          updated: next.nodes
            .filter(
              (n) =>
                before.has(n.id) &&
                JSON.stringify(before.get(n.id)) !== JSON.stringify(n),
            )
            .map((n) => n.id),
          deleted: c.doc.nodes.filter((n) => !after.has(n.id)).map((n) => n.id),
        };
      }
      commit(next);
      const result = {
        ...meta,
        revision: this.sync(next),
        applied: p.commands.length,
        idempotencyKey: p.idempotencyKey,
      };
      this.receipts.set(key, { fingerprint, result });
      return result;
    }
    if (method === "get_screenshot" || method === "export_svg") {
      if (!c.bridgeExport)
        throw new McpError(
          "PERMISSION_DENIED",
          "Export access is disabled in the editor",
        );
      return meta;
    }
    return meta;
  }
}
