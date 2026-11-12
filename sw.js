// Raíces: funciona sin internet.
// Estrategia: primero la red (siempre la versión más nueva); si no hay conexión, la copia guardada.
// Al publicar una versión nueva, cambiá VERSION.
const VERSION = "raices-web-6";
const SHELL = ["./", "index.html", "manifest.webmanifest", "bible/index.js", "bible/extra.js", "bible/ch/index.js", "bible/vv/index.js", "bible/lex.js", "bible/morph.js", "icons/icon-192.png", "icons/apple-touch-icon.png", "fonts/gentium-book-plus-greek-400-normal.woff2", "fonts/gentium-book-plus-greek-700-normal.woff2", "fonts/gentium-book-plus-greek-ext-400-normal.woff2", "fonts/gentium-book-plus-greek-ext-700-normal.woff2", "fonts/gentium-book-plus-latin-400-normal.woff2", "fonts/gentium-book-plus-latin-700-normal.woff2", "fonts/gentium-book-plus-latin-ext-400-normal.woff2", "fonts/gentium-book-plus-latin-ext-700-normal.woff2", "fonts/noto-sans-latin-400-normal.woff2", "fonts/noto-sans-latin-600-normal.woff2", "fonts/noto-sans-latin-700-normal.woff2", "fonts/noto-sans-latin-ext-400-normal.woff2", "fonts/noto-sans-latin-ext-600-normal.woff2", "fonts/noto-sans-latin-ext-700-normal.woff2", "fonts/noto-sans-phoenician-phoenician-400-normal.woff2", "fonts/noto-serif-hebrew-hebrew-400-normal.woff2", "fonts/noto-serif-hebrew-hebrew-700-normal.woff2"];
const BOOKS = ["bible/GEN.js", "bible/EXO.js", "bible/LEV.js", "bible/NUM.js", "bible/DEU.js", "bible/JOS.js", "bible/JDG.js", "bible/RUT.js", "bible/1SA.js", "bible/2SA.js", "bible/1KI.js", "bible/2KI.js", "bible/1CH.js", "bible/2CH.js", "bible/EZR.js", "bible/NEH.js", "bible/EST.js", "bible/JOB.js", "bible/PSA.js", "bible/PRO.js", "bible/ECC.js", "bible/SNG.js", "bible/ISA.js", "bible/JER.js", "bible/LAM.js", "bible/EZK.js", "bible/DAN.js", "bible/HOS.js", "bible/JOL.js", "bible/AMO.js", "bible/OBA.js", "bible/JON.js", "bible/MIC.js", "bible/NAM.js", "bible/HAB.js", "bible/ZEP.js", "bible/HAG.js", "bible/ZEC.js", "bible/MAL.js", "bible/MAT.js", "bible/MRK.js", "bible/LUK.js", "bible/JHN.js", "bible/ACT.js", "bible/ROM.js", "bible/1CO.js", "bible/2CO.js", "bible/GAL.js", "bible/EPH.js", "bible/PHP.js", "bible/COL.js", "bible/1TH.js", "bible/2TH.js", "bible/1TI.js", "bible/2TI.js", "bible/TIT.js", "bible/PHM.js", "bible/HEB.js", "bible/JAS.js", "bible/1PE.js", "bible/2PE.js", "bible/1JN.js", "bible/2JN.js", "bible/3JN.js", "bible/JUD.js", "bible/REV.js"];

self.addEventListener("install", e => {
  // cache: "reload" evita guardar una copia vieja del caché HTTP del navegador
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(SHELL.map(u => new Request(u, {cache: "reload"}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function fromNetwork(req, ms) {
  return new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("timeout")), ms);
    fetch(req, {cache: "no-cache"}).then(r => { clearTimeout(t); ok(r); }, err => { clearTimeout(t); fail(err); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const key = req.mode === "navigate" ? new URL("index.html", self.registration.scope).href : req;
    try {
      const res = await fromNetwork(req, req.mode === "navigate" ? 4000 : 8000);
      if (res.ok) cache.put(key, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(key, {ignoreSearch: true});
      if (hit) return hit;
      throw err;
    }
  })());
});

// La app pide guardar la Biblia (libros de su tradición + Septuaginta + versiones elegidas), avisando el progreso.
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type !== "save-all") return;
  const list = [...(d.books || BOOKS), ...(d.extra || [])];
  const client = e.source;
  e.waitUntil(caches.open(VERSION).then(async c => {
    let done = 0;
    for (const u of list) {
      if (!(await c.match(u))) {
        try { const r = await fetch(u, {cache: "no-cache"}); if (r.ok) await c.put(u, r); }
        catch (err) { client.postMessage({type: "save-error"}); return; }
      }
      done++;
      if (done % 5 === 0 || done === list.length) client.postMessage({type: "save-progress", done, total: list.length});
    }
  }));
});
