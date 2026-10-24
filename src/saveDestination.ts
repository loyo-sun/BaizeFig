import { isCloudOffline, setCloudReachable } from "./cloudConnectivity";
import {
  cacheCloudDraft,
  acknowledgeCloudDraft,
  stableDocumentJSON,
  hasPendingManual,
  readCloudRecovery,
} from "./cloudRecovery";
import type { CloudSession } from "./cloud";
import type { Document } from "./core";
import { svgString, raster } from "./Canvas";
export type SaveDestination = "ask" | "local" | "cloud";
export const SAVE_DESTINATION_KEY = "baizefig.save.destination";
export function readSaveDestination(): SaveDestination {
  try {
    const value = localStorage.getItem(SAVE_DESTINATION_KEY);
    return value === "local" || value === "cloud" ? value : "ask";
  } catch {
    return "ask";
  }
}
export function storeSaveDestination(value: SaveDestination) {
  localStorage.setItem(SAVE_DESTINATION_KEY, value);
}
const bindingKey = (session: CloudSession, id: string) =>
  "baizefig.cloud.file." + session.base + "." + session.user.id + "." + id;
export function readCloudBinding(
  session: CloudSession,
  id: string,
): {
  headId: string;
  folderId: string | null;
  draftRevision?: string | null;
} | null {
  try {
    return JSON.parse(localStorage.getItem(bindingKey(session, id)) || "null");
  } catch {
    return null;
  }
}
export function rememberCloudBinding(
  session: CloudSession,
  id: string,
  headId: string,
  folderId: string | null,
  draftRevision?: string | null,
) {
  try {
    localStorage.setItem(
      bindingKey(session, id),
      JSON.stringify({
        headId,
        folderId,
        ...(draftRevision !== undefined
          ? { draftRevision }
          : {
              draftRevision:
                readCloudBinding(session, id)?.draftRevision || null,
            }),
      }),
    );
  } catch {
    /* The next save will ask for a folder again. */
  }
}
export async function cloudRequest(
  session: CloudSession,
  path: string,
  body?: unknown,
) {
  let response: Response;
  try {
    response = await fetch(session.base + "/api/v1/space" + path, {
      headers: {
        Authorization: "Bearer " + session.token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      ...(!window.baizefigDesktop
        ? { signal: AbortSignal.timeout(120000) }
        : {}),
    });
  } catch (error) {
    setCloudReachable(false);
    throw error;
  }
  setCloudReachable(true);
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      Error(result.error_description || result.error || "Cloud save failed"),
      { status: response.status },
    );
  return result;
}
const savedCloudSnapshots = new Map<string, Document>();
const savedHeads = new Map<string, string | null>();
const fingerprints = new WeakMap<Document, string>();
const cloudProgress = new Map<string, { pending: number; error: string }>();
export const CLOUD_SAVE_EVENT = "baizefig-cloud-save";
const cloudKey = (session: CloudSession, id: string) =>
  session.base + ":" + session.user.id + ":" + id;
const webClient = () =>
  typeof window !== "undefined" && !window.baizefigDesktop;
