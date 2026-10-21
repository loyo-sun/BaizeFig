import { useCallback, useEffect, useRef, useState } from "react";
import { cloudBase, restoreCloudSession, type CloudSession } from "./cloud";

export const CLOUD_SESSION_KEY = "baizefig.cloud.session.v1";
const DURATION_KEY = "baizefig.cloud.durationDays";
export const CLOUD_SESSION_DAYS = [1, 7, 30, 90] as const;
export function readStoredCloudSession(base: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(CLOUD_SESSION_KEY) || "null");
    if (!saved) return null;
    const s = saved.session;
    if (
      !s ||
      s.base !== base ||
      s.mcpUrl !== base + "/mcp/baizefig" ||
      typeof s.token !== "string" ||
      s.token.length < 20 ||
      s.token.length > 512 ||
      typeof s.user?.id !== "string" ||
      typeof s.user?.username !== "string" ||
      !Number.isFinite(s.expiresAt) ||
      s.expiresAt <= Date.now() ||
      typeof saved.autoConnect !== "boolean"
    ) {
      localStorage.removeItem(CLOUD_SESSION_KEY);
      return null;
    }
    return saved as { session: CloudSession; autoConnect: boolean };
  } catch {
    return null;
  }
}
function store(session: CloudSession | null, autoConnect = false) {
  try {
    if (session) {
      const value = JSON.stringify({ session, autoConnect });
      if (localStorage.getItem(CLOUD_SESSION_KEY) !== value)
        localStorage.setItem(CLOUD_SESSION_KEY, value);
    } else localStorage.removeItem(CLOUD_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
export function useCloudSession(ready: boolean) {
  const base = cloudBase(import.meta.env.VITE_LOYOCLOUD_URL);
  const [session, updateSession] = useState<CloudSession | null>(null);
  const [active, updateActive] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const [restoreVersion, setRestoreVersion] = useState(0);
  const generation = useRef(0);
  const currentToken = useRef<string | null>(null);
  currentToken.current = session?.token ?? null;
  const [durationDays, updateDuration] = useState(() => {
    try {
      const days = Number(localStorage.getItem(DURATION_KEY));
      return CLOUD_SESSION_DAYS.some((d) => d === days) ? days : 30;
    } catch {
      return 30;
    }
  });
  const setDurationDays = (days: number) => {
    if (!CLOUD_SESSION_DAYS.some((d) => d === days)) return;
    updateDuration(days);
    try {
      localStorage.setItem(DURATION_KEY, String(days));
    } catch {
      /* Current choice still works. */
    }
  };
  const forget = useCallback((token?: string) => {
    if (token && currentToken.current !== token) return;
    currentToken.current = null;
    generation.current++;
    store(null);
    updateSession(null);
    updateActive(false);
    setRestoring(false);
    setRestoreError("");
  }, []);
  const accept = (value: CloudSession) => {
    generation.current++;
    currentToken.current = value.token;
    const persisted = store(value, true);
    updateSession(value);
    updateActive(true);
    setRestoring(false);
    setRestoreError("");
    return persisted;
  };
  const setActive = (value: boolean) => {
    updateActive(value);
    if (session) store(session, value);
  };
  useEffect(() => {
    if (!ready) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const controller = new AbortController();
    const version = ++generation.current;
    async function restore(showLoading = false) {
      if (stopped || generation.current !== version) return;
      const saved = readStoredCloudSession(base);
      if (!saved) {
        setRestoring(false);
        return;
      }
      if (showLoading) {
        setRestoring(true);
        setRestoreError("");
      }
      try {
        const validated = await restoreCloudSession(
          saved.session,
          controller.signal,
        );
        if (stopped || generation.current !== version) return;
        // The server's absolute expiration remains unchanged when restoring.
        const latest = readStoredCloudSession(base);
        if (!latest || latest.session.token !== saved.session.token) return;
        store(validated, latest.autoConnect);
        updateSession(validated);
        updateActive(latest.autoConnect);
        setRestoring(false);
        setRestoreError("");
      } catch (error) {
        if (stopped || generation.current !== version) return;
        if ((error as { invalidSession?: boolean }).invalidSession) forget();
        else {
          setRestoring(false);
          setRestoreError(
            (error as { unsupported?: boolean }).unsupported
              ? "Cloud service needs an update before sign-in can be restored. Your saved sign-in is kept."
              : "Unable to restore sign-in right now. Your saved sign-in is kept; retrying automatically.",
          );
          clearTimeout(retry);
          retry = setTimeout(
            () => void restore(),
            Math.min(1000 * 2 ** attempt++, 30000),
          );
        }
      }
    }
    const online = () => {
      clearTimeout(retry);
      void restore();
    };
    void restore(true);
    window.addEventListener("online", online);
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(retry);
      window.removeEventListener("online", online);
    };
  }, [base, ready, restoreVersion, forget]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== CLOUD_SESSION_KEY && event.key !== null) return;
      generation.current++;
      updateSession(null);
      updateActive(false);
      setRestoreVersion((v) => v + 1);
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  useEffect(() => {
    if (!session) return;
    const check = () => {
      if (Date.now() >= session.expiresAt) forget();
    };
    // Avoid the browser's 32-bit timeout limit for long sessions.
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    check();
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [session, forget]);
  return {
    session,
    active,
    restoring,
    restoreError,
    retryRestore: () => setRestoreVersion((v) => v + 1),
    durationDays,
    setDurationDays,
    accept,
    forget,
    setActive,
  };
}
