WASTELAND GRID - static HTML5 game (v5)
=======================================
No build step, no server code, no dependencies.

Play locally : double-click index.html
Publish      : upload ALL files in this folder to any static host
               (itch.io [zip as HTML5 game, index.html at root], GitHub Pages,
               Netlify, Cloudflare Pages, any web server).
               index.html must stay at the root next to the .js files.

Notes
- Progress is saved in the browser (localStorage), per site address.
  v5 changed the map (Greenland, Hawaii, more counties), so campaigns from
  earlier versions cannot be continued - start a new game.
- Fonts (Press Start 2P, VT323) load from Google Fonts; offline it falls back
  to a system monospace font.
- Recommended viewport: desktop browser, 1280x720 or larger.

Map keys: WASD pan, +/- zoom, TAB next target, N next trouble spot, ENTER open, / find county,
U union screen, V map view, F wide map, O settings, L radio log.
U union, V map view, F wide map, O settings (export\/import saves there), L radio log, ? help.
