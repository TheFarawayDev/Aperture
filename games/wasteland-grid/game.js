'use strict';
// ============================================================
//  GAME.JS - the county builder. Colors/sprites: art.js.
//  Levels come from county.js. Costs/outputs are in BUILD below,
//  the tech tree is TECH below.
// ============================================================

const W = 480, H = 270, T = 8;
const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4];                      // play-area zoom levels (the view shows W/zoom x H/zoom world pixels)
let camZ = 1, VW = W, VH = H;
try { const z = +localStorage.getItem('wastelandGrid.zoom'); if (ZOOMS.includes(z)) { camZ = z; VW = W / z; VH = H / z; } } catch (e) { /* default */ }
let WW = 100, WH = 70, N = WW * WH;
let DISTRICTS = [], START_BUILDINGS = [], FORCED_PONDS = [], SITES = [], SPEC = null;
const HOUSE_RADIUS = 10;         // how far from a restored hub houses / workshops may be built
const $ = id => document.getElementById(id);
const cv = $('game'), g = cv.getContext('2d');
// ---------- in-game dialogs (instead of the browser's confirm / alert) ----------
function uiDialog(text, { title = 'NOTICE', ok = 'OK', cancel = null } = {}) {
  return new Promise(resolve => {
    const box = $('dialog'), okb = $('dlg-ok'), cb = $('dlg-cancel');
    $('dlg-title').textContent = title; $('dlg-text').textContent = text; okb.textContent = ok; cb.style.display = cancel ? '' : 'none'; if (cancel) cb.textContent = cancel;
    box.style.display = 'flex'; okb.focus();
    const done = v => { box.style.display = 'none'; okb.onclick = cb.onclick = null; removeEventListener('keydown', key, true); resolve(v); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); done(true); } };
    addEventListener('keydown', key, true); okb.onclick = () => done(true); cb.onclick = () => done(false);
  });
}
const uiConfirm = (text, title = 'ARE YOU SURE?', ok = 'YES', cancel = 'CANCEL') => uiDialog(text, { title, ok, cancel });
const uiAlert = (text, title = 'NOTICE') => uiDialog(text, { title });

g.imageSmoothingEnabled = false;

// ---------- helpers ----------
function px(x, y, w, h, c) { g.fillStyle = PAL[c]; g.fillRect(x, y, w, h); }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
const inb = (x, y) => x >= 0 && y >= 0 && x < WW && y < WH;
function valueNoise(seed) {                           // smooth 2D noise, ~0..1
  const r = mulberry(seed), G = new Float32Array(64 * 64); for (let i = 0; i < G.length; i++) G[i] = r();
  const s = t => t * t * (3 - 2 * t);
  return (x, y, sc) => {
    x /= sc; y /= sc; const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const a = G[(yi & 63) * 64 + (xi & 63)], b = G[(yi & 63) * 64 + ((xi + 1) & 63)], c = G[((yi + 1) & 63) * 64 + (xi & 63)], d = G[((yi + 1) & 63) * 64 + ((xi + 1) & 63)];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function bake(rows, sub = {}) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const k = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; ch = sub[ch] ?? ch; k.fillStyle = PAL[parseInt(ch, 16)]; k.fillRect(x, y, 1, 1); }));
  return weatherize(c, rows.join('').length * 17 + rows[1].charCodeAt(3));
}
const cache = {};
const memo = (key, fn) => cache[key] || (cache[key] = fn());
const IMG = {
  gen: bake(SPRITE_GENERATOR), genFlash: bake(SPRITE_GENERATOR.map(r => r.replace(/7/g, '8'))),
  pump: bake(SPRITE_PUMP), router: bake(SPRITE_ROUTER), solar: bake(SPRITE_SOLAR), tower: bake(SPRITE_TOWER),
  windA: bake(SPRITE_WIND_A), windB: bake(SPRITE_WIND_B),
  houseOn: bake(SPRITE_HOUSE, HOUSE_ON), houseOff: bake(SPRITE_HOUSE, HOUSE_OFF), ruin: bake(SPRITE_HOUSE, HOUSE_RUIN),
  lab: paintLab(), depot: paintDepot(), fueldepot: paintFuelDepot(), refinery: paintRefinery(), clinic: paintClinic(),
  hydro: paintHydro(), intertie: paintIntertie(), security: paintSecurity(), gasturbine: paintGasTurbine(), desal: paintDesal(), relay: paintRelay(), apartments: paintApartments(), market: paintMarket(), school: paintSchool(), greenhouse: paintGreenhouse(), station: paintStation(), dStation: paintStation(true), powerplant: paintPowerPlant(), waterplant: paintWaterPlant(), datacenter: paintDataCenter(),
  kiln: paintKiln(), digester: paintDigester(), oilwell: paintOilWell(), synfuel: paintSynfuel(), tankfarm: paintTankFarm(), biomass: paintBiomass(), fuelcell: paintFuelCell(),
  cargo: paintCargo(), sat: paintSat(), sattower: paintSatTower(), dronebay: paintDroneBay(), smelter: paintSmelter(), circuitfab: paintCircuitFab(), exchange: paintExchange(), solarfarm: paintSolarFarm(), windfarm: paintWindFarm(), compworks: paintCompWorks(), fission: paintFission(), robotdepot: paintRobotDepot(),
  arcology: paintArcology(), vfarm: paintVFarm(), quantum: paintQuantum(), fusion: paintFusion(), atmo: paintAtmo(), megafab: paintMegafab(), orbital: paintOrbital(),
  geothermal: paintGeothermal(), well: paintWell(), scrapyard: paintScrapyard(), mine: paintMine(), foundry: paintFoundry(), assembly: paintAssembly(), warehouse: paintWarehouse(), archive: paintArchive(),
  dPowerplant: paintPowerPlant(true), dWaterplant: paintWaterPlant(true), dDatacenter: paintDataCenter(true),
};
const batterySprite = lit => memo('bat' + lit, () => bake(SPRITE_BATTERY, { P: lit > 0 ? '7' : '1', Q: lit > 1 ? '7' : '1', R: lit > 2 ? '7' : '1' }));
const switchSprite = (L, on) => memo('sw' + L + on, () => bake(SPRITE_SWITCH, { A: on ? ['7', 'e', 'b'][L] : '3', L: on ? '8' : '5' }));
const workshopSprite = on => memo('ws' + on, () => bake(SPRITE_WORKSHOP, { W: on ? '7' : '1', D: on ? '6' : '1' }));
function hubSprite(type, p, w, n, restored, beaconOn) {
  const key = 'hub' + type + [p, w, n, restored, beaconOn].map(v => +v).join('');
  return memo(key, () => {
    const sub = { P: p ? '7' : '1', Q: w ? 'e' : '1', R: n ? 'b' : '1', D: restored ? '6' : '1', 7: beaconOn ? '8' : (restored ? '7' : '5'), 2: BUILD[type].accent };
    if (!restored) { sub[3] = '2'; sub[2] = '1'; }
    return bake(SPRITE_HUB, sub);
  });
}

// ---------- sound ----------
let ac, muted = false;
try { muted = localStorage.getItem('wastelandGrid.mute') === '1'; } catch (e) { /* ignore */ }
function beep(f, d = 0.07, type = 'square', v = 0.035, when = 0) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), gn = ac.createGain(), t0 = ac.currentTime + when;
    o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(v, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(gn); gn.connect(ac.destination); o.start(t0); o.stop(t0 + d);
  } catch (e) { /* audio is optional */ }
}

// ---------- state ----------
let terrain, occ, cab, ents = [], sortedEnts = [], comp = [], info = [], totals = [], alerts = [], pulses = [], warns = [], waterTiles = [];
let scrap = 0, income = 0, upkeep = 0, camX = 0, camY = 0, tool = TOOLS[0], won = false, restoring = false;
let groups = [], activeMods = new Set(), stationEnt = null, transformerFired = false;
let outageActive = false, outageCb = null, curTab = 'build', activeCat = 'LINES';
const storyEv = id => { if (typeof Story !== 'undefined') Story.event(id); };
let stock = { fuel: 0, parts: 0 }, fuelCap = 100, gameT = 0, evT = 80, radUntil = 0, eventsOn = true, needSolve = true;
let hover = { x: -1, y: -1 }, mouse = { x: 0, y: 0, in: false }, sel = null;
let speed = 1, acc = 0, focus = -1, hist = [], stroke = null, cleared = new Set(), countyId = null;
let dirty = { cab: true, mini: true, ui: true, sort: true };
try { eventsOn = localStorage.getItem('wastelandGrid.events') !== '0'; } catch (e) { /* ignore */ }
const terrainCv = document.createElement('canvas'), tg = terrainCv.getContext('2d');
const cabCv = Array.from({ length: NL }, () => document.createElement('canvas')), cabG = cabCv.map(c => c.getContext('2d'));
const cabAllCv = document.createElement('canvas'), cabAllG = cabAllCv.getContext('2d');      // every line layer merged: one blit per frame instead of six
const miniCv = document.createElement('canvas');
const mm = $('minimap'), mmg = mm.getContext('2d');
let mmDrag = false;
let qbuf = new Int32Array(1), compBuf = [];

// ---------- terrain ----------
// 0 ground  1 water  2 rubble  3 road  4 rock  5 bridge  6 beach
const BIOME = {
  waste: { base: 2, alt: 1, a: 1, b: 3, shore: 4 }, desert: { base: 4, alt: 3, a: 3, b: 5, shore: 3 }, plains: { base: 9, alt: 2, a: 2, b: 10, shore: 4 },
  forest: { base: 1, alt: 9, a: 2, b: 9, shore: 3 }, swamp: { base: 9, alt: 2, a: 1, b: 10, shore: 3 }, tundra: { base: 3, alt: 2, a: 2, b: 15, shore: 2 },
  mountain: { base: 3, alt: 2, a: 2, b: 1, shore: 4 },
  jungle: { base: 9, alt: 10, a: 1, b: 11, shore: 3 }, taiga: { base: 9, alt: 10, a: 1, b: 15, shore: 3 },
  steppe: { base: 4, alt: 10, a: 3, b: 11, shore: 4 }, badlands: { base: 5, alt: 4, a: 3, b: 2, shore: 4 },
};
let tnoise = valueNoise(1);
const CATCOL = { LINES: '#d8e6e0', POWER: '#f5c95a', FUEL: '#e8743c', WATER: '#5fc4d0', NET: '#8fbf5a', CONTROL: '#b59cf0', TOWN: '#e08a3c', INDUSTRY: '#d9a066', OPS: '#e6dd9a', TOOLS: '#8a6a4e' };
const LORE = {
  res: ['A kettle whistles somewhere. Someone laughs.', 'Porch lights come on, one by one.', 'A child asks what the humming is. Then they stop asking.'],
  ind: ['The old foundry coughs, then roars.', 'Sparks fly from a lathe nobody has touched in eleven years.', 'The shift whistle blows. People remember how to line up.'],
  farm: ['Pumps shudder and the dead fields drink.', 'Irrigation lines hiss. Someone plants the first row.', 'Green. Actual green. Just a thread of it.'],
  med: ['A monitor beeps. The room goes quiet, then everyone cheers.', 'The clinic lights flicker on. Someone in the dark starts to cry with relief.', 'Cold storage hums. The medicine will keep.'],
  campus: ['Screens glow in the old lecture hall. Students gather.', 'The campus mainframe spins up and finds a signal.', 'The first signals from other counties arrive.'],
};
// ---- terrain renderer v2: per-pixel ground blending, autotiled roads and bridges, crumbling pavement ----
const PALRGB = PAL.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
const ROADISH = q => q === 3 || q === 5;
const nb4 = (tx, ty) => [ty > 0 ? terrain[(ty - 1) * WW + tx] : 1, tx < WW - 1 ? terrain[ty * WW + tx + 1] : 1, ty < WH - 1 ? terrain[(ty + 1) * WW + tx] : 1, tx > 0 ? terrain[ty * WW + tx - 1] : 1]; // N E S W

