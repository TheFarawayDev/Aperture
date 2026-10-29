/* Scramjet v2 (alpha) service worker. Scope = this folder. */
importScripts("./controller/controller.sw.js");

addEventListener("fetch", (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  }
});
