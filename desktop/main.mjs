import {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  Menu,
  dialog,
  clipboard,
  shell,
  utilityProcess,
  session,
} from "electron";
import { join, resolve, relative, isAbsolute } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createFileOpenQueue } from "./open-files.mjs";
import { readJson, atomicJson, updateClientConfig } from "./config.mjs";
import { findMacUpdate, releasesApi } from "./releases.mjs";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const publicVersion = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).displayVersion;
const origin = "baizefig://app";
protocol.registerSchemesAsPrivileged([
  {
    scheme: "baizefig",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);
app.setName("BaizeFig");
if (process.env.BAIZEFIG_DESKTOP_TEST_DATA)
  app.setPath("userData", process.env.BAIZEFIG_DESKTOP_TEST_DATA);
const statePath = join(app.getPath("userData"), "desktop-mcp.json");
let state,
  service,
  window,
  settingsWindow,
  updateTimer,
  quitting = false,
  cleaned = false;
let pendingSave,
  quitPending = false;
let operation = Promise.resolve();
let serviceError = "";
const serialize = (fn) => {
  const task = operation.then(fn);
  operation = task.catch(() => {});
  return task;
};
const fileOpens = createFileOpenQueue(() => {
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    window.webContents.send("desktop:files-available");
  }
});
// macOS can deliver these before app.whenReady() and before the editor loads.
app.on("open-file", (event, path) => {
  event.preventDefault();
  fileOpens.enqueue(path);
});
const save = () => atomicJson(statePath, state);
async function flushDocument() {
  if (!window || window.isDestroyed()) return;
  await new Promise((resolveSave, reject) => {
    const id = randomBytes(16).toString("hex");
    const timer = setTimeout(() => {
      pendingSave = undefined;
      reject(Error("保存作品超时，请返回画布保存或导出后重试。"));
    }, 15000);
    pendingSave = {
      id,
      finish: (ok) => {
        clearTimeout(timer);
        pendingSave = undefined;
        ok
          ? resolveSave()
          : reject(Error("作品尚未保存，请返回画布保存或导出后重试。"));
      },
    };
    window.webContents.send("desktop:save-before-quit", id);
  });
}
const clientEntry = () => ({
  command: process.execPath,
  args: [join(root, "desktop", "stdio.mjs"), statePath],
  env: { ELECTRON_RUN_AS_NODE: "1" },
});
const publicStatus = () => ({
  version: publicVersion,
  installed: state.installed,
  enabled: state.enabled,
  running: !!service && !!state.endpoint,
  endpoint: state.endpoint ?? "",
  pairingToken: state.installed ? state.pairingToken : "",
  config: state.installed
    ? JSON.stringify({ mcpServers: { baizefig: clientEntry() } }, null, 2)
    : "",
  clients: Object.keys(state.clients ?? {}),
  error: serviceError,
});
async function stopService() {
  const previous = service;
  service = undefined;
  if (previous) {
    await new Promise((done) => {
      const timer = setTimeout(done, 3000);
      previous.once("exit", () => {
        clearTimeout(timer);
        done();
      });
      previous.kill();
    });
  }
  delete state.endpoint;
  await save();
}
async function startService() {
  if (!state.installed) throw Error("请先安装本机 MCP");
  if (service && state.endpoint) return;
  serviceError = "";
  const child = utilityProcess.fork(join(root, "desktop", "service.mjs"), [], {
    serviceName: "BaizeFig MCP",
    stdio: "pipe",
  });
  service = child;
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {}); // Never expose private service credentials in logs.
  child.on("exit", () => {
    if (service === child) {
      service = undefined;
      delete state.endpoint;
      serviceError = "MCP 服务已退出，请重新启动";
      void serialize(save);
    }
  });
  try {
    const port = await new Promise((resolvePort, reject) => {
      const timer = setTimeout(() => reject(Error("MCP 启动超时")), 15000);
      child.once("exit", () => {
        clearTimeout(timer);
        reject(Error("MCP 启动失败"));
      });
      child.on("message", (message) => {
        clearTimeout(timer);
        if (message.type === "ready") resolvePort(message.port);
        else reject(Error(message.message ?? "MCP 启动失败"));
      });
      child.once("spawn", () =>
        child.postMessage({
          type: "start",
          accessToken: state.accessToken,
          pairingToken: state.pairingToken,
        }),
      );
    });
    state.endpoint = `http://127.0.0.1:${port}/mcp`;
    state.enabled = true;
    await save();
  } catch (e) {
    serviceError = e.message;
    await stopService();
    throw e;
  }
}
function secureWindow(options = {}) {
  const result = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    show: false,
    ...options,
    webPreferences: {
      preload: join(root, "desktop", "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  result.once("ready-to-show", () => result.show());
  result.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin + "/")) {
      const preview = secureWindow({ width: 1100, height: 800 });
      void preview.loadURL(url);
    } else if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  result.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin + "/")) {
      event.preventDefault();
      if (/^https:\/\//.test(url)) void shell.openExternal(url);
    }
  });
  return result;
}
function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = secureWindow({
    width: 840,
    height: 780,
    minWidth: 700,
    minHeight: 650,
    title: "BaizeFig · 桌面设置",
  });
  void settingsWindow.loadURL(origin + "/desktop/settings.html");
}
const trusted = (event) => {
  const url = event.senderFrame?.url;
  if (
    event.senderFrame !== event.sender.mainFrame ||
    ![
      origin + "/",
      origin + "/index.html",
      origin + "/desktop/settings.html",
    ].includes(url)
  )
    throw Error("不允许的桌面调用来源");
};
function handle(name, fn) {
  ipcMain.handle(name, async (event, ...args) => {
    trusted(event);
    return fn(...args);
  });
}