function groundNoise(wx, wy, bm) {                     // organic two-tone + bare-earth patches, stippled at the borders
  const el = ELEV && ELEV.length === N ? ELEV[((wy / T) | 0) * WW + ((wx / T) | 0)] / 255 : 0.5;
  const n = tnoise(wx, wy, 40) * 0.68 + tnoise(wx, wy, 12) * 0.32 + (el - 0.5) * 0.3, th = bay(wx, wy) - 0.5;      // higher ground drifts toward the light tone, hollows toward the dark one
  if (n > 0.56 + th * 0.16) return bm.alt;
  if (n < 0.30 + th * 0.12) return bm.a;
  return bm.base;
}
function baseColorAt(tx, ty, lx, ly, t, nb, bm) {
  if (t === 7) return 2;
  const wx = tx * T + lx, wy = ty * T + ly, d = [ly, T - 1 - lx, T - 1 - ly, lx], b = bay(wx, wy);
  if (t === 6) {                                      // bank: stipple into the ground next to it
    for (let k = 0; k < 4; k++) { const q = nb[k]; if ((q === 0 || q === 2 || q === 3 || q === 7 || q === 4) && d[k] < 3 && b < (3 - d[k]) / 4) return groundNoise(wx, wy, bm); }
    return tnoise(wx, wy, 9) > 0.62 && b > 0.45 ? (bm.shore === 4 ? 3 : 4) : bm.shore;
  }
  for (let k = 0; k < 4; k++) if (nb[k] === 6 && d[k] < 3 && b < (3 - d[k]) / 4) return bm.shore;
  return groundNoise(wx, wy, bm);
}
function paintBaseTile(tx, ty, t, nb) {
  const bm = BIOME[SPEC.biome] || BIOME.waste;
  for (let ly = 0; ly < T; ly++) for (let lx = 0; lx < T; lx++) { tg.fillStyle = PAL[baseColorAt(tx, ty, lx, ly, t, nb, bm)]; tg.fillRect(tx * T + lx, ty * T + ly, 1, 1); }
}
function bakeBaseAll() {                               // whole ground layer in one ImageData (fast)
  const bm = BIOME[SPEC.biome] || BIOME.waste, w = WW * T, h = WH * T, im = tg.createImageData(w, h), data = im.data;
  for (let ty = 0; ty < WH; ty++) for (let tx = 0; tx < WW; tx++) {
    const t = terrain[ty * WW + tx]; if (t === 1 || t === 5 || t === 4) continue;
    const nb = nb4(tx, ty);
    for (let ly = 0; ly < T; ly++) for (let lx = 0; lx < T; lx++) {
      const c = PALRGB[baseColorAt(tx, ty, lx, ly, t, nb, bm)], o = ((ty * T + ly) * w + tx * T + lx) * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  tg.putImageData(im, 0, 0);
}

function tileTerrain(tx, ty, skipBase) {
  const t = terrain[ty * WW + tx], x = tx * T, y = ty * T, s = mulberry(hash(tx, ty) + 7), bm = BIOME[SPEC.biome] || BIOME.waste, B = SPEC.biome;
  const P = (dx, dy, w, h, c) => { tg.fillStyle = PAL[c]; tg.fillRect(x + dx, y + dy, w, h); };
  const nb = nb4(tx, ty), [nN, nE, nS, nW] = nb, wat = q => q === 1;
  const darkGround = bm.base === 1 || bm.base === 2 || bm.base === 9, rs = darkGround ? 3 : 1, rk = darkGround ? 4 : 3, rcr = darkGround ? 1 : 0;   // roads contrast with the ground
  const strip = (n, e, so, w, surf, kerb) => {          // 6px wide road/deck with curbs, connected through the tile edges
    P(1, 1, 6, 6, surf);
    if (n) P(1, 0, 6, 1, surf); if (so) P(1, 7, 6, 1, surf); if (w) P(0, 1, 1, 6, surf); if (e) P(7, 1, 1, 6, surf);
    if (!w) P(1, 1, 1, 6, kerb); if (!e) P(6, 1, 1, 6, kerb); if (!n) P(1, 1, 6, 1, kerb); if (!so) P(1, 6, 6, 1, kerb);
    if (n) { P(1, 0, 1, 1, kerb); P(6, 0, 1, 1, kerb); } if (so) { P(1, 7, 1, 1, kerb); P(6, 7, 1, 1, kerb); }
    if (w) { P(0, 1, 1, 1, kerb); P(0, 6, 1, 1, kerb); } if (e) { P(7, 1, 1, 1, kerb); P(7, 6, 1, 1, kerb); }
  };

  if (t === 1 || t === 5) {                            // water / bridge
    const deep = tnoise(x, y, 28) > 0.6;
    P(0, 0, T, T, 13);
    if (deep) for (let k = 0; k < 10; k++) P(s() * 8 | 0, s() * 8 | 0, 2, 1, 9);
    for (let k = 0; k < 3; k++) P(s() * 8 | 0, s() * 8 | 0, 1, 1, 9);
    if (s() < 0.55) P(1 + (s() * 4 | 0), 1 + (s() * 6 | 0), 3, 1, 14);
    if (t === 1) {                                     // dark bank line with broken foam, softened at the corners
      const edge = (cond, dx, dy, w, h, fx, fy, fw, fh, alt) => { if (!cond) return; P(dx, dy, w, h, 9); if (alt) P(fx, fy, fw, fh, 14); };
      edge(nN !== 1 && nN !== 5, 0, 0, T, 1, 1, 1, 3, 1, tx & 1); edge(nS !== 1 && nS !== 5, 0, T - 1, T, 1, 2, T - 2, 3, 1, tx & 1);
      edge(nW !== 1 && nW !== 5, 0, 0, 1, T, 1, 1, 1, 3, ty & 1); edge(nE !== 1 && nE !== 5, T - 1, 0, 1, T, T - 2, 2, 1, 3, ty & 1);
      if (s() < 0.1) P(s() * 6 + 1 | 0, s() * 6 + 1 | 0, 1, 1, 12);       // glint
    } else {                                           // bridge deck: planks, rails, the odd missing board
      const n = ROADISH(nN), e = ROADISH(nE), so = ROADISH(nS), w = ROADISH(nW), horiz = (e || w) && !(n || so);
      strip(n, e, so, w, 4, 0);
      for (let k = 1; k < 7; k++) { if (horiz || (!n && !so)) P(k, 2, 1, 4, k % 2 ? 3 : 4); else P(2, k, 4, 1, k % 2 ? 3 : 4); }
      if (s() < 0.22) P(2 + (s() * 3 | 0), 2 + (s() * 3 | 0), 2, 2, 13);   // hole through to the water
      if (s() < 0.35) P(s() * 5 + 1 | 0, 3, 1, 1, 6);                       // fresh nail head
    }
    return;
  }
  if (t === 7) {                                       // concrete slabs, cracked, stained, with weeds and crumbling edges
    P(0, 0, T, T, (tx + ty) % 2 ? 2 : 3);                                         // alternating slab tone
    for (let i = 0; i < T; i++) { if (s() < 0.82) P(i, 0, 1, 1, 1); if (s() < 0.82) P(0, i, 1, 1, 1); }   // broken seams
    if ((tx + ty) % 2 === 0) { P(1, 1, 6, 1, 4); } else P(1, 1, 1, 6, 3);
    for (let k = 0; k < 5; k++) P(s() * 7 + 1 | 0, s() * 7 + 1 | 0, 1, 1, s() < 0.55 ? 3 : 1);
    if (s() < 0.22) { const a = 2 + (s() * 3 | 0), b = 2 + (s() * 3 | 0); P(a, b, 1, 1, 1); P(a + 1, b + 1, 1, 1, 1); P(a + 1, b + 2, 1, 1, 1); P(a + 2, b + 3, 1, 1, 1); }
    if (s() < 0.10) P(2 + (s() * 3 | 0), 2 + (s() * 3 | 0), 3, 2, 1);                       // stain
    if (s() < 0.12) { const a = 1 + (s() * 6 | 0); P(a, 3, 1, 2, 10); P(a + 1, 4, 1, 1, 9); } // weed in a crack
    [[nN, 0], [nE, 1], [nS, 2], [nW, 3]].forEach(([q, k]) => {
      if (q === 7 || ROADISH(q)) return;
      for (let i = 0; i < T; i++) {
        const wx = x + (k === 1 ? T - 1 : k === 3 ? 0 : i), wy = y + (k === 0 ? 0 : k === 2 ? T - 1 : i);
        const r = s();
        if (r < 0.5) P(k === 1 ? T - 1 : k === 3 ? 0 : i, k === 0 ? 0 : k === 2 ? T - 1 : i, 1, 1, 1);
        else if (r < 0.7) { tg.fillStyle = PAL[groundNoise(wx, wy, bm)]; tg.fillRect(wx, wy, 1, 1); }          // slab chipped away
        if (r > 0.92) P(k === 1 ? T - 2 : k === 3 ? 1 : i, k === 0 ? 1 : k === 2 ? T - 2 : i, 1, 1, 1);
      }
    });
    return;
  }
  if (t === 4) {                                       // cliffs: joined masses, lit top edge, dark base, cracks
    const above = nN === 4, below = nS === 4, left = nW === 4, right = nE === 4, snow = B === 'mountain' || B === 'tundra';
    P(0, 0, T, T, 2);
    for (let k = 0; k < 7; k++) P(s() * 8 | 0, s() * 8 | 0, 1, 1, s() < 0.5 ? 1 : 3);
    if (!above) { P(0, 0, T, 2, 3); P(1, 0, 6, 1, snow && s() < 0.65 ? 15 : 4); if (!left) P(0, 0, 1, 1, 2); if (!right) P(7, 0, 1, 1, 2); }
    if (!below) { P(0, 6, T, 2, 0); P(1, 5, 6, 1, 1); }
    if (!left) P(0, 1, 1, 6, 1); if (!right) P(7, 1, 1, 6, 0);
    if (s() < 0.4) { const a = 2 + (s() * 3 | 0); P(a, 3, 1, 1, 0); P(a + 1, 4, 1, 1, 0); P(a + 1, 5, 1, 1, 0); }
    return;
  }

  // ----- ground-like tiles: base comes from the blended ground layer -----
  if (!skipBase) paintBaseTile(tx, ty, t, nb);
  if (nN === 4 && t !== 3) for (let k = 0; k < T; k += 2) P(k + (ty & 1), 0, 1, 2, 1);               // shadow cast by a cliff
  const sa = t === 6 ? 3 : bm.a, sb = t === 6 ? 15 : bm.b;
  for (let k = 0; k < 5; k++) P(s() * 8 | 0, s() * 8 | 0, 1, 1, s() < 0.55 ? sa : sb);

  if (t === 3) {                                       // ----- autotiled road -----
    const n = ROADISH(nN) || nN === 7, e = ROADISH(nE) || nE === 7, so = ROADISH(nS) || nS === 7, w = ROADISH(nW) || nW === 7;
    strip(n, e, so, w, rs, rk);
    const straightV = n && so && !e && !w, straightH = e && w && !n && !so;
    if (straightV && s() > 0.2) { if (ty & 1) P(3, 1, 2, 2, 15); else P(3, 5, 2, 2, 15); }              // faded centre dashes (some worn away)
    if (straightH && s() > 0.2) { if (tx & 1) P(1, 3, 2, 2, 15); else P(5, 3, 2, 2, 15); }
    if (straightV) for (let k = 1; k < 7; k++) if (s() < 0.45) { P(2, k, 1, 1, 2); if (s() < 0.5) P(5, k, 1, 1, 2); }   // tyre wear
    if (straightH) for (let k = 1; k < 7; k++) if (s() < 0.45) { P(k, 2, 1, 1, 2); if (s() < 0.5) P(k, 5, 1, 1, 2); }
    const wear = s();
    if (wear < 0.16) { const a = 2 + (s() * 2 | 0), b = 2 + (s() * 2 | 0); P(a, b, 1, 1, rcr); P(a + 1, b + 1, 1, 1, rcr); P(a + 1, b + 2, 1, 1, rcr); P(a + 2, b + 2, 1, 1, rk); } // crack
    else if (wear < 0.22) { const a = 2 + (s() * 2 | 0), b = 2 + (s() * 2 | 0); P(a, b, 2, 2, rcr); P(a, b, 1, 1, 0); P(a + 1, b + 1, 1, 1, rk); }          // pothole
    else if (wear < 0.29) { P(2, 3 + (s() * 2 | 0), 3, 2, rcr); P(3, 3, 1, 1, rk); }                                                                          // oil stain
    else if (wear < 0.36) { P(2, 2, 4, 3, darkGround ? 2 : 2); P(2, 2, 4, 1, rk); }                                                                                              // patched tarmac
    if (s() < 0.1) P(1 + (s() * 5 | 0), 1 + (s() * 5 | 0), 1, 1, rk);                                                                                      // gravel
    [[n, 0], [e, 1], [so, 2], [w, 3]].forEach(([c, k]) => {                                           // verge: gravel and weeds where the road isn't
      if (c) return;
      for (let i = 0; i < T; i++) if (s() < 0.2) P(k === 1 ? 7 : k === 3 ? 0 : i, k === 0 ? 0 : k === 2 ? 7 : i, 1, 1, s() < 0.5 ? 4 : bm.b);
    });
    return;
  }

  const dv = VEG && VEG.length === N ? VEG[ty * WW + tx] / 128 : 1, dec = s() / Math.max(0.1, dv);      // groves and clearings: vegetation density varies across the county
  if (t === 0) {
    if (B === 'desert') {
      if (dec < 0.04) { P(3, 1, 2, 6, 10); P(1, 3, 2, 1, 10); P(1, 2, 1, 2, 10); P(5, 4, 2, 1, 10); P(5, 3, 1, 1, 10); P(3, 7, 2, 1, 0); P(3, 1, 1, 1, 11); }
      else if (dec < 0.13) { const yy = 2 + (s() * 4 | 0); P(1, yy, 5, 1, 5); P(2, yy + 1, 3, 1, 3); }
      else if (dec < 0.15) { P(2, 3, 3, 2, 15); P(2, 3, 1, 1, 0); P(4, 3, 1, 1, 0); P(3, 5, 1, 1, 15); }
    } else if (B === 'badlands') {
      if (dec < 0.05) { P(3, 2, 2, 5, 10); P(1, 3, 2, 1, 10); P(5, 4, 2, 1, 10); P(3, 7, 2, 1, 0); }
      else if (dec < 0.2) { const yy = 1 + (s() * 5 | 0); P(0, yy, 8, 1, s() < 0.5 ? 5 : 3); P(1, yy + 1, 6, 1, 4); }
      else if (dec < 0.24) { P(2, 3, 4, 3, 3); P(2, 3, 4, 1, 4); P(3, 6, 3, 1, 0); }
    } else if (B === 'steppe') {
      if (dec < 0.22) { const a = s() * 6 | 0, b = s() * 4 | 0; P(a, b + 2, 1, 3, 10); P(a + 1, b + 1, 1, 4, 4); P(a + 2, b + 2, 1, 3, 10); P(a + 3, b + 1, 1, 3, 4); }
      else if (dec < 0.27) { P(2, 4, 4, 2, 10); P(3, 3, 2, 1, 10); P(2, 6, 4, 1, 0); }
      else if (dec < 0.29) { P(3, 3, 1, 4, 3); P(2, 3, 3, 1, 4); }
    } else if (B === 'taiga') {
      if (dec < 0.38) { P(3, 0, 2, 1, s() < 0.3 ? 15 : 9); P(2, 1, 4, 1, 9); P(2, 2, 4, 1, 10); P(1, 3, 6, 1, 9); P(1, 4, 6, 1, 10); P(0, 5, 8, 1, 9); P(3, 6, 2, 2, 0); }
      else if (dec < 0.44) { P(2, 5, 4, 2, 15); P(1, 6, 6, 1, 3); }
      else if (dec < 0.5) { P(3, 3, 1, 4, 9); P(2, 4, 3, 1, 10); }
    } else if (B === 'jungle') {
      if (dec < 0.5) { const c = dec < 0.25 ? 9 : 10; P(0, 1, 8, 5, c); P(1, 0, 6, 1, c); P(2, 1, 2, 2, 11); P(5, 2, 2, 2, 11); P(0, 6, 8, 1, 9); P(3, 5, 2, 3, 0); P(2, 3, 1, 3, 9); }
      else if (dec < 0.62) { const a = s() * 4 | 0; P(a, 2, 3, 5, 10); P(a + 3, 1, 2, 6, 9); P(a + 1, 1, 1, 2, 12); }
      else if (dec < 0.66) { P(1, 4, 6, 2, 13); P(2, 4, 3, 1, 14); }
    } else if (B === 'forest') {
      if (dec < 0.32) { const c = dec < 0.16 ? 9 : 10; P(1, 0, 6, 5, c); P(2, 0, 4, 1, 9); P(0, 2, 8, 2, c); P(3, 5, 2, 3, 0); P(1, 1, 2, 2, 11); P(4, 4, 3, 1, 0); P(0, 4, 8, 1, 9); P(5, 1, 1, 1, 12); }
      else if (dec < 0.42) { const a = s() * 6 | 0; P(a, 5, 1, 2, 10); P(a + 1, 4, 1, 3, 9); P(a + 2, 5, 1, 2, 11); }
    } else if (B === 'swamp') {
      if (dec < 0.13) { const a = s() * 5 | 0; P(a, 2, 1, 5, 10); P(a + 2, 3, 1, 4, 9); P(a + 1, 1, 1, 2, 11); P(a + 3, 2, 1, 2, 12); }
      else if (dec < 0.25) { P(1, 3, 6, 3, 13); P(2, 3, 3, 1, 14); P(1, 5, 6, 1, 9); P(0, 4, 1, 1, 13); P(7, 4, 1, 1, 13); }
    } else if (B === 'plains') {
      if (dec < 0.24) { const a = s() * 6 | 0, b = s() * 5 | 0; P(a, b + 1, 1, 2, 4); P(a + 1, b, 1, 3, 10); P(a + 2, b + 1, 1, 2, 4); P(a + 3, b, 1, 2, 10); }
      else if (dec < 0.26) { P(3, 3, 1, 4, 4); P(2, 3, 3, 1, 4); P(4, 2, 2, 1, 4); }
    } else if (B === 'tundra') {
      if (dec < 0.12) { P(1, 2, 5, 3, 15); P(2, 1, 3, 1, 15); P(1, 5, 5, 1, 3); } else if (dec < 0.22) { P(3, 2, 1, 5, 9); P(2, 4, 3, 1, 9); P(1, 6, 5, 1, 9); P(3, 1, 1, 1, 15); }
    } else if (B === 'mountain') {
      if (dec < 0.1) { P(1, 4, 3, 2, 4); P(2, 3, 2, 1, 3); P(1, 6, 3, 1, 1); } else if (dec < 0.14) P(2, 5, 1, 1, 15); else if (dec < 0.2) P(1, 6, 6, 1, 1);
    } else {
      if (dec < 0.07) { const a = s() * 6 | 0, b = s() * 5 | 0; P(a, b + 1, 1, 2, 10); P(a + 1, b, 1, 2, 9); }
      else if (dec < 0.10) P(1, 1 + (s() * 5 | 0), 4, 1, 1);
      else if (dec < 0.125) { P(3, 3, 1, 4, 4); P(2, 3, 3, 1, 4); P(1, 2, 1, 1, 4); P(5, 4, 1, 1, 4); }
      else if (dec < 0.135) { P(1, 3, 6, 3, 5); P(2, 2, 3, 1, 5); P(2, 3, 2, 1, 13); P(1, 6, 2, 1, 0); P(5, 6, 2, 1, 0); P(1, 3, 6, 1, 6); }
      else if (dec < 0.145) { P(2, 3, 3, 2, 15); P(2, 3, 1, 1, 0); P(4, 3, 1, 1, 0); }
      else if (dec < 0.17) { P(2, 3, 4, 3, 1); P(3, 4, 2, 1, 0); }                                  // old scorch mark
    }
    if (dec > 0.9 && dec < 0.935) P(1, 5, 4, 1, 1);
  }
  if (t === 2) { P(1, 5, 6, 2, 0); P(0, 6, 8, 1, 1); P(1, 2, 4, 3, 4); P(1, 2, 4, 1, 6); P(4, 3, 3, 3, 3); P(4, 3, 3, 1, 4); P(5, 1, 1, 2, 5); P(2, 4, 2, 1, 5); P(6, 5, 1, 1, 15); }
  if (t === 6 && dec < 0.14) { P(2, 3, 3, 1, 15); P(3, 4, 1, 1, 3); }
}

// ---- terrain generator v3: elevation field, lakes in the lows, rivers that flow downhill, ridges, road routing, town sprawl, vegetation density ----
let ELEV = null, VEG = null;
// per-biome recipe: relief (hilliness), lake (fraction of land that is water), rivers [min,max], rock (fraction of land), ridged (long ridge lines),
// veg (vegetation density, 1 = normal), clump (0 even .. 1 groves and clearings), riparian (extra growth beside water), rubble (extra ruin sprawl)
const BIOME_GEN = {
  waste: { relief: 0.5, lake: 0.015, rivers: [0, 1], rock: 0.05, ridged: false, veg: 0.4, clump: 0.4, riparian: 0.8, rubble: 1.2 },
  desert: { relief: 0.5, lake: 0.004, rivers: [0, 0], rock: 0.09, ridged: false, veg: 0.3, clump: 0.6, riparian: 3.0, rubble: 0.8 },
  badlands: { relief: 0.95, lake: 0.003, rivers: [0, 1], rock: 0.22, ridged: true, veg: 0.22, clump: 0.5, riparian: 2.5, rubble: 0.7 },
  plains: { relief: 0.22, lake: 0.025, rivers: [1, 2], rock: 0.008, ridged: false, veg: 0.75, clump: 0.3, riparian: 1.3, rubble: 1.2 },
  steppe: { relief: 0.28, lake: 0.012, rivers: [1, 1], rock: 0.02, ridged: false, veg: 0.65, clump: 0.35, riparian: 1.6, rubble: 1.0 },
  forest: { relief: 0.4, lake: 0.035, rivers: [1, 2], rock: 0.035, ridged: false, veg: 1.05, clump: 0.65, riparian: 0.8, rubble: 1.0 },
  taiga: { relief: 0.45, lake: 0.06, rivers: [1, 2], rock: 0.06, ridged: false, veg: 1.1, clump: 0.55, riparian: 0.6, rubble: 0.9 },
  jungle: { relief: 0.45, lake: 0.03, rivers: [2, 2], rock: 0.025, ridged: false, veg: 1.6, clump: 0.25, riparian: 0.4, rubble: 0.8 },
  swamp: { relief: 0.12, lake: 0.13, rivers: [2, 3], rock: 0, ridged: false, veg: 1.1, clump: 0.5, riparian: 0.5, rubble: 0.9 },
  tundra: { relief: 0.35, lake: 0.07, rivers: [1, 1], rock: 0.08, ridged: false, veg: 0.6, clump: 0.5, riparian: 1.0, rubble: 0.9 },
  mountain: { relief: 1.0, lake: 0.03, rivers: [1, 2], rock: 0.3, ridged: true, veg: 0.5, clump: 0.5, riparian: 1.0, rubble: 0.7 },
};
const smooth01 = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// route a road (or anything) across the grid: A* with a turn penalty so runs stay straight. cost(i) < 0 = blocked.
function gridRoute(sx, sy, gx, gy, cost, turn) {
  const NS = N * 5, g = new Float32Array(NS).fill(Infinity), from = new Int32Array(NS).fill(-1), heap = [];
  const push = (f, s) => { heap.push([f, s]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (; ;) { const l = 2 * k + 1, r2 = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const h = (x, y) => Math.abs(x - gx) + Math.abs(y - gy) * 1, s0 = (sy * WW + sx) * 5 + 4; g[s0] = 0; push(h(sx, sy), s0);
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; let end = -1, guard = 0;
  while (heap.length && guard++ < 90000) {
    const [f, s] = pop(), i = (s / 5) | 0, d = s % 5, x = i % WW, y = (i / WW) | 0;
    if (f - h(x, y) > g[s] + 1e-3) continue;
    if (x === gx && y === gy) { end = s; break; }
    for (let nd = 0; nd < 4; nd++) {
      const nx = x + DX[nd], ny = y + DY[nd]; if (!inb(nx, ny)) continue; const ni = ny * WW + nx, c = cost(ni); if (c < 0) continue;
      const ng = g[s] + c + (d !== 4 && d !== nd ? turn : 0), ns = ni * 5 + nd; if (ng < g[ns]) { g[ns] = ng; from[ns] = s; push(ng + h(nx, ny), ns); }
    }
  }
  if (end < 0) return null;
  const path = []; for (let s = end; s >= 0; s = from[s]) { const i = (s / 5) | 0; path.push([i % WW, (i / WW) | 0]); } return path.reverse();
}

function generateWorld() {
  terrain = new Uint8Array(N);
  const r = mulberry(SPEC.seed), n1 = valueNoise(SPEC.seed + 5), n2 = valueNoise(SPEC.seed + 9), n3 = valueNoise(SPEC.seed + 31), n4 = valueNoise(SPEC.seed + 47);
  const G = BIOME_GEN[SPEC.biome] || BIOME_GEN.waste, co = SPEC.coast, wet = [co.n, co.s, co.w, co.e].some(v => v > 0);
  const blob = (cx, cy, rad, v, only) => {
    for (let y = Math.max(0, cy - rad - 2 | 0); y < Math.min(WH, cy + rad + 3); y++) for (let x = Math.max(0, cx - rad - 2 | 0); x < Math.min(WW, cx + rad + 3); x++)
      if ((!only || terrain[y * WW + x] === only) && Math.hypot(x - cx, y - cy) + r() * 0.7 < rad) terrain[y * WW + x] = v;
  };
  // 1) elevation: big landforms + hills + texture. Mountains use ridged noise (sharp crests), the rest rolling noise. Land slopes down toward any coast.
  const el = new Float32Array(N), ridge = new Float32Array(N);
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const a = n1(x, y, 46), b = n2(x, y, 21), c = n3(x, y, 10), d = n4(x, y, 5);
    let e = a * 0.5 + b * 0.28 + c * 0.16 + d * 0.06;
    const rg = 1 - Math.abs(2 * (n2(x + 17, y + 5, 26) * 0.6 + n3(x, y + 9, 13) * 0.4) - 1);          // ridge lines
    ridge[y * WW + x] = rg;
    e = (e - 0.5) * (0.6 + G.relief) + 0.5; if (G.ridged) e = e * 0.55 + rg * 0.45 * (0.4 + G.relief * 0.6);
    if (co.n) e += 0.28 * Math.min(1, y / (WH * 0.6)); if (co.s) e += 0.28 * Math.min(1, (WH - 1 - y) / (WH * 0.6));
    if (co.w) e += 0.28 * Math.min(1, x / (WW * 0.6)); if (co.e) e += 0.28 * Math.min(1, (WW - 1 - x) / (WW * 0.6));
    el[y * WW + x] = e;
  }
  const sorted = Float32Array.from(el).sort(), pct = f => sorted[Math.max(0, Math.min(N - 1, Math.floor(f * N)))];
  // 2) lakes fill the lowest ground: organic shapes, small puddles drained, edges smoothed
  if (G.lake > 0) { const th = pct(G.lake); for (let i = 0; i < N; i++) if (el[i] < th) terrain[i] = 1; }
  for (let pass = 0; pass < 2; pass++) {                                                                            // majority filter: no jagged single-tile spurs
    const nt = terrain.slice();
    for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) { let w = 0; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (terrain[(y + j) * WW + x + k] === 1) w++; if (w >= 6) nt[y * WW + x] = 1; else if (w <= 2) nt[y * WW + x] = 0; }
    terrain = nt;
  }
  { const seen = new Uint8Array(N), minSize = SPEC.biome === 'swamp' ? 3 : 9;                                         // drain tiny puddles
    for (let i = 0; i < N; i++) if (terrain[i] === 1 && !seen[i]) { const q = [i], comp = [i]; seen[i] = 1; while (q.length) { const c = q.pop(), x = c % WW, y = (c / WW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const j = ny * WW + nx; if (terrain[j] === 1 && !seen[j]) { seen[j] = 1; q.push(j); comp.push(j); } } } if (comp.length < minSize) comp.forEach(j => { terrain[j] = 0; }); } }
  // 3) rivers: start in the highlands, follow the slope downhill (with some meander), widen as they go, end at water or the edge
  const rc = G.rivers[0] + (r() * (G.rivers[1] - G.rivers[0] + 1) | 0), elAt = (x, y) => el[Math.max(0, Math.min(WH - 1, Math.round(y))) * WW + Math.max(0, Math.min(WW - 1, Math.round(x)))];
  const hi = pct(0.72);
  for (let k = 0; k < rc; k++) {
    let sx = 0, sy = 0, ok = false;
    for (let t = 0; t < 120 && !ok; t++) { sx = 6 + r() * (WW - 12); sy = 6 + r() * (WH - 12); if (elAt(sx, sy) > hi && terrain[Math.round(sy) * WW + Math.round(sx)] !== 1) ok = true; }
    if (!ok) { sx = r() * WW; sy = r() < 0.5 ? 0 : WH - 1; }
    let x = sx, y = sy, vx = 0, vy = 0, len = 0, flat = 0, wid = 0.8;
    for (let step = 0; step < 520; step++) {
      const gx = (elAt(x + 2, y) - elAt(x - 2, y)) / 4, gy = (elAt(x, y + 2) - elAt(x, y - 2)) / 4, gm = Math.hypot(gx, gy);
      flat = gm < 0.004 ? flat + 1 : 0; if (flat > 10) { blob(x, y, 2.6, 1); break; }                              // a basin: the river ends in a small lake
      const ang = (n3(x * 3 + k * 50, y * 3, 9) - 0.5) * 1.6;                                                  // gentle meander
      let nvx = vx * 0.72 - gx / (gm || 1) * 0.55, nvy = vy * 0.72 - gy / (gm || 1) * 0.55; nvx += Math.cos(ang) * 0.14; nvy += Math.sin(ang) * 0.14;
      const nm = Math.hypot(nvx, nvy) || 1; vx = nvx / nm; vy = nvy / nm; x += vx; y += vy; len++; wid = Math.min(1.9, 0.8 + len * 0.012);
      blob(x, y, wid, 1);
      if (x < -1 || y < -1 || x > WW || y > WH) break;
      if (len > 12 && terrain[Math.max(0, Math.min(N - 1, Math.round(y) * WW + Math.round(x)))] === 1 && el[Math.round(y) * WW + Math.round(x)] < pct(G.lake + 0.01)) break;
    }
  }
  // 4) coasts / great lakes on the sides that touch water on the world map (unchanged: they have to match the world map)
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const jitter = n1(x, y, 6) * 6 - 3, jx = n2(x, y, 7) * 5 - 2.5;
    const dn = y - (co.n + jx), ds = (WH - 1 - y) - (co.s + jx), dw = x - (co.w + jitter), de = (WW - 1 - x) - (co.e + jitter);
    const dist = Math.min(co.n ? dn : 99, co.s ? ds : 99, co.w ? dw : 99, co.e ? de : 99);
    if (dist < 0) terrain[y * WW + x] = 1;
    else if (dist < 2.4 && terrain[y * WW + x] !== 1) terrain[y * WW + x] = 6;
  }
  // 5) rock: the highest ground (or the ridge crests), so it forms believable ranges, mesas and boulder fields
  if (G.rock > 0) {
    const key = new Float32Array(N); for (let i = 0; i < N; i++) key[i] = G.ridged ? ridge[i] * 0.6 + el[i] * 0.4 : el[i] + n4(i % WW, (i / WW) | 0, 3) * 0.05;
    const ks = Float32Array.from(key).sort(), th = ks[Math.floor((1 - G.rock * 1.1) * N)];
    for (let i = 0; i < N; i++) if (terrain[i] === 0 && key[i] > th) terrain[i] = 4;
  }
  const clear = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) terrain[y * WW + x] = 0; };
  for (const d of DISTRICTS) clear(d.x - 6, d.y - 5, d.x + 7, d.y + 6);
  for (const s of SITES) { const z = s.kind === 'station' ? 5 : 4; clear(s.x - 2, s.y - 2, s.x + z, s.y + z); }
  for (const p of FORCED_PONDS) for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (Math.hypot(x - p.x, y - p.y) < p.r) terrain[y * WW + x] = 1;
  // 6) old roads: routed around lakes and rock (bridges only where water can't be avoided), merging into each other like a real network
  const nearForced = (x, y) => FORCED_PONDS.some(p => Math.hypot(x - p.x, y - p.y) < p.r + 1.5);
  const isRoad = new Uint8Array(N);
  const road = (x, y) => { if (!inb(x, y) || nearForced(x, y)) return; const i = y * WW + x; if (terrain[i] === 1) terrain[i] = 5; else if (terrain[i] !== 5) terrain[i] = 3; isRoad[i] = 1; };
  const rcost = i => { const t = terrain[i]; if (t === 3 || t === 5 || isRoad[i]) return 0.35; if (t === 1) { const x = i % WW, y = (i / WW) | 0; return nearForced(x, y) ? -1 : 9; } if (t === 4) return 28; if (t === 6) return 1.4; return 1 + n3(i % WW, (i / WW) | 0, 5) * 0.5; };
  const links = [];
  DISTRICTS.forEach((d, i) => { if (!i) return; let b = 0, bd = 1e9; for (let j = 0; j < i; j++) { const dd = Math.abs(DISTRICTS[j].x - d.x) + Math.abs(DISTRICTS[j].y - d.y); if (dd < bd) { bd = dd; b = j; } } links.push([DISTRICTS[b], d]); });
  if (DISTRICTS.length > 3) { const a = DISTRICTS[1 + (r() * (DISTRICTS.length - 1) | 0)], b = DISTRICTS[(DISTRICTS.indexOf(a) + 2) % DISTRICTS.length]; if (a !== b) links.push([a, b]); }   // a ring road
  SITES.forEach(s => { let b = DISTRICTS[0], bd = 1e9; DISTRICTS.forEach(d => { const dd = Math.abs(d.x - s.x) + Math.abs(d.y - s.y); if (dd < bd) { bd = dd; b = d; } }); links.push([b, { x: s.x - 1, y: s.y + 1 }]); });
  for (const [a, b] of links) {
    const sx = Math.max(0, Math.min(WW - 1, a.x + 1)), sy = Math.max(0, Math.min(WH - 1, a.y + 3)), ex = Math.max(0, Math.min(WW - 1, b.x + 1)), ey = Math.max(0, Math.min(WH - 1, b.y + 3));
    const p = gridRoute(sx, sy, ex, ey, rcost, 1.1);
    if (p) p.forEach(([x, y]) => road(x, y));
  }
  tnoise = valueNoise(SPEC.seed + 21);
  // 7) ruins: town sprawl around every district and rubble beside the roads, plus scattered wreckage (more on harder counties)
  const rub = (x, y) => { if (inb(x, y) && terrain[y * WW + x] === 0) terrain[y * WW + x] = 2; };
  for (const d of DISTRICTS) for (let k = 0, n = Math.round((22 + SPEC.diff * 2) * G.rubble); k < n; k++) { const a = r() * 6.283, rad = 7 + r() * 7; rub(Math.round(d.x + Math.cos(a) * rad * 1.3), Math.round(d.y + Math.sin(a) * rad)); if (r() < 0.5) rub(Math.round(d.x + Math.cos(a) * rad * 1.3) + 1, Math.round(d.y + Math.sin(a) * rad)); }
  for (let i = 0; i < N; i++) if (isRoad[i] && r() < 0.035 * G.rubble) { const x = i % WW, y = (i / WW) | 0, s = r() < 0.5 ? 2 : -2; rub(x, y + s); rub(x + (r() < 0.5 ? 1 : 0), y + s); }
  for (let k = 0; k < SPEC.rubbleClusters * 0.5 * G.rubble; k++) {
    const cx = r() * WW | 0, cy = r() * WH | 0, n = 3 + (r() * 5 | 0);
    for (let j = 0; j < n; j++) rub(cx + (r() * 6 - 3) | 0, cy + (r() * 6 - 3) | 0);
  }
  for (const d of DISTRICTS) for (let y = d.y - 2; y <= d.y + 4; y++) for (let x = d.x - 3; x <= d.x + 4; x++) if (inb(x, y) && terrain[y * WW + x] === 0) terrain[y * WW + x] = 7;
  for (const q of SITES) { const z = q.kind === 'station' ? 4 : 3; for (let y = q.y - 1; y <= q.y + z; y++) for (let x = q.x - 1; x <= q.x + z; x++) if (inb(x, y) && terrain[y * WW + x] === 0) terrain[y * WW + x] = 7; }
  const bank = [];
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (terrain[y * WW + x] === 0 && (hash(x, y) % 100) < 75 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inb(x + dx, y + dy) && terrain[(y + dy) * WW + x + dx] === 1)) bank.push(y * WW + x);
  bank.forEach(i => { terrain[i] = 6; });
  waterTiles = []; for (let i = 0; i < N; i++) if (terrain[i] === 1) waterTiles.push(i);
  // 8) the living layers: distance to water (moisture) and vegetation density, used to place trees, grass, reeds and bare patches
  const wd = new Uint8Array(N).fill(255), q = []; for (const i of waterTiles) { wd[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const c = q[h], x = c % WW, y = (c / WW) | 0, dd = wd[c]; if (dd >= 14) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const j = ny * WW + nx; if (wd[j] > dd + 1) { wd[j] = dd + 1; q.push(j); } } }
  ELEV = new Uint8Array(N); VEG = new Uint8Array(N);
  const emin = sorted[0], emax = sorted[N - 1];
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const i = y * WW + x, e01 = (el[i] - emin) / (emax - emin || 1); ELEV[i] = Math.round(e01 * 255);
    const clump = n3(x + 11, y + 3, 15) * 0.6 + n2(x + 3, y + 29, 7) * 0.4, shape = 1 + (smooth01((clump - 0.38) / 0.28) * 1.9 - 1) * G.clump;
    let v = G.veg * shape;
    const near = Math.max(0, (7 - wd[i]) / 7); v *= 1 + near * G.riparian * (SPEC.biome === 'desert' || SPEC.biome === 'badlands' ? 1 : 0.5);
    if (SPEC.biome === 'desert' || SPEC.biome === 'badlands') v *= wd[i] <= 3 ? 3 : 1;                          // oases
    if (SPEC.biome === 'mountain') v *= 1.3 - e01 * 1.5;                                                         // the tree line
    if (isRoad[i]) v *= 0.3;
    VEG[i] = Math.max(0, Math.min(255, Math.round(v * 128)));
  }
  bakeBaseAll();
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) tileTerrain(x, y, true);
}

