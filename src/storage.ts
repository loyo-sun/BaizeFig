import { openDB } from "idb";
import { type Document, validateDocument } from "./core";
const database = () =>
  openDB("baizefig", 1, {
    upgrade(db) {
      db.createObjectStore("documents", { keyPath: "id" });
      db.createObjectStore("settings");
    },
  });
export async function save(doc: Document) {
  const db = await database();
  await db.put("documents", doc);
  await db.put("settings", doc.id, "last-document");
}
export async function loadLast(): Promise<Document | undefined> {
  const db = await database();
  const key = await db.get("settings", "last-document");
  if (!key) return;
  const doc = await db.get("documents", key);
  if (doc) validateDocument(doc);
  return doc;
}
export async function listDocuments(): Promise<Document[]> {
  return (await database()).getAll("documents");
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
