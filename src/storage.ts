import {
  validateLibraryPackage,
  type LibraryPackage,
} from "./componentLibraries";
import { resolvedDesign, type MergeSide } from "./designMerge";
import { openDB } from "idb";
import { type Document, validateDocument } from "./core";
export const storageMetrics = { saveMs: 0, loadMs: 0 };
const observedRevisions = new Map<string, number>();
let connection: ReturnType<typeof openDB> | undefined;
const database = () =>
  (connection ??= openDB("baizefig", 6, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("revisions"))
        db.createObjectStore("revisions");
      if (!db.objectStoreNames.contains("branches")) {
        const branches = db.createObjectStore("branches", { keyPath: "id" });
        branches.createIndex("mainId", "mainId");
      }
      if (!db.objectStoreNames.contains("libraries"))
        db.createObjectStore("libraries", { keyPath: "key" });
      if (!db.objectStoreNames.contains("versions")) {
        const versions = db.createObjectStore("versions", { keyPath: "id" });
        versions.createIndex("documentId", "documentId");
      }
      if (!db.objectStoreNames.contains("documents"))
        db.createObjectStore("documents", { keyPath: "id" });
      if (!db.objectStoreNames.contains("settings"))
        db.createObjectStore("settings");
      if (!db.objectStoreNames.contains("trash"))
        db.createObjectStore("trash", { keyPath: "document.id" });
    },
    blocking() {
      void connection?.then((db) => db.close());
      connection = undefined;
    },
  }));
export interface TrashRecord {
  document: Document;
  deletedAt: number;
}
export async function save(doc: Document): Promise<boolean> {
  const started = performance.now();
  const db = await database(),
    tx = db.transaction(
      ["documents", "settings", "trash", "revisions"],
      "readwrite",
    );
  void tx.done.catch(() => {});
  // A delayed autosave from this tab or another tab must never resurrect a deleted file.
  if (await tx.objectStore("trash").get(doc.id)) {
    await tx.done;
    return false;
  }
  const revision = (await tx.objectStore("revisions").get(doc.id)) ?? 0;
  const previous = await tx.objectStore("documents").get(doc.id);
  if (previous && JSON.stringify(previous) === JSON.stringify(doc)) {
    await tx.objectStore("settings").put(doc.id, "last-document");
    await tx.done;
    observedRevisions.set(doc.id, revision);
    storageMetrics.saveMs = performance.now() - started;
    return true;
  }
  if (
    observedRevisions.has(doc.id) &&
    observedRevisions.get(doc.id) !== revision
  ) {
    await tx.done;
    throw Error(
      "This file changed in another tab. Export your work or save a separate copy.",
    );
  }
  await tx.objectStore("documents").put(doc);
  await tx.objectStore("revisions").put(revision + 1, doc.id);
  await tx.objectStore("settings").put(doc.id, "last-document");
  await tx.done;
  observedRevisions.set(doc.id, revision + 1);
  storageMetrics.saveMs = performance.now() - started;
  return true;
}
export async function loadLast(): Promise<Document | undefined> {
  const started = performance.now();
  const db = await database(),
    tx = db.transaction(["documents", "settings", "revisions"], "readonly"),
    key = await tx.objectStore("settings").get("last-document");
  const doc =
    (key ? await tx.objectStore("documents").get(key) : undefined) ??
    (await tx.objectStore("documents").getAll())[0];
  if (doc) {
    const revision = (await tx.objectStore("revisions").get(doc.id)) ?? 0;
    await tx.done;
    validateDocument(doc);
    observedRevisions.set(doc.id, revision);
    storageMetrics.loadMs = performance.now() - started;
    return doc;
  }
  await tx.done;
  return undefined;
}
export async function listDocuments(): Promise<Document[]> {
  const db = await database(),
    tx = db.transaction(["documents", "revisions"], "readonly"),
    docs = await tx.objectStore("documents").getAll();
  for (const d of docs)
    if (!observedRevisions.has(d.id))
      observedRevisions.set(
        d.id,
        (await tx.objectStore("revisions").get(d.id)) ?? 0,
      );
  await tx.done;
  return docs;
}
export async function listTrash(): Promise<TrashRecord[]> {
  return (await database()).getAll("trash");
}
export async function trashDocument(id: string): Promise<void> {
  const db = await database(),
    tx = db.transaction(
      ["documents", "settings", "trash", "revisions"],
      "readwrite",
    ),
    store = tx.objectStore("documents"),
    document = await store.get(id);
  void tx.done.catch(() => {});
  if (document) {
    await tx.objectStore("trash").put({ document, deletedAt: Date.now() });
    await store.delete(id);
    const revision = (await tx.objectStore("revisions").get(id)) ?? 0;
    await tx.objectStore("revisions").put(revision + 1, id);
  }
  if ((await tx.objectStore("settings").get("last-document")) === id) {
    const remaining = await store.getAllKeys();
    if (remaining.length)
      await tx.objectStore("settings").put(remaining[0], "last-document");
    else await tx.objectStore("settings").delete("last-document");
  }
  await tx.done;
}
export async function restoreDocument(id: string): Promise<void> {
  const db = await database(),
    tx = db.transaction(["documents", "trash", "revisions"], "readwrite"),
    record = (await tx.objectStore("trash").get(id)) as TrashRecord | undefined;
  void tx.done.catch(() => {});
  if (record) {
    await tx.objectStore("documents").put(record.document);
    await tx.objectStore("trash").delete(id);
    const revision = (await tx.objectStore("revisions").get(id)) ?? 0;
    await tx.objectStore("revisions").put(revision + 1, id);
    observedRevisions.set(id, revision + 1);
  }
  await tx.done;
}
export function download(
  data: Blob | string,
  name: string,
  type = "application/json",
) {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  name: string;
  createdAt: number;
  document: Document;
}
export async function saveVersion(
  doc: Document,
  name: string,
): Promise<DocumentVersion> {
  validateDocument(doc);
  const version: DocumentVersion = {
    id: crypto.randomUUID(),
    documentId: doc.id,
    name: name.trim() || doc.name,
    createdAt: Date.now(),
    document: structuredClone(doc),
  };
  const db = await database();
  await db.put("versions", version);
  return version;
}
export async function listVersions(
  documentId: string,
): Promise<DocumentVersion[]> {
  return (
    (await (
      await database()
    ).getAllFromIndex(
      "versions",
      "documentId",
      documentId,
    )) as DocumentVersion[]
  ).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}
