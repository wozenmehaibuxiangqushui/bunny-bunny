export function playLaunchAnimation() {
  const splash = document.querySelector("#launch-screen");
  if (!splash) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finish = () => {
    clearTimeout(window.__bunnyBootTimer);
    if (!splash.isConnected || splash.classList.contains('is-finished')) return;
    splash.classList.add("is-finished");
    setTimeout(() => splash.remove(), reduced ? 140 : 620);
  };
  // Some image or font requests never finish on CDN previews, so load cannot be the only exit.
  setTimeout(finish, reduced ? 150 : 1550);
  if (document.readyState !== "complete") window.addEventListener("load", () => setTimeout(finish, reduced ? 120 : 1250), { once: true });
}
