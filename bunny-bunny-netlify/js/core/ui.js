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
  phone.style.setProperty("--wallpaper-image", appearance.wallpaper ? `url("${String(appearance.wallpaper).replace(/["\\]/g, "")}")` : "none");
  phone.classList.toggle("has-wallpaper", Boolean(appearance.wallpaper));
}