// ---------- entities ----------
function addEntity(type, x, y, extra = {}) {
  const d = BUILD[type];
  const e = Object.assign({ type, x, y, w: d.w, h: d.h, ok: [true, true, true], on: true, charge: 0, active: false, run: false, live: true, cond: 100, mult: 1, isHub: !!d.isHub, mods: [] }, extra);
  ents.push(e);
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) occ[(y + j) * WW + x + i] = e;
  dirty.sort = true;
  return e;
}
function removeEntity(e) {
  ents.splice(ents.indexOf(e), 1);
  for (let j = 0; j < e.h; j++) for (let i = 0; i < e.w; i++) occ[(e.y + j) * WW + e.x + i] = null;
  if (sel === e) sel = null;
  dirty.sort = true;
}

function initWorld() {
  WW = SPEC.WW; WH = SPEC.WH; N = WW * WH; qbuf = new Int32Array(N);
  compBuf = Array.from({ length: NL }, () => new Int32Array(N));
  terrainCv.width = WW * T; terrainCv.height = WH * T;
  cabCv.forEach(c => { c.width = WW * T; c.height = WH * T; }); cabAllCv.width = WW * T; cabAllCv.height = WH * T;
  mm.width = WW * 2; mm.height = WH * 2;
  miniCv.width = WW; miniCv.height = WH;
  occ = new Array(N).fill(null);
  cab = Array.from({ length: NL }, () => new Uint8Array(N));
  ents = []; hist = []; stroke = null; sel = null; cleared = new Set();
  generateWorld();
  for (const d of DISTRICTS) {
    d.restored = false;
    d.hub = addEntity(HUB_OF[d.kind || 'res'], d.x, d.y, { district: d });
    for (const [rx, ry] of d.ruins) addEntity('ruin', rx, ry, { district: d });
  }
  for (const s of SITES) addEntity(s.kind === 'station' ? 'dormantStation' : 'dormant', s.x, s.y, { site: s.kind });
  for (const b of START_BUILDINGS) addEntity(b.type, b.x, b.y);
  goHome();
}
function goHome() { const home = DISTRICTS.find(d => d.home) || DISTRICTS[0]; centerOn(home.x + 1, home.y + 1); }
function centerOn(tx, ty) { camX = tx * T - VW / 2; camY = ty * T - VH / 2; clampCam(); }

// ---------- the simulation ----------
function recompute() { needSolve = true; }
function outMult(e) {
  const d = BUILD[e.type];
  if (e.cond <= 0) return 0;
  if (d.fuel && stock.fuel <= 0) return 0;
  if (d.partsUse && stock.parts <= 0) return 0;
  if (d.needsAll) for (let L = 0; L < 3; L++) if (d.dem[L] > 0 && !e.ok[L] && !(activeMods.has('blackstart') && e.type === 'powerplant' && L === 1)) return 0;
  let m = e.cond < 20 ? 0.5 : e.cond < 50 ? 0.8 : 1;
  if ((e.type === 'solar' || e.type === 'solarfarm') && radUntil > gameT) m *= 0.4;
  { const tm = TM(); if (e.type === 'solar' || e.type === 'solarfarm') m *= tm.solar || 1; else if (e.type === 'wind' || e.type === 'windfarm') m *= tm.wind || 1; else if (e.type === 'fission' || e.type === 'fusion') m *= tm[e.type] || 1; else if (e.type === 'hydro') m *= tm.hydro || 1; else if (e.type === 'pump') m *= tm.pump || 1; else if (e.type === 'well') m *= tm.well || 1;
    if (d.sup[0] > 0 && d.fuel) m *= tm.genOut || 1; if (d.sup[1] > 0) m *= tm.waterOut || 1; if (d.sup[2] > 0) m *= tm.netOut || 1; }
  if (d.sup[0] > 0 && Meta.has('efficiency')) m *= 1.2;
  if (activeMods.has('core')) m *= 1.1;
  if (d.sup[2] > 0 && Meta.has('netboost')) m *= 1.25;
  if (e.type === 'pump' && Meta.has('pumps2')) m *= 1.25;
  if (jamUntil > gameT && d.sup[2] > 0 && !d.central) m *= 0.15;                         // jammed by Dimmer raiders
  if (surgeUntil > gameT && (d.sup[0] > 0 || d.sup[1] > 0 || d.sup[2] > 0)) m *= surgeMul;   // HQ overcharge order
  return m;
}
function solveNow() {
  needSolve = false; computeImports();
  for (const e of ents) if (e.isHub === undefined) e.isHub = !!BUILD[e.type].isHub;
  solvePass(); solvePass();
  fuelCap = 100 + (typeof qmLvl === 'function' ? 25 * qmLvl('tank') : 0) + (CUR.kitFuel ? 50 : 0); income = 0; upkeep = 0; alerts = [];
  const anyRestored = DISTRICTS.some(x => x.restored);
  for (const e of ents) e.linked = isLinked(e);
  const clinics = ents.filter(e => e.type === 'clinic' && e.cond > 0 && e.ok.every(Boolean));
  for (const e of ents) {
    const d = BUILD[e.type], needs = d.dem[0] + d.dem[1] + d.dem[2] > 0, allOk = d.dem.every((v, L) => v === 0 || e.ok[L]);
    e.active = needs && allOk && e.cond > 0;
    e.run = e.linked && e.cond > 0 && allOk && (!d.fuel || stock.fuel > 0) && (!d.partsUse || stock.parts > 0) && (!d.poolUse || Pool.has(d.poolUse));
    if (d.fuelCap && e.cond > 0) fuelCap += Math.round(d.fuelCap * (TM().fuelStore || 1));
    if (d.upkeep && anyRestored && e.run) upkeep += d.upkeep * (Meta.has('logistics') ? 0.75 : 1) * (TM().upkeep || 1);      // idle or unwired machines cost nothing
    if (e.active && d.income && (!d.partsUse || stock.parts > 0) && (!d.fuel || stock.fuel > 0)) {      // converters (assembly plant) only earn while they have stock
      income += d.income;
      if (e.type === 'house' && clinics.some(c => Math.abs(c.x - e.x) <= 8 && Math.abs(c.y - e.y) <= 8)) income += 1;
    }
    if (d.maint && e.cond <= 0) alerts.push({ e, miss: ['FAILED'], label: d.name, jump: 1 });
    else if (needs && !e.active && !(e.type === 'hub' && false)) {
      const miss = [0, 1, 2].filter(L => d.dem[L] > 0 && !e.ok[L]).map(L => RES_SHORT[L] + (tierOf(e, L) ? '*' : ''));
      alerts.push({ e, miss, label: e.district ? e.district.name + (e.district.restored ? '' : ' HUB') : d.name });
    } else if (d.bridge !== undefined && !e.live && e.on) alerts.push({ e, miss: ['NO SIGNAL'], label: d.name });
    else if (d.fuel && stock.fuel <= 0) alerts.push({ e, miss: ['NO FUEL'], label: d.name });
    else if (d.partsUse && stock.parts <= 0 && !d.central) alerts.push({ e, miss: ['NO PARTS'], label: d.name });
    else if (d.poolUse && !Pool.has(d.poolUse) && e.linked && allOk) alerts.push({ e, miss: ['NO ' + Object.keys(d.poolUse).map(k => GOODS[k].s).join('/')], label: d.name });
  }
  stationEnt = ents.find(e => BUILD[e.type].isStation) || null;
  activeMods = new Set(stationEnt && stationEnt.run && stationEnt.cond > 0 ? stationEnt.mods : []);
  if (activeMods.has('sorter')) income = Math.round(income * 1.25 * 10) / 10;
  let dmg = 0, firstDmg = -1; for (let L = 0; L < NL; L++) for (let i = 0; i < N; i++) if (cab[L][i] === 2) { dmg++; if (firstDmg < 0) firstDmg = i; }
  if (dmg) alerts.unshift({ cable: firstDmg, miss: [dmg + ' DAMAGED'], label: 'LINES' });
  if (stock.fuel < 20 && ents.some(e => BUILD[e.type].fuel)) alerts.unshift({ miss: ['FUEL LOW'], label: 'STOCK' });
  alerts.sort((a, b) => (b.e && b.e.isHub) - (a.e && a.e.isHub));
  opsAlerts();
  for (const d of DISTRICTS) {
    if (!d.restored && d.hub.active) {
      d.restored = true;
      if (!restoring) {
        scrap += 40; toast(d.name + ' RESTORED! +40 scrap. ' + LORE[d.kind || 'res'][Math.random() * LORE[d.kind || 'res'].length | 0]);
        [523, 659, 784, 1047].forEach((f, k) => beep(f, 0.16, 'square', 0.05, k * 0.09));
        setTimeout(() => storyEv('hub'), 2200);                       // the very first light of the campaign
      }
      refreshDistrictButtons();
    }
  }
  if (!won && !restoring && DISTRICTS.length && DISTRICTS.every(d => d.restored)) {
    won = true; $('win').style.display = 'flex'; $('win-title').textContent = Builder.name + ' RESTORED';
    const sr = starRating(); $('win-stars').innerHTML = starsHtml(sr); $('win-text').textContent = sr === 3 ? 'Flawless. Every machine runs and every plant is awake.' : 'Every district hums with power, clean water and a working network. Repair every fault and wake the plants for more stars.';
  }
  Net.refresh();
  if (!transformerFired && !restoring && ents.some(e => BUILD[e.type].bridge !== undefined && e.live && e.on && e.cond > 0)) { transformerFired = true; setTimeout(() => storyEv('transformer'), 1200); }
  dirty.cab = dirty.mini = dirty.ui = true;
}

// one game second: storage, fuel, parts, wear, repairs, faults, scrap
function tick() {
  gameT++;
  if (needSolve) solveNow();
  for (const c of groups) {
    if (!c.stores.length) continue;
    let net = c.base - c.demand;
    if (net > 0) for (const e of c.stores) { if (e.cond <= 0) continue; const st = BUILD[e.type].store, add = Math.min(net, st.rate * storeMult(), st.cap - e.charge); if (add > 0) { e.charge += add; net -= add; } }
    else if (net < 0) { let def = -net; for (const e of c.stores) { if (e.charge <= 0 || e.cond <= 0) continue; const st = BUILD[e.type].store, d = Math.min(def, st.rate * storeMult(), e.charge); e.charge -= d; def -= d; } }
  }
  for (const e of ents) {
    const d = BUILD[e.type];
    if (e.run) {
      if (d.fuel) stock.fuel -= d.fuel * (activeMods.has('fuelrec') ? 0.75 : 1) * (TM().fuel || 1); if (d.fuelOut) stock.fuel += d.fuelOut * (TM().fuelOut || 1);
      if (d.partsOut) stock.parts += d.partsOut * (TM().partsOut || 1); if (d.partsUse) stock.parts -= d.partsUse;
      if (d.rp) { Meta.rp += d.rp * (TM().rp || 1); Meta.dirty = true; }
      if (d.poolUse) for (const k in d.poolUse) Pool.take(k, d.poolUse[k]);
      if (d.prod) for (const k in d.prod) Pool.add(k, d.prod[k] * (TM()[k + 'Out'] || 1) * (e.mult || 1));
    } else if (e.isHub && e.active) { if (d.partsOut) stock.parts += d.partsOut * (TM().partsOut || 1); if (d.rp) { Meta.rp += d.rp * (TM().rp || 1); Meta.dirty = true; } }
    if (d.maint && e.cond > 0 && e.run && DISTRICTS.some(x => x.restored)) e.cond = Math.max(0, e.cond - d.maint * WMOD.wear * (TM().wear || 1));   // only working machines wear
  }
  Pool.exchange(ents);
  stock.fuel = Math.max(0, Math.min(fuelCap, stock.fuel)); stock.parts = Math.max(0, stock.parts);
  for (const dep of ents) {                            // maintenance crews
    const d = BUILD[dep.type]; if (!d.repair || !dep.run) continue;
    const rate = d.repair.rate * (Meta.has('crews') ? 2 : 1);
    ents.filter(e => BUILD[e.type].maint && e.cond < 100 && e.cond > 0 && Math.hypot(e.x - dep.x, e.y - dep.y) <= d.repair.radius).sort((a, b) => a.cond - b.cond).slice(0, d.repair.max).forEach(e => { e.cond = Math.min(100, e.cond + rate); });
  }
  if (TM().autoRepair) ents.forEach(e => { if (BUILD[e.type].maint && e.cond > 0 && e.cond < 100) e.cond = Math.min(100, e.cond + TM().autoRepair); });
  if (TM().partsFlow && DISTRICTS.some(x => x.restored)) stock.parts += TM().partsFlow;
  if (activeMods.has('link')) { Meta.rp += 1.5; Meta.dirty = true; }
  if (activeMods.has('repair')) ents.forEach(e => { if (BUILD[e.type].maint && e.cond > 0 && e.cond < 100) e.cond = Math.min(100, e.cond + 0.15); });
  if (eventsOn && TM().ev !== 0 && DISTRICTS.some(x => x.restored) && --evT <= 0) { fireEvent(); evT = (70 + Math.random() * 80) * (activeMods.has('forecast') ? 1.3 : 1) * WMOD.ev * (TM().ev || 1); }
  scrap = Math.max(0, scrap + income * WMOD.inc * (TM().income || 1) - upkeep);
  Drones.tick(); Fix.tick();
  Flows.tick();
  Variety.tick();
  checkOutage();
  if (Meta.dirty && gameT % 5 === 0) Meta.save();
  opsTick();
  solveNow();
}
function fireEvent() {
  if (Variety.event()) return;                                  // traders, caravans, scouts, floods...
  Variety.count('faults');
  setTimeout(() => storyEv('fault'), 4200);
  const sw = ents.filter(e => BUILD[e.type].sw !== undefined && e.on), maintainable = ents.filter(e => BUILD[e.type].maint && e.cond > 30 && !BUILD[e.type].fixed);
  const roll = Math.random(), diff = SPEC.diff || 0;
  if (roll < 0.35) {
    const live = []; for (let L = 0; L < NL; L++) for (let i = 0; i < N; i++) if (cab[L][i] === 1) live.push([L, i]);
    if (!live.length) return;
    let n = 2 + (Math.random() * 3 | 0) + (diff / 3 | 0); if (Meta.has('hardening')) n = Math.ceil(n / 2); n = Math.max(1, Math.round(n * (TM().stormN || 1))); if (activeMods.has('shield')) n = Math.max(1, Math.ceil(n / 4));
    for (let k = 0; k < n; k++) { const [L, i] = live[Math.random() * live.length | 0]; cab[L][i] = 2; }
    toast('STORM! ' + n + ' lines were damaged. Use the REPAIR tool (V) or a maintenance depot.'); beep(120, 0.4, 'sawtooth', 0.05);
  } else if (roll < 0.7 && maintainable.length && !(activeMods.has('guard') && Math.random() < 0.5)) {
    const e = maintainable[Math.random() * maintainable.length | 0]; e.cond = 0;
    toast('EQUIPMENT FAILURE: ' + BUILD[e.type].name + ' broke down. Repair it (V).'); beep(90, 0.5, 'sawtooth', 0.05); centerOn(e.x + 1, e.y + 1);
  } else if (roll < 0.85 && sw.length && !activeMods.has('guard')) {
    const e = sw[Math.random() * sw.length | 0]; e.on = false;
    toast('POWER SURGE tripped a ' + BUILD[e.type].name + '. Switch it back on (T).'); beep(140, 0.3, 'sawtooth', 0.05);
  } else { radUntil = gameT + 50; toast('RADIATION STORM! Solar output is crippled for a while.'); beep(70, 0.6, 'sawtooth', 0.05); }
  recompute();
}

