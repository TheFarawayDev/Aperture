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
  The map now also holds South America (opens after the whole United States, through Panama) and Europe (opens once a whole
  continent - North or South America - is restored, reached through Greenland and Iceland). Older saves must be restarted.
  The map is built by usmap.js; headless checks: load it in node with the vm module and run buildUS().
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

In a county: WASD / arrows pan (SHIFT faster), mouse wheel or + / - zoom the play area (\ resets, or use the buttons on the
view), right-drag or middle-drag pans, a plain right-click drops the current tool, ? shows every shortcut.
Touch: pinch to zoom, two fingers to pan.

Variety: every county has a trait (sunbaked, deep freeze, river valley, old foundry...), some start in a different
state (derelict grid, black start, supply cache), each offers three bonus goals, random events include traders,
caravans, scouts and floods (many ask you to decide), and the world map hands out rolling CONTRACTS.
Tutorial: a guided, hands-on tutorial with glowing highlights runs in your first county and on the world map.
Skip it any time; replay it from Settings. Shortcuts: . and , jump between alerts in a county.
Continents: complete a whole continent (all of North America, or all of South America) to open Europe.

Long game: restoring places earns SKILL POINTS (press K): a 20-node tree in five branches. Your landing county becomes
HEADQUARTERS once restored (press Q): choose a DOCTRINE (Forge, Bulwark, Frontier, Scholar), then ten upgradable
departments (power, water, data, maintenance, fabricator, command, storehouse, aegis, signal relay, survey office) paid for
with research and limited by capacity, so you must choose. Six of them unlock ORDERS (supply drop, grid restart, overcharge,
field survey, lockdown, rebuild crew) you can call down inside a county; they cool down in real time. Counties connected to HQ by lit
ground get its full support; others get half, and an outage at HQ switches it off. Glowing supply caches in every county
hold scrap, parts, research, skill chips and BLUEPRINTS, which the top HQ levels (4 and 5) require.

More in this version:
 * Research: 25 new passive technologies (power, water, scrap, parts, storms, raids, caches...) in the POWER and new BOOST branches.
 * Bonus goals: 37 different county goals (3 per county), plus 51 campaign OBJECTIVES on the map that pay skill points and research.
 * Dimmers: raids come in five kinds (saboteurs, scavengers, jammers, arsonists, warbands) and walk in from where they hide.
   Some counties hide a DIMMER CAMP: click it to send a strike team. Held counties have WARLORDS; take their last county to break them.
 * Camera: drag with the left button on the inspect tool, hold SPACE and drag with any tool, or right-drag. Release to glide.
