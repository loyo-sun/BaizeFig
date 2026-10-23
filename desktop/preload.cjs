const { contextBridge, ipcRenderer } = require("electron");
let saveDocument;
let openDocument;
let draining = false;
async function drainFiles() {
  if (draining || !openDocument) return;
  draining = true;
  try {
    while (openDocument) {
      const file = await ipcRenderer.invoke("desktop:next-file");
      if (!file) break;
      await openDocument(file);
    }
  } finally {
    draining = false;
  }
}
ipcRenderer.on("desktop:files-available", () => void drainFiles());
ipcRenderer.on("desktop:save-before-quit", async (_event, id) => {
  try {
    ipcRenderer.send(
      "desktop:saved",
      id,
      saveDocument ? await saveDocument() : true,
    );
  } catch {
    ipcRenderer.send("desktop:saved", id, false);
  }
});
contextBridge.exposeInMainWorld("baizefigDesktop", {
  onOpenFile: (callback) => {
    openDocument = callback;
    void drainFiles();
    return () => {
      if (openDocument === callback) openDocument = undefined;
    };
  },
  onSave: (callback) => {
    saveDocument = callback;
    return () => {
      if (saveDocument === callback) saveDocument = undefined;
    };
  },
  status: () => ipcRenderer.invoke("desktop:status"),
  manage: () => ipcRenderer.invoke("desktop:manage"),
  mcp: (action) => ipcRenderer.invoke("desktop:mcp", action),
  client: (action) => ipcRenderer.invoke("desktop:client", action),
  copyConfig: () => ipcRenderer.invoke("desktop:copy-config"),
  update: () => ipcRenderer.invoke("desktop:update"),
});