// ---------- building rules ----------
const nearRestoredHub = (x, y) => DISTRICTS.some(d => d.restored && Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) <= HOUSE_RADIUS);
function costText(d) { return d.cost + (d.parts ? ' +' + d.parts + 'P' : '') + (d.pool && typeof Pool !== 'undefined' ? ' +' + Pool.costText(d.pool, true).replace(/ /g, ' +') : ''); }
function canPlace(type, x, y) {
  const d = BUILD[type];
  if (!unlocked(type)) return 'LOCKED - RESEARCH ' + TECH[d.tech].name + ' (Y)';
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const tx = x + i, ty = y + j;
    if (!inb(tx, ty)) return 'OUT OF BOUNDS';
    const k = ty * WW + tx;
    if (terrain[k] === 1 || terrain[k] === 5) return 'CAN\'T BUILD ON WATER';
    if (terrain[k] === 2) return 'CLEAR THE RUBBLE FIRST (SALVAGE)';
    if (terrain[k] === 4) return 'ROCK IN THE WAY';
    if (occ[k]) return 'SOMETHING IS ALREADY HERE';
    if (Loot.at(tx, ty)) return 'OPEN THE SUPPLY CACHE FIRST (CLICK IT)';
    if (cab.some(a => a[k])) return 'SALVAGE THE LINES FIRST';
  }
  if (!Net.areaCovered(x, y, d.w, d.h)) return d.relay ? 'OUTSIDE YOUR SIGNAL - RELAYS MUST BE PLACED INSIDE IT' : 'OUTSIDE YOUR SIGNAL - EXTEND IT WITH SAT RELAYS (LINES TAB)';
  if (d.relay && !Net.linkFor(x, y, d)) return 'TOO FAR FROM A HUB OR RELAY';
  if (d.needWater) {
    let ok = false;
    for (let j = -1; j <= d.h; j++) for (let i = -1; i <= d.w; i++) if (inb(x + i, y + j) && terrain[(y + j) * WW + x + i] === 1) ok = true;
    if (!ok) return d.name + ' MUST BE NEXT TO WATER';
  }
  if (d.town && !nearRestoredHub(x, y)) return 'NEEDS A RESTORED HUB WITHIN ' + HOUSE_RADIUS + ' TILES';
  if (scrap < d.cost) return 'NOT ENOUGH SCRAP (' + d.cost + ')';
  if (d.parts && stock.parts < d.parts) return 'NOT ENOUGH PARTS (' + d.parts + ') - BUILD WORKSHOPS';
  if (d.pool && !Pool.afford(d.pool)) return 'NEEDS SHARED ' + Pool.costText(d.pool).toUpperCase() + ' (AGES SCREEN, G ON THE MAP)';
  return null;
}

// ---------- undo ----------
function beginStroke() { stroke = { ops: [] }; }
function note(undoFn) { if (stroke) stroke.ops.push(undoFn); }
function endStroke() { if (stroke && stroke.ops.length) { hist.push(stroke); if (hist.length > 60) hist.shift(); } stroke = null; updateUndoBtn(); }
function undo() {
  const s = hist.pop(); if (!s) { toast('NOTHING TO UNDO'); return; }
  for (let k = s.ops.length - 1; k >= 0; k--) s.ops[k]();
  recompute(); beep(200, 0.06, 'triangle'); updateUndoBtn();
}
function updateUndoBtn() { $('btn-undo').disabled = !hist.length; }

// ---------- tool actions ----------
let lastToast = 0;
let toastUntil = 0, tipIdx = 0, tipT = 0;
// ---------- the news feed: every message, tagged and timestamped ----------
const Feed = {
  items: [], flt: 'all', seq: 0,
  kind(m) {
    if (/^TIP:/.test(m)) return 'tip';
    if (/RAID|STORM|FAILED|CASCADE|EXPLOD|STRAIN|JAMM|ARSON|OUTAGE|SABOTAGE|WARBAND|TRIP|FLOOD|NOT ENOUGH|CAN'T|CANNOT|NO ROUTE|SAVE FAILED|FIRE|CRITICAL|LOW|ASSAULT FAILS|SCAVENGER/i.test(m)) return 'alert';
    if (/GOAL|OBJECTIVE|FOUND|CAMP DESTROYED|credits|CONTRACT|REPELLED|RESTORED|BONUS|SUPPLY|LAID|SOLD|BOUGHT|CLEARED|MENDED|UNLOADED/i.test(m)) return 'good';
    return 'info';
  },
  clock() { const t = Math.floor(typeof gameT === 'number' ? gameT : 0); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); },
  push(msg) {
    const last = this.items[0]; if (last && last.m === msg && performance.now() - last.p < 3000) return;
    this.items.unshift({ m: msg, k: this.kind(msg), t: this.clock(), p: performance.now(), n: ++this.seq }); if (this.items.length > 60) this.items.pop(); this.render();
  },
  clear() { this.items = []; this.render(); },
  render() {
    const box = $('newsfeed'); if (!box) return; const list = this.items.filter(x => this.flt === 'all' || x.k === 'alert').slice(0, 24);
    const tag = { alert: 'ALERT', good: 'GOOD', tip: 'TIP', info: 'INFO' };
    box.innerHTML = list.length ? list.map((x, i) => `<div class="nw k-${x.k} ${i > 1 ? 'old' : ''} ${i === 0 && performance.now() - x.p < 1500 ? 'fresh' : ''}"><i>${x.t}</i><b>${tag[x.k]}</b><span>${x.m.replace(/^TIP: /, '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></div>`).join('') : '<div class="nw k-info"><i>--:--</i><b>INFO</b><span>' + (this.flt === 'alert' ? 'No alerts. Good.' : 'Nothing has happened yet.') + '</span></div>';
    const c = $('newscount'); if (c) c.textContent = this.items.length ? this.items.length + ' MSG' : '';
  },
};
document.addEventListener('click', e => { const b = e.target.closest('#newsflt button'); if (!b) return; Feed.flt = b.dataset.nf; document.querySelectorAll('#newsflt button').forEach(x => x.classList.toggle('on', x === b)); Feed.render(); });
function toast(msg) {
  Feed.push(msg);
  $('banner').textContent = msg; $('banner').classList.add('show');
  toastUntil = performance.now() + 5200;
  clearTimeout(toast.t); toast.t = setTimeout(() => { $('banner').classList.remove('show'); refreshTip(true); }, 5200);
}
function warnOnce(msg) { if (performance.now() - lastToast > 800) { toast(msg); lastToast = performance.now(); } }
const blockedTerrain = i => terrain[i] === 1 || terrain[i] === 2 || terrain[i] === 4;

function repairCable(x, y) {
  if (!inb(x, y)) return; const i = y * WW + x; let did = false;
  for (let L = 0; L < NL; L++) if (cab[L][i] === 2) { const c = LAYERS[L].cost || 1; if (scrap < c) return warnOnce('NOT ENOUGH SCRAP'); scrap -= c; cab[L][i] = 1; did = true; }
  if (did) { Tutorial.repaired = true; beep(500, 0.05, 'triangle'); recompute(); }
}
function repairEntity(e) {
  const d = BUILD[e.type]; if (!d.maint || e.cond >= 100) return false;
  const miss = 100 - e.cond, sc = Math.ceil(miss * 0.4 * (TM().repair || 1)), pt = Math.ceil(miss / 50) - (e.cond > 0 ? 0 : 0);
  if (scrap < sc) { warnOnce('REPAIR NEEDS ' + sc + ' SCRAP'); return false; }
  if (stock.parts < pt) { warnOnce('REPAIR NEEDS ' + pt + ' PARTS (WORKSHOPS MAKE THEM)'); return false; }
  scrap -= sc; stock.parts -= pt; e.cond = 100; Tutorial.repaired = true; beep(660, 0.08, 'triangle'); toast(d.name + ' repaired (-' + sc + ' scrap' + (pt ? ', -' + pt + ' parts' : '') + ')'); recompute(); return true;
}
function salvageAt(x, y) {
  if (!inb(x, y)) return;
  const i = y * WW + x, e = occ[i];
  if (e) {
    const d = BUILD[e.type];
    if (d.fixed) return warnOnce('CAN\'T SALVAGE THAT');
    if (d.central || d.isStation) return warnOnce('THE ' + d.name + ' CAN\'T BE SALVAGED');
    const refund = d.refund !== undefined ? d.refund : Math.floor((d.cost || 100) / 2), snap = { type: e.type, x: e.x, y: e.y, on: e.on, charge: e.charge, cond: e.cond };
    scrap += refund; removeEntity(e);
    note(() => { scrap -= refund; addEntity(snap.type, snap.x, snap.y, { on: snap.on, charge: snap.charge, cond: snap.cond }); });
    beep(140, 0.1, 'sawtooth'); recompute(); return;
  }
  if (terrain[i] === 2) {
    const gain = (Meta.has('recycling') ? 6 : 3) * (TM().rubble || 1); Variety.count('salv'); terrain[i] = 0; cleared.add(i); tileTerrain(x, y); scrap += gain; if (Math.random() < 0.25) { stock.parts += 1; } beep(220, 0.05, 'sawtooth'); dirty.mini = true;
    note(() => { terrain[i] = 2; cleared.delete(i); tileTerrain(x, y); scrap -= gain; });
    return;
  }
  const had = Array.from({ length: NL }, (_, L) => L).filter(L => cab[L][i]);
  if (had.length) { const was = had.map(L => cab[L][i]), ref = had.reduce((a, L) => a + (LAYERS[L].cost || 1), 0); had.forEach(L => { cab[L][i] = 0; }); scrap += ref; note(() => { had.forEach((L, k) => { cab[L][i] = was[k]; }); scrap -= ref; }); recompute(); }
}
function toggleSwitch(e) {
  if (!e || BUILD[e.type].sw === undefined) return false;
  beginStroke(); e.on = !e.on; e.manual = !e.on; const was = e.on; note(() => { e.on = !was; }); endStroke();
  beep(e.on ? 600 : 300, 0.08); toast(BUILD[e.type].name + (e.on ? ' ON' : ' OFF - line cut'));
  recompute(); return true;
}
let paintMode = 'paint';
function act(x, y, first) {
  if (!inb(x, y)) return;
  if (tool.kind === 'cable') {
    if (first) paintMode = cab[tool.L][y * WW + x] === 1 ? 'erase' : cab[tool.L][y * WW + x] === 2 ? 'fix' : 'paint';
    if (paintMode === 'fix') repairCable(x, y); else cableAt(tool.L, x, y, paintMode);
  } else if (tool.kind === 'multi') multiAct(x, y, first);
  else if (tool.kind === 'route') { if (first) Route.click(x, y); }
  else if (tool.kind === 'salvage') salvageAt(x, y);
  else if (tool.kind === 'repair') { const e = occ[y * WW + x]; if (e && first) repairEntity(e); else repairCable(x, y); }
  else if (tool.kind === 'inspect' && first) {
    const e = occ[y * WW + x]; sel = e || null; dirty.ui = true; if (e) showTab('status');
    if (e && BUILD[e.type].sw !== undefined) { stroke = null; toggleSwitch(e); }
    beep(520, 0.04);
  } else if (tool.kind === 'build' && first) {
    const why = canPlace(tool.type, x, y);
    if (why) { toast(why); beep(110, 0.12, 'sawtooth'); return; }
    const d = BUILD[tool.type], paid = d.cost; scrap -= paid; stock.parts -= d.parts || 0; if (d.pool) Pool.pay(d.pool);
    const e = addEntity(tool.type, x, y);
    note(() => { removeEntity(e); scrap += paid; stock.parts += d.parts || 0; if (d.pool) Pool.refund(d.pool); });
    beep(440, 0.08); beep(660, 0.1, 'square', 0.035, 0.07); recompute();
    if (tool.type === 'house' || tool.type === 'refinery') setTimeout(() => storyEv(tool.type), 2400);
  }
}

// ---------- input ----------
const keys = {};
let drag = null, glide = null, spaceHeld = false, spaceUsed = false;
function toGame(ev) { const r = cv.getBoundingClientRect(), s = r.width / W * camZ; return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s }; }      // view coordinates (zoom already removed)
const toScreen = ev => { const r = cv.getBoundingClientRect(), s = r.width / W; return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s }; };
function setZoom(z, sx, sy) {                                  // keep the world point under (sx, sy) [canvas pixels] where it is
  if (!ZOOMS.includes(z) || z === camZ) return;
  if (sx === undefined) { sx = W / 2; sy = H / 2; }
  const wx = sx / camZ + camX, wy = sy / camZ + camY;
  camZ = z; VW = W / z; VH = H / z; camX = wx - sx / z; camY = wy - sy / z; clampCam();
  try { localStorage.setItem('wastelandGrid.zoom', String(z)); } catch (e) { /* ignore */ }
  const l = $('gz-lbl'); if (l) l.textContent = (z === 0.75 ? '.75' : z) + 'x'; dirty.mini = true;
}
function stepZoom(dir, sx, sy) { setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(camZ) + dir))], sx, sy); }
const overMini = () => false;
function clampCam() { camX = Math.max(0, Math.min(Math.max(0, WW * T - VW), camX)); camY = Math.max(0, Math.min(Math.max(0, WH * T - VH), camY)); }
function lineTiles(x0, y0, x1, y1, fn) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (; ;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
const miniTo = () => {};
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  if (!Builder.active) return;
  const p = toGame(e);
  glide = null;
  if (e.button === 2 || e.button === 1) { e.preventDefault(); drag = { mode: 'pan', px: p.x, py: p.y, sx: p.x, sy: p.y, btn: e.button, vx: 0, vy: 0, lt: 0 }; cv.style.cursor = 'grabbing'; return; }
  if (spaceHeld) { spaceUsed = true; drag = { mode: 'pan', px: p.x, py: p.y, sx: p.x, sy: p.y, btn: 0, moved: true, vx: 0, vy: 0, lt: 0 }; cv.style.cursor = 'grabbing'; return; }   // hold SPACE and drag to pan with any tool
  if (overMini(p)) { drag = { mode: 'mini' }; miniTo(p); return; }
  const tx = Math.floor((p.x + camX) / T), ty = Math.floor((p.y + camY) / T);
  if (Loot.tryOpen(tx, ty)) { drag = null; return; }                              // supply caches open with a click, whatever tool you hold
  if (Camp.tryClick(tx, ty)) { drag = null; return; }                             // so does the Dimmer camp: it asks whether to attack
  if (tool.kind === 'inspect') { drag = { mode: 'pan', btn: 0, px: p.x, py: p.y, sx: p.x, sy: p.y, tile: { x: tx, y: ty }, vx: 0, vy: 0, lt: 0 }; return; }   // click selects on release, drag pans
  drag = { mode: 'paint', last: { x: tx, y: ty }, start: { x: tx, y: ty } };
  beginStroke(); act(tx, ty, true);
});
addEventListener('mousemove', e => {
  const p = toGame(e); mouse.x = p.x; mouse.y = p.y; mouse.in = p.x >= 0 && p.y >= 0 && p.x < VW && p.y < VH;
  hover = { x: Math.floor((p.x + camX) / T), y: Math.floor((p.y + camY) / T) };
  if (!drag) return;
  if (drag.mode === 'pan') {
    if (!drag.moved) { if (Math.hypot(p.x - drag.sx, p.y - drag.sy) <= 4) return; drag.moved = true; drag.px = p.x; drag.py = p.y; cv.style.cursor = 'grabbing'; }
    const dx = p.x - drag.px, dy = p.y - drag.py; camX -= dx; camY -= dy; drag.vx = drag.vx * 0.5 + dx * 0.5; drag.vy = drag.vy * 0.5 + dy * 0.5; drag.lt = performance.now(); drag.px = p.x; drag.py = p.y; clampCam();
  }
  else if (drag.mode === 'mini') miniTo(p);
  else if (tool.kind === 'cable' || tool.kind === 'multi' || tool.kind === 'salvage' || tool.kind === 'repair') {
    let tx = hover.x, ty = hover.y;
    if (e.shiftKey && drag.start) { if (Math.abs(tx - drag.start.x) > Math.abs(ty - drag.start.y)) ty = drag.start.y; else tx = drag.start.x; }
    lineTiles(drag.last.x, drag.last.y, tx, ty, (x, y) => { if (x !== drag.last.x || y !== drag.last.y) act(x, y, false); });
    drag.last = { x: tx, y: ty };
  }
});
addEventListener('mouseup', () => {
  if (drag && drag.mode === 'paint') endStroke();
  if (drag && drag.mode === 'pan') {
    if (drag.moved) { if (performance.now() - drag.lt < 90 && Math.hypot(drag.vx, drag.vy) > 0.7) glide = { vx: -drag.vx, vy: -drag.vy }; }                    // let go while moving: the view keeps gliding
    else if (drag.btn === 2 && Builder.active && tool.kind === 'route' && Route.a) { Route.a = null; Route.path = null; toast('Route cancelled.'); }
    else if (drag.btn === 2 && Builder.active && tool.kind !== 'inspect') selectTool(TOOLS.find(t => t.kind === 'inspect'));                                 // a plain right-click drops the current tool
    else if (drag.btn === 0 && drag.tile && Builder.active) { beginStroke(); act(drag.tile.x, drag.tile.y, true); endStroke(); }                           // a plain click selects / flips a switch
  }
  drag = null; cv.style.cursor = '';
});
let wheelAcc = 0;
cv.addEventListener('wheel', e => {                              // mouse wheel / trackpad: zoom the play area around the pointer
  e.preventDefault(); if (!Builder.active) return;
  wheelAcc += e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
  if (Math.abs(wheelAcc) < 40) return;
  const s = toScreen(e); stepZoom(wheelAcc < 0 ? 1 : -1, s.x, s.y); wheelAcc = 0;
}, { passive: false });
cv.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
cv.addEventListener('dblclick', e => { if (Builder.active && tool.kind === 'inspect') { const p = toGame(e); if (!occ[Math.floor((p.y + camY) / T) * WW + Math.floor((p.x + camX) / T)]) setZoom(1); } });
addEventListener('keydown', e => {
  if (!Builder.active) return;
  const k = e.key.toLowerCase();
  if ([...document.querySelectorAll('.overlay')].some(o => o.style.display === 'flex') && !['escape', '?', '/', 'j', 'y'].includes(k)) return;   // dialogs open: don't change tools or pan underneath them
  keys[k] = true;
  if (e.ctrlKey || e.metaKey) { if (k === 'z') { e.preventDefault(); undo(); } return; }
  if ($('research').style.display === 'flex') { if (k === 'escape' || k === 'y') closeResearch(); return; }
  const t = TOOLS.find(t => t.key === k); if (t) selectTool(t);
  if (k === 'escape') { $('guide').style.display = 'none'; selectTool(TOOLS.find(t => t.kind === 'inspect')); sel = null; dirty.ui = true; $('help').style.display = 'none'; }
  if (k === ' ') { e.preventDefault(); if (!e.repeat) { spaceHeld = true; spaceUsed = false; cv.style.cursor = 'grab'; } }      // tap SPACE to pause, hold it and drag to pan
  if (k === 't' && mouse.in && inb(hover.x, hover.y)) toggleSwitch(occ[hover.y * WW + hover.x]);
  if (k === '+' || k === '=' && e.shiftKey || k === 'add') { e.preventDefault(); stepZoom(1); }
  if (k === '-' || k === '_' || k === 'subtract') { e.preventDefault(); stepZoom(-1); }
  if (k === '\\') setZoom(1);
  if (k === '.') jumpAlert(1); if (k === ',') jumpAlert(-1);
  if (k === 'home') goHome(); if (k === 'tab') { e.preventDefault(); cycleTab(); } if (k === 'l') setFocus(focus >= 2 ? -1 : focus + 1); if (k === 'm') toggleMute(); if (k === 'y') openResearch();
  if (k === '?' || k === '/') $('help').style.display = $('help').style.display === 'flex' ? 'none' : 'flex';
  if (k === '[') setSpeed(speed === 4 ? 2 : speed === 2 ? 1 : speed);
  if (k === ']') setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : speed);
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; if (e.key === ' ' && spaceHeld) { spaceHeld = false; if (!drag) cv.style.cursor = ''; if (!spaceUsed && Builder.active) setSpeed(speed === 0 ? 1 : 0); } });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; spaceHeld = false; });

