import { useI18n } from "./LanguageContext";
import { rememberCloudBinding, readCloudBinding } from "./saveDestination";
import { CloudThumbnail } from "./CloudThumbnail";
import {
  LayoutGrid,
  List,
  Folder,
  RefreshCw,
  Plus,
  CloudUpload,
} from "lucide-react";
import { svgString, raster } from "./Canvas";
import { useEffect, useState } from "react";
import type { CloudSession } from "./cloud";
import { type Document, validateDocument } from "./core";
type File = {
  id: string;
  name: string;
  folder_id: string | null;
  head_id: string | null;
  updated_at: string;
};
type Folder = { id: string; name: string; parent_id: string | null };
export function CloudFiles({
  session,
  document,
  onOpen,
}: {
  session: CloudSession;
  document: Document;
  onOpen: (doc: Document) => Promise<void>;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"grid" | "list">(() => {
    try {
      return localStorage.getItem("baizefig.cloud.view") === "list"
        ? "list"
        : "grid";
    } catch {
      return "grid";
    }
  });
  const [search, setSearch] = useState("");
  const changeView = (next: "grid" | "list") => {
    setView(next);
    try {
      localStorage.setItem("baizefig.cloud.view", next);
    } catch {}
  };
  const [files, setFiles] = useState<File[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [parent, setParent] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [heads, setHeads] = useState<Record<string, string | null>>({}),
    [versions, setVersions] = useState<{ id: string; created_at: string }[]>(
      [],
    ),
    [selected, setSelected] = useState<File | null>(null);
  async function api(path: string, body?: unknown) {
    const r = await fetch(session.base + "/api/v1/space" + path, {
      headers: {
        Authorization: "Bearer " + session.token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    });
    if (!r.ok)
      throw Error(
        r.status === 409
          ? t("The cloud file has changed. Reopen it before saving.")
          : t("Cloud space request failed ({status})", { status: r.status }),
      );
    return r.json();
  }
  async function load() {
    const d = await api("");
    setFiles(d.files);
    setFolders(d.folders);
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setHeads({});
    setParent(null);
    void run(load);
  }, [session.token]);
  async function open(file: File, version?: string) {
    const d = await api(
      "/files/" + file.id + (version ? "?version=" + version : ""),
    );
    validateDocument(d.content);
    await onOpen(d.content);
    rememberCloudBinding(
      session,
      file.id,
      d.file.head_id,
      d.file.folder_id || null,
    );
    setHeads((h) => ({ ...h, [file.id]: d.file.head_id }));
  }
  return (
    <div className="cloud-files" aria-busy={busy}>
      <div className="cloud-files-heading">
        <div>
          <h3>{t("All cloud files")}</h3>
          <p>
            {t("Organize designs in folders and open a file to keep creating.")}
          </p>
        </div>
        <div
          className="cloud-view-switch"
          role="group"
          aria-label={t("File view")}
        >
          <button
            aria-label={t("Icon view")}
            aria-pressed={view === "grid"}
            onClick={() => changeView("grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            aria-label={t("List view")}
            aria-pressed={view === "list"}
            onClick={() => changeView("list")}
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {error && <p role="alert">{t(error)}</p>}
      <fieldset disabled={busy} className="cloud-files-body">
        <div className="cloud-toolbar">
          <input
            type="search"
            aria-label={t("Search this folder")}
            placeholder={t("Search files or folders")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => void run(load)}>
            <RefreshCw size={14} />
            {t("Refresh")}
          </button>
          <button
            onClick={() =>
              void run(async () => {
                const name = prompt(t("Folder name"));
                if (name) {
                  await api("/folders", { name, parentId: parent });
                  await load();
                }
              })
            }
          >
            <Plus size={14} />
            {t("New folder")}
          </button>
          <button
            onClick={() =>
              void run(async () => {
                const preview = await Promise.all(
                  document.pages.map(async (page) => {
                    const blob = await raster(
                      await svgString(document, page.id),
                      0.5,
                    );
                    return await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                  }),
                );
                const d = await api("/files/" + document.id + "/save", {
                  content: document,
                  preview,
                  headId:
                    readCloudBinding(session, document.id)?.headId ||
                    heads[document.id] ||
                    null,
                });
                rememberCloudBinding(
                  session,
                  document.id,
                  d.headId,
                  files.find((f) => f.id === document.id)?.folder_id || null,
                );
                setHeads((h) => ({ ...h, [document.id]: d.headId }));
                await load();
              })
            }
          >
            <CloudUpload size={14} />
            {t("Save current file to cloud")}
          </button>
        </div>
        <nav className="cloud-breadcrumb" aria-label={t("File path")}>
          <button onClick={() => setParent(null)}>{t("Cloud space")}</button>
          {(() => {
            const chain: Folder[] = [];
            let cursor = parent;
            while (cursor) {
              const f = folders.find((x) => x.id === cursor);
              if (!f) break;
              chain.unshift(f);
              cursor = f.parent_id;
            }
            return chain.map((f) => (
              <span key={f.id}>
                {" "}
                / <button onClick={() => setParent(f.id)}>{f.name}</button>
              </span>
            ));
          })()}
        </nav>
        <table className={`cloud-file-table cloud-file-${view}`}>
          <thead>
            <tr>
              <th>{t("Name")}</th>
              <th>{t("Updated")}</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {folders
              .filter(
                (f) =>
                  f.parent_id === parent &&
                  f.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((f) => (
                <tr key={f.id}>
                  <td>
                    <button
                      className="cloud-file-open cloud-folder-open"
                      onClick={() => setParent(f.id)}
                    >
                      <span className="cloud-folder-picture">
                        <Folder size={view === "grid" ? 44 : 18} />
                      </span>
                      <strong>{f.name}</strong>
                    </button>
                  </td>
                  <td className="cloud-file-date">{t("Folder")}</td>
                  <td className="cloud-file-actions">—</td>
                </tr>
              ))}
            {files
              .filter(
                (f) =>
                  f.folder_id === parent &&
                  f.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((f) => (
                <tr key={f.id}>
                  <td>
                    <button
                      className="cloud-file-open"
                      onClick={() => void run(() => open(f))}
                    >
                      {view === "grid" && (
                        <CloudThumbnail
                          session={session}
                          id={f.id}
                          head={f.head_id}
                          name={f.name}
                        />
                      )}
                      <strong>{f.name}.baizefig</strong>
                    </button>
                  </td>
                  <td className="cloud-file-date">
                    {f.updated_at
                      ? new Date(f.updated_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="cloud-file-actions">
                    <details>
                      <summary>{t("More actions")}</summary>
                      <div className="cloud-file-menu">
                        <button onClick={() => void run(() => open(f))}>
                          {t("Open to edit")}
                        </button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              setSelected(f);
                              setVersions(
                                (await api("/files/" + f.id)).versions,
                              );
                            })
                          }
                        >
                          {t("Properties and versions")}
                        </button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              const target = prompt(
                                t("Target folder ID (leave empty for root)") +
                                  "\n" +
                                  folders
                                    .map((x) => x.name + ": " + x.id)
                                    .join("\n"),
                              );
                              if (target !== null) {
                                await api("/files/" + f.id + "/move", {
                                  folderId: target || null,
                                });
                                await load();
                              }
                            })
                          }
                        >
                          {t("Move")}
                        </button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              const d = await api(
                                "/files/" + f.id + "/share",
                                {},
                              );
                              prompt(
                                t("Read-only share URL"),
                                session.base + d.url,
                              );
                            })
                          }
                        >
                          {t("Share")}
                        </button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              await api("/files/" + f.id + "/share", {
                                revoke: true,
                              });
                            })
                          }
                        >
                          {t("Revoke share")}
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!folders.some(
          (f) =>
            f.parent_id === parent &&
            f.name.toLowerCase().includes(search.toLowerCase()),
        ) &&
          !files.some(
            (f) =>
              f.folder_id === parent &&
              f.name.toLowerCase().includes(search.toLowerCase()),
          ) && (
            <p className="cloud-empty">
              {search
                ? t("No matching files")
                : t(
                    "This folder is empty. Save the current design to get started.",
                  )}
            </p>
          )}
        {selected && (
          <section className="cloud-file-properties">
            <button
              className="cloud-properties-close"
              onClick={() => setSelected(null)}
            >
              {t("Close details")}
            </button>
            <h4>{selected.name}.baizefig</h4>
            <p>
              {t("File ID")}: {selected.id}
              <br />
              {t("Updated")}: {selected.updated_at}
            </p>
            {versions.map((v) => (
              <p key={v.id}>
                {v.created_at}{" "}
                <button onClick={() => void run(() => open(selected, v.id))}>
                  {t("Open this version")}
                </button>
                <button
                  onClick={() =>
                    void run(async () => {
                      await api(
                        "/files/" +
                          selected.id +
                          "/versions/" +
                          v.id +
                          "/delete",
                        {},
                      );
                      setVersions(
                        (await api("/files/" + selected.id)).versions,
                      );
                    })
                  }
                >
                  {t("Delete historical version")}
                </button>
              </p>
            ))}
            <p>
              {t(
                "Open a historical version and save to create a new version while keeping the history.",
              )}
            </p>
          </section>
        )}
      </fieldset>
    </div>
  );
}