function fingerprint(doc: Document) {
  let value = fingerprints.get(doc);
  if (!value) {
    value = webClient() ? stableDocumentJSON(doc) : JSON.stringify(doc);
    fingerprints.set(doc, value);
  }
  return value;
}
function announce(key: string) {
  if (webClient())
    window.dispatchEvent(
      new window.CustomEvent(CLOUD_SAVE_EVENT, { detail: { key } }),
    );
}
export function markCloudSnapshotSaved(session: CloudSession, doc: Document) {
  const key = cloudKey(session, doc.id);
  savedCloudSnapshots.set(key, doc);
  savedHeads.set(key, readCloudBinding(session, doc.id)?.headId || null);
  const progress = cloudProgress.get(key);
  if (progress) progress.error = "";
  announce(key);
}
export function isCloudSnapshotSaved(session: CloudSession, doc: Document) {
  const key = cloudKey(session, doc.id),
    snapshot = savedCloudSnapshots.get(key);
  if (!webClient()) return snapshot === doc;
  return (
    !!snapshot &&
    savedHeads.get(key) ===
      (readCloudBinding(session, doc.id)?.headId || null) &&
    (snapshot === doc || fingerprint(snapshot) === fingerprint(doc))
  );
}
export function readCloudSaveState(session: CloudSession, doc: Document) {
  const progress = cloudProgress.get(cloudKey(session, doc.id));
  return {
    saved:
      (!webClient() || !isCloudOffline()) && isCloudSnapshotSaved(session, doc),
    draft: webClient() && !!readCloudBinding(session, doc.id)?.draftRevision,
    saving: !!progress?.pending,
    error: progress?.error || "",
  };
}
export function matchesCloudSaveEvent(
  event: Event,
  session: CloudSession,
  id: string,
) {
  return (event as CustomEvent).detail?.key === cloudKey(session, id);
}
const cloudSaveQueue = new Map<string, Promise<unknown>>();
export type CloudEdit = {
  editorId: string;
  lockToken: string;
  saveMode?: "autosave";
  source?: "ai";
  archive?: boolean;
};
export function saveCloudDocument(
  session: CloudSession,
  doc: Document,
  folderId: string | null,
  headId: string | null,
  edit?: CloudEdit,
) {
  const key = cloudKey(session, doc.id),
    previous = cloudSaveQueue.get(key);
  const cachedTask = webClient()
    ? cacheCloudDraft(
        session,
        doc,
        {
          headId: readCloudBinding(session, doc.id)?.headId || headId,
          folderId,
          draftRevision: readCloudBinding(session, doc.id)?.draftRevision,
        },
        { manual: edit?.saveMode !== "autosave", archive: edit?.archive },
      )
    : Promise.resolve(null);
  void cachedTask.catch(() => {});
  const progress = cloudProgress.get(key) || { pending: 0, error: "" };
  cloudProgress.set(key, progress);
  progress.pending++;
  announce(key);
  const next = (previous || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (
        webClient() &&
        edit?.saveMode === "autosave" &&
        !hasPendingManual(doc.id) &&
        isCloudSnapshotSaved(session, doc) &&
        readCloudBinding(session, doc.id)?.folderId === folderId
      )
        return {
          headId: readCloudBinding(session, doc.id)!.headId,
          folderApplied: true,
          unchanged: true,
        };
      const result = await saveCloudSnapshot(
        session,
        doc,
        folderId,
        readCloudBinding(session, doc.id)?.headId || headId,
        edit,
        await cachedTask,
      );
      if (!result.offline) markCloudSnapshotSaved(session, doc);
      return result;
    })
    .catch((error) => {
      progress.error = (error as Error).message;
      throw error;
    })
    .finally(() => {
      progress.pending--;
      if (cloudSaveQueue.get(key) === next) cloudSaveQueue.delete(key);
      announce(key);
    });
  cloudSaveQueue.set(key, next);
  return next;
}
async function saveCloudSnapshot(
  session: CloudSession,
  doc: Document,
  folderId: string | null,
  headId: string | null,
  edit?: CloudEdit,
  cached: Awaited<ReturnType<typeof cacheCloudDraft>> | null = null,
) {
  const binding = readCloudBinding(session, doc.id);
  const currentRecovery = cached
    ? await readCloudRecovery(session, doc.id)
    : null;
  if (webClient() && isCloudOffline())
    return { headId, folderApplied: true, offline: true };
  const automatic =
    webClient() && edit?.saveMode === "autosave" && !currentRecovery?.manual;
  const preview =
    automatic && Date.now() - (currentRecovery?.previewAt || 0) < 15 * 60 * 1000
      ? undefined
      : await Promise.all(
          doc.pages.map(async (page) => {
            const blob = await raster(await svgString(doc, page.id), 0.5);
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }),
        );
  const result = await cloudRequest(
    session,
    "/files/" + doc.id + (automatic ? "/draft" : "/save"),
    {
      ...edit,
      content: doc,
      preview,
      folderId,
      headId,
      overwrite: false,
      ...(cached
        ? {
            versionPolicy: "rolling-v1",
            draftRevision:
              currentRecovery?.cloudRevision || binding?.draftRevision || null,
            stageId: currentRecovery?.stageId || cached.stageId,
            clientId: cached.clientId,
            sequence: cached.sequence,
          }
        : {}),
    },
  );
  // Older LoyoCloud deployments accept save but do not apply path/overwrite flags.
  // Keep the successful head even if a follow-up request fails.
  rememberCloudBinding(
    session,
    doc.id,
    result.headId,
    result.folderApplied
      ? folderId
      : readCloudBinding(session, doc.id)?.folderId || null,
    webClient() ? result.draftRevision || null : undefined,
  );
  if (cached)
    await acknowledgeCloudDraft(
      session,
      doc,
      { ...result, ...(preview ? { previewAt: Date.now() } : {}) },
      cached,
    );
  if (!result.folderApplied) {
    try {
      await cloudRequest(session, "/files/" + doc.id + "/move", { folderId });
      rememberCloudBinding(session, doc.id, result.headId, folderId);
    } catch {
      throw Error(
        "The file was saved to cloud, but moving it failed. Check its location in the cloud workspace.",
      );
    }
  }
  return result;
}

/** Cloud-linked browser copies are recovery caches, not local workspace files. */
export function isCloudBackedDocument(id: string): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("baizefig.cloud.file.") && key.endsWith("." + id)) {
        const binding = JSON.parse(localStorage.getItem(key) || "null");
        if (binding?.headId) return true;
      }
    }
  } catch {
    /* Keep local files visible if browser settings cannot be read. */
  }
  return false;
}
