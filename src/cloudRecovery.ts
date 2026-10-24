import { isCloudOffline } from "./cloudConnectivity";
import { openDB } from "idb";
import type { CloudSession } from "./cloud";
import type { Document } from "./core";
import { save } from "./storage";
export type CloudBinding = {
  headId: string | null;
  folderId: string | null;
  draftRevision?: string | null;
};
export type RecoveryRecord = {
  key: string;
  documentId: string;
  doc: Document;
  hash: string;
  syncedHash: string;
  baseName?: string;
  headId: string | null;
  cloudRevision: string | null;
  folderId: string | null;
  stageId: string;
  clientId: string;
  sequence: number;
  dirty: boolean;
  manual: boolean;
  editing: boolean;
  updatedAt: number;
  previewAt?: number;
  archive?: { doc: Document; sequence: number; at: number };
};
let connection: ReturnType<typeof openDB> | undefined;
const database = () =>
  (connection ??= openDB("baizefig-cloud-recovery", 1, {
    upgrade(db) {
      db.createObjectStore("drafts", { keyPath: "key" });
    },
  }));
const key = (s: CloudSession, id: string) =>
  s.base + ":" + s.user.id + ":" + id;
const marker = (id: string) => "baizefig.offline-edit." + id;
const recovered = new WeakSet<Document>();
const queue = new Map<string, Promise<unknown>>();
const activeClients = new Map<string, string>();
// Every tab owns a writer identity; a sequence from another tab is never treated as our own acknowledgement.
function clientId(s: CloudSession) {
  const k = s.base + ":" + s.user.id;
  let id = activeClients.get(k);
  if (!id) {
    id = crypto.randomUUID();
    activeClients.set(k, id);
  }
  return id;
}
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, ordered(v)]),
    );
  return value;
}
export const stableDocumentJSON = (doc: Document) =>
  JSON.stringify(ordered(doc));
