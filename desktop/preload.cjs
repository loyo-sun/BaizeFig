const { contextBridge, ipcRenderer } = require("electron");
let saveDocument;
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