// ---------- UI ----------
function setSpeed(s) { speed = s; document.querySelectorAll('#speedseg button').forEach(b => b.classList.toggle('on', +b.dataset.s === s)); $('pausetag').style.display = s === 0 ? 'block' : 'none'; }
function setFocus(f) { focus = f; document.querySelectorAll('#viewseg button').forEach(b => b.classList.toggle('on', +b.dataset.f === f)); dirty.cab = true; }
function toggleMute() { muted = !muted; try { localStorage.setItem('wastelandGrid.mute', muted ? '1' : '0'); } catch (e) { /* ignore */ } $('btn-mute').textContent = muted ? 'SND OFF' : 'SND ON'; }
function iconCanvas(type) {
  return iconCanvasOf(type) || IMG[type];
}
function iconCanvasOf(type) {
  return ({ generator: IMG.gen, solar: IMG.solar, wind: IMG.windA, battery: batterySprite(3), pump: IMG.pump, tower: IMG.tower, router: IMG.router,
    substation: switchSprite(0, true), valve: switchSprite(1, true), node: switchSprite(2, true), house: IMG.houseOn, workshop: workshopSprite(true),
    clinic: IMG.clinic, intertie: IMG.intertie, security: IMG.security, hydro: IMG.hydro, gasturbine: IMG.gasturbine, desal: IMG.desal, relay: IMG.relay, apartments: IMG.apartments, market: IMG.market, school: IMG.school, greenhouse: IMG.greenhouse, lab: IMG.lab, depot: IMG.depot, fueldepot: IMG.fueldepot, refinery: IMG.refinery })[type];
}
const ICON_URL = {};
const iconUrl = (type, c) => ICON_URL[type] || (ICON_URL[type] = c.toDataURL());      // encode each icon once
function iconFor(t) {
  const c = t.kind === 'build' ? iconCanvas(t.type) : null;
  if (c) return `<img class="${c.width === 8 ? 'sm' : ''}" src="${iconUrl(t.type, c)}" alt="">`;
  if (t.kind === 'cable') return `<span class="ico line" style="--lc:${t.color}"></span>`;
  return `<span class="ico" style="color:${t.color}">${t.kind === 'multi' ? pxi('multi') : t.kind === 'route' ? pxi('route') : t.kind === 'salvage' ? pxi('cut') : t.kind === 'inspect' ? pxi('look') : t.kind === 'repair' ? pxi('plus') : ''}</span>`;
}
const CATS = [...new Set(TOOLS.map(t => t.cat))];
const TABS = ['build', 'status', 'sites', 'goals'];
function showTab(n) { curTab = n; if (n === 'build') setTimeout(fitCatalogue, 0); if (n === 'status') setTimeout(() => { lastAlertKey = ''; updateAlerts(); }, 0); document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === n)); TABS.forEach(t => { const el = $('tab-' + t); if (el) el.classList.toggle('on', t === n); }); }
function cycleTab() { showTab(TABS[(TABS.indexOf(curTab) + 1) % TABS.length]); }
document.querySelectorAll('#tabs button').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
let toolQuery = '';
function buildToolbar() {
  const cats = $('cats'); cats.innerHTML = '';
  CATS.forEach(c => { const b = document.createElement('button'); b.innerHTML = `<span>${c}</span><small>${TOOLS.filter(t => t.cat === c).length}</small>`; b.dataset.cat = c; b.style.setProperty('--cc', CATCOL[c] || '#343e46'); b.onclick = () => { toolQuery = ''; $('toolsearch').value = ''; activeCat = c; renderTools(); selectTool(TOOLS.find(t => t.cat === c)); }; cats.appendChild(b); });
  renderTools(); selectTool(TOOLS[0]);
}
const toolAgeOk = t => t.kind !== 'build' || !BUILD[t.type].tech || TECH[BUILD[t.type].tech].age <= curAge();      // later ages reveal more buildings
function toolList() { const q = toolQuery.trim().toLowerCase(); return (q ? TOOLS.filter(t => (t.name + ' ' + t.cat + ' ' + (t.desc || '')).toLowerCase().includes(q)) : TOOLS.filter(t => t.cat === activeCat)).filter(toolAgeOk); }
function renderTools() {
  const bar = $('tools'); bar.innerHTML = ''; const box = document.createElement('div'); box.className = 'grid'; bar.appendChild(box);
  const list = toolList(); $('toolcount').textContent = toolQuery.trim() ? list.length + ' FOUND' : list.length + ' IN ' + activeCat;
  if (!list.length) box.innerHTML = '<div class="none">Nothing matches that.</div>';
  list.forEach(t => {
    const b = document.createElement('button');
    if (t.name.length > 10) b.classList.add('long');
    b.innerHTML = `${iconFor(t)}<span class="nm">${t.name}</span><span class="sub"></span><span class="ky">${t.key ? t.key.toUpperCase() : ''}</span><em class="ct"></em>`;
    b.title = t.desc + (t.kind === 'build' && !unlocked(t.type) && TECH[BUILD[t.type].tech] ? ' [Research: ' + TECH[BUILD[t.type].tech].name + ']' : ''); b.dataset.name = t.name; b.onclick = () => selectTool(t); b._t = t; b.style.setProperty('--c', CATCOL[t.cat] || '#343e46'); box.appendChild(b);
  });
  document.querySelectorAll('#cats button').forEach(b => b.classList.toggle('on', !toolQuery.trim() && b.dataset.cat === activeCat));
  refreshToolbar(); fitCatalogue();
}
function fitCatalogue() {                                           // tiles shrink in steps until every item is visible: the catalogue never scrolls or cuts
  const t = $('tools'), box = $('tab-build'), g = t && t.querySelector('.grid'); if (!g || !t.offsetHeight) return;
  box.classList.remove('compact', 'tiny');
  const cut = () => g.getBoundingClientRect().bottom > t.getBoundingClientRect().bottom + 1;
  if (cut()) { box.classList.add('compact'); if (cut()) { box.classList.remove('compact'); box.classList.add('tiny'); } }
}
const RES3 = ['PWR', 'H2O', 'NET'];
function statChips(d) {
  const c = []; d.sup.forEach((v, L) => { if (v > 0) c.push(`<span class="st sup">+${v} ${RES3[L]}</span>`); }); d.dem.forEach((v, L) => { if (v > 0) c.push(`<span class="st dem">needs ${v} ${RES3[L]}</span>`); });
  if (d.store) c.push(`<span class="st sup">stores ${d.store.cap}</span>`); if (d.fuel) c.push(`<span class="st dem">${d.fuel} fuel/s</span>`);
  if (d.prod) for (const k in d.prod) c.push(`<span class="st sup">+${d.prod[k]} ${GOODS[k].n.toLowerCase()}/s (shared)</span>`); if (d.poolUse) for (const k in d.poolUse) c.push(`<span class="st dem">uses ${d.poolUse[k]} ${GOODS[k].n.toLowerCase()}/s</span>`); if (d.exchange) c.push('<span class="st sup">trades parts + fuel</span>'); if (d.drones) c.push(`<span class="st sup">${d.drones.n} repair drones, ${d.drones.radius} tiles</span>`);
  if (d.fuelOut) c.push(`<span class="st sup">+${d.fuelOut} fuel/s</span>`); if (d.partsOut) c.push(`<span class="st sup">+${d.partsOut} parts/s</span>`); if (d.partsUse) c.push(`<span class="st dem">uses ${d.partsUse} parts/s</span>`);
  if (d.fuelCap) c.push(`<span class="st sup">+${d.fuelCap} fuel tank</span>`); if (d.scrapCap) c.push(`<span class="st sup">+${d.scrapCap} scrap cap</span>`);
  if (d.income) c.push(`<span class="st sup">+${d.income} scrap/s</span>`); if (d.rp) c.push(`<span class="st sup">+${d.rp} RP/s</span>`); if (d.upkeep) c.push(`<span class="st dem">${d.upkeep} upkeep</span>`);
  c.push(`<span class="st">${d.w}x${d.h} tiles</span>`); return c.join('');
}
function refreshToolbar() {
  const counts = {}; for (const e of ents) counts[e.type] = (counts[e.type] || 0) + 1;
  document.querySelectorAll('#tools button').forEach(b => {
    const t = b._t, lock = t.kind === 'build' && !unlocked(t.type), d = t.kind === 'build' ? BUILD[t.type] : null, poor = !lock && d && (scrap < d.cost || stock.parts < (d.parts || 0));
    b.classList.toggle('locked', lock); b.classList.toggle('poor', !!poor);
    const sub = b.querySelector('.sub'); sub.innerHTML = lock ? pxi('lock') + ' LOCKED' : d ? costText(d) : (t.cost || '');
    const ct = b.querySelector('.ct'); ct.textContent = d && counts[t.type] ? 'x' + counts[t.type] : '';
  });
}
function toolCard(t) {
  const lock = t.kind === 'build' && !unlocked(t.type), d = t.kind === 'build' ? BUILD[t.type] : null;
  let h = `<div class="tcard"><div class="tc-top">${iconFor(t)}<div><b>${t.name}</b><small>${t.cat}${t.key ? ' - KEY ' + t.key.toUpperCase() : ''}</small></div></div>`;
  if (d) h += `<div class="tc-chips"><span class="st cost">${d.cost} scrap</span>${d.parts ? `<span class="st cost">${d.parts} parts</span>` : ''}${d.pool ? Object.keys(d.pool).map(k => `<span class="st cost">${d.pool[k]} ${GOODS[k].n.toLowerCase()}</span>`).join('') : ''}${statChips(d)}</div>`;
  h += `<p>${t.desc}</p>`; if (lock) h += `<div class="lk">LOCKED: research ${TECH[d.tech].name} (Y)</div>`;
  return h + '</div>';
}
function selectTool(t) {
  tool = t; if (t.cat !== activeCat && !toolQuery.trim()) { activeCat = t.cat; renderTools(); }
  document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.name === t.name));
  if (t.kind !== 'inspect') sel = null; dirty.ui = true; updateInspector();
  if (t.kind !== 'inspect' && curTab !== 'build') showTab('build');
  if (typeof renderMulti === 'function') renderMulti();
}
document.addEventListener('input', e => { if (e.target.id === 'toolsearch') { toolQuery = e.target.value; renderTools(); } });
document.addEventListener('keydown', e => { if (e.target && e.target.id === 'toolsearch') { e.stopPropagation(); if (e.key === 'Escape') { e.target.value = ''; toolQuery = ''; e.target.blur(); renderTools(); } else if (e.key === 'Enter') { const f = toolList()[0]; if (f) { selectTool(f); e.target.blur(); } } } }, true);
function refreshDistrictButtons() {
  const box = $('districts'); box.innerHTML = '';
  DISTRICTS.forEach(d => {
    const b = document.createElement('button');
    b.innerHTML = pxi(d.restored ? 'sq' : 'sqo') + ' ' + d.name + ' ' + ({ res: '', ind: '[IND]', farm: '[FARM]', med: '[MED]', campus: '[LAB]' })[d.kind || 'res']; b.className = d.restored ? 'done' : '';
    b.onclick = () => centerOn(d.x + 1, d.y + 1); box.appendChild(b);
  });
  SITES.forEach(s => { const e = ents.find(q => q.x === s.x && q.y === s.y); const b = document.createElement('button'); const live = e && !String(e.type).startsWith('dormant'); b.innerHTML = pxi('dia') + ' ' + SITE_NAME[s.kind] + (s.kind === 'station' ? '' : ' PLANT') + (live ? ' ' + pxi('check') : ''); b.className = live ? 'done' : 'site'; b.onclick = () => centerOn(s.x + 1, s.y + 1); box.appendChild(b); });
}
function buildMeters() {
  $('meters').innerHTML = RESOURCES.map((l, i) => `<div class="meter"><span class="lab" style="color:${l.css}">${l.name}</span><div class="bar"><i id="mb${i}" style="background:${l.css}"></i></div><span class="num" id="mt${i}"></span></div>`).join('');
}
let alertTrimT = 0;
function updateHud() {
  if (curTab === 'status' && ++alertTrimT % 4 === 0) { lastAlertKey = ''; updateAlerts(); }
  $('scrap').textContent = Math.floor(scrap) + '/' + Flows.scrapCap(); Credits.show(); if (curTab === 'status') Flows.render();
  const net = income - upkeep; $('income').textContent = (net >= 0 ? '+' : '') + Math.round(net * 10) / 10 + '/s'; $('income').className = net < 0 ? 'neg' : 'pos';
  $('fuel').textContent = Math.floor(stock.fuel) + '/' + fuelCap; $('fuel').className = stock.fuel < 20 ? 'neg' : '';
  $('parts').textContent = Math.floor(stock.parts); $('rp').textContent = Math.floor(Meta.rp);
  $('econ').textContent = `INCOME +${income}   UPKEEP -${upkeep}` + (radUntil > gameT ? '   RADIATION STORM' : '');
  const dr = DISTRICTS.filter(d => d.restored).length; $('dcount').textContent = 'DISTRICTS ' + dr + '/' + DISTRICTS.length; $('dbar').style.width = (DISTRICTS.length ? dr / DISTRICTS.length * 100 : 0) + '%';
  for (let L = 0; L < 3; L++) {
    const t = totals[L], ratio = t.sup > 0 ? t.dem / t.sup : (t.dem > 0 ? 2 : 0), bar = $('mb' + L);
    bar.style.width = Math.min(100, ratio * 100) + '%'; bar.style.background = ratio > 1 ? '#b5502b' : ratio > 0.8 ? '#e08a3c' : RESOURCES[L].css;
    $('mt' + L).textContent = `${Math.round(t.dem)}/${Math.round(t.sup)}` + (t.cap ? `  [${Math.round(t.charge)}/${t.cap}]` : '');
  }
}
let lastAlertKey = '';
function updateAlerts() {
  const bd = $('badge'); bd.textContent = alerts.length; bd.style.display = alerts.length ? 'block' : 'none';
  const key = alerts.map(a => a.label + a.miss.join()).join('|'); if (key === lastAlertKey) return; lastAlertKey = key;
  const box = $('alerts'); box.innerHTML = '';
  if (!alerts.length) { box.innerHTML = '<div class="ok">ALL SYSTEMS NOMINAL</div>'; return; }
  alerts.slice(0, 12).forEach(a => {
    const b = document.createElement('button'); b.innerHTML = `<b>${a.label}</b> ${a.miss.join(' ')}`;
    b.onclick = () => { if (a.e) { centerOn(a.e.x + 1, a.e.y + 1); sel = a.e; dirty.ui = true; } else if (a.cable !== undefined) centerOn(a.cable % WW, (a.cable / WW) | 0); };
    box.appendChild(b);
  });
  let shown = Math.min(alerts.length, 12); const ab = $('alertbox');
  if (ab && ab.offsetHeight > 0) {                                          // show as many alerts as fit: nothing in the sidebar ever needs scrolling
    const lim = ab.getBoundingClientRect().bottom - 6, kids = [...box.children];
    while (kids.length > 1 && kids[kids.length - 1].getBoundingClientRect().bottom > lim - (shown < alerts.length ? 18 : 0)) { kids.pop().remove(); shown--; }
    if (shown < alerts.length) while (kids.length > 1 && kids[kids.length - 1].getBoundingClientRect().bottom > lim - 18) { kids.pop().remove(); shown--; }
  }
  if (alerts.length > shown) { const d = document.createElement('div'); d.className = 'more'; d.textContent = '+' + (alerts.length - shown) + ' more (press . to jump through them)'; box.appendChild(d); }
}
let lastInfo = '', alertIdx = 0;
function jumpAlert(dir) {
  if (!alerts.length) { toast('ALL SYSTEMS NOMINAL'); return; }
  alertIdx = (alertIdx + dir + alerts.length) % alerts.length; const a = alerts[alertIdx];
  if (a.e) { centerOn(a.e.x + 1, a.e.y + 1); sel = a.e; dirty.ui = true; } else if (a.cable !== undefined) centerOn(a.cable % WW, (a.cable / WW) | 0);
  toast((alertIdx + 1) + '/' + alerts.length + '  ' + a.label + ' ' + a.miss.join(' '));
}
// research window
function openResearch() { techAge = curAge(); renderResearch(); $('research').style.display = 'flex'; }
function closeResearch() { $('research').style.display = 'none'; refreshToolbar(); selectTool(tool); }

