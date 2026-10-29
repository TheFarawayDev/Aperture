/* Scramjet service worker (scope = this folder). Source: @mercuryworkshop/scramjet 1.1.0 */
importScripts("./scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function handleRequest(event) {
  await scramjet.loadConfig();
  if (scramjet.route(event)) return scramjet.fetch(event);
  return fetch(event.request);
}
self.addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
