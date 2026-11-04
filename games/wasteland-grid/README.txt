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
- Works on any screen size. The interface zooms itself to suit the window (Settings > GRAPHICS > UI SCALE:
  AUTO or 75% - 200%), so it stays readable on phones, tablets, laptops and 4K monitors.
- Graphics (Settings, key O): quality presets LOW / MEDIUM / HIGH, UI scale, pixel scaling (AUTO / CRISP whole
  pixels / FILL the window), effect density, frame limit (30 / 60 / none), CRT scanlines, night darkness,
  animated menu and fades, FPS counter, fullscreen. Choices are remembered per browser.
- Touch: one finger = click / paint / drag. Two fingers = pan in a county, pinch to zoom on the world map.

Map keys: WASD pan, +/- zoom, TAB next target, N next trouble spot, ENTER open, / find county,
U union, V map view, F wide map, O settings (graphics and export/import saves), L radio log, ? help.