// ---------- drawing ----------
function spriteFor(e, t) {
  const d = e.district;
  switch (e.type) {
    case 'generator': return e.run && Math.sin(t * 9) > 0.3 ? IMG.genFlash : IMG.gen;
    case 'solar': return IMG.solar; case 'wind': return Math.floor(t * 3) % 2 ? IMG.windA : IMG.windB;
    case 'battery': return batterySprite(Math.ceil(e.charge / BUILD.battery.store.cap * 3 - 0.001));
    case 'pump': return IMG.pump; case 'tower': return IMG.tower; case 'router': return IMG.router;
    case 'substation': case 'valve': case 'node': return switchSprite(BUILD[e.type].sw, e.on && e.live);
    case 'house': return e.active ? IMG.houseOn : IMG.houseOff;
    case 'workshop': return workshopSprite(e.run);
    case 'ruin': return d.restored ? IMG.houseOn : IMG.ruin;
    case 'hydro': case 'intertie': case 'security': case 'gasturbine': case 'desal': case 'relay': case 'apartments': case 'market': case 'school': case 'greenhouse': case 'station': return IMG[e.type];
    case 'dronebay': return IMG.dronebay; case 'sat': return IMG.sat; case 'cargo': return IMG.cargo; case 'sattower': return IMG.sattower;
    case 'smelter': case 'circuitfab': case 'exchange': case 'solarfarm': case 'windfarm': case 'compworks': case 'fission': case 'robotdepot': case 'arcology': case 'vfarm': case 'quantum': case 'fusion': case 'atmo': case 'megafab': case 'orbital':
    case 'kiln': case 'digester': case 'oilwell': case 'synfuel': case 'tankfarm': case 'biomass': case 'fuelcell': case 'geothermal': case 'well': case 'scrapyard': case 'mine': case 'foundry': case 'assembly': case 'warehouse': case 'archive': return IMG[e.type];
    case 'dormantStation': return IMG.dStation;
    case 'lab': return IMG.lab; case 'depot': return IMG.depot; case 'fueldepot': return IMG.fueldepot; case 'refinery': return IMG.refinery; case 'clinic': return IMG.clinic;
    case 'powerplant': return IMG.powerplant; case 'waterplant': return IMG.waterplant; case 'datacenter': return IMG.datacenter;
    case 'dormant': return IMG[({ power: 'dPowerplant', water: 'dWaterplant', data: 'dDatacenter' })[e.site]];
    default: if (e.isHub) return hubSprite(e.type, e.ok[0], e.ok[1], e.ok[2], d.restored, d.restored && Math.sin(t * 4) > 0.2);
  }
}
function drawMinimap(t) {
  const w = mm.width, h = mm.height; mmg.imageSmoothingEnabled = false; mmg.drawImage(miniCv, 0, 0, w, h);
  for (const d of DISTRICTS) { const x = (d.x + 1) * 2, y = (d.y + 1) * 2; mmg.fillStyle = '#000'; mmg.fillRect(x - 3, y - 3, 7, 7); mmg.fillStyle = PAL[d.restored ? 12 : 5]; mmg.fillRect(x - 2, y - 2, 5, 5); }
  for (const s of SITES) { const x = (s.x + 1.5) * 2, y = (s.y + 1.5) * 2; mmg.fillStyle = '#000'; mmg.fillRect(x - 3, y - 3, 7, 7); mmg.fillStyle = PAL[15]; mmg.fillRect(x - 2, y - 1, 5, 3); mmg.fillRect(x - 1, y - 2, 3, 5); }
  if (Math.floor(t * 2) % 2) for (const a of alerts) if (a.e && a.miss[0] === 'FAILED') { mmg.fillStyle = '#000'; mmg.fillRect((a.e.x + 1) * 2 - 3, (a.e.y + 1) * 2 - 3, 6, 6); mmg.fillStyle = PAL[5]; mmg.fillRect((a.e.x + 1) * 2 - 2, (a.e.y + 1) * 2 - 2, 4, 4); }
  Net.drawMini(); opsMini(); Loot.mini(); Camp.mini();
  mmg.lineWidth = 1; mmg.strokeStyle = '#000'; mmg.strokeRect(camX / T * 2 - 0.5, camY / T * 2 - 0.5, Math.min(w, VW / T * 2) + 2, Math.min(h, VH / T * 2) + 2);
  mmg.strokeStyle = PAL[8]; mmg.strokeRect(camX / T * 2 + 0.5, camY / T * 2 + 0.5, Math.min(w - 1, VW / T * 2), Math.min(h - 1, VH / T * 2));
}
function mmGo(e) { const r = mm.getBoundingClientRect(); centerOn((e.clientX - r.left) / r.width * WW, (e.clientY - r.top) / r.height * WH); }
mm.addEventListener('mousedown', e => { if (!Builder.active) return; mmDrag = true; mmGo(e); });
addEventListener('mousemove', e => { if (mmDrag) mmGo(e); });
addEventListener('mouseup', () => { mmDrag = false; });
function label(txt, cx, y, col) {                       // tiny 3x5 pixel text, centred at cx
  if (typeof FONT === 'undefined') return;
  const chars = [...txt.toUpperCase()], wpx = chars.length * 4 - 1; let x = Math.round(cx - wpx / 2);
  px(x - 2, y - 1, wpx + 4, 7, 0);
  chars.forEach(ch => { const g5 = FONT[ch]; if (g5) for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g5[r * 3 + q] === '1') px(x + q, y + r, 1, 1, col); x += 4; });
}
let miniT = 0, hudT = 0, startT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (typeof Display !== 'undefined' && Display.skip('g', now)) return;
  if (!Builder.active || document.hidden) { frame.last = now; return; }
  const t = now / 1000, dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
  if (speed > 0) { acc += dt * speed; while (acc >= 1) { acc -= 1; tick(); } }
  if (needSolve) solveNow();
  const sp = 170 * dt / camZ * (keys['shift'] ? 2 : 1);
  if (keys['a'] || keys['arrowleft']) camX -= sp; if (keys['d'] || keys['arrowright']) camX += sp;
  if (keys['w'] || keys['arrowup']) camY -= sp; if (keys['s'] || keys['arrowdown']) camY += sp;
  if (glide) { const f = dt * 60; camX += glide.vx * f; camY += glide.vy * f; glide.vx *= Math.pow(0.9, f); glide.vy *= Math.pow(0.9, f); if (Math.hypot(glide.vx, glide.vy) < 0.08) glide = null; }
  clampCam();
  if (dirty.cab) bakeCables();
  if (dirty.sort) { sortedEnts = [...ents].sort((a, b) => (a.y + a.h) - (b.y + b.h)); dirty.sort = false; }
  const cx = Math.round(camX), cy = Math.round(camY);
  const x0 = Math.max(0, Math.floor(cx / T)), y0 = Math.max(0, Math.floor(cy / T)), x1 = Math.min(WW - 1, Math.floor((cx + VW) / T)), y1 = Math.min(WH - 1, Math.floor((cy + VH) / T));
  g.setTransform(camZ, 0, 0, camZ, 0, 0); g.imageSmoothingEnabled = false;                // everything below is drawn in world pixels; the transform does the zoom
  px(0, 0, VW + 1, VH + 1, 0);
  g.drawImage(terrainCv, -cx, -cy);
  // water shimmer
  const wf = Math.floor(t * 2);
  if (!Settings.lite) for (const i of waterTiles) { const x = i % WW, y = (i / WW) | 0; if (x < x0 || x > x1 || y < y0 || y > y1) continue; if ((x * 7 + y * 13 + wf) % 11 === 0) px(x * T - cx + 2 + (wf & 3), y * T - cy + 3, 3, 1, 14); }
  if (tool.kind === 'build') {
    const bd = BUILD[tool.type];
    if (bd.needWater) {
      g.globalAlpha = 0.22;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (terrain[y * WW + x] === 1) continue; let near = false;
        for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1; i++) if (inb(x + i, y + j) && terrain[(y + j) * WW + x + i] === 1) { near = true; break; }
        if (near) px(x * T - cx, y * T - cy, T, T, 14);
      }
      g.globalAlpha = 1;
    }
    if (bd.town) { g.strokeStyle = PAL[12]; g.globalAlpha = 0.5; for (const d of DISTRICTS) if (d.restored) g.strokeRect(((d.x - HOUSE_RADIUS) * T - cx) + 0.5, ((d.y - HOUSE_RADIUS) * T - cy) + 0.5, (HOUSE_RADIUS * 2 + 2) * T, (HOUSE_RADIUS * 2 + 2) * T); g.globalAlpha = 1; }
  }
  Net.drawUnder(cx, cy);
  if (focus < 0) g.drawImage(cabAllCv, -cx, -cy);
  else for (let L = 0; L < NL; L++) { g.globalAlpha = focus === LAYERS[L].res ? 1 : 0.2; g.drawImage(cabCv[L], -cx, -cy); }
  g.globalAlpha = 1;
  const ph = Math.floor(t * 14);
  if (!Settings.lite) for (const p of pulses) {
    if (p.tx < x0 || p.tx > x1 || p.ty < y0 || p.ty > y1 || (focus >= 0 && focus !== LAYERS[p.L].res)) continue;
    const k = LAYERS[p.L].lane, d = 2 + (ph + p.i * 3) % 6, sx = p.tx * T - cx, sy = p.ty * T - cy;
    if (p.arms & 1) px(sx + k, sy + k - d, 1, 1, 8); else if (p.arms & 2) px(sx + k + d, sy + k, 1, 1, 8); else if (p.arms & 4) px(sx + k, sy + k + d, 1, 1, 8); else px(sx + k - d, sy + k, 1, 1, 8);
  }
  if (warns.length) {
    const flip = Math.floor(t * 4) % 2;
    for (const w of warns) if (w.tx >= x0 && w.tx <= x1 && w.ty >= y0 && w.ty <= y1 && (focus < 0 || focus === LAYERS[w.L].res)) { if (w.dead) { if (flip) px(w.tx * T - cx + LAYERS[w.L].lane, w.ty * T - cy + LAYERS[w.L].lane, 2, 2, 8); } else cableTile(g, w.L, w.tx, w.ty, flip ? WARN : LAYERS[w.L].live, cx, cy); }
  }
  for (const e of sortedEnts) {
    if (e.x > x1 || e.y > y1 || e.x + e.w < x0 || e.y + e.h < y0) continue;
    const ex = e.x * T - cx, ey = e.y * T - cy, d = BUILD[e.type];
    if (Settings.lite) px(ex, ey + e.h * T - 1, e.w * T, 2, 0); else { g.globalAlpha = 0.5; px(ex - 1, ey + 1, e.w * T + 2, e.h * T + 1, 0); g.globalAlpha = 0.35; px(ex + 2, ey + e.h * T, e.w * T, 2, 0); g.globalAlpha = 1; }      // foundation + shadow
    g.drawImage(spriteFor(e, t), ex, ey);
    if (e.type === 'generator' && e.run) for (let k = 0; k < 2; k++) { const u = (t * 6 + k * 3 + e.x) % 8; px(ex + 11 + k * 2 + (Math.sin(u) > 0 ? 1 : 0), ey - 1 - u, 1, 1, u < 4 ? 3 : 2); }
    if ((e.type === 'workshop' || e.type === 'refinery') && e.run) for (let k = 0; k < 3; k++) { const u = (t * 5 + k * 2.5) % 9; px(ex + 10 + (Math.sin(u + k) > 0 ? 1 : 0), ey + 1 - u, 2, 1, u < 5 ? 3 : 2); }
    if (e.type === 'powerplant' && e.run) for (let k = 0; k < 4; k++) { const u = (t * 4 + k * 3) % 12; px(ex + 6 + (Math.sin(u + k) * 2 | 0) + k, ey + 2 - u, 3, 1, u < 6 ? 15 : 3); }
    if (d.store) { const f = e.charge / d.store.cap; px(ex + 2, ey - 3, 12, 2, 0); px(ex + 2, ey - 3, Math.round(12 * f), 2, LAYERS[d.store.L].live); }
    if (d.maint && e.cond > 0 && e.cond < 50) px(ex + e.w * T - 3, ey - 3, 2, 2, e.cond < 20 ? WARN : 6);
    if (d.maint && e.cond <= 0 && Math.floor(t * 3) % 2) { px(ex + 2, ey + 2, e.w * T - 4, 2, WARN); px(ex + 2, ey + e.h * T - 4, e.w * T - 4, 2, WARN); }
    if (!d.fixed && !d.store && d.sw === undefined && d.dem.some(v => v) && !e.active && e.cond > 0 && Math.floor(t * 3) % 2) { let n = 0; for (let L = 0; L < 3; L++) if (d.dem[L] && !e.ok[L]) { px(ex + n * 3, ey - 3, 2, 2, LAYERS[L].live); n++; } }
    if (e.isHub) label(e.district.name, ex + 8, ey - 8, e.district.restored ? 12 : 4);
    if (e.type === 'dormant' || e.type === 'dormantStation') label(SITE_NAME[e.site], ex + e.w * 4, ey - 8, 15);
    if (e.type === 'station') label('CONTROL', ex + 16, ey - 8, e.run ? 12 : 4);
  }
  if (typeof Tutorial !== 'undefined') Tutorial.drawWorld(t, cx, cy);
  Loot.draw(t, cx, cy); Camp.draw(t, cx, cy);
  drawFx(t, cx, cy, dt); Drones.draw(t, cx, cy, dt);
  const night = Math.max(0, Math.sin((t - startT) / 40 + 3.3)) * 0.32;
  if (night > 0.03) { if (Settings.lite) { g.globalAlpha = night * 0.55; px(0, 0, VW + 1, VH + 1, 0); g.globalAlpha = 1; } else drawLights(night, cx, cy, x0, y0, x1, y1); }
  else if (radUntil > gameT) { g.globalAlpha = 0.1; px(0, 0, VW + 1, VH + 1, 11); g.globalAlpha = 1; }
  if (mouse.in && !overMini(mouse) && inb(hover.x, hover.y)) {
    const hx = hover.x * T - cx, hy = hover.y * T - cy;
    if (tool.kind === 'build') {
      const d = BUILD[tool.type], bad = canPlace(tool.type, hover.x, hover.y);
      g.globalAlpha = 0.55; g.drawImage(spriteFor({ type: tool.type, ok: [1, 1, 1], on: true, live: true, active: true, run: true, charge: 0, cond: 100, district: {}, site: 'power' }, t), hx, hy);
      g.globalAlpha = 0.35; px(hx, hy, d.w * T, d.h * T, bad ? 5 : 11); g.globalAlpha = 1;
      g.strokeStyle = PAL[bad ? 5 : 12]; g.strokeRect(hx + 0.5, hy + 0.5, d.w * T - 1, d.h * T - 1);
    } else { g.strokeStyle = PAL[tool.kind === 'cable' ? LAYERS[tool.L].live : 15]; g.strokeRect(hx + 0.5, hy + 0.5, T - 1, T - 1); }
  }
  Net.drawOver(t, cx, cy); if (tool.kind === 'build') Net.ghost(t, cx, cy);
  if (tool.kind === 'route') Route.draw(cx, cy);
  if (sel && ents.includes(sel)) { g.strokeStyle = PAL[8]; g.strokeRect(sel.x * T - cx - 0.5, sel.y * T - cy - 0.5, sel.w * T + 1, sel.h * T + 1); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (dirty.mini && now - miniT > 400) { bakeMini(); miniT = now; }
  drawMinimap(t);
  if (now - hudT > 200) {
    hudT = now; updateHud(); refreshTip(); opsHud();
    if (dirty.ui) { updateAlerts(); updateInspector(); refreshToolbar(); dirty.ui = false; }
    const d = describe(); if (d !== lastInfo) { lastInfo = d; $('info').textContent = d || ' '; }
  }
}

// ---------- progress, stars and outages ----------
function damagedCount() { let n = 0; for (let L = 0; L < NL; L++) for (let i = 0; i < N; i++) if (cab[L][i] === 2) n++; return n; }
function progressInfo() { const total = DISTRICTS.length, r = DISTRICTS.filter(d => d.restored).length; return { restored: r, total, full: total > 0 && r === total, partial: total > 0 && r >= Math.ceil(total / 2) }; }
function starRating() {
  const p = progressInfo(); if (!p.full) return 0; let st = 1;
  if (!ents.some(e => BUILD[e.type].maint && e.cond <= 0) && damagedCount() === 0) st++;
  if (SITES.some(q => q.kind !== 'station') && SITES.filter(q => q.kind !== 'station').every(q => ents.some(e => BUILD[e.type].central && e.x === q.x && e.y === q.y))) st++;
  return st;
}
const exitResult = () => Object.assign(progressInfo(), { stars: starRating(), goals: Variety.doneCount() });
function applyOutage() {
  let n = 0; for (let L = 0; L < NL; L++) for (let i = 0; i < N; i++) if (cab[L][i] === 1 && Math.random() < 0.16) { cab[L][i] = 2; n++; }
  const mach = ents.filter(e => BUILD[e.type].maint && e.cond > 0 && !BUILD[e.type].fixed); for (let k = 0; k < 2 && mach.length; k++) mach.splice(Math.random() * mach.length | 0, 1)[0].cond = 0;
  ents.forEach(e => { if (BUILD[e.type].sw !== undefined) { e.on = false; e.manual = false; e.tripT = 0; } });
  outageActive = true; recompute(); toast('OUTAGE! A storm tore through this county: ' + n + ' lines down, machines failed, switches tripped. Repair it (V) and switch things back on (T).'); beep(100, 0.6, 'sawtooth', 0.05);
}
function checkOutage() {
  if (!outageActive) return;
  if (damagedCount() === 0 && !ents.some(e => BUILD[e.type].maint && e.cond <= 0) && DISTRICTS.every(d => !d.restored || d.hub.active)) {
    outageActive = false; toast('OUTAGE CLEARED! The county is stable again (+15 research).'); [523, 659, 784].forEach((f, i) => beep(f, 0.15, 'square', 0.05, i * 0.1)); if (outageCb) outageCb();
  }
}

// ---------- per-county autosave ----------
const SAVE_PREFIX = 'wastelandGrid.c5.';
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
const unb64 = (s, n) => { const a = atob(s), u = new Uint8Array(n); for (let i = 0; i < n && i < a.length; i++) u[i] = a.charCodeAt(i); return u; };
// cable layers are mostly empty: store them as run-lengths ("R" + value + length in base 36) so hundreds of counties fit in browser storage
function rleEnc(u8) {
  let any = false; for (let i = 0; i < u8.length; i++) if (u8[i]) { any = true; break; }
  if (!any) return '';
  let out = 'R', i = 0; while (i < u8.length) { const v = u8[i]; let j = i + 1; while (j < u8.length && u8[j] === v) j++; out += v + (j - i).toString(36) + '.'; i = j; }
  return out;
}
function rleDec(s, n) {
  if (!s) return new Uint8Array(n);
  if (s[0] !== 'R') return unb64(s, n);                                  // older saves
  const u = new Uint8Array(n); let p = 0; const re = /(\d)([0-9a-z]+)\./g; let m;
  while ((m = re.exec(s))) { const len = parseInt(m[2], 36), v = +m[1]; if (v) u.fill(v, p, Math.min(n, p + len)); p += len; }
  return u;
}
let saveWarned = false;
function saveCounty() {
  if (countyId === null || !Builder.active) return;
  if (typeof Pool !== 'undefined') Pool.snapshot(countyId);
  try {
    localStorage.setItem(SAVE_PREFIX + countyId, JSON.stringify({
      scrap: Math.floor(scrap), stock, evT, cab: cab.map(rleEnc), rub: [...cleared],
      ents: ents.filter(e => !BUILD[e.type].fixed).map(e => ({ t: e.type, x: e.x, y: e.y, on: e.on, c: Math.round(e.charge), q: Math.round(e.cond), m: e.mods, mn: e.manual ? 1 : 0 })),
      rest: DISTRICTS.map(d => d.restored ? 1 : 0), ou: outageActive ? 1 : 0, go: Variety.dump(), nv: Net.dump(),
    }));
  } catch (e) { if (!saveWarned) { saveWarned = true; toast('SAVE FAILED: browser storage is full. Open Settings on the map and EXPORT SAVE, then free some space.'); } }
}
let LOADED_GO = null;
function loadCounty(id) {
  LOADED_GO = null;
  let s; try { s = JSON.parse(localStorage.getItem(SAVE_PREFIX + id)); } catch (e) { return false; }
  if (!s) return false;
  restoring = true;
  ents.filter(e => !BUILD[e.type].fixed).forEach(removeEntity);
  s.rub.forEach(i => { terrain[i] = 0; cleared.add(i); tileTerrain(i % WW, (i / WW) | 0); });
  cab = Array.from({ length: NL }, (_, L) => rleDec(s.cab[L], N));
  s.ents.forEach(o => {
    const d = BUILD[o.t]; if (!d || !inb(o.x, o.y)) return;
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) { const q = occ[(o.y + j) * WW + o.x + i]; if (q && String(q.type).startsWith('dormant')) removeEntity(q); }
    addEntity(o.t, o.x, o.y, { on: o.on, charge: o.c, cond: o.q ?? 100, mods: o.m || [], manual: !!o.mn });
  });
  scrap = s.scrap; if (s.stock) stock = s.stock; evT = s.evT || 80; s.rest.forEach((r, k) => { if (DISTRICTS[k]) DISTRICTS[k].restored = !!r; });
  outageActive = !!s.ou; LOADED_GO = s.go || null; Net.restore(s); solveNow(); restoring = false; refreshDistrictButtons();
  won = DISTRICTS.length > 0 && DISTRICTS.every(d => d.restored);
  return true;
}

// ---------- public API used by the campaign ----------
const Builder = {
  active: false, name: '', onExit: () => { },
  hasSave(id) { try { return !!localStorage.getItem(SAVE_PREFIX + id); } catch (e) { return false; } },
  clearSave(id) { try { localStorage.removeItem(SAVE_PREFIX + id); } catch (e) { /* ignore */ } },
  save: saveCounty,
  start(spec, opts) {
    SPEC = spec; opsInit(opts); this.name = opts.name || 'COUNTY'; this.onExit = opts.onExit; countyId = opts.id ?? null;
    DISTRICTS = spec.districts.map(d => ({ ...d, ruins: d.ruins.map(r => r.slice()) }));
    START_BUILDINGS = spec.start; FORCED_PONDS = spec.ponds; SITES = spec.sites || [];
    scrap = opts.scrap; stock = { fuel: 200, parts: 12 }; gameT = 0; evT = 80; radUntil = 0; acc = 0; won = false; drag = null; restoring = false; lastAlertKey = '';
    $('win').style.display = 'none'; $('help').style.display = 'none'; $('research').style.display = 'none';
    Net.reset(); initWorld(); solveNow(); refreshDistrictButtons();
    outageActive = false; outageCb = opts.onOutageCleared || null;
    let loaded = false; try { loaded = countyId !== null && loadCounty(countyId); } catch (err) { console.error('county save unreadable', err); restoring = false; loaded = false; if (countyId !== null) { this.clearSave(countyId); initWorld(); solveNow(); toast('That county\'s save was damaged, so it starts fresh.'); } }
    Variety.begin(spec, (typeof US !== 'undefined' && opts.id != null) ? US.counties[opts.id] : null, loaded, LOADED_GO);
    if (opts.outage && !outageActive) applyOutage();
    buildToolbar(); setSpeed(1); setFocus(-1); updateUndoBtn();
    $('where').textContent = opts.where || ''; $('biome').textContent = (spec.biome || '').toUpperCase() + ' - ' + (opts.sub || '');
    const dd = spec.diff || 0; $('diffTag').textContent = dd < 3 ? 'EASY' : dd < 6 ? 'MEDIUM' : dd < 10 ? 'HARD' : 'BRUTAL'; $('mmcoords').textContent = WW + 'x' + WH + (IMPORTS.links ? ' LINKED ' + IMPORTS.links : ''); if (opts.hostile) $('diffTag').textContent = 'HOSTILE';
    toastUntil = 0; Tutorial.cam0 = { x: camX, y: camY }; Tutorial.repaired = false; refreshTip(true); if (loaded) toast('Welcome back. Your county was restored from its autosave.'); else Variety.announce();
    startT = performance.now() / 1000; this.active = true; dirty.ui = true;
  },
  stop() { this.active = false; },
};
const HINT_START = 'Your home generator, pump and router are cut off from the hub. Lay POWER lines (1) to the pump, router and hub, WATER pipes (2) pump to hub, NET cables (3) router to hub. Press ? for all shortcuts, Y for research.';

$('keep').onclick = () => { $('win').style.display = 'none'; };
$('tomap').onclick = async () => {
  const p = progressInfo();
  if (!p.full && Settings.confirmLeave) {
    const msg = p.partial ? 'This county is more than half restored, so its light will already spread to the neighbours. It autosaves - come back any time to finish it.' : 'This county autosaves, so you can come back to it any time.';
    if (!await uiConfirm(msg, 'LEAVE THIS COUNTY?', 'LEAVE', 'STAY')) return;
  }
  saveCounty(); reportSurplus(); Meta.save(); const r = exitResult(); if (r.partial && !r.full) storyEv('partial'); Builder.onExit(r);
};
$('towin').onclick = () => { $('win').style.display = 'none'; saveCounty(); reportSurplus(); Meta.save(); Builder.onExit(exitResult()); };
$('btn-undo').onclick = undo; $('btn-mute').onclick = toggleMute; $('btn-mute').textContent = muted ? 'SND OFF' : 'SND ON';
$('btn-help').onclick = () => { $('help').style.display = 'flex'; }; $('help-close').onclick = () => { $('help').style.display = 'none'; };
$('btn-research').onclick = openResearch; $('research-close').onclick = closeResearch;
$('chk-events').checked = eventsOn; $('chk-events').onchange = e => { eventsOn = e.target.checked; try { localStorage.setItem('wastelandGrid.events', eventsOn ? '1' : '0'); } catch (x) { /* ignore */ } };
document.querySelectorAll('#speedseg button').forEach(b => { b.onclick = () => setSpeed(+b.dataset.s); });
document.querySelectorAll('#viewseg button').forEach(b => { b.onclick = () => setFocus(+b.dataset.f); });
setInterval(() => { if (Builder.active) { saveCounty(); reportSurplus(); } }, 10000);
addEventListener('beforeunload', () => { if (Builder.active) saveCounty(); Meta.save(); });
// ---------- tips, tutorial, field guide ----------
const TIPS = [
  'Drag over an existing cable to erase it. Hold SHIFT while dragging for perfectly straight lines.',
  'The layer buttons (ALL / PWR / H2O / NET) fade the other utilities so crossing lines are easy to read.',
  'Batteries and water towers fill from surplus and cover brownouts. Build them before you need them.',
  'Generators burn fuel. If FUEL hits zero your power drops - build a refinery.',
  'Press SPACE to pause, [ and ] to change speed, CTRL+Z to undo.',
  'Dormant grey 3x3 plants are huge. Research HEAVY INDUSTRY, then INSPECT one and press RESTORE.',
  'A broken building flashes red on the minimap. Click ALERTS to jump to it.',
  'Maintenance depots repair everything within 16 tiles for free. Elite Crews research doubles their speed.',
  'Switches (substation, valve house, net node) can cut off a branch to protect the rest of your grid.',
  'Solar panels are weak during radiation storms. Mix your power sources.',
  'Houses only earn scrap while all three utilities reach them. A clinic nearby adds +1 each.',
  'Salvage rubble for scrap - sometimes it hides spare parts.',
];
function refreshTip(force) {
  const now = performance.now(); if (now < toastUntil && !force) return;
  if (now < toastUntil) return;
  const row = $('msgrow'), m = $('msg'); m.classList.remove('flash');
  {
    row.classList.remove('tutorial'); $('msgtag').textContent = 'TIP'; if (now - tipT > 14000) { tipIdx = (tipIdx + 1) % TIPS.length; tipT = now; }
    m.textContent = TIPS[tipIdx]; $('msgbtns').style.display = 'none';
  }
}

