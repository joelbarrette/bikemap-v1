/**
 * Service Worker for Bikemap Offline Support
 * Simple cache-everything approach: cache files AND tiles as they're requested
 * The entire site gets cached automatically with no hardcoded file lists
 */

const CACHE_VERSION = 'bikemap-v1-2025-12-30-v12';
const TILE_CACHE = 'bikemap-tiles-v1';
const OFFLINE_PAGE = '/404.html';

// Files to pre-cache on install - ALL essential resources for offline to work
// These must be cached during install because the SW doesn't control the page on first load
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/folder.json',
  '/style.css',
  '/theme.js',
  '/leaflet-gpx.js',
  '/poi.json',
  '/rec.geojson',
  // CSS files
  '/css/leaflet.css',
  '/css/font-awesome.css',
  '/css/leaflet-sidebar.css',
  '/css/main.css',
  '/css/L.Control.Locate.css',
  '/css/L.switchBasemap.css',
  // JS files (local)
  '/src/leaflet-elevation.js',
  '/src/leaflet.legend.js',
  '/src/leaflet-sidebar.js',
  '/src/leaflet.edgebuffer.js',
  '/src/L.switchBasemap.js',
  '/src/L.Control.Locate.js',
  '/src/leaflet.permalink.js',
  '/src/leaflet-offline-bundle.js',
  '/src/SmoothWheelZoom.js',
  '/src/leaflet.legend.css',
  // Images
  '/pin-icon-wpt.png',
  '/pin-shadow.png',
  '/resources/camp.png',
  '/resources/rec-site.png',
  '/resources/osm.png',
  '/resources/otm.png',
  '/resources/mapbox-dark.png',
  '/resources/mapbox-light.png',
  '/resources/mapbox-satellite-streets.png',
  // Fonts (Font Awesome)
  '/fonts/fontawesome-webfont.woff2',
  '/fonts/fontawesome-webfont.woff',
  '/fonts/fontawesome-webfont.ttf',
];

// Tile server domains we want to cache (configurable)
const TILE_SERVERS = [
  'tile.openstreetmap.org',
  'api.mapbox.com',
  'tiles.stadiamaps.com',
  'a.tile.stamen.com',
  'b.tile.stamen.com',
  'c.tile.stamen.com',
];

// Optional: Limit tile caching to specific zoom levels to save space
// Set to null to cache all zoom levels
const MAX_ZOOM_TO_CACHE = 15;

// Helper function to safely cache a file with error tolerance
async function safeAddToCache(cache, url) {
  try {
    // Fetch without special CORS mode for local files
    const response = await fetch(url);
    
    // Only cache 2xx and 206 (partial content) responses
    if ((response.status >= 200 && response.status < 300) || response.status === 206) {
      await cache.put(url, response);
      return true;
    }
    
    // Log non-success responses but don't fail
    if (response.status >= 400) {
      console.warn(`[Service Worker] HTTP ${response.status} for ${url.replace(/^.*\//, '')}`);
    }
    return false;
  } catch (err) {
    // Log fetch errors but don't fail - network might be down
    console.warn(`[Service Worker] Network error caching ${url.replace(/^.*\//, '')}: ${err.message}`);
    return false;
  }
}

// Helper function to detect if a URL is a tile request
function isTileRequest(url) {
  // Match tile URL patterns like /z/x/y.png or /tiles/z/x/y.png
  return /\/(\d+)\/(\d+)\/(\d+)\.(png|jpg|webp)($|\?)/i.test(url.pathname);
}

// Helper function to extract zoom level from tile URL
function getZoomFromTile(url) {
  const match = url.pathname.match(/\/(\d+)\/(\d+)\/(\d+)\.(png|jpg|webp)/i);
  return match ? parseInt(match[1]) : null;
}

// Helper function to check if we should cache this tile
function shouldCacheTile(url) {
  // Check zoom level constraint
  if (MAX_ZOOM_TO_CACHE !== null) {
    const zoom = getZoomFromTile(url);
    if (zoom !== null && zoom > MAX_ZOOM_TO_CACHE) {
      return false;
    }
  }
  return true;
}

