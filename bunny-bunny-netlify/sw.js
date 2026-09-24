const CACHE_NAME = "bunny-bunny-shell-v45";
const OFFLINE_URL = new URL("./index.html", self.registration.scope).href;
const APP_SHELL = [
 "./js/photo-editor.js", "./js/bubble-shape.js", "./js/schedule-engine.js", "./css/chat-refresh.css",
 "./js/world-context.js",
 './js/chat-skins.js', './css/chat-skins.css',
 './js/device-shell.js', './css/device-shell.css',
 './js/apps/desktop-drag.js', './js/appearance-controls.js', './js/x-app.js', './js/x-model.js', './css/desktop-polish.css', './css/x-app.css',
  './css/apps/widget-collection.css', './js/apps/widget-collection.js',
  './css/apps/widget-surfaces.css', './js/apps/widget-surfaces.js',
  "./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./apple-touch-icon.png",
  "./css/tokens.css", "./css/enhancements.css", "./css/splash.css", "./css/shell.css", "./css/components.css", "./css/apps/desktop.css", "./css/apps/chat.css", "./css/apps/settings.css", "./css/apps/social.css", "./css/responsive.css", "./css/ios-refinement.css", "./css/chat-v3.css", "./css/call-v3.css", "./css/contacts-v2.css",
  "./js/app.js", "./js/chat-v3.js", "./js/chat-protocol.js", "./js/time-context.js", "./js/favorites.js", "./js/proactive-messages.js", "./js/media-store.js", "./js/account-system.js", "./js/image-client.js", "./js/moments-v2.js", "./js/relationship-notebook.js", "./js/friend-request-protocol.js", "./js/tts-providers.js", "./js/wallet-v2.js", "./js/voice-client.js", "./js/call-prompts.js", "./js/call-v3.js", "./js/memory-engine.js", "./js/memory-debug.js", "./js/anonymous-box.js", "./js/ios-refinement.js", "./js/splash.js", "./js/pwa.js", "./js/webmcp.js", "./js/core/store.js", "./js/core/router.js", "./js/core/ui.js",
  "./js/apps/desktop.js", "./js/apps/desktop-v2.js", "./js/apps/chat-v2.js", "./js/apps/friend-requests.js", "./js/apps/chat-settings-v2.js", "./js/apps/phone-settings-v2.js", "./js/apps/data-settings.js", "./js/apps/prompt-library.js", "./js/apps/chat.js", "./js/apps/contacts.js", "./js/apps/phone-settings.js", "./js/apps/chat-settings.js", "./js/apps/api-settings.js", "./js/apps/placeholders.js", "./js/apps/companions.js",
  "./js/integrations/ai-client.js", "./js/integrations/mcp-client.js", "./js/integrations/reality-bridge.js"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(OFFLINE_URL,copy));return response; }).catch(()=>caches.match(OFFLINE_URL)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}return response; })));
});
