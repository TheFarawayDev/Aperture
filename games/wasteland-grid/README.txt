WASTELAND GRID - static HTML5 game (v6)
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

Latest version:
 * The storyline is gone (no cutscenes, radio chatter or chapters). The old radio log is now a plain EVENT LOG.
 * Performance: the world map no longer recomputes whole-map questions every frame (map frames are ~10x cheaper and the
   once-a-second world update went from ~100 ms to ~6 ms). New LITE mode and a MINIMAL (20 fps) preset strip glows, shadows,
   water shimmer, line pulses and night lighting. AUTOMATIC QUALITY watches real frame times and lowers the preset by itself
   (Settings > Graphics). Line layers are merged into one blit per frame.
 * CREDITS (¢): a second currency from counties, goals, caches, camps and selling surplus scrap (the warehouse caps scrap).
   Spend them at the QUARTERMASTER (map, key B / SUPPLY): supply kits for the next county, instant buys, permanent depot upgrades.
 * Resources: the STATUS tab has a FLOWS panel (per-second flows, time until fuel runs out, top earners and costs). Scrap has a
   warehouse cap; fuel tanks and warehouse can be upgraded.
 * Lines: AUTO ROUTE tool (key ;) lays the chosen line types along the cheapest path with a cost preview. New BRIDGE SPANS
   research lets lines (and routes) cross water.
 * Tutorial: new steps for auto route, flows and credits, a progress bar, Enter to continue, and one-time TIP messages that
   appear exactly when a situation first matters (turn them off in Settings).

Control panel + terrain update:
 * The whole interface is now a control panel: steel plates with screws, hardware-style keys with LEDs, green LCD readouts for
   resources, segmented LED meters and a row of STATUS LAMPS in the header (PWR / H2O / NET / FUEL / RAID / ALRT: green = fine,
   amber = watch it, red = act now). Touch devices get bigger targets, notches/safe areas are respected, and portrait phones keep
   a compact minimap.
 * Terrain generation was rebuilt: an elevation map with lakes in the low ground, rivers that start in the highlands and flow
   downhill (widening as they go), ridge lines and mesas for rock, roads routed around lakes and rock (bridges only when needed,
   with a ring road), town sprawl and rubble beside roads, groves and clearings, oases, and a tree line on mountains.
 * Four new biomes: JUNGLE (Amazon, Central America, Hawaii), TAIGA (northern Canada, Alaska, Scandinavia), STEPPE (Great Plains,
   pampas, Patagonia, Meseta, Eastern Europe) and BADLANDS (the Southwest, Andalusia). Each has its own look, traits and recipe.

Interface v6 (new UI):
 * The whole interface was rebuilt as one stylesheet with one set of colours and spacing, replacing four older themes that
   were stacked on top of each other and fighting. Steel panels, amber accents, green LCD readouts, pixel-crisp edges.
 * The layout code now measures the real header, news strip and side panels instead of guessing pixel sizes, so the play
   area and the world map always fit the window with no page scrolling, on phones, laptops and 4K screens alike.
 * Fixed: buttons that wrapped onto two lines (MENU, EVENT LOG, IRON WINTER), campaign stats cut off on the map bar, the
   map side panel not lining up with the map, clipped text and a hidden FLOWS panel in the STATUS tab, tab badges cut off,
   settings headers sitting outside their panels, the main menu overlapping itself on phones, a blank strip beside the map
   on phones, an oversized minimap on phones, and the map screen showing through behind full-screen windows.
 * Lists that can scroll now show a thin scroll bar instead of hiding it.


Version 6.1 - catalogue, alignment, fuel and industry:
 * New catalogue: a two-row category bar across the full panel, then same-size cards in two columns (icon, name, cost,
   hotkey). Names never break mid-word, costs are always shown, and the inspector below has a fixed height, so the panel
   no longer jumps around when you pick a tool. Tab badges sit beside their labels.
 * Every edge lines up: the header, play area, sidebar tabs, catalogue, news strip, minimap and inspector share the same
   outer edges and one 8px gap (checked at 1280x720, 1366x768, 1440x900, 1920x1080 and 2560x1440). On the world map the
   side panel is exactly as tall as the map.
 * New FUEL tab: CHARCOAL KILN (no power or lines needed), BIOGAS DIGESTER, OIL WELL, SYNFUEL PLANT and TANK FARM, alongside
   the refinery and fuel depot.
 * New INDUSTRY tab: SALVAGE YARD, ORE MINE, FOUNDRY (parts from power, water and fuel), ASSEMBLY PLANT (turns parts into a big
   scrap income) and WAREHOUSE (raises the scrap cap).
 * New power: BIOMASS BURNER, FUEL CELL STACK and GEOTHERMAL WELL. New water: WATER WELL (works away from the shore).
   New research building: DATA ARCHIVE.
 * 22 new research projects (96 in total), including a new INDUSTRY branch: Charcoal Kilns, Biomass Burners, Biogas, Tank
   Farms, Oil Drilling, Catalysts, Bulk Storage, Synfuel Plants, Catalytic Cracking, Fuel Cells, Geothermal, Dug Wells,
   Aquifer Survey, Mining, Warehousing, Foundries, Smelting, Assembly Lines, Conveyors, Automation and Data Archives.
 * The Field Guide (J) has new FUEL and INDUSTRY pages.

