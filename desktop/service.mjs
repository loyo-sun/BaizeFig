import { createBridge } from "../bridge/server.mjs";
let bridge;
process.parentPort.on("message", async ({ data }) => {
  if (data.type !== "start" || bridge) return;
  try {
    bridge = createBridge({
      http: true,
      authMode: "token",
      autoPair: false,
      host: "127.0.0.1",
      port: 0,
      hosts: ["127.0.0.1"],
      origins: ["baizefig://app"],
      accessToken: data.accessToken,
      pairingToken: data.pairingToken,
    });
    const address = await bridge.start();
    process.parentPort.postMessage({ type: "ready", port: address.port });
  } catch (e) {
    process.parentPort.postMessage({ type: "error", message: e.message });
    process.exitCode = 1;
  }
});
