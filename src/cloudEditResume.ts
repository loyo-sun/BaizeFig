import type { CloudSession } from "./cloud";
export type EditResume = { editorId: string; token: string };
const key = (session: CloudSession, id: string) =>
  "baizefig.edit-resume." + session.base + "." + session.user.id + "." + id;
// A refresh keeps sessionStorage; another tab still has to acquire the browser's local file lock.
export function readEditResume(
  session: CloudSession,
  id: string,
): EditResume | null {
  if (window.baizefigDesktop) return null;
  try {
    const value = JSON.parse(
      sessionStorage.getItem(key(session, id)) || "null",
    );
    return typeof value?.editorId === "string" &&
      value.editorId.length > 0 &&
      value.editorId.length <= 200 &&
      typeof value?.token === "string" &&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value.token)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function rememberEditResume(
  session: CloudSession,
  id: string,
  value: EditResume,
) {
  if (window.baizefigDesktop) return;
  try {
    sessionStorage.setItem(key(session, id), JSON.stringify(value));
  } catch {
    /* Safe fallback: wait for release/expiry and acquire normally. */
  }
}
export function forgetEditResume(
  session: CloudSession,
  id: string,
  token?: string,
) {
  if (window.baizefigDesktop) return;
  try {
    if (!token || readEditResume(session, id)?.token === token)
      sessionStorage.removeItem(key(session, id));
  } catch {
    /* A stale proof is always checked by the server. */
  }
}
