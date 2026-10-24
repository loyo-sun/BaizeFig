import {
  readEditResume,
  rememberEditResume,
  forgetEditResume,
} from "./cloudEditResume";
import { isCloudOffline, CLOUD_NETWORK_EVENT } from "./cloudConnectivity";
import { useEffect, useRef, useState } from "react";
import type { CloudSession } from "./cloud";
import type { Document } from "./core";
import {
  cloudRequest,
  isCloudBackedDocument,
  rememberCloudBinding,
} from "./saveDestination";
import {
  canEditOffline,
  claimLocalEditor,
  releaseLocalEditor,
  ownsLocalEditor,
  resolveCloudOpen,
  setOfflineEditing,
  offlineSessionForDoc,
  readCloudRecovery,
  markRecoveredDocument,
} from "./cloudRecovery";
type Lease = {
  token: string;
  documentId: string;
  kind: "human" | "ai";
  until: number;
  ending?: boolean;
};
const reconnectKey = (id: string) => "baizefig.reconnect-edit." + id;
function needsReconnect(id: string) {
  try {
    return localStorage.getItem(reconnectKey(id)) === "true";
  } catch {
    return false;
  }
}
function reconnect(id: string, value: boolean) {
  try {
    if (value) localStorage.setItem(reconnectKey(id), "true");
    else localStorage.removeItem(reconnectKey(id));
  } catch {
    /* Local content is still retained. */
  }
}
export function useExclusiveEdit(
  session: CloudSession | null,
  documentId: string,
  editorId: string,
  load: (doc: Document) => void,
  flush: (
    s: CloudSession,
    id: string,
    token: string,
    kind?: "human" | "ai",
    checkpoint?: boolean,
  ) => Promise<unknown>,
) {
  const starting = useRef(false);
  const refreshEdit = useRef<() => void>(() => {});
  const generation = useRef(0),
    autoPaused = useRef<string | null>(null),
    previousDocument = useRef(documentId);
  const cloudBacked = isCloudBackedDocument(documentId);
  const [occupant, setOccupant] = useState("");
  const [checking, setChecking] = useState(
    !window.baizefigDesktop && !!session && cloudBacked,
  );
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const lease = useRef<Lease | null>(null),
    active = useRef(documentId),
    loadRef = useRef(load);
  active.current = documentId;
  loadRef.current = load;
  const [status, setStatus] = useState("只读 · 点击开始编辑获取编辑权"),
    [busy, setBusy] = useState(false),
    [, render] = useState(0);
  const web = !window.baizefigDesktop;
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
    ).then((response) => {
      if (response.ok && web && l.kind === "human")
        forgetEditResume(s, l.documentId, l.token);
      return response;
    });
  useEffect(() => {
    let cancelled = false,
      updating = false;
    generation.current++;
    const s = session,
      id = documentId;
    if (previousDocument.current !== id) {
      autoPaused.current = null;
      previousDocument.current = id;
    }
    if (web) {
      setOccupant("");
      setChecking(!!s && cloudBacked);
    }

    const update = async () => {
      if (updating) return;
      updating = true;
      try {
        const opening = web
          ? new URLSearchParams(window.location.search).get("cloudFile")
          : null;
        if (opening && opening !== id) return;
        if (web && isCloudOffline() && navigator.onLine && s) {
          try {
            await cloudRequest(s, "/files/" + id + "/edit");
          } catch {
            /* Keep the local draft while the cloud is unreachable. */
          }
        }
        if (web && isCloudOffline()) {
          const local = s || offlineSessionForDoc(id),
            alreadyOwned = ownsLocalEditor(id);
          if (
            local &&
            (await readCloudRecovery(local, id))?.editing &&
            !cancelled &&
            (await claimLocalEditor(id))
          ) {
            if (cancelled || active.current !== id) {
              if (!alreadyOwned) releaseLocalEditor(id);
              return;
            }
            const cached = await readCloudRecovery(local, id);
            if (!alreadyOwned && cached)
              loadRef.current(markRecoveredDocument(cached.doc));
            await setOfflineEditing(local, id, true);
            reconnect(id, true);
            setStatus("本机保存 · 待联网同步；云端编辑权已释放");
            render((v) => v + 1);
          }
          return;
        }
        if (!s || !isCloudBackedDocument(id)) return;
        if (web && needsReconnect(id) && !lease.current) {
          let finish = false;
          try {
            finish =
              localStorage.getItem("baizefig.finish-after-sync." + id) ===
              "true";
          } catch {}
          await begin("human", undefined, true);
          if (finish) {
            await end();
            try {
              localStorage.removeItem("baizefig.finish-after-sync." + id);
            } catch {}
          }
          return;
        }
        if (
          web &&
          !lease.current &&
          autoPaused.current !== id &&
          readEditResume(s, id) &&
          !starting.current
        ) {
          await begin("human", undefined, true);
          return;
        }
        const current = lease.current;
        if (current?.documentId === id && current.kind === "human") {
          const result = await cloudRequest(
            s,
            "/files/" + id + "/edit/renew",
            body(current),
          );
          if (!cancelled && lease.current === current) {
            current.until = new Date(result.expires_at).getTime();
            setOccupant("");
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
            ) {
              lease.current = null;
              if (web) releaseLocalEditor(id);
            }
            const holder = web
              ? result.lock?.holder || result.lock?.label || ""
              : result.lock?.label || "";
            if (web) setOccupant(holder);
            setStatus(
              holder
                ? holder + " 正在编辑 · 当前只读"
                : "只读 · 点击开始编辑获取编辑权",
            );
            render((v) => v + 1);
            if (
              web &&
              !result.lock &&
              !lease.current &&
              autoPaused.current !== id &&
              !starting.current
            )
              await begin("human", undefined, true);
          }
        }
      } catch (error) {
        if (!cancelled) {
          if ((error as { status?: number }).status !== 413)
            lease.current = null;
          if (web && (error as { status?: number }).status === 423) {
            const state = await cloudRequest(
              s!,
              "/files/" + id + "/edit",
            ).catch(() => null);
            if (!cancelled && state?.lock) {
              const holder = web
                ? state.lock.holder || state.lock.label
                : state.lock.label;
              if (web) setOccupant(holder);
              setStatus(holder + " 正在编辑 · 当前只读");
            }
          } else {
            if (web) setOccupant("");
            setStatus(
              (error as Error).message || "编辑连接已失效 · 本机内容已保留",
            );
          }
          render((v) => v + 1);
        }
      } finally {
        if (web && !cancelled && !starting.current) setChecking(false);
        updating = false;
      }
    };
    refreshEdit.current = () => void update();
    void update();
    const timer = setInterval(
      () => {
        const current = lease.current;
        if (
          web &&
          current?.kind === "human" &&
          current.until - Date.now() > 75000
        )
          return;
        void update();
      },
      web ? 5000 : 15000,
    );
    const close = () => {
      const l = lease.current;
      if (s && l?.documentId === id) {
        lease.current = null;
        void (async () => {
          try {
            await flushRef.current(s, id, l.token, l.kind, false);
          } finally {
            await release(s, l);
            if (web) releaseLocalEditor(id);
          }
        })().catch(() => {});
      } else if (web) releaseLocalEditor(id);
    };
    const leave = () => {
      const l = lease.current;
      if (s && l?.documentId === id) {
        lease.current = null;
        void release(s, l).catch(() => {});
      }
      if (web) releaseLocalEditor(id);
    };
    const offline = () => {
      const l = lease.current;
      if (web && l?.kind === "human") reconnect(id, true);
      if (s && l?.documentId === id) {
        lease.current = null;
        void release(s, l).catch(() => {});
      }
      setStatus(
        web ? "本机保存 · 待联网同步；云端编辑权已释放" : "连接中断 · 当前只读",
      );
      render((v) => v + 1);
      if (web) void update();
    };
    const network = (event: Event) => {
      if ((event as CustomEvent).detail.online) void update();
      else offline();
    };
    const online = () => void update();
    const show = (event: PageTransitionEvent) => {
      if (web && event.persisted) void update();
    };
    if (web) window.addEventListener("pageshow", show);
    if (web) window.addEventListener(CLOUD_NETWORK_EVENT, network);
    window.addEventListener("pagehide", leave);
    window.addEventListener("offline", offline);
    if (web) window.addEventListener("online", online);
    return () => {
      cancelled = true;
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", show);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.removeEventListener(CLOUD_NETWORK_EVENT, network);
      close();
    };
  }, [session?.token, documentId, editorId]);
  useEffect(() => {
    if (web && cloudBacked && !lease.current) {
      setChecking(true);
      refreshEdit.current();
    }
  }, [cloudBacked]);
  async function begin(
    kind: "human" | "ai" = "human",
    token?: string,
    resuming = false,
  ) {
    if (starting.current) throw Error("正在获取编辑权，请稍候");
    starting.current = true;
    if (web) {
      setChecking(true);
      setStatus("正在获取编辑权…");
    }
    try {
      const result = await beginEditing(kind, token);
      if (web) {
        autoPaused.current = null;
        setOccupant("");
      }
      if (web && !resuming)
        try {
          localStorage.removeItem("baizefig.finish-after-sync." + documentId);
        } catch {}
      return result;
    } catch (error) {
      if (
        web &&
        [401, 403, 423].includes((error as { status?: number }).status || 0) &&
        session
      )
        forgetEditResume(session, documentId);
      throw error;
    } finally {
      starting.current = false;
      if (web) setChecking(false);
    }
  }
  async function beginEditing(kind: "human" | "ai" = "human", token?: string) {
    const id = documentId,
      epoch = generation.current,
      s = session || offlineSessionForDoc(id);
    if (!s) throw Error("请先登录乐悦云");
    if (lease.current) throw Error("请先结束当前编辑会话");
    if (web && navigator.locks && !(await claimLocalEditor(id))) {
      const state = await cloudRequest(s, "/files/" + id + "/edit").catch(
        () => null,
      );
      const holder =
        state?.lock?.holder || state?.lock?.label || "另一个标签页";
      setOccupant(holder);
      setStatus(holder + " 正在编辑 · 当前只读");
      throw Object.assign(Error(holder + " 正在编辑，请先结束该会话"), {
        status: 423,
      });
    }
    if (web && isCloudOffline()) {
      if (kind !== "human" || !(await readCloudRecovery(s, id))) {
        releaseLocalEditor(id);
        throw Error("此文件没有本机恢复缓存，请联网打开后重试");
      }
      if (!ownsLocalEditor(id))
        throw Error("当前浏览器无法安全管理离线编辑，请联网后重试");
      await setOfflineEditing(s, id, true);
      reconnect(id, true);
      setStatus("本机保存 · 待联网同步；云端编辑权已释放");
      render((v) => v + 1);
      return "";
    }
    setBusy(true);
    let acquired: Lease | null = null;
    try {
      const result = token
        ? { token, expires_at: Date.now() + 90000 }
        : await cloudRequest(s, "/files/" + id + "/edit/acquire", {
            editorId,
            platform: web ? "web" : "desktop",
            label: web ? "网页版" : "本地版",
            ...(web && kind === "human"
              ? { resume: readEditResume(s, id) }
              : {}),
          });
      acquired = {
        token: result.token,
        kind,
        documentId: id,
        until: new Date(result.expires_at).getTime(),
      };
      if (active.current !== id || (web && generation.current !== epoch))
        throw Error("文档已切换，请重新开始编辑");
      if (web && kind === "human")
        rememberEditResume(s, id, { editorId, token: acquired.token });
      try {
        let latest = await cloudRequest(s, "/files/" + id);
        if (web) latest = await resolveCloudOpen(s, latest);
        if (active.current !== id || (web && generation.current !== epoch))
          throw Error("文档已切换");
        rememberCloudBinding(
          s,
          id,
          latest.file.head_id,
          latest.file.folder_id,
          web ? latest.draft?.revision || null : undefined,
        );
        loadRef.current(latest.content);
        if (web) await setOfflineEditing(s, id, kind === "human");
      } catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
      }
      lease.current = acquired;
      if (web) reconnect(id, false);
      setStatus(
        kind === "human" ? "你正在独占编辑" : "AI 正在独占编辑 · 当前只读",
      );
      render((v) => v + 1);
      return acquired.token;
    } catch (error) {
      if (acquired) await release(s, acquired).catch(() => {});
      if (web) releaseLocalEditor(id);
      if ((error as { status?: number }).status === 423) {
        const state = await cloudRequest(s, "/files/" + id + "/edit").catch(
          () => null,
        );
        if (state?.lock) {
          const holder = web
            ? state.lock.holder || state.lock.label
            : state.lock.label;
          if (web) setOccupant(holder);
          setStatus(holder + " 正在编辑 · 当前只读");
        }
      }
      throw error;
    } finally {
      setBusy(false);
    }
  }
  function canEdit(id: string) {
    if (!isCloudBackedDocument(id)) return true;
    if (web && canEditOffline(id)) return true;
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
    if (web && isCloudOffline() && canEditOffline(documentId)) {
      const local = session || offlineSessionForDoc(documentId);
      if (!local) throw Error("无法读取本机缓存");
      await flushRef.current(local, documentId, "", "human", true);
      await setOfflineEditing(local, documentId, false);
      try {
        localStorage.setItem(
          "baizefig.finish-after-sync." + documentId,
          "true",
        );
      } catch {}
      releaseLocalEditor(documentId);
      autoPaused.current = documentId;
      setStatus("已保存到本机 · 联网后同步");
      render((v) => v + 1);
      return;
    }
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
      await flushRef.current(session, documentId, l.token, l.kind, true);
      await release(session, l);
      lease.current = null;
      if (web) {
        if (l.kind === "human") autoPaused.current = documentId;
        setOccupant("");
        await setOfflineEditing(session, documentId, false);
        releaseLocalEditor(documentId);
      }
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
    occupant,
    checking,
    busy,
    begin,
    end,
    lease,
    canEdit,
    canSave: (token?: string) =>
      (web && canEditOffline(documentId)) ||
      (!!session &&
        lease.current?.documentId === documentId &&
        (!token || lease.current.token === token)),
    editing: canEdit(documentId) && isCloudBackedDocument(documentId),
  };
}