// Install event - cache essential assets AND GPX files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[Service Worker] Caching essential app files');
        // Cache essential app files first
        return Promise.all(
          STATIC_ASSETS.map((asset) => safeAddToCache(cache, asset))
        )
          .then(() => {
            console.log('[Service Worker] Essential files cached. Now caching GPX routes...');
            // Fetch folder.json to get all GPX file paths
            return fetch('/folder.json');
          })
          .then((response) => {
            if (!response.ok) {
              console.warn('[Service Worker] Could not fetch folder.json');
              return [];
            }
            return response.json();
          })
          .then((gpxFiles) => {
            console.log(`[Service Worker] Found ${gpxFiles.length} GPX files to cache`);
            
            // Filter to cache only road (1-road) and connector (2-connector) routes initially
            // to keep install time reasonable. Gravel and recon can be cached on-demand.
            const priorityTypes = ['0-route', '1-road', '2-connector'];
            const priorityGpx = gpxFiles.filter(file => 
              priorityTypes.includes(file.type)
            );
            
            console.log(`[Service Worker] Caching ${priorityGpx.length} priority routes (road & connector)`);
            
            // Cache priority GPX files
            // Use encodeURI to match how the app loads them (important for files with spaces)
            return Promise.allSettled(
              priorityGpx.map((file) => safeAddToCache(cache, '/' + encodeURI(file.path)))
            ).then((results) => {
              const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
              const failed = results.filter(r => r.status === 'rejected' || r.value === false).length;
              console.log(`[Service Worker] GPX caching complete: ${successful} cached, ${failed} failed`);
            });
          })
          .then(() => {
            console.log('[Service Worker] Installation complete. Site is ready for offline use.');
          });
      })
      .catch((err) => {
        console.error('[Service Worker] Installation failed:', err);
        throw err;
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Keep current version and tile cache, delete everything else
          if (cacheName !== CACHE_VERSION && cacheName !== TILE_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Claim all clients immediately
  );
});

// Fetch event - serve from cache, fallback to network
// Everything gets cached as it's used - simple and effective
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Check if this is a tile request
  const isTile = isTileRequest(url);
  
  // Skip external origins EXCEPT tile servers
  if (url.origin !== self.location.origin && !TILE_SERVERS.some(server => url.hostname.includes(server))) {
    // For external resources (non-tiles), try network first, fall back to cache
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          // Cache successful responses
          if (response.status >= 200 && response.status < 400) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          // Network failed, try cache
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return createOfflineResponse();
        })
    );
    return;
  }

  // For tile requests, use a separate tile cache and different strategy
  if (isTile && url.origin !== self.location.origin) {
    if (!shouldCacheTile(url)) {
      // Don't cache this tile, just fetch and return
      event.respondWith(fetch(request));
      return;
    }

    // Cache tiles with network-first strategy (prefer fresh, cache fallback)
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.status >= 200 && response.status < 400) {
            // Cache the tile in the tile cache
            const cache = await caches.open(TILE_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          // Network failed, try tile cache
          const cached = await caches.match(request, { cacheName: TILE_CACHE });
          if (cached) {
            return cached;
          }
          return createOfflineResponse();
        })
    );
    return;
  }

  // For local resources: Use network-first for source files (HTML/CSS/JS), cache-first for data files (GPX, JSON, etc)
  event.respondWith(
    (async () => {
      // Determine if this is a source file that should always be fresh
      const isSourceFile = request.url.endsWith('.html') || 
                          request.url.endsWith('.css') || 
                          request.url.endsWith('.js') ||
                          request.url === url.origin + '/' ||
                          request.url === url.origin;
      
      if (isSourceFile) {
        // Network-first strategy for source files when online
        try {
          const networkResponse = await fetch(request);
          
          // Only cache successful responses (2xx, 3xx)
          if (networkResponse.status >= 200 && networkResponse.status < 400) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(request, responseToCache);
          }
          return networkResponse;
        } catch (error) {
          // Network failed, fall back to cache
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) {
            console.log(`[SW] Serving cached source file (offline): ${request.url}`);
            return cached;
          }
          
          // For HTML requests, serve cached index.html (app shell)
          if (request.headers.get('accept')?.includes('text/html')) {
            const indexCached = await caches.match('/index.html');
            if (indexCached) {
              return indexCached;
            }
          }
          
          return createOfflineResponse();
        }
      } else {
        // Cache-first strategy for data files (GPX, JSON, images, fonts)
        let response = await caches.match(request, { ignoreSearch: true });
        
        if (response) {
          // Found in cache, return it
          if (request.url.endsWith('.gpx')) {
            console.log(`[SW] Serving cached GPX: ${request.url}`);
          }
          return response;
        }

        // Not in cache, fetch from network and cache it
        try {
          const networkResponse = await fetch(request);
          
          // Only cache successful responses (2xx, 3xx)
          if (networkResponse.status >= 200 && networkResponse.status < 400) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(request, responseToCache);
            if (request.url.endsWith('.gpx')) {
              console.log(`[SW] Cached from network: ${request.url}`);
            }
          }
          return networkResponse;
        } catch (error) {
          // Network failed and not in cache
          if (request.url.endsWith('.gpx')) {
            console.error(`[SW] GPX not in cache and offline: ${request.url}`);
          } else {
            console.warn(`[SW] Offline and no cache for: ${request.url}`);
          }
          
          // For HTML requests, serve cached index.html (app shell)
          if (request.headers.get('accept')?.includes('text/html')) {
            const cached = await caches.match('/index.html');
            if (cached) {
              return cached;
            }
          }
          
          // For other resources, return generic offline response
          return createOfflineResponse();
        }
      }
    })()
  );
});

