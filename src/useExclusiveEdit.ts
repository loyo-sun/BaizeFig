import { useEffect, useRef, useState } from "react";
import type { CloudSession } from "./cloud";
import type { Document } from "./core";
import {
  cloudRequest,
  isCloudBackedDocument,
  rememberCloudBinding,
} from "./saveDestination";

type Lease = {
  token: string;
  documentId: string;
  kind: "human" | "ai";
  until: number;
  ending?: boolean;
};
export function useExclusiveEdit(
  session: CloudSession | null,
  documentId: string,
  editorId: string,
  load: (doc: Document) => void,
  flush: (s: CloudSession, id: string, token: string) => Promise<unknown>,
) {
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const lease = useRef<Lease | null>(null),
    active = useRef(documentId),
    loadRef = useRef(load);
  active.current = documentId;
  loadRef.current = load;
  const [status, setStatus] = useState("只读 · 点击开始编辑获取编辑权");
  const [busy, setBusy] = useState(false),
    [, render] = useState(0);
  const body = (l: Lease) => ({ editorId, lockToken: l.token });
  const release = (s: CloudSession, l: Lease) =>
    fetch(
      s.base +
        "/api/v1/space/files/" +
        encodeURIComponent(l.documentId) +
        "/edit/release",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + s.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body(l)),
        keepalive: true,
      },
    );
  useEffect(() => {
    let cancelled = false;
    const s = session,
      id = documentId;
    const update = async () => {
      if (!s || !isCloudBackedDocument(id)) return;
      try {
        const current = lease.current;
        if (current?.documentId === id && current.kind === "human") {
          const result = await cloudRequest(
            s,
            "/files/" + id + "/edit/renew",
            body(current),
          );
          if (!cancelled && lease.current === current) {
            current.until = new Date(result.expires_at).getTime();
            setStatus("你正在独占编辑");
          }
        } else {
          const result = await cloudRequest(s, "/files/" + id + "/edit");
          if (!cancelled) {
            const own = lease.current;
            if (
              own?.kind === "ai" &&
              (!result.lock ||
                result.lock.editor_id !== editorId ||
                !result.lock.grant_id)
            )
              lease.current = null;
            setStatus(
              result.lock
                ? result.lock.label + " 正在编辑 · 当前只读"
                : "只读 · 点击开始编辑获取编辑权",
            );
            render((v) => v + 1);
          }
        }
      } catch {
        if (!cancelled) {
          lease.current = null;
          setStatus("编辑连接已失效 · 当前只读");
          render((v) => v + 1);
        }
      }
    };
    void update();
    const timer = setInterval(() => void update(), 15000);
    const close = () => {
      const l = lease.current;
      if (s && l?.documentId === id) {
        lease.current = null;
        void (async () => {
          try {
            await flushRef.current(s, id, l.token);
          } finally {
            await release(s, l);
          }
        })().catch(() => {});
      }
    };
    const leave = () => {
      const l = lease.current;
      if (s && l?.documentId === id) {
        lease.current = null;
        void release(s, l).catch(() => {});
      }
    };
    window.addEventListener("pagehide", leave);
    const offline = () => {
      leave();
      setStatus("连接中断 · 当前只读");
      render((v) => v + 1);
    };
    window.addEventListener("offline", offline);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("offline", offline);
      close();
    };
  }, [session?.token, documentId, editorId]);
  async function begin(kind: "human" | "ai" = "human", token?: string) {
    if (!session) throw Error("请先登录乐悦云");
    if (lease.current) throw Error("请先结束当前编辑会话");
    const id = documentId,
      s = session;
    setBusy(true);
    let acquired: Lease | null = null;
    try {
      const result = token
        ? { token, expires_at: Date.now() + 90000 }
        : await cloudRequest(s, "/files/" + id + "/edit/acquire", {
            editorId,
            platform: window.baizefigDesktop ? "desktop" : "web",
            label: window.baizefigDesktop ? "本地版" : "网页版",
          });
      acquired = {
        token: result.token,
        kind,
        documentId: id,
        until: new Date(result.expires_at).getTime(),
      };
      if (active.current !== id) throw Error("文档已切换，请重新开始编辑");
      // Reload under the lock so an old browser cache never becomes the new editing base.
      try {
        const latest = await cloudRequest(s, "/files/" + id);
        if (active.current !== id) throw Error("文档已切换");
        rememberCloudBinding(s, id, latest.file.head_id, latest.file.folder_id);
        loadRef.current(latest.content);
      } catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
      }
      lease.current = acquired;
      setStatus(
        kind === "human" ? "你正在独占编辑" : "AI 正在独占编辑 · 当前只读",
      );
      render((v) => v + 1);
      return acquired.token;
    } catch (error) {
      if (acquired) await release(s, acquired).catch(() => {});
      if ((error as { status?: number }).status === 423) {
        const state = await cloudRequest(s, "/files/" + id + "/edit").catch(
          () => null,
        );
        if (state?.lock) setStatus(state.lock.label + " 正在编辑 · 当前只读");
      }
      throw error;
    } finally {
      setBusy(false);
    }
  }
  function canEdit(id: string) {
    if (!isCloudBackedDocument(id)) return true;
    const l = lease.current;
    return (
      !!session &&
      navigator.onLine &&
      session.expiresAt > Date.now() &&
      l?.documentId === id &&
      l.kind === "human" &&
      !l.ending &&
      l.until > Date.now()
    );
  }
  async function end(token?: string) {
    const l = lease.current;
    if (
      !session ||
      !l ||
      l.documentId !== documentId ||
      (token && token !== l.token)
    )
      throw Error("编辑会话已失效");
    l.ending = true;
    setStatus("正在保存并结束编辑 · 当前只读");
    setBusy(true);
    render((v) => v + 1);
    try {
      await flushRef.current(session, documentId, l.token);
      await release(session, l);
      lease.current = null;
      setStatus("只读 · 点击开始编辑获取编辑权");
    } catch (error) {
      l.ending = false;
      throw error;
    } finally {
      setBusy(false);
      render((v) => v + 1);
    }
  }
  return {
    status,
    busy,
    begin,
    end,
    lease,
    canEdit,
    canSave: (token?: string) =>
      !!session &&
      lease.current?.documentId === documentId &&
      (!token || lease.current.token === token),
    editing: canEdit(documentId) && isCloudBackedDocument(documentId),
  };
}
