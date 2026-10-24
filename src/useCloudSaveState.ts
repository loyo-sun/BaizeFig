import { useEffect, useState } from "react";
import type { CloudSession } from "./cloud";
import type { Document } from "./core";
import {
  CLOUD_SAVE_EVENT,
  matchesCloudSaveEvent,
  readCloudSaveState,
} from "./saveDestination";
export function useCloudSaveState(session: CloudSession | null, doc: Document) {
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!session || window.baizefigDesktop) return;
    const receive = (event: Event) => {
      if (matchesCloudSaveEvent(event, session, doc.id)) refresh((v) => v + 1);
    };
    window.addEventListener(CLOUD_SAVE_EVENT, receive);
    return () => window.removeEventListener(CLOUD_SAVE_EVENT, receive);
  }, [session?.token, doc.id]);
  return session
    ? readCloudSaveState(session, doc)
    : { saved: false, saving: false, error: "", draft: false };
}
