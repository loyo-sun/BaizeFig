const api = window.baizefigDesktop;
let busy = false;
function render(state) {
  document.querySelector("#version").textContent =
    `版本 ${state.version} · 本地作品保存在此应用中`;
  document.querySelector("#status").textContent = state.running
    ? `运行中 · ${state.endpoint}`
    : state.installed
      ? "已安装 · 已停止"
      : "尚未安装";
  document.querySelector("#config").textContent =
    state.config || "安装 MCP 后显示连接配置";
  document.querySelector("#clients").textContent = state.clients.length
    ? `已登记的配置文件：\n${state.clients.join("\n")}`
    : "尚未通过此窗口安装客户端连接。";
  if (state.error) document.querySelector("#message").textContent = state.error;
  for (const button of document.querySelectorAll("button")) {
    button.disabled = busy;
    if (button.dataset.mcp === "install") button.disabled ||= state.installed;
    if (["start", "stop", "uninstall"].includes(button.dataset.mcp))
      button.disabled ||= !state.installed;
    if (button.dataset.mcp === "start") button.disabled ||= state.running;
    if (button.dataset.mcp === "stop") button.disabled ||= !state.running;
    if (button.id === "copy" || button.dataset.client === "install")
      button.disabled ||= !state.installed;
  }
}
async function run(task, message = "") {
  if (busy) return;
  busy = true;
  document.querySelector("#message").textContent = "";
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    await task();
    document.querySelector("#message").textContent = message;
  } catch (e) {
    document.querySelector("#message").textContent = e.message;
  } finally {
    busy = false;
    render(await api.status());
  }
}
for (const button of document.querySelectorAll("[data-mcp]"))
  button.onclick = () => {
    const action = button.dataset.mcp;
    if (
      action === "uninstall" &&
      !confirm(
        "卸载本机 MCP 并移除已登记的客户端连接？作品不会删除。手动复制到其他客户端的连接需自行移除。",
      )
    )
      return;
    void run(() => api.mcp(action));
  };
for (const button of document.querySelectorAll("[data-client]"))
  button.onclick = () =>
    void run(
      () => api.client(button.dataset.client),
      "操作完成后，请在 AI 客户端重新加载 MCP 连接。",
    );
document.querySelector("#copy").onclick = () =>
  void run(
    () => api.copyConfig(),
    "配置已复制。请合并 baizefig 项，保留其他 MCP 配置。",
  );
document.querySelector("#update").onclick = () => void run(() => api.update());
window.addEventListener("focus", () => {
  if (!busy) void api.status().then(render);
});
void api.status().then(render);
