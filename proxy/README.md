# Aperture proxy (Scramjet + Wisp)

`proxy/`  - the proxy page. Built from the open-source Scramjet 1.1.0, bare-mux 2.1.9 and
            libcurl-transport 1.5.2 files (no hosted Scramjet instance is used).
`wisp-server/` - tiny Wisp server for your own free host (public Wisp servers come and go).

## Setup
1. Copy the `proxy/` folder into the root of the Aperture GitHub repo and push.
2. Repo Settings > Pages > deploy from branch `main` / root. Proxy page = https://<user>.github.io/Aperture/proxy/
   (jsDelivr cannot host it: it needs real text/html and a service worker scope.)
3. In the launcher address box run:  proxy:https://<user>.github.io/Aperture/proxy/
4. Wisp: the page tries the public servers listed in proxy/index.html (WISP_SERVERS). If none work, deploy
   `wisp-server/` and run:  wisp:wss://<your-host>/
5. Open the LAUNCHER from https or http://localhost, not from a file (browsers block the proxy worker there).
