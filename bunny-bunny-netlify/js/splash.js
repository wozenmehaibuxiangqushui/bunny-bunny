export function playLaunchAnimation() {
  const splash = document.querySelector("#launch-screen");
  if (!splash) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finish = () => {
    splash.classList.add("is-finished");
    setTimeout(() => splash.remove(), reduced ? 140 : 620);
  };
  if (document.readyState === "complete") setTimeout(finish, reduced ? 120 : 1550);
  else window.addEventListener("load", () => setTimeout(finish, reduced ? 120 : 1250), { once: true });
}
