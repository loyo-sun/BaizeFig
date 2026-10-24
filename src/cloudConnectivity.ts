let unreachable = false;
export const CLOUD_NETWORK_EVENT = "baizefig-cloud-network";
export function isCloudOffline() {
  return typeof navigator !== "undefined" && (!navigator.onLine || unreachable);
}
export function setCloudReachable(reachable: boolean) {
  if (typeof window === "undefined" || window.baizefigDesktop) return;
  const next = !reachable;
  if (next === unreachable) return;
  unreachable = next;
  window.dispatchEvent(
    new CustomEvent(CLOUD_NETWORK_EVENT, {
      detail: { online: reachable && navigator.onLine },
    }),
  );
}
