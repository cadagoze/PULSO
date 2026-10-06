/* PULSO — service worker: la app abre y funciona sin conexión.
 *
 * - Al instalar guarda las pantallas principales y todo lo que referencian (JS, CSS, fuentes);
 *   después, en segundo plano, programas y fichas de ejercicio.
 * - Páginas: red primero (contenido fresco) y, sin conexión, la copia guardada.
 * - Archivos con hash (/_next/static), imágenes (también las optimizadas, /_next/image) e íconos: caché primero.
 * - Los datos del usuario viven en localStorage; el service worker nunca los toca.
 *
 * Sube VERSION si cambias este archivo de forma incompatible.
 */
const VERSION = "pulso-v4";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;

const ROUTES = [
  "/", "/entrenar", "/entrenar/sesion", "/entrenar/intervalos", "/ejercicios",
  "/progreso", "/perfil", "/ajustes", "/guia", "/comidas",
];
const STATIC_FILES = [
  "/offline.html", "/manifest.webmanifest", "/icon/192", "/icon/512", "/apple-icon",
];

const ASSET_PATTERN = /\/_next\/static\/[^"'\\)\s]+/g;

/**
 * Copia sin la marca de redirección: algunos servidores (p. ej. Cloudflare) redirigen
 * /offline.html → /offline, y el navegador no acepta una respuesta redirigida para navegar.
 */
async function storable(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers });
}

/** Rutas de archivos estáticos referenciadas en un HTML o CSS. */
function referencedAssets(text) {
  return [...new Set(text.match(ASSET_PATTERN) ?? [])].map((path) => path.replace(/&amp;/g, "&"));
}

async function precache() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const discovered = new Set();
  await Promise.all(ROUTES.map(async (route) => {
    try {
      const response = await fetch(route, { cache: "no-cache" });
      if (!response.ok) return;
      await pages.put(route, await storable(response.clone()));
      referencedAssets(await response.text()).forEach((path) => discovered.add(path));
    } catch {
      // Una ruta que falle no impide instalar el resto.
    }
  }));
  await Promise.all([...STATIC_FILES, ...discovered].map(async (path) => {
    try {
      if (await assets.match(path)) return;
      const response = await fetch(path);
      if (!response.ok) return;
      await assets.put(path, await storable(response.clone()));
      // Las hojas de estilo referencian fuentes: también se guardan.
      if (path.endsWith(".css")) {
        for (const font of referencedAssets(await response.text())) {
          if (!(await assets.match(font))) {
            const fontResponse = await fetch(font).catch(() => null);
            if (fontResponse?.ok) await assets.put(font, fontResponse);
          }
        }
      }
    } catch {
      // Se reintentará al usarlo con conexión.
    }
  }));
}

/** Segunda fase, sin bloquear la instalación: programas y fichas de ejercicio (lista en /precache.json). */
async function precacheDetailPages() {
  try {
    const { pages: list } = await (await fetch("/precache.json", { cache: "no-cache" })).json();
    const pages = await caches.open(PAGES);
    for (const route of list) {
      if (await pages.match(route)) continue;
      const response = await fetch(route).catch(() => null);
      if (response?.ok) await pages.put(route, await storable(response));
    }
  } catch {
    // Se guardarán al visitarlas con conexión.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !key.startsWith(`${VERSION}-`)).map((key) => caches.delete(key)));
    await self.clients.claim();
    void precacheDetailPages();
  })());
});

function isAsset(url) {
  return url.pathname.startsWith("/_next/static/")
    || url.pathname === "/_next/image"
    || url.pathname.startsWith("/images/")
    || url.pathname.startsWith("/wasm/")
    || url.pathname.startsWith("/icon")
    || url.pathname.startsWith("/apple-icon")
    || url.pathname === "/manifest.webmanifest";
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request, { ignoreSearch: request.url.includes("/icon") });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Páginas: red primero; sin conexión, la copia guardada o la página de respaldo. */
async function networkFirstPage(request, url) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      storable(response.clone()).then((copy) => cache.put(url.pathname, copy)).catch(() => {});
      // Guarda en segundo plano los archivos de páginas nuevas (p. ej. una ficha de ejercicio).
      response.clone().text().then(async (html) => {
        const assets = await caches.open(ASSETS);
        for (const path of referencedAssets(html)) {
          if (!(await assets.match(path))) fetch(path).then((res) => res.ok && assets.put(path, res)).catch(() => {});
        }
      }).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    return (await caches.match("/offline.html")) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Inicio de sesión (puente a Firebase): siempre a la red, nunca guardado.
  if (url.pathname.startsWith("/__/")) return;

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Navegación del cliente (React Server Components): si no hay red, falla para que el
  // enrutador cargue la página completa, que sí está guardada.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
  }
});

// ─── Avisos ──────────────────────────────────────────────────────────────
// El servidor envía { title, body, url, tag }; al tocar el aviso se abre (o enfoca) PULSO en esa pantalla.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(self.registration.showNotification(data.title || "PULSO", {
    body: data.body || "",
    icon: "/icon/192",
    tag: data.tag || "pulso",
    lang: "es",
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = windows.find((item) => new URL(item.url).origin === self.location.origin);
    if (client) {
      await client.focus();
      if ("navigate" in client) await client.navigate(url).catch(() => undefined);
      return;
    }
    await self.clients.openWindow(url);
  })());
});
