// Service worker for Let's Get Lunch.
//
// Caching policy, by design:
//  - Restaurant/specials data (Supabase REST calls, /api/* routes, and the
//    RSC/data fetches Next issues on client-side navigation) is NEVER
//    intercepted here - those requests fall through to the network exactly
//    as if this service worker didn't exist. That's what keeps listings and
//    specials from ever going stale.
//  - Hashed build output (/_next/static/*) is cache-first: the filename
//    changes whenever the content does, so a cache hit is always correct.
//  - Other static assets (icons, splash screens, manifest, fonts, images,
//    /_next/image) use stale-while-revalidate: fast repeat paint, refreshed
//    in the background.
//  - Full-page navigations are network-first, with the last successful
//    response for that URL (and finally /offline.html) as the fallback when
//    the network fails outright. This is what lets the app still open on a
//    dead connection without ever preferring a cached page over a live one.
//
// Bump these versions when the caching strategy itself changes; stale
// versions are swept on activate.
const STATIC_CACHE = 'lgl-static-v1';
const ASSET_CACHE = 'lgl-assets-v1';
const PAGES_CACHE = 'lgl-pages-v1';
const CURRENT_CACHES = [STATIC_CACHE, ASSET_CACHE, PAGES_CACHE];

const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Hosts/paths that must always hit the network untouched: live restaurant
// data (Supabase), our own API routes, and third-party scripts that manage
// their own caching (Maps, Vercel Analytics).
function shouldBypass(url) {
  if (url.origin === self.location.origin) {
    return url.pathname.startsWith('/api/');
  }
  return (
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('maps.googleapis.com') ||
    url.hostname.endsWith('maps.gstatic.com') ||
    url.hostname.endsWith('vercel-insights.com') ||
    url.hostname.endsWith('vercel-scripts.com')
  );
}

function isImmutableBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkFetch) || Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (shouldBypass(url)) return; // let the browser handle it, no caching at all

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isImmutableBuildAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (['style', 'script', 'font', 'image', 'manifest'].includes(request.destination)) {
    if (url.origin === self.location.origin) {
      event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    }
    return;
  }

  // Everything else (RSC data fetches, prefetches, sitemap, etc.) - untouched.
});
