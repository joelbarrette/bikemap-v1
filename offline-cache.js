/*
Copyright 2015, 2019, 2020 Google LLC. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
console.log("hello");
// Incrementing OFFLINE_VERSION will kick off the install event and force
// previously cached resources to be updated from the network.
const OFFLINE_VERSION = 16;
const CACHE_NAME = "offline";
// Customize this with a different URL if needed.
const OFFLINE_URL = "https://tripreport.tk";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Setting {cache: 'reload'} in the new request will ensure that the
      // response isn't fulfilled from the HTTP cache; i.e., it will be from
      // the network.
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
    })()
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});



self.addEventListener("fetch", (event) => {
  // We only want to call event.respondWith() if this is a navigation request
  // for an HTML page.
 
  if (event.request.url == "https://tripreport.tk" || event.request.url == "https://tripreport.tk/*" ) {
  console.log("Checking Cache for: " + event.request.url);
    event.respondWith(
      (async () => {
          console.log("Fetching Online Copy");

          try{// Always try the network first.
          const networkResponse = await fetch(event.request);
          console.log("Received Status Code: " + networkResponse.status);
          if (networkResponse.status == 200) {
            console.log("Working Online");
            const cache = await caches.open(CACHE_NAME);
            await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
            return networkResponse;
          }else{
            console.log("Fetch failed; returning offline page instead.");
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(OFFLINE_URL);
            const responseText = await cachedResponse.text();
            console.log(responseText);
            const newText = responseText.replace(/<title>JB <\/title>/gi, '<title>OFFLINE </title>');
            return new Response(newText, cachedResponse);
          }
        
        } catch{ 
            console.log("Fetch failed; returning offline page instead.");

            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(OFFLINE_URL);
            const responseText = await cachedResponse.text();
            console.log(responseText);
            const newText = responseText.replace(/<title>JB <\/title>/gi, '<title>OFFLINE </title>');
            return new Response(newText, cachedResponse);
          };
         
      })()
    );
 } else {
    console.log("Bypassing Cache for: " + event.request.url);

 }
  //}

  // If our if() condition is false, then this fetch handler won't intercept the
  // request. If there are any other fetch handlers registered, they will get a
  // chance to call event.respondWith(). If no fetch handlers call
  // event.respondWith(), the request will be handled by the browser as if there
  // were no service worker involvement.

});