let checking = false;
async function checkUpdate(manual = false) {
  if (process.env.BAIZEFIG_DESKTOP_TEST_DATA && !manual) return;
  if (!app.isPackaged) {
    if (manual)
      await dialog.showMessageBox({
        message: "开发模式不检查更新，请使用已安装的发行版本。",
      });
    return;
  }
  if (checking) return;
  checking = true;
  try {
    const result = await net.fetch(releasesApi, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "BaizeFig-Desktop",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!result.ok) throw Error(`GitHub HTTP ${result.status}`);
    const update = findMacUpdate(await result.json(), app.getVersion());
    if (!update && manual)
      await dialog.showMessageBox({ message: "当前已经是最新版本。" });
    if (update) {
      const { response } = await dialog.showMessageBox({
        message: `发现新版本 ${update.label}`,
        detail:
          "下载新版后，退出 BaizeFig，将新应用拖入「应用程序」替换旧版。本地作品会保留。此版本不使用 Apple 签名或公证，需手动安装更新。",
        buttons: ["稍后", "下载新版"],
        defaultId: 1,
        cancelId: 0,
      });
      if (response === 1) await shell.openExternal(update.url);
    }
  } catch (e) {
    if (manual)
      await dialog.showMessageBox({
        type: "error",
        message: "暂时无法检查更新，请稍后重试。",
        detail: e.message,
      });
  } finally {
    checking = false;
  }
}
async function setup() {
  state = await readJson(statePath, {
    installed: false,
    enabled: false,
    clients: {},
  });
  delete state.endpoint;
  await save();
  protocol.handle("baizefig", async (request) => {
    const url = new URL(request.url);
    if (url.host !== "app" || !["GET", "HEAD"].includes(request.method))
      return new Response("Forbidden", { status: 403 });
    let path;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Bad path", { status: 400 });
    }
    const desktopFiles = [
      "/desktop/settings.html",
      "/desktop/settings.js",
      "/desktop/settings.css",
    ];
    const base = desktopFiles.includes(path) ? root : join(root, "dist");
    const file = resolve(base, "." + (path === "/" ? "/index.html" : path));
    const rel = relative(base, file);
    if (!rel || rel.startsWith("..") || isAbsolute(rel))
      return new Response("Forbidden", { status: 403 });
    try {
      return await net.fetch(pathToFileURL(file).href);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
  session.defaultSession.setPermissionRequestHandler(
    (contents, permission, callback) =>
      callback(
        contents.getURL().startsWith(origin + "/") &&
          [
            "clipboard-read",
            "clipboard-write",
            "clipboard-sanitized-write",
          ].includes(permission),
      ),
  );
  ipcMain.on("desktop:saved", (event, id, ok) => {
    if (
      event.sender !== window?.webContents ||
      event.senderFrame !== event.sender.mainFrame
    )
      return;
    if (pendingSave?.id === id) pendingSave.finish(ok === true);
  });
  handle("desktop:next-file", () => fileOpens.next());
  handle("desktop:status", publicStatus);
  handle("desktop:manage", openSettings);
  handle("desktop:mcp", (action) =>
    serialize(async () => {
      if (action === "install") {
        if (!state.installed) {
          state = {
            ...state,
            installed: true,
            accessToken: randomBytes(32).toString("hex"),
            pairingToken: randomBytes(32).toString("hex"),
          };
          await save();
        }
        await startService();
      } else if (action === "start") await startService();
      else if (action === "stop") {
        state.enabled = false;
        await stopService();
      } else if (action === "uninstall") {
        // Check all tracked entries before removing any; never remove another MCP.
        for (const [path, entry] of Object.entries(state.clients)) {
          const config = await readJson(path, {});
          const actual = config.mcpServers?.baizefig;
          if (actual && JSON.stringify(actual) !== JSON.stringify(entry))
            throw Error(`客户端配置已变化，请先移除连接：${path}`);
        }
        for (const [path, entry] of Object.entries(state.clients)) {
          await updateClientConfig(path, undefined, entry);
          delete state.clients[path];
          await save();
        }
        state.enabled = false;
        await stopService();
        state = { installed: false, enabled: false, clients: {} };
        serviceError = "";
        await save();
      } else throw Error("未知操作");
      return publicStatus();
    }),
  );
  handle("desktop:client", (action) =>
    serialize(async () => {
      if (!["install", "remove"].includes(action)) throw Error("未知操作");
      if (action === "install" && !state.installed)
        throw Error("请先安装本机 MCP");
      const result = await dialog.showOpenDialog({
        title: "选择 AI 客户端的 MCP JSON 配置文件",
        properties: ["openFile"],
        filters: [{ name: "MCP JSON", extensions: ["json"] }],
      });
      if (result.canceled) return publicStatus();
      const path = result.filePaths[0];
      if (action === "remove" && !state.clients[path])
        throw Error("此文件未由 BaizeFig 安装连接，请在客户端手动移除");
      const entry = action === "install" ? clientEntry() : undefined;
      await updateClientConfig(path, entry, state.clients[path]);
      if (entry) state.clients[path] = entry;
      else delete state.clients[path];
      await save();
      return publicStatus();
    }),
  );
  handle("desktop:copy-config", () => {
    if (!state.installed) throw Error("请先安装本机 MCP");
    clipboard.writeText(publicStatus().config);
  });
  handle("desktop:update", () => checkUpdate(true));
  window = secureWindow({ title: "BaizeFig · 白泽" });
  window.on("close", (event) => {
    if (cleaned) return;
    event.preventDefault();
    if (quitting) return;
    const choice = dialog.showMessageBoxSync(window, {
      type: "question",
      message: "关闭 BaizeFig？",
      detail:
        "本地作品会自动保存。关闭后本机 MCP 将停止；如需文件备份，请先导出。",
      buttons: ["取消", "关闭"],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 1) {
      quitting = true;
      app.quit();
    }
  });
  await window.loadURL(origin + "/");
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin"
        ? [
            {
              label: "BaizeFig",
              submenu: [
                { label: "桌面设置与本机 MCP", click: openSettings },
                { type: "separator" },
                { role: "quit" },
              ],
            },
          ]
        : []),
      {
        label: "编辑",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "桌面",
        submenu: [
          { label: "本机 MCP 管理", click: openSettings },
          { label: "检查更新", click: () => void checkUpdate(true) },
          { role: "togglefullscreen" },
        ],
      },
      { label: "窗口", submenu: [{ role: "minimize" }, { role: "zoom" }] },
    ]),
  );
  if (state.installed && state.enabled)
    await startService().catch((e) => {
      serviceError = e.message;
    });
  updateTimer = setInterval(() => void checkUpdate(), 6 * 60 * 60 * 1000);
  updateTimer.unref();
  void checkUpdate();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  process.argv.slice(1).forEach((path) => fileOpens.enqueue(path));
  app.on("second-instance", (_event, argv) => {
    argv.forEach((path) => fileOpens.enqueue(path));
    window?.restore();
    window?.focus();
  });
  app
    .whenReady()
    .then(setup)
    .catch((e) => {
      dialog.showErrorBox("BaizeFig 启动失败", e.message);
      app.exit(1);
    });
  app.on("before-quit", (event) => {
    if (cleaned) return;
    event.preventDefault();
    if (quitPending) return;
    quitPending = true;
    quitting = true;
    clearInterval(updateTimer);
    void flushDocument()
      .then(() =>
        serialize(async () => {
          if (state) await stopService();
        }),
      )
      .then(() => {
        cleaned = true;
        app.quit();
      })
      .catch(async (e) => {
        quitPending = false;
        quitting = false;
        await dialog.showMessageBox({ type: "error", message: e.message });
      });
  });
  app.on("window-all-closed", () => app.quit());
}
