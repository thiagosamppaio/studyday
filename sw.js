// Service worker do StudyDay: funciona offline e busca a versão nova quando há internet.
const V = 'studyday-v2';
const ARQUIVOS = ['./', './index.html', './sd.css', './sd-main.js', './sd-util.js', './sd-dados.js', './sd-logica.js', './sd-ui.js',
  './tela-hoje.js', './tela-plano.js', './tela-questoes.js', './tela-cards.js', './tela-mais.js',
  './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(V);
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(req, { signal: ctrl.signal, cache: 'no-cache' }); clearTimeout(t);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    }
  })());
});