Version 7 - ages, the shared stockpile and the end game:
 * AGES: the campaign moves through five ages - SCAVENGER, INDUSTRIAL, ELECTRIC, ATOMIC and FUSION. Open the AGES screen on the
   map (key G, or the AGES button) to see what the next age needs (research projects done, counties restored, research points
   and later shared goods) and advance. Each age opens new research and buildings and gives a permanent bonus. Older campaigns
   start in the age their progress already earned.
 * RESEARCH: 164 projects in all (68 new), spread across the ages so there is always something to aim for. The research tree
   has an age filter (ALL AGES / AGE I-V); projects from later ages are shown with a lock until you get there.
 * SHARED STOCKPILE (Electric Age): ALLOYS, CIRCUITS and COMPONENTS, plus spare PARTS and FUEL, live in one stockpile shared by
   every county (shown in the county header and on the AGES screen). Advanced buildings are built from it and some run on it.
 * PRODUCTION HUBS: a restored county with factories keeps producing for the stockpile while you play elsewhere (50% speed at
   first; Freight Rail, Containerisation and Hyperloop raise it to full speed). Build one county as a central factory for
   components and every other county can use them. SUPPLY EXCHANGES trade spare parts and fuel with the stockpile, so one
   county's surplus feeds another.
 * 15 new buildings: Alloy Smelter, Circuit Fab, Component Works, Megafactory, Supply Exchange, Solar Farm, Wind Farm, Fission
   Reactor, Fusion Reactor, Atmo Water Plant, Orbital Uplink, Robot Depot, Arcology, Vertical Farm and Quantum Lab.
   The catalogue shows the buildings of your current age; later ages reveal more.
 * END GAME: in the Fusion Age, research WORLD GRID THEORY and IGNITE THE WORLD GRID on the AGES screen (150 research projects,
   160 counties, 4000 research points, 400 components, 250 alloys, 250 circuits). It ends the long game with a permanent
   bonus; you can keep playing afterwards.
 * HQ ORDERS only appear in the sidebar once you have an order, so the catalogue keeps its space.

Version 8 - research queue, repair drones, more skills, less hassle:
 * RESEARCH works like a production line now: queue projects (double-click, or ADD TO QUEUE; missing prerequisites are
   queued first) and the one at the front fills up over time, drawing research points from your bank at RESEARCH SPEED
   (faster every age; Research Speed I-V and the Lab Technician / Polymath / Overmind skills raise it). From the Electric
   Age, projects also use SCIENCE PACKS from the shared stockpile (alloys, circuits, components) - only goods you can
   already make, so it can never deadlock. Research keeps running on the world map (press Y there too) and labs in
   counties you have left keep feeding the bank.
 * REPAIR DRONES (research Repair Drones, then build a DRONE BAY in OPS): drones fly out and repair failed machines, worn
   machines and damaged lines within 30 tiles, for free. A county with a drone bay fixes its own outages while you are
   away and suffers half as many. Drone Swarms, Autonomous Drones and Nano-Drone Cloud make them stronger.
 * LESS HASSLE: a REPAIR ALL button in the STATUS tab (shows the cost, fixes the worst first), AUTO-REPAIR in Settings > GAME
   (on by default: failed machines and broken lines are fixed from scrap and parts), Emergency Fuel research (scrap is
   turned into fuel when the tank runs dry), Auto-Reclosers (tripped switches close again after 3 seconds) and Predictive
   Maintenance.
 * SKILLS: 36 skills (16 new) - two new tiers in every branch and a new AUTOMATION branch for drones and repairs.
 * 12 new research projects (176 in total).
 * Backwards compatible: older campaigns keep their research, research points, skill ranks, settings, counties and
   stockpile; the research queue simply starts empty and new settings take their defaults.

Version 8.1 - assists by difficulty and a sizing pass:
 * ASSISTS depend on the difficulty (shown on the difficulty cards and in Settings):
     SETTLER   FULL      auto-repair, REPAIR ALL, emergency fuel; drones fix map outages fast and prevent 60% of them.
     SURVIVOR  STANDARD  auto-repair, REPAIR ALL, emergency fuel; drones fix map outages and prevent half of them.
     IRON WINTER LIMITED no auto-repair; REPAIR ALL costs 25% more; emergency fuel costs double; drones fix map
                         outages at half speed and prevent 30%.
     BLACKOUT  NONE      no auto-repair, no REPAIR ALL, no emergency fuel; drones still repair inside a county but fix
                         map outages slowly and prevent none.
   Locked options are greyed out in Settings with the reason. Changing the difficulty applies at once.
 * Sizing: spare screen width now goes to the sidebar (up to 480px) and the map's side panel (up to 440px) instead of
   empty margins, and a roomy sidebar shows the catalogue in three columns, so long lists like late-game POWER fit without
   scrolling. Tablets use a ~1x interface instead of the phone layout blown up to 125%, and the county header no
   longer leaves the districts readout stranded. Every edge still lines up at 1280x720 to 2560x1440.