const GUIDE = [
  ['SIGNAL & SAT RELAYS', 'You can only build where your <b>signal</b> reaches: around your home hub (Settler 13 tiles, Survivor 11, Iron Winter 10, Blackout 9) and around every restored hub. Dim ground is out of reach. <b>SAT RELAYS</b> (LINES tab, key <b>\'</b>) extend it: place one inside the signal and it lights 2 tiles around itself plus a corridor back along its beam - chain them into a <b>highway</b>. Each relay in a county costs more than the last. Reaching a new district or dormant plant pays a bonus. Long-Range Dishes, Phased Arrays, Wide Beams and Mesh Satellites make every relay light further; Sat Towers light a wide circle; Skynet covers whole counties.'],
  ['AGES', 'The campaign moves through five ages: <b>SCAVENGER, INDUSTRIAL, ELECTRIC, ATOMIC</b> and <b>FUSION</b>. Open the <b>AGES</b> screen on the map (key <b>G</b>) to see what the next age needs - research projects done, counties restored, research points and later shared goods - and advance. Each age opens new research and buildings, and gives a permanent bonus. In the Fusion Age, research World Grid Theory and <b>IGNITE THE WORLD GRID</b> to finish the long game.'],
  ['SHARED STOCKPILE & HUBS', 'From the Electric Age, <b>ALLOYS</b>, <b>CIRCUITS</b> and <b>COMPONENTS</b> live in one stockpile shared by every county (the chip in the header). Smelters and circuit fabs fill it, component works and megafactories turn alloys and circuits into components, and advanced buildings are built from it. A restored county with factories is a <b>PRODUCTION HUB</b>: it keeps producing while you play elsewhere (at 50% speed; Freight Rail, Containerisation and Hyperloop raise it). <b>SUPPLY EXCHANGES</b> trade spare parts and fuel with the stockpile, so one county can feed another.'],
  ['FUEL', 'Generators, gas turbines, fuel cells and foundries burn <b>fuel</b>. Make it in the <b>FUEL</b> tab: a <b>CHARCOAL KILN</b> needs no power or lines at all (research Charcoal Kilns), a <b>BIOGAS DIGESTER</b> runs on power and water, the <b>REFINERY</b> and <b>OIL WELL</b> come with Fuel Refining and Oil Drilling, and the big <b>SYNFUEL PLANT</b> needs Heavy Industry. Store it in <b>FUEL DEPOTS</b> and <b>TANK FARMS</b>. Catalysts and Catalytic Cracking make every fuel maker produce more.'],
  ['INDUSTRY', 'The <b>INDUSTRY</b> tab turns power into parts and parts into scrap. A <b>SALVAGE YARD</b> sorts scrap and a few parts, an <b>ORE MINE</b> digs parts, a <b>FOUNDRY</b> casts lots of parts but burns fuel, and an <b>ASSEMBLY PLANT</b> turns parts back into a big scrap income (it stops when parts run out). <b>WAREHOUSES</b> raise the scrap cap. Smelting, Conveyors and Automation improve the whole chain.'],
  ['MULTI LINE', 'Pick MULTI LINE (key =) and choose which line types to lay at once, or use a preset: LOCAL x3 lays power, water and net together; TRUNK x3 lays HV, main and fiber side by side. Dragging over existing lines erases them. Trunk lines now share a tile as three parallel lanes.'],
  ['INTERTIES & STATION LINKS', 'A county with an ONLINE control station exports its surplus. Neighbouring counties get that offered as imports: build INTERTIES on your trunk lines to take it. Linked counties also give a starting scrap bonus. Restore stations in a chain and every new county starts half-built.'],
  ['THE UNION', 'Open the <b>UNION</b> screen on the map (key U). <b>Unity</b> is 25 points each for coverage, stable station links, signed accords and open borders. Higher tiers give permanent bonuses: more start scrap, faster link recovery, power that crosses three counties, research income, and slower Dimmers. At 96% with every county lit, the grid is truly one.'],
  ['FACTIONS & COMPACTS', 'Every region has a faction: Haven Ridge Compact, Prairie Syndicate, Northern Line, Linea Sur, League of Two Seas, Sila Collective. Restoring their counties and keeping borders friendly raises <b>trust</b>; outages and Dimmer sabotage lower it. At 60 trust you can <b>sign a compact</b> (research points) for a permanent perk. Even the Dimmers will talk: build trust for a truce, then make them Keepers.'],
  ['BORDERS', 'Each frontier between countries is <b>OPEN</b>, a <b>CHECKPOINT</b> or <b>CLOSED</b>. Open borders share everything and build trust, but Dimmers cross them. Checkpoints share 60%, slow Dimmers and pay a little research. Closed borders stop imports, light and Dimmers alike. Change them in the UNION screen or on a county panel.'],
  ['STABLE LINKS', 'Where two online control stations touch, a <b>link</b> forms. Links have a <b>stability</b>: STABLE (60+) carries full power, UNSTABLE halves it, DROPPED carries nothing. Storms and nearby Dimmers wear them down. <b>Fix</b> a link for 6 RP, or <b>upgrade</b> it (Relay, Hardened, Backbone) for faster recovery and more capacity. Imports travel several hops, losing a little at each.'],
  ['FAILURE SEQUENCES', 'Failures now unfold. <b>Grid strain</b> (demand above supply for ten seconds) warns, trips your substations, then cascades. A machine below 12% condition goes <b>critical</b> and explodes in 14 seconds unless repaired. The red ribbon above the map shows the countdown - act before it hits zero.'],
  ['THE DIMMERS', 'The Dimmers hold some counties and slowly expand, sabotaging your restored neighbours. Liberate a Dimmer-held county to push them back. Inside threatened counties raiders strike with a short warning: build SECURITY POSTS (or slot a sentry module).'],
  ['RAIDS & CAMPS', 'Raiders come as <b>saboteurs</b> (cut lines), <b>scavengers</b> (steal scrap and parts), <b>jammers</b> (knock out routers and relays for 30 seconds), <b>arsonists</b> (burn generators) and <b>warbands</b> (two waves). A red ring shows where they will strike and you can watch them walk in. Security posts repel them and you keep their spoils. Hostile counties may hide a <b>Dimmer camp</b>: click it to send a strike team (costs scrap and parts, chance shown). Win and the raids mostly stop and the camp pays out loot. Dimmer-held counties have <b>warlords</b>: liberate their last county to break them.'],
  ['HQ ORDERS', 'Headquarters departments unlock <b>orders</b> that appear in the side panel inside a county: Supply Drop (Fabricator 1), Grid Restart (Power Core 2), Overcharge (Data Core 2), Field Survey (Survey Office 1), Lockdown (Aegis Grid 2) and Rebuild Crew (Maintenance Bay 3). They need HQ online, work at half strength in counties not joined to HQ, and cool down in real time. The Command Centre shortens the cooldowns.'],
  ['LINE TYPES', 'Each utility has a thin LOCAL line (houses, small machines) and a thick TRUNK line: <b>HV</b> power, <b>water mains</b> and <b>fiber</b>. Big producers - plants and hydro - and the control station connect to trunks. A <b>transformer</b> (substation, pressure station, net exchange) joins a trunk to the local line next to it.'],
  ['TRANSFORMERS', 'Place a substation so one side touches your HV trunk and the other touches local power lines. Power then flows between them. They are also switches (press T). A substation needs a net signal; pressure stations and net exchanges need power.'],
  ['CONTROL STATION', 'Somewhere in every county stands a dormant <b>grid control station</b>. Research Grid Control, restore it (200 scrap + 12 parts), feed it 10 HV power and 3 fiber, then slot <b>modules</b> into it: surge guard, fuel recycler, load balancer, auto-repair and more. More slots come from research.'],
  ['RESEARCH TREE', 'Press Y. Nodes are joined by lines: finish the nodes that lead to a technology first. Click a node to read it, double-click or press RESEARCH to buy it. Colours show the branch.'],
  ['LAYERS', 'Three separate networks: <b>POWER</b>, <b>WATER</b> and <b>NET</b>. Producers (generators, pumps, routers) feed consumers (hubs, houses, workshops). Each bar in RESOURCES is demand / supply. A line flickers when its network is overloaded.'],
  ['HUBS & DISTRICTS', 'A district hub needs all three utilities. Residential hubs are balanced, <b>industrial</b> hubs want lots of power and make parts, <b>farming</b> hubs want water, <b>medical</b> hubs and <b>campus</b> hubs produce research.'],
  ['PLANTS', 'Grey 3x3 sites are <b>dormant central plants</b>: POWER, WATER and DATA. Research <b>Heavy Industry</b>, INSPECT a site, press RESTORE (120 scrap + 8 parts). A plant supplies a huge share of a utility but only runs while fed: <b>power plant</b> needs water + fuel, <b>water plant</b> needs power + net + parts, <b>data center</b> needs power + water. They wear out fast - keep a depot nearby.'],
  ['FUEL', 'Generators and power plants burn fuel. Refineries (power + water) make it, fuel depots store it. At zero fuel your power drops. Solar, wind and batteries need no fuel.'],
  ['PARTS', 'Workshops and industrial hubs make parts. Parts pay for repairs, substations, clinics, refineries and plants. Salvaging rubble sometimes gives parts.'],
  ['WEAR & REPAIR', 'Every machine loses condition. Below 50% it underperforms, at 0% it fails. Use REPAIR (V) for scrap + parts, or a <b>maintenance depot</b> to repair nearby machines for free. Storms damage cable; the REPAIR tool fixes it for 1 scrap per tile.'],
  ['FAULTS', 'Once a district is restored, random faults begin: <b>storms</b> break lines, <b>breakdowns</b> kill machines, <b>surges</b> trip switches, <b>radiation storms</b> cripple solar. Turn them off in the controls (?) screen if you want a calm game.'],
  ['SWITCHES', '<b>Substations</b> (power), <b>valve houses</b> (water) and <b>net nodes</b> (network) cut a branch off when OFF. They need support to work: substations need a network signal, valves and nodes need power. Press T over one to toggle it.'],
  ['STORAGE', 'Batteries and water towers charge from surplus and cover shortages at 6 per second. Build them before storms and surges, not after.'],
  ['RESEARCH', 'Research labs (power + net) and campus hubs make research points. Spend them with Y. Research carries over to every county for the whole campaign.'],
  ['THE MAP', 'Restore every county of a country to win it. The light spreads to neighbours. Restore the whole <b>United States</b> first - then Canada, Mexico, Central America and South America call for help. Complete a whole <b>continent</b> and the radio finds <b>Europe</b> across the Atlantic (through Greenland and Iceland).'],
  ['ZOOM & CAMERA', 'Scroll the <b>mouse wheel</b> (or press <b>+</b> and <b>-</b>) to zoom the play area around the pointer; <b>\\</b> or double-click empty ground resets it. Zoom out to plan big networks, zoom in for fine work. Pan with WASD or the arrows (hold SHIFT to go faster), right-drag or middle-drag. On a touch screen pinch to zoom and drag with two fingers.'],
  ['SHORTCUTS', 'WASD pan, + - zoom, . , jump between alerts, 1-3 lines, 4-0 power/water/net buildings, Q E R switches, F G O town, B N U I ops, V repair, X salvage, C inspect, T toggle, Y research, SPACE pause, CTRL+Z undo, J this guide.'],
];
function openGuide() { $('guide-body').innerHTML = GUIDE.map(([h, p]) => `<section><h4>${h}</h4><p>${p}</p></section>`).join(''); $('guide').style.display = 'flex'; }
$('btn-guide').onclick = openGuide; $('guide-close').onclick = () => { $('guide').style.display = 'none'; };
$('guide-replay').onclick = () => { $('guide').style.display = 'none'; Tutorial.restart(); };
addEventListener('keydown', e => { if (Builder.active && e.key.toLowerCase() === 'j' && !e.ctrlKey) { $('guide').style.display === 'flex' ? ($('guide').style.display = 'none') : openGuide(); } });

// ================= v5: trunk lines, transformers, main station, research tree =================
const RES_SHORT = ['PWR', 'H2O', 'NET'];
const storeMult = () => (Meta.has('grid2') ? 1.5 : 1) * (activeMods.has('balance') ? 1.5 : 1) * (TM().store || 1);
const hasRes = (e, R) => { const d = BUILD[e.type]; return d.sup[R] > 0 || d.dem[R] > 0 || (d.store && d.store.L === R) || d.bridge === R || !!d.importer; };
const tierOf = (e, R) => { const d = BUILD[e.type]; return (d.tier && d.tier[R]) || 0; };
const uses = (e, L) => {                                   // does this building connect to line layer L?
  const d = BUILD[e.type], R = L % 3, t = L < 3 ? 0 : 1;
  if (d.bridge === R) return e.on && e.live && e.cond > 0;     // a transformer joins both tiers while it is closed
  if (!(d.sup[R] > 0 || d.dem[R] > 0 || (d.store && d.store.L === R) || d.importer)) return false;
  return tierOf(e, R) === t;
};
function conductive(L, i) {
  if (cab[L][i] === 1) return true;
  const e = occ[i]; return !!e && uses(e, L);
}
// is this building wired to anything? (a line or another building touching it on a layer it uses)
function isLinked(e) {
  const d = BUILD[e.type]; if (d.fixed || d.isHub) return true;
  if (!d.importer && !d.store && d.sup.every(v => !v) && d.dem.every(v => !v) && (d.fuelOut || d.partsOut || d.income || d.rp)) return true;   // self-contained producers (charcoal kiln) need no lines
  for (let R = 0; R < 3; R++) {
    if (!(d.sup[R] > 0 || d.dem[R] > 0 || d.importer || (d.store && d.store.L === R))) continue;
    const L = R + 3 * tierOf(e, R);
    for (let j = -1; j <= e.h; j++) for (let i = -1; i <= e.w; i++) {
      if ((i >= 0 && i < e.w) && (j >= 0 && j < e.h)) continue; if ((i < 0 || i === e.w) && (j < 0 || j === e.h)) continue;
      const x = e.x + i, y = e.y + j; if (inb(x, y) && conductive(L, y * WW + x)) return true;
    }
  }
  return false;
}
function grpOf(e, R) { const L = R + 3 * tierOf(e, R), c = comp[L][e.y * WW + e.x]; return c >= 0 ? info[L][c] : null; }

function solvePass() {
  for (const e of ents) e.mult = BUILD[e.type].sup.some(v => v > 0) ? outMult(e) : 1;
  comp = []; info = []; groups = [];
  const tot = [0, 1, 2].map(() => ({ sup: 0, dem: 0, charge: 0, cap: 0 }));
  const rawCount = [], offs = []; let off = 0;
  for (let L = 0; L < NL; L++) {                          // 1) connected pieces of line, per layer
    const cm = compBuf[L]; cm.fill(-1); let n = 0;
    for (let s = 0; s < N; s++) {
      if (cm[s] !== -1 || !conductive(L, s)) continue;
      const id = n++; cm[s] = id; let qh = 0, qt = 0; qbuf[qt++] = s;
      while (qh < qt) {
        const i = qbuf[qh++], x = i % WW, y = (i / WW) | 0;
        if (y > 0 && cm[i - WW] === -1 && conductive(L, i - WW)) { cm[i - WW] = id; qbuf[qt++] = i - WW; }
        if (y < WH - 1 && cm[i + WW] === -1 && conductive(L, i + WW)) { cm[i + WW] = id; qbuf[qt++] = i + WW; }
        if (x > 0 && cm[i - 1] === -1 && conductive(L, i - 1)) { cm[i - 1] = id; qbuf[qt++] = i - 1; }
        if (x < WW - 1 && cm[i + 1] === -1 && conductive(L, i + 1)) { cm[i + 1] = id; qbuf[qt++] = i + 1; }
      }
    }
    rawCount[L] = n; offs[L] = off; off += n; comp.push(cm);
  }
  const par = new Int32Array(off); for (let i = 0; i < off; i++) par[i] = i;      // 2) transformers merge local + trunk pieces
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (const e of ents) {
    const d = BUILD[e.type]; if (d.bridge === undefined) continue;
    const R = d.bridge, i = e.y * WW + e.x, a = comp[R][i], b = comp[R + 3][i];
    if (a >= 0 && b >= 0) { const ra = find(offs[R] + a), rb = find(offs[R + 3] + b); if (ra !== rb) par[ra] = rb; }
  }
  const gmap = new Map();                                 // 3) one accounting group per merged network
  for (let L = 0; L < NL; L++) {
    const arr = new Array(rawCount[L]);
    for (let c = 0; c < rawCount[L]; c++) {
      const r = find(offs[L] + c); let gp = gmap.get(r);
      if (!gp) { gp = { base: 0, sto: 0, supply: 0, demand: 0, stores: [] }; gmap.set(r, gp); groups.push(gp); }
      arr[c] = gp;
    }
    info.push(arr);
  }
  for (const e of ents) {                                 // 4) add up what every building gives and needs
    const d = BUILD[e.type];
    for (let R = 0; R < 3; R++) {
      const imp = d.importer, hasS = d.sup[R] > 0 || (imp && e.imp && e.imp[R] > 0), hasD = d.dem[R] > 0, hasSt = d.store && d.store.L === R;
      if (!hasS && !hasD && !hasSt) continue;
      const L = R + 3 * tierOf(e, R), c = comp[L][e.y * WW + e.x]; if (c < 0) continue;
      const gp = info[L][c], sup = imp ? (e.imp ? e.imp[R] : 0) : d.sup[R] * e.mult;
      const need = (d.maint && e.cond <= 0) ? 0 : d.dem[R];                  // a broken machine draws nothing
      gp.base += sup; gp.demand += need; tot[R].sup += sup;
      if (hasSt) { gp.stores.push(e); tot[R].charge += e.charge; tot[R].cap += d.store.cap; if (e.charge > 0 && e.cond > 0) gp.sto += d.store.rate * storeMult(); }
      if (!(e.isHub && !e.district.restored)) tot[R].dem += need;
    }
  }
  for (const gp of groups) gp.supply = gp.base + gp.sto;
  for (const e of ents) {                                 // 5) is each building supplied?
    const d = BUILD[e.type];
    for (let R = 0; R < 3; R++) { if (d.dem[R] > 0) { const gp = grpOf(e, R); e.ok[R] = !!gp && gp.supply >= gp.demand; } else e.ok[R] = true; }
    if (d.bridge !== undefined) e.live = d.dem.every((v, R) => v === 0 || e.ok[R]);
  }
  totals = tot;
}

function cableTile(ctx, L, tx, ty, c, ox, oy) {
  const lay = LAYERS[L], sx = tx * T - ox, sy = ty * T - oy, i = ty * WW + tx;
  const n = ty > 0 && conductive(L, i - WW), s = ty < WH - 1 && conductive(L, i + WW), w = tx > 0 && conductive(L, i - 1), e = tx < WW - 1 && conductive(L, i + 1);
  const mask = (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0);
  const stacked = lay.trunk && ((cab[3][i] ? 1 : 0) + (cab[4][i] ? 1 : 0) + (cab[5][i] ? 1 : 0)) > 1;
  if (stacked) {                                           // several trunks share this tile: three parallel 2px lanes
    const k = 1 + (L - 3) * 2;
    const arms = col => { ctx.fillStyle = PAL[col];
      if (n) ctx.fillRect(sx + k, sy, 2, k + 2); if (s) ctx.fillRect(sx + k, sy + k, 2, T - k); if (w) ctx.fillRect(sx, sy + k, k + 2, 2); if (e) ctx.fillRect(sx + k, sy + k, T - k, 2); ctx.fillRect(sx + k, sy + k, 2, 2); };
    ctx.save(); ctx.translate(1, 1); arms(0); ctx.restore(); arms(c);
    ctx.fillStyle = PAL[lay.core]; if (n) ctx.fillRect(sx + k, sy, 1, k + 1); if (s) ctx.fillRect(sx + k, sy + k, 1, T - k); if (w) ctx.fillRect(sx, sy + k, k + 1, 1); if (e) ctx.fillRect(sx + k, sy + k, T - k, 1);
    return mask;
  }
  if (lay.trunk) {                                         // thick trunk: outline, body, bright core
    [[6, 0], [4, c], [2, lay.core]].forEach(([wd, col]) => {
      const o = (8 - wd) / 2; ctx.fillStyle = PAL[col];
      if (n) ctx.fillRect(sx + o, sy, wd, o); if (s) ctx.fillRect(sx + o, sy + o + wd, wd, 8 - o - wd);
      if (w) ctx.fillRect(sx, sy + o, o, wd); if (e) ctx.fillRect(sx + o + wd, sy + o, 8 - o - wd, wd);
      ctx.fillRect(sx + o, sy + o, wd, wd);
    });
    if (L === 3 && ((tx + ty) % 3 === 0) && (mask === 5 || mask === 10)) { ctx.fillStyle = PAL[0]; if (mask === 5) ctx.fillRect(sx + 1, sy + 3, 6, 1); else ctx.fillRect(sx + 3, sy + 1, 1, 6); }   // pylon cross-arm
    return mask;
  }
  const k = lay.lane;
  ctx.fillStyle = PAL[0];                                  // thin line: outline first
  if (n) ctx.fillRect(sx + k + 1, sy, 1, k + 1); if (s) ctx.fillRect(sx + k + 1, sy + k, 1, T - k);
  if (w) ctx.fillRect(sx, sy + k + 1, k + 1, 1); if (e) ctx.fillRect(sx + k, sy + k + 1, T - k, 1);
  ctx.fillRect(sx + k + 1, sy + k + 1, 2, 2);
  ctx.fillStyle = PAL[c];
  if (n) ctx.fillRect(sx + k, sy, 1, k + 1); if (s) ctx.fillRect(sx + k, sy + k, 1, T - k);
  if (w) ctx.fillRect(sx, sy + k, k + 1, 1); if (e) ctx.fillRect(sx + k, sy + k, T - k, 1);
  ctx.fillRect(sx + k, sy + k, 2, 2);
  return mask;
}
function bakeCables() {
  pulses = []; warns = [];
  for (let L = 0; L < NL; L++) {
    const k = cabG[L]; k.clearRect(0, 0, WW * T, WH * T); const arr = cab[L], lay = LAYERS[L];
    for (let i = 0; i < N; i++) {
      if (!arr[i]) continue;
      const tx = i % WW, ty = (i / WW) | 0;
      if (arr[i] === 2) { k.fillStyle = PAL[WARN]; const sx = tx * T, sy = ty * T, q = lay.lane; k.fillRect(sx + q - 1, sy + q - 1, 4, 1); k.fillRect(sx + q - 1, sy + q + 2, 4, 1); k.fillRect(sx + q, sy + q, 2, 2); warns.push({ L, tx, ty, dead: 1 }); continue; }
      const inf = info[L][comp[L][i]]; let c = lay.dim, state = 0;
      if (inf.supply > 0) { if (inf.supply >= inf.demand) { c = lay.live; state = 1; } else state = 2; }
      const arms = cableTile(k, L, tx, ty, c, 0, 0);
      if (state === 1 && arms) pulses.push({ L, tx, ty, arms, i }); if (state === 2) warns.push({ L, tx, ty });
    }
  }
  cabAllG.clearRect(0, 0, WW * T, WH * T); for (let L = 0; L < NL; L++) cabAllG.drawImage(cabCv[L], 0, 0);
  dirty.cab = false;
}
function bakeMini() {
  const k = miniCv.getContext('2d'), im = k.createImageData(WW, WH), col = c => parseInt(PAL[c].slice(1), 16), bm = BIOME[SPEC.biome] || BIOME.waste;
  const catCol = e => { const d = BUILD[e.type]; if (e.cond <= 0 && d.maint) return 5; if (d.sup[0] > 0 || (d.store && d.store.L === 0) || d.bridge === 0) return 7; if (d.sup[1] > 0 || (d.store && d.store.L === 1) || d.bridge === 1) return 14; if (d.sup[2] > 0 || d.bridge === 2) return 11; return 4; };
  for (let i = 0; i < N; i++) {
    const t = terrain[i];
    let c = t === 1 ? 13 : t === 5 ? 4 : t === 4 ? 0 : t === 6 ? bm.shore : t === 3 ? 4 : t === 7 ? 3 : t === 2 ? 5 : bm.base === 1 ? 2 : bm.base;
    for (let L = 0; L < NL; L++) if (cab[L][i]) { c = LAYERS[L].live; break; }
    const e = occ[i]; if (e) c = e.isHub ? (e.district.restored ? 12 : 5) : String(e.type).startsWith('dormant') ? 15 : e.type === 'ruin' ? 1 : e.type === 'station' ? 8 : catCol(e);
    const v = col(c); im.data[i * 4] = v >> 16; im.data[i * 4 + 1] = (v >> 8) & 255; im.data[i * 4 + 2] = v & 255; im.data[i * 4 + 3] = 255;
  }
  k.putImageData(im, 0, 0); dirty.mini = false;
}