export async function restoreVersion(
  current: Document,
  versionId: string,
): Promise<Document> {
  const db = await database(),
    tx = db.transaction(
      ["documents", "versions", "trash", "revisions"],
      "readwrite",
    );
  const version = (await tx.objectStore("versions").get(versionId)) as
    DocumentVersion | undefined;
  if (!version || version.documentId !== current.id) {
    await tx.done;
    throw Error("Version not found");
  }
  if (await tx.objectStore("trash").get(current.id)) {
    await tx.done;
    throw Error("Restore the file from trash first");
  }
  const revision = (await tx.objectStore("revisions").get(current.id)) ?? 0;
  if (
    observedRevisions.has(current.id) &&
    observedRevisions.get(current.id) !== revision
  ) {
    await tx.done;
    throw Error("Design changed. Compare again before merging");
  }
  validateDocument(version.document);
  validateDocument(current);
  void tx.done.catch(() => {});
  // The recovery checkpoint and restored document commit atomically.
  await tx.objectStore("versions").put({
    id: crypto.randomUUID(),
    documentId: current.id,
    name: "Before restore",
    createdAt: Date.now(),
    document: structuredClone(current),
  } satisfies DocumentVersion);
  await tx.objectStore("documents").put(version.document);
  await tx.objectStore("revisions").put(revision + 1, current.id);
  await tx.done;
  observedRevisions.set(current.id, revision + 1);
  return structuredClone(version.document);
}