async function hashDocument(doc: Document) {
  const data = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableDocumentJSON(doc)),
  );
  return Array.from(new Uint8Array(data), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
function serial<T>(k: string, run: () => Promise<T>): Promise<T> {
  const next = (queue.get(k) || Promise.resolve()).catch(() => {}).then(run);
  queue.set(k, next);
  void next
    .finally(() => {
      if (queue.get(k) === next) queue.delete(k);
    })
    .catch(() => {});
  return next;
}
function rememberPermission(s: CloudSession, record: RecoveryRecord) {
  try {
    localStorage.setItem(
      marker(record.documentId),
      JSON.stringify({
        key: record.key,
        base: s.base,
        userId: s.user.id,
        editing: record.editing,
        manual: record.manual,
        canRecover: true,
      }),
    );
  } catch {
    /* IndexedDB remains the source of recovery content. */
  }
}
export function canEditOffline(id: string) {
  if (window.baizefigDesktop || !isCloudOffline() || !localEditors.has(id))
    return false;
  try {
    return !!JSON.parse(localStorage.getItem(marker(id)) || "null")?.editing;
  } catch {
    return false;
  }
}
const localEditors = new Map<string, () => void>();
export function ownsLocalEditor(id: string) {
  return localEditors.has(id);
}
export function releaseLocalEditor(id: string) {
  localEditors.get(id)?.();
  localEditors.delete(id);
}
export function claimLocalEditor(id: string): Promise<boolean> {
  if (localEditors.has(id)) return Promise.resolve(true);
  if (!navigator.locks) return Promise.resolve(false);
  return new Promise((resolve) => {
    void navigator.locks
      .request("baizefig-editor-" + id, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }
        await new Promise<void>((release) => {
          localEditors.set(id, release);
          resolve(true);
        });
      })
      .catch(() => resolve(false));
  });
}
export function offlineSessionForDoc(id: string): CloudSession | null {
  if (window.baizefigDesktop || !isCloudOffline()) return null;
  try {
    const m = JSON.parse(localStorage.getItem(marker(id)) || "null");
    return m?.canRecover
      ? {
          base: m.base,
          user: { id: m.userId, username: "离线" },
          token: "",
          expiresAt: 0,
          mcpUrl: m.base + "/mcp/baizefig",
        }
      : null;
  } catch {
    return null;
  }
}
export function hasPendingManual(id: string) {
  try {
    return !!JSON.parse(localStorage.getItem(marker(id)) || "null")?.manual;
  } catch {
    return false;
  }
}
export function setOfflineEditing(
  s: CloudSession,
  id: string,
  editing: boolean,
) {
  const k = key(s, id);
  return serial(k, async () => {
    const db = await database();
    const r: RecoveryRecord | undefined = await db.get("drafts", k);
    if (r) {
      r.editing = editing;
      await db.put("drafts", r);
      rememberPermission(s, r);
    }
  });
}
export async function hasOfflineRecovery(s: CloudSession, id: string) {
  const r: RecoveryRecord | undefined = await (
    await database()
  ).get("drafts", key(s, id));
  return !!r;
}
export function isRecoveredDocument(doc: Document) {
  return recovered.has(doc);
}
export function markRecoveredDocument(doc: Document) {
  recovered.add(doc);
  return doc;
}
export async function readCloudRecovery(s: CloudSession, id: string) {
  return (await (await database()).get("drafts", key(s, id))) as
    RecoveryRecord | undefined;
}
export function cacheCloudDraft(
  s: CloudSession,
  doc: Document,
  binding: CloudBinding,
  {
    manual = false,
    editing,
    archive = false,
  }: { manual?: boolean; editing?: boolean; archive?: boolean } = {},
) {
  const k = key(s, doc.id);
  return serial(k, async () => {
    const db = await database();
    let r: RecoveryRecord | undefined = await db.get("drafts", k);
    const hash = await hashDocument(doc);
    if (!r)
      r = {
        key: k,
        documentId: doc.id,
        doc,
        hash,
        syncedHash: "",
        headId: binding.headId,
        cloudRevision: binding.draftRevision || null,
        folderId: binding.folderId,
        stageId: crypto.randomUUID(),
        clientId: clientId(s),
        sequence: 0,
        dirty: true,
        manual: false,
        editing: !!editing,
        updatedAt: Date.now(),
      };
    if (r.hash !== hash) {
      r.sequence++;
      r.hash = hash;
      r.doc = doc;
      r.dirty = hash !== r.syncedHash;
      r.updatedAt = Date.now();
    }
    if (r.clientId !== clientId(s)) {
      r.clientId = clientId(s);
      r.sequence++;
    }
    r.manual ||= manual;
    if (editing !== undefined) r.editing = editing;
    if (archive || !r.archive || Date.now() - r.archive.at >= 15 * 60 * 1000)
      r.archive = { doc, sequence: r.sequence, at: Date.now() };
    await db.put("drafts", r);
    rememberPermission(s, r);
    return r;
  });
}
export function acknowledgeCloudDraft(
  s: CloudSession,
  doc: Document,
  result: {
    headId: string | null;
    draftRevision?: string | null;
    checkpoint?: boolean;
    previewAt?: number;
  },
  sent: RecoveryRecord,
) {
  const k = key(s, doc.id);
  return serial(k, async () => {
    const db = await database();
    const r: RecoveryRecord | undefined = await db.get("drafts", k);
    if (!r) return;
    if (result.previewAt) r.previewAt = result.previewAt;
    r.headId = result.headId;
    r.cloudRevision = result.draftRevision || null;
    r.syncedHash = await hashDocument(doc);
    r.baseName = doc.name;
    r.dirty = r.hash !== r.syncedHash;
    if (result.checkpoint) {
      r.manual = false;
      r.archive = undefined;
      r.stageId = crypto.randomUUID();
    } else if (!result.draftRevision && !r.dirty) {
      r.manual = false;
      r.archive = undefined;
    }
    // A newer local edit queued while the request was in flight keeps its own sequence and content.
    if (r.sequence === sent.sequence) r.dirty = false;
    await db.put("drafts", r);
    rememberPermission(s, r);
  });
}
export async function resolveCloudOpen(s: CloudSession, result: any) {
  if (window.baizefigDesktop || !result.content) return result;
  const k = key(s, result.content.id);
  return serial(k, async () => {
    const db = await database();
    let r: RecoveryRecord | undefined = await db.get("drafts", k);
    if (
      !ownsLocalEditor(result.content.id) &&
      navigator.locks &&
      (await navigator.locks.query()).held?.some(
        (lock) => lock.name === "baizefig-editor-" + result.content.id,
      )
    )
      return result;
    const remoteHash = await hashDocument(result.content),
      draft = result.draft;
    let content: Document = result.content;
    if (r && (r.dirty || r.manual) && r.hash !== remoteHash) {
      const sameBase =
        r.headId === result.file.head_id ||
        (result.checkpoint?.source === "自动存档" &&
          result.checkpoint?.stage_id === r.stageId);
      const sameDraft =
        (r.cloudRevision || null) === (draft?.revision || null) ||
        (draft?.clientId === r.clientId &&
          Number(draft.sequence) <= r.sequence) ||
        (!draft &&
          result.checkpoint?.source === "自动存档" &&
          result.checkpoint?.stage_id === r.stageId);
      const conflictingRename =
        !!r.baseName &&
        r.baseName !== result.file.name &&
        r.doc.name !== result.file.name;
      if (sameBase && sameDraft && !conflictingRename) {
        content = r.doc;
        recovered.add(content);
        r.headId = result.file.head_id;
        r.cloudRevision = draft?.revision || null;
      } else {
        const copy = {
          ...r.doc,
          id: crypto.randomUUID(),
          name: r.doc.name + "（本机恢复副本）",
        };
        if (!(await save(copy)))
          throw Error("无法保留本机恢复副本，请先导出备份");
        window.dispatchEvent(
          new CustomEvent("baizefig-cloud-recovery", {
            detail: { name: copy.name },
          }),
        );
        r = undefined;
      }
    }
    if (!r || content === result.content) {
      r = {
        key: k,
        documentId: content.id,
        doc: content,
        hash: remoteHash,
        syncedHash: remoteHash,
        baseName: result.file.name,
        headId: result.file.head_id,
        cloudRevision: draft?.revision || null,
        folderId: result.file.folder_id,
        stageId: draft?.stageId || crypto.randomUUID(),
        clientId: clientId(s),
        sequence: draft?.clientId === clientId(s) ? Number(draft.sequence) : 0,
        dirty: false,
        manual: r?.manual || false,
        editing: r?.editing || false,
        updatedAt: Date.now(),
        previewAt: Date.now(),
      };
    }
    await db.put("drafts", r);
    rememberPermission(s, r);
    return { ...result, content, recovered: content !== result.content };
  });
}
