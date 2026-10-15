import { openDB } from "idb";
import { type Document, validateDocument } from "./core";
let connection: ReturnType<typeof openDB> | undefined;
const database = () =>
  (connection ??= openDB("baizefig", 3, {
    upgrade(db) {
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
  const db = await database(),
    tx = db.transaction(["documents", "settings", "trash"], "readwrite");
  // A delayed autosave from this tab or another tab must never resurrect a deleted file.
  if (await tx.objectStore("trash").get(doc.id)) {
    await tx.done;
    return false;
  }
  await tx.objectStore("documents").put(doc);
  await tx.objectStore("settings").put(doc.id, "last-document");
  await tx.done;
  return true;
}
export async function loadLast(): Promise<Document | undefined> {
  const db = await database(),
    key = await db.get("settings", "last-document");
  const doc = key ? await db.get("documents", key) : undefined;
  const found = doc ?? (await db.getAll("documents"))[0];
  if (found) validateDocument(found);
  return found;
}
export async function listDocuments(): Promise<Document[]> {
  return (await database()).getAll("documents");
}
export async function listTrash(): Promise<TrashRecord[]> {
  return (await database()).getAll("trash");
}
export async function trashDocument(id: string): Promise<void> {
  const db = await database(),
    tx = db.transaction(["documents", "settings", "trash"], "readwrite"),
    store = tx.objectStore("documents"),
    document = await store.get(id);
  if (document) {
    await tx.objectStore("trash").put({ document, deletedAt: Date.now() });
    await store.delete(id);
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
    tx = db.transaction(["documents", "trash"], "readwrite"),
    record = (await tx.objectStore("trash").get(id)) as TrashRecord | undefined;
  if (record) {
    await tx.objectStore("documents").put(record.document);
    await tx.objectStore("trash").delete(id);
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
    tx = db.transaction(["documents", "versions", "trash"], "readwrite");
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
  validateDocument(version.document);
  validateDocument(current);
  // The recovery checkpoint and restored document commit atomically.
  await tx
    .objectStore("versions")
    .put({
      id: crypto.randomUUID(),
      documentId: current.id,
      name: "Before restore",
      createdAt: Date.now(),
      document: structuredClone(current),
    } satisfies DocumentVersion);
  await tx.objectStore("documents").put(version.document);
  await tx.done;
  return structuredClone(version.document);
}
