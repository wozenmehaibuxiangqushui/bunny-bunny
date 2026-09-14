const CACHE_NAME = "bunny-bunny-shell-v4";
const APP_SHELL = [
  "/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/apple-touch-icon.png",
  "/css/tokens.css", "/css/enhancements.css", "/css/splash.css", "/css/shell.css", "/css/components.css", "/css/apps/desktop.css", "/css/apps/chat.css", "/css/apps/settings.css", "/css/apps/social.css", "/css/responsive.css",
  "/js/app.js", "/js/splash.js", "/js/pwa.js", "/js/webmcp.js", "/js/core/store.js", "/js/core/router.js", "/js/core/ui.js",
  "/js/apps/desktop.js", "/js/apps/desktop-v2.js", "/js/apps/chat-v2.js", "/js/apps/chat-settings-v2.js", "/js/apps/phone-settings-v2.js", "/js/apps/data-settings.js", "/js/apps/prompt-library.js", "/js/apps/chat.js", "/js/apps/contacts.js", "/js/apps/phone-settings.js", "/js/apps/chat-settings.js", "/js/apps/api-settings.js", "/js/apps/placeholders.js", "/js/apps/companions.js",
  "/js/integrations/ai-client.js", "/js/integrations/mcp-client.js", "/js/integrations/reality-bridge.js"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put("/index.html",copy));return response; }).catch(()=>caches.match("/index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}return response; })));
});
