export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function initialsAvatar(person, profile = {}) {
  const image = profile.avatarUrl ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="">` : escapeHtml(person.initials);
  return `<span class="avatar ${person.type === "user" ? "light" : ""}">${image}</span>`;
}

let toastTimer;
export function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

export function updateIsland(message, active = false) {
  document.querySelector("#island-copy").textContent = message;
  document.querySelector("#dynamic-island").classList.toggle("active", active);
}

export function readForm(form) { return Object.fromEntries(new FormData(form).entries()); }

export function openSheet(html, { onReady } = {}) {
  const root = document.querySelector("#modal-root");
  root.innerHTML = `<div class="sheet-backdrop" data-close-sheet></div><section class="sheet" role="dialog" aria-modal="true">${html}</section>`;
  root.classList.add("open");
  root.querySelector("[data-close-sheet]").addEventListener("click", closeSheet);
  root.querySelectorAll("[data-sheet-close]").forEach(button => button.addEventListener("click", closeSheet));
  onReady?.(root.querySelector(".sheet"));
}

export function closeSheet() {
  const root = document.querySelector("#modal-root");
  root.classList.remove("open");
  root.innerHTML = "";
}

export function setPhoneAppearance(appearance) {
  const phone = document.querySelector("#phone-root");
  phone.dataset.theme = appearance.theme || "mono";
  const glassMode = appearance.glassMode === "soft" ? "soft" : "clear";
  const clarity = Math.max(0, Math.min(100, Number(appearance.glassClarity ?? 72)));
  phone.dataset.glassMode = glassMode;
  phone.style.setProperty("--liquid-fill", `rgba(245,249,255,${(0.46 - clarity * 0.0035 + (glassMode === "soft" ? 0.16 : 0)).toFixed(3)})`);
  phone.style.setProperty("--liquid-blur", `${Math.round(28 - clarity * 0.12 + (glassMode === "soft" ? 8 : 0))}px`);
  const wallpaper=appearance.wallpapers?.[appearance.theme]??appearance.wallpaper;
  phone.style.setProperty("--wallpaper-image", wallpaper ? `url(${JSON.stringify(String(wallpaper))})` : appearance.theme==='glass'?'radial-gradient(ellipse at 6% 6%,#fff8e3 0%,transparent 35%),radial-gradient(ellipse at 95% 12%,#f5acc0 0%,transparent 38%),radial-gradient(ellipse at 10% 62%,#8fc4e8 0%,transparent 48%),radial-gradient(ellipse at 88% 84%,#8d9ad6 0%,transparent 44%),linear-gradient(156deg,#d4e8f3 5%,#b8ccd9 48%,#d5c6df 100%)':'none');
  phone.style.setProperty('--wallpaper-veil',1-Math.max(0,Math.min(1,appearance.wallpaperOpacity??1)));
  phone.style.setProperty('--desktop-label-color',appearance.desktopLabelColor||'#222222');
  phone.style.setProperty('--global-text-color',appearance.globalTextColor||'#222222');
  phone.classList.toggle("has-wallpaper", Boolean(wallpaper));
  let style=document.querySelector('#global-font-style');if(!style){style=document.createElement('style');style.id='global-font-style';document.head.appendChild(style)}const url=appearance.globalFontUrl||'';style.textContent=/^https?:\/\//i.test(url)?`@font-face{font-family:BunnyGlobal;src:url(${JSON.stringify(url)});font-display:swap}#phone-root{--bunny-font:BunnyGlobal,-apple-system,sans-serif}`:'';
}
