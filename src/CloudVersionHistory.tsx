import { useEffect, useState } from "react";
import type { CloudSession } from "./cloud";
import { cloudRequest } from "./saveDestination";
import { CloudVersions, type CloudVersion } from "./CloudVersions";
import { webAlert, webConfirm } from "./WebDialogs";
export function CloudVersionHistory({
  session,
  documentId,
}: {
  session: CloudSession;
  documentId: string;
}) {
  const [versions, setVersions] = useState<CloudVersion[]>([]),
    [head, setHead] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const result = await cloudRequest(session, "/files/" + documentId);
    setVersions(result.versions);
    setHead(result.file.head_id);
  };
  useEffect(() => {
    let active = true;
    void cloudRequest(session, "/files/" + documentId)
      .then((result) => {
        if (active) {
          setVersions(result.versions);
          setHead(result.file.head_id);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [session.token, documentId]);
  const perform = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="cloud-version-history">
      <header>
        <strong>云端版本 · {versions.length} 个</strong>
        <button disabled={busy} onClick={() => void perform(load)}>
          刷新
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <CloudVersions
          versions={versions}
          headId={head}
          onDeleteUnnamed={async () => {
            const count = versions.filter(
              (v) => v.id !== head && !v.version_name?.trim(),
            ).length;
            if (
              await webConfirm(
                "删除 " +
                  count +
                  " 个未命名历史版本？最新版本和所有已命名版本将保留。",
              )
            )
              await perform(async () => {
                await cloudRequest(
                  session,
                  "/files/" + documentId + "/versions/delete-unnamed",
                  {},
                );
              });
          }}
          onRename={(version, name) =>
            perform(async () => {
              await cloudRequest(
                session,
                "/files/" + documentId + "/versions/" + version + "/rename",
                { name },
              );
            })
          }
          onDelete={async (version) => {
            if (await webConfirm("删除这个云端历史版本？此操作将释放云空间。"))
              await perform(async () => {
                await cloudRequest(
                  session,
                  "/files/" + documentId + "/versions/" + version + "/delete",
                  {},
                );
              });
          }}
          onRestore={async (version) => {
            if (
              await webConfirm(
                "将此版本恢复为新的云端文件？原文件与历史版本保持不变。",
              )
            )
              await perform(async () => {
                const copy = await cloudRequest(
                  session,
                  "/files/" + documentId + "/versions/" + version + "/restore",
                  {},
                );
                await webAlert("已恢复为新文件：" + copy.name);
              });
          }}
        />
      </fieldset>
    </section>
  );
}