function libraryJSON(value: unknown): string {
  return JSON.stringify(value, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, value[key]]),
        )
      : value,
  );
}
export async function saveLibrary(pack: LibraryPackage) {
  validateLibraryPackage(pack);
  const db = await database(),
    key = pack.id + "@" + pack.revision,
    tx = db.transaction("libraries", "readwrite"),
    existing = await tx.store.get(key);
  if (existing && libraryJSON(existing.package) !== libraryJSON(pack)) {
    tx.abort();
    await tx.done.catch(() => {});
    throw Error("A different library version already uses this revision");
  }
  await tx.store.put({ key, package: pack });
  await tx.done;
}
export async function listLibraryVersions(
  libraryId?: string,
): Promise<LibraryPackage[]> {
  const records = await (await database()).getAll("libraries");
  return records
    .map((r) => r.package as LibraryPackage)
    .filter((p) => !libraryId || p.id === libraryId)
    .sort((a, b) => b.revision - a.revision);
}
export async function latestLibraries(): Promise<LibraryPackage[]> {
  const versions = await listLibraryVersions(),
    latest = new Map<string, LibraryPackage>();
  for (const p of versions) if (!latest.has(p.id)) latest.set(p.id, p);
  return [...latest.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface DesignBranch {
  id: string;
  mainId: string;
  name: string;
  createdAt: number;
  base: Document;
}
export async function branchContext(
  documentId: string,
): Promise<{ mainId: string; branches: DesignBranch[] }> {
  const db = await database(),
    own = (await db.get("branches", documentId)) as DesignBranch | undefined,
    mainId = own?.mainId ?? documentId;
  return {
    mainId,
    branches: await db.getAllFromIndex("branches", "mainId", mainId),
  };
}
export async function getDocument(documentId: string): Promise<Document> {
  const db = await database(),
    tx = db.transaction(["documents", "revisions"], "readonly"),
    doc = await tx.objectStore("documents").get(documentId),
    revision = (await tx.objectStore("revisions").get(documentId)) ?? 0;
  await tx.done;
  if (!doc) throw Error("Design file is unavailable or in trash");
  validateDocument(doc);
  observedRevisions.set(documentId, revision);
  return doc;
}
export async function createDesignBranch(
  current: Document,
  name: string,
): Promise<Document> {
  validateDocument(current);
  if (!name.trim()) throw Error("Enter a branch name");
  const db = await database(),
    tx = db.transaction(
      ["documents", "branches", "trash", "settings", "revisions"],
      "readwrite",
    );
  if (await tx.objectStore("trash").get(current.id)) {
    await tx.done;
    throw Error("Restore the file from trash first");
  }
  if (await tx.objectStore("branches").get(current.id)) {
    await tx.done;
    throw Error("Create branches from the main design");
  }
  const revision = (await tx.objectStore("revisions").get(current.id)) ?? 0;
  if (
    observedRevisions.has(current.id) &&
    observedRevisions.get(current.id) !== revision
  ) {
    await tx.done;
    throw Error("Design changed. Compare again before merging");
  }
  const branch = {
    ...structuredClone(current),
    id: crypto.randomUUID(),
    name: current.name + " / " + name.trim(),
  };
  void tx.done.catch(() => {});
  await tx.objectStore("documents").put(current);
  await tx.objectStore("documents").put(branch);
  await tx.objectStore("branches").put({
    id: branch.id,
    mainId: current.id,
    name: name.trim(),
    createdAt: Date.now(),
    base: structuredClone(current),
  } satisfies DesignBranch);
  await tx.objectStore("settings").put(branch.id, "last-document");
  await tx.objectStore("revisions").put(revision + 1, current.id);
  await tx.objectStore("revisions").put(1, branch.id);
  await tx.done;
  observedRevisions.set(current.id, revision + 1);
  observedRevisions.set(branch.id, 1);
  return branch;
}
export interface BranchReview {
  branch: DesignBranch;
  main: Document;
  draft: Document;
}
export async function reviewDesignBranch(
  current: Document,
  branchId: string,
): Promise<BranchReview> {
  if (!(await save(current))) throw Error("Restore the file from trash first");
  const db = await database(),
    tx = db.transaction(["documents", "branches"], "readonly"),
    branch = (await tx.objectStore("branches").get(branchId)) as
      DesignBranch | undefined;
  if (!branch || ![branch.id, branch.mainId].includes(current.id)) {
    await tx.done;
    throw Error("Design branch not found");
  }
  const main = await tx.objectStore("documents").get(branch.mainId),
    draft = await tx.objectStore("documents").get(branch.id);
  await tx.done;
  if (!main || !draft) throw Error("Design file is unavailable or in trash");
  validateDocument(main);
  validateDocument(draft);
  return { branch, main, draft };
}
export async function mergeDesignBranch(
  review: BranchReview,
  choices: Record<string, MergeSide>,
): Promise<Document> {
  const merged = resolvedDesign(
      review.branch.base,
      review.main,
      review.draft,
      choices,
    ),
    db = await database(),
    tx = db.transaction(
      ["documents", "versions", "branches", "trash", "settings", "revisions"],
      "readwrite",
    );
  const main = await tx.objectStore("documents").get(review.main.id),
    draft = await tx.objectStore("documents").get(review.draft.id),
    branch = await tx.objectStore("branches").get(review.branch.id);
  if (
    JSON.stringify(main) !== JSON.stringify(review.main) ||
    JSON.stringify(draft) !== JSON.stringify(review.draft) ||
    JSON.stringify(branch) !== JSON.stringify(review.branch)
  ) {
    await tx.done;
    throw Error("Design changed. Compare again before merging");
  }
  void tx.done.catch(() => {});
  // Recovery checkpoints and main document update are one atomic transaction.
  for (const d of [main, draft])
    await tx.objectStore("versions").put({
      id: crypto.randomUUID(),
      documentId: d.id,
      name: "Before merge",
      createdAt: Date.now(),
      document: structuredClone(d),
    } satisfies DocumentVersion);
  await tx.objectStore("documents").put(merged);
  // Keep the branch and rebase its current state, enabling subsequent independent work and merges.
  const rebased = {
    ...structuredClone(merged),
    id: draft.id,
    name: draft.name,
  };
  await tx.objectStore("documents").put(rebased);
  await tx
    .objectStore("branches")
    .put({ ...branch, base: structuredClone(merged) });
  await tx.objectStore("settings").put(merged.id, "last-document");
  const revisions = new Map<string, number>();
  for (const d of [main, draft]) {
    const revision = (await tx.objectStore("revisions").get(d.id)) ?? 0;
    await tx.objectStore("revisions").put(revision + 1, d.id);
    revisions.set(d.id, revision + 1);
  }
  await tx.done;
  for (const [id, revision] of revisions) observedRevisions.set(id, revision);
  return merged;
}

export async function saveRecoveryCopy(doc: Document): Promise<Document> {
  const copy = {
    ...structuredClone(doc),
    id: crypto.randomUUID(),
    name: doc.name + " / Recovery",
  };
  validateDocument(copy);
  await save(copy);
  return copy;
}