function cableAt(L, x, y, mode) {
  if (!inb(x, y)) return;
  const i = y * WW + x, cost = LAYERS[L].cost || 1;
  if (!lineUnlocked(L)) return warnOnce('RESEARCH ' + TECH[LAYERS[L].tech].name + ' FIRST (Y)');
  if (mode === 'erase') { if (cab[L][i]) { const was = cab[L][i]; cab[L][i] = 0; scrap += cost; note(() => { cab[L][i] = was; scrap -= cost; }); recompute(); } return; }
  if (cab[L][i]) return;
  if (terrain[i] === 1 && !Meta.has('spans')) return warnOnce('CAN\'T LAY LINE ON WATER: RESEARCH BRIDGE SPANS (Y) OR GO AROUND');
  if (terrain[i] === 2) return warnOnce('RUBBLE IN THE WAY - SALVAGE IT (X)');
  if (terrain[i] === 4) return warnOnce('ROCK IN THE WAY - GO AROUND');
  if (occ[i]) return;
  if (!Net.covered(x, y)) { if (!Route.busy) warnOnce('OUTSIDE YOUR SIGNAL - BUILD SAT RELAYS (LINES TAB) TO REACH HERE'); return; }
  const cst = terrain[i] === 1 ? cost * 5 : cost;
  if (scrap < cst) return warnOnce('NOT ENOUGH SCRAP');
  scrap -= cst; cab[L][i] = 1; note(() => { cab[L][i] = 0; scrap += cst; });
  if (!Route.busy) beep(300 + L * 70, 0.03, 'square', 0.02); recompute();
  if (LAYERS[L].trunk) storyEv('trunk');
}
function restoreSite(e) {
  const st = e.type === 'dormantStation';
  if (st) {
    if (!Meta.has('control')) return warnOnce('RESEARCH GRID CONTROL FIRST (Y)');
    if (scrap < 200 || stock.parts < 12) return warnOnce('THE STATION NEEDS 200 SCRAP AND 12 PARTS');
    scrap -= 200; stock.parts -= 12;
  } else {
    if (!Meta.has('industry')) return warnOnce('RESEARCH HEAVY INDUSTRY FIRST (Y)');
    if (scrap < 120 || stock.parts < 8) return warnOnce('RESTORING A PLANT NEEDS 120 SCRAP AND 8 PARTS');
    scrap -= 120; stock.parts -= 8;
  }
  const k = e.site, x = e.x, y = e.y; removeEntity(e);
  const n = addEntity(SITE_OF[k], x, y); sel = n;
  storyEv(st ? 'station' : 'plant');
  toast(BUILD[n.type].name + ' restored. ' + (st ? 'Feed it 10 HV power and 3 fiber, then slot modules into it.' : 'It sits on the trunk lines and needs steady inputs and maintenance.'));
  [392, 523, 659].forEach((f, i) => beep(f, 0.15, 'square', 0.05, i * 0.1)); recompute();
}

// ---------- the control station: slot modules into it ----------
const stationSlots = () => 2 + (Meta.has('station2') ? 1 : 0) + (Meta.has('station3') ? 1 : 0);
function installModule(e, id) {
  const m = MODULES[id]; if (!m || e.mods.includes(id)) return;
  if (e.mods.length >= stationSlots()) return warnOnce('NO FREE SLOT - RESEARCH MORE SLOTS (Y)');
  if (scrap < m.cost || stock.parts < m.parts) return warnOnce('MODULE NEEDS ' + m.cost + ' SCRAP AND ' + m.parts + ' PARTS');
  scrap -= m.cost; stock.parts -= m.parts; e.mods.push(id); beep(520, 0.08); beep(780, 0.1, 'square', 0.04, 0.08);
  toast(m.name + ' installed. ' + (e.run ? '' : 'It only works while the station is running.')); recompute(); dirty.ui = true;
}
function removeModule(e, idx) { const id = e.mods[idx], m = MODULES[id]; if (!m) return; scrap += Math.floor(m.cost / 2); e.mods.splice(idx, 1); beep(260, 0.08, 'sawtooth'); recompute(); dirty.ui = true; }
function stationHtml(e) {
  const slots = stationSlots(); let h = `<div class="stn">STATION ${e.run ? '<span class="pos">ONLINE</span>' : '<span class="neg">OFFLINE</span>'} - needs 10 HV power + 3 fiber<br>MODULE SLOTS ${e.mods.length}/${slots}<br>`;
  for (let i = 0; i < slots; i++) {
    if (e.mods[i]) { const m = MODULES[e.mods[i]]; h += `<div class="slot full"><b>${m.name}</b> <small>${m.desc}</small><button data-rem="${i}">REMOVE</button></div>`; }
    else h += `<div class="slot"><small>EMPTY SLOT ${i + 1}</small></div>`;
  }
  const avail = Object.entries(MODULES).filter(([id, m]) => Meta.has(m.tech) && !e.mods.includes(id));
  if (e.mods.length < slots) h += avail.length ? avail.map(([id, m]) => `<button data-inst="${id}" title="${m.desc}">+ ${m.name} (${m.cost}+${m.parts}P)</button>`).join('') : '<small>No modules researched yet (Y).</small>';
  return h + '</div>';
}

function updateInspector() {
  const box = $('inspect');
  const hint = $('inspecthint'); if (hint) hint.textContent = sel && ents.includes(sel) ? 'SELECTED' : 'TOOL';
  if (!sel || !ents.includes(sel)) { box.innerHTML = toolCard(tool); return; }
  const e = sel, d = BUILD[e.type]; let h = `<b>${d.name}</b>${e.district ? ' - ' + e.district.name : ''}<br>`;
  if (d.maint) h += `CONDITION <span class="${e.cond < 30 ? 'neg' : ''}">${Math.round(e.cond)}%</span>${e.cond <= 0 ? ' FAILED' : ''}<br>`;
  if (e.type === 'dormant') h += `A dormant ${SITE_NAME[e.site]} plant. Restore: 120 scrap + 8 parts, needs HEAVY INDUSTRY. It connects to the TRUNK lines.<br><button id="i-res">RESTORE</button> `;
  if (e.type === 'dormantStation') h += `The dormant GRID CONTROL STATION. Restore: 200 scrap + 12 parts, needs GRID CONTROL research. Then slot upgrade modules into it.<br><button id="i-res">RESTORE</button> `;
  for (let R = 0; R < 3; R++) if (hasRes(e, R)) {
    const c = grpOf(e, R), lay = LAYERS[R + 3 * tierOf(e, R)]; if (!c && d.bridge !== R) continue;
    if (d.bridge === R) { h += `<span style="color:${lay.css}">${RESOURCES[R].name}</span> TRANSFORMER local &#8596; trunk ${e.on && e.live ? 'CLOSED' : 'OPEN'}<br>`; continue; }
    h += `<span style="color:${lay.css}">${lay.name}</span> ${d.dem[R] ? (e.ok[R] ? 'OK' : 'MISSING') : 'supplies ' + Math.round(d.importer ? (e.imp ? e.imp[R] : 0) : d.sup[R] * e.mult)} (${Math.round(c.demand)}/${Math.round(c.supply)})<br>`;
  }
  if (d.store) h += `STORED ${Math.round(e.charge)}/${d.store.cap}<br>`;
  if (d.fuel) h += `BURNS ${d.fuel} fuel/s${stock.fuel <= 0 ? ' - NO FUEL' : ''}<br>`;
  if (d.bridge !== undefined) h += `SWITCH ${e.on ? 'ON' : 'OFF'}${e.on && !e.live ? ' (NO SIGNAL/POWER)' : ''}<br><button id="i-tog">TOGGLE (T)</button> `;
  if (d.upkeep) h += `UPKEEP ${d.upkeep}/s<br>`;
  if (d.income) h += `EARNS ${d.income}/s ${e.active ? '' : '(inactive)'}<br>`;
  if (d.fuelOut) h += `MAKES ${(d.fuelOut * (TM().fuelOut || 1)).toFixed(2)} fuel/s ${e.run ? '' : '(idle)'}<br>`;
  if (d.partsOut && !e.isHub) h += `MAKES ${(d.partsOut * (TM().partsOut || 1)).toFixed(2)} parts/s ${e.run ? '' : '(idle)'}<br>`;
  if (d.partsUse) h += `USES ${d.partsUse} parts/s${stock.parts <= 0 ? ' - NO PARTS' : ''}<br>`;
  if (d.prod) h += `MAKES ${Object.keys(d.prod).map(k => (d.prod[k] * (TM()[k + 'Out'] || 1)).toFixed(2) + ' ' + GOODS[k].n.toLowerCase()).join(', ')}/s for the shared stockpile ${e.run ? '' : '(idle)'}<br>`;
  if (d.poolUse) h += `USES ${Object.keys(d.poolUse).map(k => d.poolUse[k] + ' ' + GOODS[k].n.toLowerCase()).join(', ')}/s from the stockpile${Pool.has(d.poolUse) ? '' : ' - <span class="neg">EMPTY</span>'}<br>`;
  if (d.cargo) h += `DOCK for the shared inventory ${e.run ? '- ONLINE' : '(needs power + net)'} <button id="i-inv">OPEN INVENTORY</button><br>`;
  if (d.drones) h += `DRONES ${(e._dr || []).filter(x => x.job).length}/${Drones.count(d)} busy - range ${Drones.range(d)} tiles${e.run ? '' : ' (idle: needs power + net)'}<br>`;
  if (d.exchange) h += `TRADES parts and fuel with the stockpile (pool: ${Pool.fmt(Pool.get('parts'))} parts, ${Pool.fmt(Pool.get('fuel'))} fuel)<br>`;
  if (d.rp && !e.isHub) h += `RESEARCH ${(d.rp * (TM().rp || 1)).toFixed(1)}/s ${e.run ? '' : '(idle)'}<br>`;
  if (d.fuelCap) h += `FUEL TANK +${Math.round(d.fuelCap * (TM().fuelStore || 1))}<br>`; if (d.scrapCap) h += `SCRAP CAP +${d.scrapCap}<br>`;
  if (d.isStation) h += stationHtml(e);
  if (d.maint) h += '<button id="i-rep">REPAIR</button> ';
  if (!d.fixed && !d.central && !d.isStation) h += '<button id="i-sal">SALVAGE</button>';
  box.innerHTML = h;
  const a = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  a('i-tog', () => toggleSwitch(e)); a('i-inv', () => Inv.show()); a('i-rep', () => repairEntity(e)); a('i-res', () => restoreSite(e)); a('i-sal', () => { beginStroke(); salvageAt(e.x, e.y); endStroke(); });
  box.querySelectorAll('[data-inst]').forEach(b => { b.onclick = () => installModule(e, b.dataset.inst); });
  box.querySelectorAll('[data-rem]').forEach(b => { b.onclick = () => removeModule(e, +b.dataset.rem); });
}
function describe() {
  if (!mouse.in || !inb(hover.x, hover.y)) return '';
  const i = hover.y * WW + hover.x, e = occ[i], out = [];
  if (Loot.at(hover.x, hover.y)) return 'SUPPLY CACHE - click to open it';
  if (e) {
    const d = BUILD[e.type]; out.push(d.name + (e.district ? ' - ' + e.district.name : ''));
    if (d.maint) out.push('COND ' + Math.round(e.cond) + '%');
    if (d.bridge !== undefined) out.push(RESOURCES[d.bridge].name + ' TRANSFORMER ' + (e.on ? 'ON' : 'OFF') + (e.on && !e.live ? ' (NO SIGNAL)' : '') + ' (T)');
    for (let R = 0; R < 3; R++) if (hasRes(e, R) && d.bridge !== R) { const c = grpOf(e, R); if (!c) continue; out.push(RES_SHORT[R] + (tierOf(e, R) ? '*' : '') + (d.dem[R] ? (e.ok[R] ? ' ok' : ' MISSING') : ' +') + ` ${Math.round(c.demand)}/${Math.round(c.supply)}`); }
    if (d.store) out.push('STORED ' + Math.round(e.charge) + '/' + d.store.cap);
  } else {
    out.push(['GROUND', 'WATER', 'RUBBLE (salvage +3)', 'OLD ROAD', 'ROCK', 'BRIDGE', 'BANK', 'PAVEMENT'][terrain[i]]);
    for (let L = 0; L < NL; L++) if (cab[L][i]) { if (cab[L][i] === 2) { out.push(LAYERS[L].short + ' DAMAGED'); continue; } const c = info[L][comp[L][i]]; out.push(LAYERS[L].short + (c.supply ? ` live ${Math.round(c.demand)}/${Math.round(c.supply)}` : ' dead')); }
  }
  return out.join('  |  ');
}

// ---------- research: a node tree ----------
const TN_W = 184, TN_H = 58, TN_GX = 70, TN_GY = 16, BR_ORDER = ['POWER', 'GRID', 'WATER', 'NET', 'TOWN', 'INDUSTRY', 'OPS', 'STATION', 'BOOST'];
let techPos = null, techSel = null;
function techLayout(ids) {
  ids = ids || Object.keys(TECH); const inSet = new Set(ids), depth = {};
  const dfs = id => { if (depth[id] !== undefined) return depth[id]; const rq = TECH[id].req.filter(r => inSet.has(r)); return (depth[id] = rq.length ? 1 + Math.max(...rq.map(dfs)) : 0); };
  ids.forEach(dfs);
  const cols = []; ids.forEach(id => { (cols[depth[id]] = cols[depth[id]] || []).push(id); });
  const row = {}, pos = {};
  cols.forEach((col, ci) => {
    col.sort((a, b) => {
      const ra = TECH[a].req.filter(r => inSet.has(r)), rb = TECH[b].req.filter(r => inSet.has(r));
      const pa = ra.length ? ra.reduce((s, r) => s + (row[r] ?? 0), 0) / ra.length : BR_ORDER.indexOf(TECH[a].br) * 2;
      const pb = rb.length ? rb.reduce((s, r) => s + (row[r] ?? 0), 0) / rb.length : BR_ORDER.indexOf(TECH[b].br) * 2;
      return pa - pb || BR_ORDER.indexOf(TECH[a].br) - BR_ORDER.indexOf(TECH[b].br);
    });
    let r = 0; col.forEach(id => { row[id] = r; pos[id] = { x: ci * (TN_W + TN_GX), y: r * (TN_H + TN_GY) }; r++; });
  });
  pos._w = cols.length * (TN_W + TN_GX); pos._h = Math.max(...cols.map(c => c.length)) * (TN_H + TN_GY);
  return pos;
}
function techUnlocks(id) {
  const u = [];
  Object.values(BUILD).forEach(b => { if (b.tech === id) u.push(b.name); });
  LAYERS.forEach(l => { if (l.tech === id) u.push(l.name); });
  Object.values(MODULES).forEach(m => { if (m.tech === id) u.push('module ' + m.name); });
  return u;
}
let techAge = 0;                                                   // research tree filter: 0 = every age
function renderResearch() {
  $('rp-have').textContent = Math.floor(Meta.rp);
  const ca = curAge(), R = ['', 'I', 'II', 'III', 'IV', 'V'];
  $('ageflt').innerHTML = [0, 1, 2, 3, 4, 5].map(a => `<button data-a="${a}" class="${a === techAge ? 'on' : ''}">${a ? 'AGE ' + R[a] + (a > ca ? ' ' + pxi('lock') : '') : 'ALL AGES'}</button>`).join('');
  $('ageflt').onclick = ev => { const b = ev.target.closest('button[data-a]'); if (b) { techAge = +b.dataset.a; techPos = null; renderResearch(); } };
  $('age-now').textContent = 'AGE ' + R[ca] + (typeof AGES !== 'undefined' ? ' - ' + AGES[ca].n : '');
  if (!techPos || techPos._age !== techAge) { techPos = techLayout(Object.keys(TECH).filter(id => !techAge || TECH[id].age === techAge)); techPos._age = techAge; }
  const nodes = $('technodes'), svg = $('techlines'), pos = techPos;
  nodes.style.width = pos._w + 'px'; nodes.style.height = pos._h + 'px'; svg.setAttribute('width', pos._w); svg.setAttribute('height', pos._h);
  let paths = '', html = '';
  Object.entries(TECH).forEach(([id, t]) => {
    const p = pos[id]; if (!p) return;
    const aged = t.age > ca, done = Meta.has(id), avail = !done && !aged && t.req.every(r => Meta.has(r)), can = avail && Meta.rp >= t.cost;
    t.req.forEach(r => {
      const a = pos[r]; if (!a) return; const x1 = a.x + TN_W, y1 = a.y + TN_H / 2, x2 = p.x, y2 = p.y + TN_H / 2, live = Meta.has(r);
      paths += `<path d="M${x1} ${y1} C${x1 + 36} ${y1}, ${x2 - 36} ${y2}, ${x2} ${y2}" stroke="${done ? '#8fbf5a' : live ? '#f5c95a' : '#3a3140'}" stroke-width="${live ? 3 : 2}" fill="none"/>`;
    });
    const qi = Meta.q.indexOf(id), pg = Meta.pr[id] ? Math.round(Research.progress(id) * 100) : 0;
    html += `<button class="tn ${done ? 'done' : avail ? (can ? 'can' : 'avail') : 'lock'} ${qi >= 0 ? 'queued' : ''} ${techSel === id ? 'sel' : ''}" data-id="${id}" style="left:${p.x}px;top:${p.y}px;--c:${BRANCH[t.br].color};--pg:${pg}%">${qi >= 0 ? `<em class="tnq">${qi + 1}</em>` : ''}<b>${t.name}</b><span>${done ? 'DONE' : aged ? 'AGE ' + R[t.age] + ' - ' + t.cost + ' RP' : pg ? pg + '% of ' + t.cost + ' RP' : t.cost + ' RP'}</span></button>`;
  });
  svg.innerHTML = paths; nodes.innerHTML = html;
  nodes.querySelectorAll('.tn').forEach(b => { b.onclick = () => { techSel = b.dataset.id; renderResearch(); }; b.ondblclick = () => queueTech(b.dataset.id); });
  Research.renderQueue();
  const info = $('techinfo'), id = techSel;
  if (!id) { info.innerHTML = '<span class="more">Click a project to read it. Double-click it (or ADD TO QUEUE) to queue it: research then fills up over time from your research points. Missing prerequisites are queued first.</span>'; return; }
  const t = TECH[id], done = Meta.has(id), avail = t.req.every(r => Meta.has(r)), un = techUnlocks(id), ageNote = t.age > curAge() ? ` <span class="neg">Opens in AGE ${R[t.age]}${typeof AGES !== 'undefined' ? ' (' + AGES[t.age].n + ')' : ''}: advance on the AGES screen (G on the map).</span>` : '';
  info.innerHTML = `<b style="color:${BRANCH[t.br].color}">${t.name}</b> <small>${t.br} - AGE ${R[t.age]}</small> - ${t.desc}${ageNote}${un.length ? ' <span class="pos">Unlocks: ' + un.join(', ') + '.</span>' : ''}${!done && !avail ? ' <span class="neg">Needs: ' + t.req.filter(r => !Meta.has(r)).map(r => TECH[r].name).join(', ') + '.</span>' : ''} <button id="tech-buy" class="${Meta.q.includes(id) ? '' : 'primary'}" ${done ? 'disabled' : ''}>${done ? 'RESEARCHED' : Meta.q.includes(id) ? 'REMOVE FROM QUEUE' : 'ADD TO QUEUE - ' + t.cost + ' RP'}</button>${!done && Meta.q.includes(id) && Meta.q[0] !== id ? '<button id="tech-front">RESEARCH NEXT</button>' : ''}${!done && Object.keys(Research.packs(id)).length ? ' <small class="warn">+ ' + Object.entries(Research.packs(id)).map(([k, v]) => v + ' ' + GOODS[k].n.toLowerCase()).join(', ') + ' as science packs</small>' : ''}${Meta.pr[id] ? ' <small class="pos">' + Math.round(Research.progress(id) * 100) + '% done</small>' : ''}`;
  $('tech-buy').onclick = () => { if (Meta.q.includes(id)) { Research.remove(id); renderResearch(); } else queueTech(id); };
  const tf = $('tech-front'); if (tf) tf.onclick = () => { Research.toFront(id); renderResearch(); };
}
function queueTech(id) {
  const r = Research.add(id), t = TECH[id];
  if (r === 'full') toast('THE RESEARCH QUEUE IS FULL (' + Research.MAXQ + ')');
  techSel = id; renderResearch(); if (r === 'ok' && t.age > curAge()) toast(t.name + ' is queued, but it waits until the AGE ' + ['', 'I', 'II', 'III', 'IV', 'V'][t.age]);
}
function buyTech(id) { return queueTech(id); }
function buyTechNow(id) { if (Meta.buy(id)) { if (typeof Variety !== 'undefined') Variety.remod(); if (typeof recalcMods === 'function') recalcMods(); recompute(); storyEv('research'); beep(660, 0.1); beep(880, 0.15, 'square', 0.04, 0.08); renderResearch(); } }

Meta.load(); buildMeters(); buildToolbar();
requestAnimationFrame(frame);
