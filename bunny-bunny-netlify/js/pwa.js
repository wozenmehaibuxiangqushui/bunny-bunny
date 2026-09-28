export function registerPwa() {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  const script=new URL('../sw.js',import.meta.url),scope=new URL('../',import.meta.url);
  window.addEventListener("load", () => navigator.serviceWorker.register(script.href, { scope: scope.pathname }).catch(error => console.warn("PWA registration failed", error)), { once: true });
}
