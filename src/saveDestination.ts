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
): { headId: string; folderId: string | null } | null {
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
) {
  try {
    localStorage.setItem(
      bindingKey(session, id),
      JSON.stringify({ headId, folderId }),
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
  const response = await fetch(session.base + "/api/v1/space" + path, {
    headers: {
      Authorization: "Bearer " + session.token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      Error(result.error_description || result.error || "云端保存失败"),
      { status: response.status },
    );
  return result;
}
export async function saveCloudDocument(
  session: CloudSession,
  doc: Document,
  folderId: string | null,
  headId: string | null,
  overwrite = true,
) {
  const preview = await Promise.all(
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
  const result = await cloudRequest(session, "/files/" + doc.id + "/save", {
    content: doc,
    preview,
    folderId,
    headId,
    overwrite,
  });
  // Older LoyoCloud deployments accept save but do not apply path/overwrite flags.
  // Keep the successful head even if a follow-up request fails.
  rememberCloudBinding(
    session,
    doc.id,
    result.headId,
    result.folderApplied
      ? folderId
      : readCloudBinding(session, doc.id)?.folderId || null,
  );
  if (!result.folderApplied) {
    try {
      await cloudRequest(session, "/files/" + doc.id + "/move", { folderId });
      rememberCloudBinding(session, doc.id, result.headId, folderId);
    } catch {
      throw Error(
        "文件已保存到云端，但移动到目标文件夹失败，请在云工作区检查位置",
      );
    }
  }
  if (overwrite && headId && !result.overwriteApplied) {
    try {
      await cloudRequest(
        session,
        "/files/" + doc.id + "/versions/" + headId + "/delete",
        {},
      );
    } catch {
      throw Error("文件已保存到云端，但旧版本清理失败，请在版本管理中检查");
    }
  }
  return result;
}
