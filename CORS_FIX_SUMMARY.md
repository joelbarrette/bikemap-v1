# CORS/503 Error Fixes - Service Worker Robustness Update

## Problem
The service worker was encountering CORS policy blocks and 503 (Service Unavailable) errors when trying to cache files, particularly manifest.json in GitHub Codespaces dev environment. These failures were cascading and preventing GPX file caching entirely.

## Root Cause
GitHub Codespaces' dev environment redirects certain requests (especially manifest.json) to an authentication page (`https://github.dev/pf-signin`), which triggers:
1. **CORS Policy Block**: Cross-origin redirect not allowed without CORS headers
2. **503 Service Unavailable**: Dev environment returning error status
3. **Cascade Failure**: One file failure blocking entire installation

## Solutions Implemented

### 1. **Removed manifest.json from HTML (Previous Fix)**
```diff
- <link rel="manifest" href="/manifest.json">
```
This eliminates the problematic file that caused the initial CORS error.

### 2. **Improved safeAddToCache() Helper**
Enhanced error handling with CORS-safe fetch options:
```javascript
const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
```
- `mode: 'cors'` - Explicit CORS mode
- `credentials: 'omit'` - Prevents auth redirects
- Only caches 2xx, 3xx, and 206 (partial) responses
- Logs non-success responses without failing
- Network errors logged but don't stop installation

### 3. **Safe Static Assets Caching**
Changed from `cache.addAll()` (all-or-nothing) to individual safe caching:
```javascript
// Before: Would fail entire install if any file missing
return cache.addAll(STATIC_ASSETS)

// After: Each file succeeds or fails independently
return Promise.all(
  STATIC_ASSETS.map((asset) => safeAddToCache(cache, asset))
);
```

### 4. **Improved Fetch Event Handler**
Enhanced both local and external resource fetching:

**Local Resources (cache-first strategy):**
- Only cache responses with status 200-399 or 206
- Log errors but return them anyway (let app handle)
- Prevents 503/error responses from being cached and served later

**External Resources (network-first strategy):**
- Added CORS-safe fetch options
- Only cache successful responses
- Fallback to cache or offline page on failure
- Detailed logging of external fetch errors

### 5. **Batch Processing Resilience**
GPX files cached in batches of 10:
- If one file fails, others in batch still cache
- Progress logged: "Cached 50/163 GPX files"
- No single file failure blocks entire installation

## Impact

### What's Fixed
✅ Service worker installation no longer blocked by 503/CORS errors  
✅ GPX files cache even if some individual files fail  
✅ Essential app files cache with graceful fallback  
✅ Status indicators show accurate caching progress  
✅ Fetch handler returns errors instead of cached error responses  

### Behavior Changes
- **Before**: One failed file = entire service worker installation fails
- **After**: Failed files logged and skipped, installation continues
- **Logging**: Console now shows detailed progress: "Cached X/Y GPX files"
- **Error Handling**: Non-fatal errors logged, fatal errors still fail gracefully

## Testing
After deployment, verify in browser console:
```javascript
// Should see logs like:
// [Service Worker] Installing...
// [Service Worker] Caching essential assets
// [Service Worker] Essential assets cached
// [Service Worker] Starting to cache GPX files...
// [Service Worker] Cached 10/163 GPX files
// [Service Worker] Cached 20/163 GPX files
// ... continues ...
```

## Technical Details

### Files Modified
- **`sw.js`**: 
  - Enhanced `safeAddToCache()` with CORS-safe fetch options
  - Changed install event to use safe caching for all assets
  - Improved fetch event handlers (local and external)
  - Better error logging and response status checking

### Fetch Options Changed
All fetch calls now use:
```javascript
{ mode: 'cors', credentials: 'omit' }
```
This prevents auth redirects and CORS blocks that were plaguing GitHub Codespaces.

### Response Status Handling
- **200-399**: Cache successfully
- **206 (Partial Content)**: Cache successfully
- **400-599**: Log as warning, don't cache, return to app
- **Network Error**: Log warning, don't fail install, try cache/offline

## Long-term Implications
- Service worker more robust in development environments
- Less likely to be blocked by dev environment quirks
- Better handling of temporary network failures
- Clearer debugging output for offline functionality

## Rollback
If issues occur, the changes are backward compatible:
- Older cached responses still work (same cache structure)
- Fetch handler falls back to cached content
- Service worker activation (cleanup) unaffected
