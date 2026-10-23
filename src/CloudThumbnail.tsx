import { useEffect, useState } from "react";
import { FileImage } from "lucide-react";
import type { CloudSession } from "./cloud";
export function CloudThumbnail({
  session,
  id,
  head,
  name,
}: {
  session: CloudSession;
  id: string;
  head: string | null;
  name: string;
}) {
  const [source, setSource] = useState<string | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setSource(null);
    setFailed(false);
    void fetch(session.base + "/api/v1/space/files/" + id + "/thumbnail", {
      headers: { Authorization: "Bearer " + session.token },
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const d = await r.json();
        if (!controller.signal.aborted)
          setSource(
            typeof d.thumbnail === "string" &&
              d.thumbnail.startsWith("data:image/png;base64,")
              ? d.thumbnail
              : null,
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [session.base, session.token, id, head]);
  return (
    <span className="cloud-thumbnail">
      {source && !failed ? (
        <img
          src={source}
          alt={name + " 缩略图"}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="thumbnail-empty">
          <FileImage size={32} />
          <small>暂无预览</small>
        </span>
      )}
    </span>
  );
}
