const CACHE_NAME = 'parking-pilar-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/icons/moto.svg',
  '/icons/auto.svg',
  '/icons/carga.svg'
];

// Instalación: Guarda archivos en el dispositivo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Estrategia: Primero Caché, si no hay, busca en Red (pero siempre offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});