// Create a generic offline response
function createOfflineResponse() {
  return new Response(
    'Offline - this resource is not available',
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    }
  );
}

// Delta sync: Compare cached GPX files with folder.json and add/remove as needed
async function syncGPXFiles(types = null) {
  console.log('[Service Worker] Starting GPX delta sync...');
  
  try {
    // Fetch latest folder.json (bypass cache to get fresh version)
    const response = await fetch('/folder.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Could not fetch folder.json');
    }
    
    // Clone response before consuming body (for caching later)
    const responseToCache = response.clone();
    const gpxFiles = await response.json();
    
    // Filter by types if specified, otherwise use priority types
    const targetTypes = types || ['0-route', '1-road', '2-connector'];
    const targetFiles = gpxFiles.filter(file => targetTypes.includes(file.type));
    
    // Build set of expected GPX URLs (with encoding to match how they're loaded)
    const expectedUrls = new Set(
      targetFiles.map(file => new URL('/' + encodeURI(file.path), self.location.origin).href)
    );
    
    const cache = await caches.open(CACHE_VERSION);
    const cachedRequests = await cache.keys();
    
    // Find cached GPX files
    const cachedGpxUrls = new Set(
      cachedRequests
        .filter(req => req.url.endsWith('.gpx'))
        .map(req => req.url)
    );
    
    // Calculate delta
    const toAdd = [...expectedUrls].filter(url => !cachedGpxUrls.has(url));
    const toRemove = [...cachedGpxUrls].filter(url => !expectedUrls.has(url));
    
    console.log(`[Service Worker] Delta sync: ${toAdd.length} to add, ${toRemove.length} to remove`);
    
    // Remove old files
    for (const url of toRemove) {
      await cache.delete(url);
      console.log(`[Service Worker] Removed: ${url.split('/').pop()}`);
    }
    
    // Add new files
    let added = 0;
    let failed = 0;
    for (const url of toAdd) {
      const success = await safeAddToCache(cache, url);
      if (success) {
        added++;
        console.log(`[Service Worker] Added: ${url.split('/').pop()}`);
      } else {
        failed++;
      }
    }
    
    // Also update folder.json in cache
    await cache.put('/folder.json', responseToCache);
    
    const result = {
      added,
      removed: toRemove.length,
      failed,
      total: cachedGpxUrls.size + added - toRemove.length
    };
    
    console.log(`[Service Worker] Delta sync complete:`, result);
    return result;
    
  } catch (err) {
    console.error('[Service Worker] Delta sync failed:', err);
    throw err;
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle sync request from client
  if (event.data && event.data.type === 'SYNC_GPX') {
    const types = event.data.types || null;
    syncGPXFiles(types)
      .then((result) => {
        // Send result back to client
        event.ports[0].postMessage({ success: true, ...result });
      })
      .catch((err) => {
        event.ports[0].postMessage({ success: false, error: err.message });
      });
  }
  
  // Handle request to get sync status (what would be added/removed)
  if (event.data && event.data.type === 'GET_SYNC_STATUS') {
    getSyncStatus(event.data.types)
      .then((status) => {
        event.ports[0].postMessage({ success: true, ...status });
      })
      .catch((err) => {
        event.ports[0].postMessage({ success: false, error: err.message });
      });
  }
});

// Get sync status without actually syncing
async function getSyncStatus(types = null) {
  const response = await fetch('/folder.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not fetch folder.json');
  const gpxFiles = await response.json();
  
  const targetTypes = types || ['0-route', '1-road', '2-connector'];
  const targetFiles = gpxFiles.filter(file => targetTypes.includes(file.type));
  
  const expectedUrls = new Set(
    targetFiles.map(file => new URL('/' + encodeURI(file.path), self.location.origin).href)
  );
  
  const cache = await caches.open(CACHE_VERSION);
  const cachedRequests = await cache.keys();
  
  const cachedGpxUrls = new Set(
    cachedRequests
      .filter(req => req.url.endsWith('.gpx'))
      .map(req => req.url)
  );
  
  const toAdd = [...expectedUrls].filter(url => !cachedGpxUrls.has(url));
  const toRemove = [...cachedGpxUrls].filter(url => !expectedUrls.has(url));
  
  return {
    toAdd: toAdd.length,
    toRemove: toRemove.length,
    currentCached: cachedGpxUrls.size,
    expectedTotal: expectedUrls.size,
    newFiles: toAdd.map(url => decodeURIComponent(url.split('/').pop())),
    removedFiles: toRemove.map(url => decodeURIComponent(url.split('/').pop()))
  };
}
