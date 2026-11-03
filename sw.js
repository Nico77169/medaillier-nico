/* Service worker : appli utilisable hors ligne + mises à jour automatiques */
const CACHE = "medaillier-v6";
const SHELL = ["./", "index.html", "app.js", "config.js", "catalogue.json", "manifest.webmanifest",
  "vendor/supabase.js", "vendor/591.supabase.js", "icons/icon-192.png", "icons/icon-512.png",
  // photos Disney et Beauval : téléchargées dès l'installation pour être visibles hors ligne
  "img/b232877_b.webp",
  "img/b232877_f.webp",
  "img/b232878_b.webp",
  "img/b232878_f.webp",
  "img/b232879_b.webp",
  "img/b232879_f.webp",
  "img/b232880_b.webp",
  "img/b232880_f.webp",
  "img/b232881_b.webp",
  "img/b232881_f.webp",
  "img/b232882_b.webp",
  "img/b232882_f.webp",
  "img/b232884_b.webp",
  "img/b232884_f.webp",
  "img/b338725_b.webp",
  "img/b338725_f.webp",
  "img/b338730_b.webp",
  "img/b338730_f.webp",
  "img/b427140_b.webp",
  "img/b427140_f.webp",
  "img/b538413_b.webp",
  "img/b538413_f.webp",
  "img/b599024_b.webp",
  "img/b599024_f.webp",
  "img/b604633_b.webp",
  "img/b604633_f.webp",
  "img/d0297_f.webp",
  "img/d0298_f.webp",
  "img/d0299_f.webp",
  "img/d0300_f.webp",
  "img/d0303_f.webp",
  "img/d0463_f.webp",
  "img/d0562_f.webp",
  "img/d0577_f.webp",
  "img/d0681_f.webp",
  "img/d0837_f.webp",
  "img/d1208_f.webp",
  "img/d1373_f.webp",
  "img/d2817_f.webp",
  "img/d2822_f.webp",
  "img/d3704_f.webp",
  "img/d3942_f.webp",
  "img/d3943_f.webp",
  "img/d3946_f.webp",
  "img/d3991_f.webp",
  "img/d4256_f.webp",
  "img/d4457_f.webp",
  "img/d4490_f.webp",
  "img/d4496_f.webp",
  "img/d4553_f.webp",
  "img/d4554_f.webp",
  "img/d4557_f.webp",
  "img/d4682_f.webp"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // Supabase, Numista, polices : réseau direct
  const fresh = req.mode === "navigate" || /\.(html|js|json|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (fresh) {
    // réseau d'abord (pour recevoir les mises à jour), copie locale si pas de réseau
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
  } else {
    // images et icônes : copie locale d'abord
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { const c = n.clone(); caches.open(CACHE).then(k => k.put(req, c)); return n; })));
  }
});
