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
};
let tnoise = valueNoise(1);
const CATCOL = { LINES: '#d8e6e0', POWER: '#f5c95a', WATER: '#5fc4d0', NET: '#8fbf5a', CONTROL: '#b59cf0', TOWN: '#e08a3c', OPS: '#e6dd9a', TOOLS: '#8a6a4e' };
const LORE = {
  res: ['A kettle whistles somewhere. Someone laughs.', 'Porch lights come on, one by one.', 'A child asks what the humming is. Then they stop asking.'],
  ind: ['The old foundry coughs, then roars.', 'Sparks fly from a lathe nobody has touched in eleven years.', 'The shift whistle blows. People remember how to line up.'],
  farm: ['Pumps shudder and the dead fields drink.', 'Irrigation lines hiss. Someone plants the first row.', 'Green. Actual green. Just a thread of it.'],
  med: ['A monitor beeps. The room goes quiet, then everyone cheers.', 'The clinic lights flicker on. Someone in the dark starts to cry with relief.', 'Cold storage hums. The medicine will keep.'],
  campus: ['Screens glow in the old lecture hall. Students gather.', 'The campus mainframe spins up and finds a signal.', 'A radio crackles with voices from another county.'],
};
// ---- terrain renderer v2: per-pixel ground blending, autotiled roads and bridges, crumbling pavement ----
const PALRGB = PAL.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
const ROADISH = q => q === 3 || q === 5;
const nb4 = (tx, ty) => [ty > 0 ? terrain[(ty - 1) * WW + tx] : 1, tx < WW - 1 ? terrain[ty * WW + tx + 1] : 1, ty < WH - 1 ? terrain[(ty + 1) * WW + tx] : 1, tx > 0 ? terrain[ty * WW + tx - 1] : 1]; // N E S W

function groundNoise(wx, wy, bm) {                     // organic two-tone + bare-earth patches, stippled at the borders
  const n = tnoise(wx, wy, 40) * 0.68 + tnoise(wx, wy, 12) * 0.32, th = bay(wx, wy) - 0.5;
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

  const dec = s();
  if (t === 0) {
    if (B === 'desert') {
      if (dec < 0.04) { P(3, 1, 2, 6, 10); P(1, 3, 2, 1, 10); P(1, 2, 1, 2, 10); P(5, 4, 2, 1, 10); P(5, 3, 1, 1, 10); P(3, 7, 2, 1, 0); P(3, 1, 1, 1, 11); }
      else if (dec < 0.13) { const yy = 2 + (s() * 4 | 0); P(1, yy, 5, 1, 5); P(2, yy + 1, 3, 1, 3); }
      else if (dec < 0.15) { P(2, 3, 3, 2, 15); P(2, 3, 1, 1, 0); P(4, 3, 1, 1, 0); P(3, 5, 1, 1, 15); }
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

function generateWorld() {
  terrain = new Uint8Array(N);
  const r = mulberry(SPEC.seed), noise = valueNoise(SPEC.seed + 5), noise2 = valueNoise(SPEC.seed + 9);
  const blob = (cx, cy, rad, v, only) => {
    for (let y = Math.max(0, cy - rad - 2 | 0); y < Math.min(WH, cy + rad + 3); y++) for (let x = Math.max(0, cx - rad - 2 | 0); x < Math.min(WW, cx + rad + 3); x++)
      if ((!only || terrain[y * WW + x] === only) && Math.hypot(x - cx, y - cy) + r() * 0.9 < rad) terrain[y * WW + x] = v;
  };
  for (let k = 0; k < SPEC.pondCount; k++) blob(3 + r() * (WW - 6), 3 + r() * (WH - 6), 2 + r() * 2.6, 1);
  // rock outcrops follow smooth noise so they form ridges / clusters
  const rd = SPEC.rockDensity, thr = 0.80 - rd * 0.18;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const n = noise(x, y, 9) * 0.65 + noise2(x, y, 4) * 0.35;
    if (n > thr && terrain[y * WW + x] === 0) terrain[y * WW + x] = 4;
  }
  for (let k = 0; k < SPEC.rubbleClusters; k++) {
    const cx = r() * WW | 0, cy = r() * WH | 0, n = 3 + (r() * 6 | 0);
    for (let j = 0; j < n; j++) { const x = cx + (r() * 6 - 3) | 0, y = cy + (r() * 6 - 3) | 0; if (inb(x, y) && terrain[y * WW + x] === 0) terrain[y * WW + x] = 2; }
  }
  for (let i = 0; i < N; i++) if (terrain[i] === 0 && r() < 0.025) terrain[i] = 2;
  // rivers: wandering water from one edge to the other
  for (let k = 0; k < SPEC.rivers; k++) {
    const vert = r() < 0.5; let x = vert ? 10 + r() * (WW - 20) : 0, y = vert ? 0 : 8 + r() * (WH - 16);
    const tx = vert ? 10 + r() * (WW - 20) : WW - 1, ty = vert ? WH - 1 : 8 + r() * (WH - 16), wid = 1.3 + r() * 0.9;
    for (let step = 0; step < 600; step++) {
      const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
      x += dx / d * 0.9 + Math.sin(step * 0.13 + k * 3) * 0.75 + (r() - 0.5) * 0.5; y += dy / d * 0.9 + Math.cos(step * 0.11 + k) * 0.75 + (r() - 0.5) * 0.5;
      blob(x, y, wid, 1);
      if (x < -2 || y < -2 || x > WW + 2 || y > WH + 2 || d < 1.5) break;
    }
  }
  // coasts / great lakes on the sides that touch water on the world map
  const co = SPEC.coast;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const jitter = noise(x * (y > x ? 1 : 1), y, 6) * 6 - 3, jx = noise2(x, y, 7) * 5 - 2.5;
    const dn = y - (co.n + jx), ds = (WH - 1 - y) - (co.s + jx), dw = x - (co.w + jitter), de = (WW - 1 - x) - (co.e + jitter);
    const dist = Math.min(co.n ? dn : 99, co.s ? ds : 99, co.w ? dw : 99, co.e ? de : 99);
    if (dist < 0) terrain[y * WW + x] = 1;
    else if (dist < 2.4 && terrain[y * WW + x] !== 1) terrain[y * WW + x] = 6;
  }
  const clear = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) terrain[y * WW + x] = 0; };
  for (const d of DISTRICTS) clear(d.x - 6, d.y - 5, d.x + 7, d.y + 6);
  for (const s of SITES) { const z = s.kind === 'station' ? 5 : 4; clear(s.x - 2, s.y - 2, s.x + z, s.y + z); }
  for (const p of FORCED_PONDS) for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (Math.hypot(x - p.x, y - p.y) < p.r) terrain[y * WW + x] = 1;
  // old roads between districts (bridges where they cross water)
  const nearForced = (x, y) => FORCED_PONDS.some(p => Math.hypot(x - p.x, y - p.y) < p.r + 1.5);
  const road = (x, y) => { if (!inb(x, y) || nearForced(x, y)) return; const i = y * WW + x; if (terrain[i] === 1) terrain[i] = 5; else if (terrain[i] !== 5) terrain[i] = 3; };
  const links = [];
  DISTRICTS.forEach((d, i) => { if (!i) return; let b = 0, bd = 1e9; for (let j = 0; j < i; j++) { const dd = Math.abs(DISTRICTS[j].x - d.x) + Math.abs(DISTRICTS[j].y - d.y); if (dd < bd) { bd = dd; b = j; } } links.push([DISTRICTS[b], d]); });
  SITES.forEach(s => { let b = DISTRICTS[0], bd = 1e9; DISTRICTS.forEach(d => { const dd = Math.abs(d.x - s.x) + Math.abs(d.y - s.y); if (dd < bd) { bd = dd; b = d; } }); links.push([b, { x: s.x - 1, y: s.y + 1 }]); });
  for (const [a, b] of links) {
    let x = a.x + 1, y = a.y + 3, dir = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? 'h' : 'v', run = 0, guard = 0;
    const ex = b.x + 1, ey = b.y + 3;
    while ((x !== ex || y !== ey) && guard++ < 900) {                 // long straight runs with occasional turns
      road(x, y);
      const dx = ex - x, dy = ey - y;
      if (dx === 0) dir = 'v'; else if (dy === 0) dir = 'h'; else if (run >= 3 + (r() * 5 | 0)) { dir = dir === 'h' ? 'v' : 'h'; run = 0; }
      if (dir === 'h') x += Math.sign(dx); else y += Math.sign(dy);
      run++;
    }
    road(ex, ey);
  }
  tnoise = valueNoise(SPEC.seed + 21);
  for (const d of DISTRICTS) for (let y = d.y - 2; y <= d.y + 4; y++) for (let x = d.x - 3; x <= d.x + 4; x++) if (inb(x, y) && terrain[y * WW + x] === 0) terrain[y * WW + x] = 7;
  for (const q of SITES) { const z = q.kind === 'station' ? 4 : 3; for (let y = q.y - 1; y <= q.y + z; y++) for (let x = q.x - 1; x <= q.x + z; x++) if (inb(x, y) && terrain[y * WW + x] === 0) terrain[y * WW + x] = 7; }
  const bank = [];
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (terrain[y * WW + x] === 0 && (hash(x, y) % 100) < 75 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inb(x + dx, y + dy) && terrain[(y + dy) * WW + x + dx] === 1)) bank.push(y * WW + x);
  bank.forEach(i => { terrain[i] = 6; });
  waterTiles = []; for (let i = 0; i < N; i++) if (terrain[i] === 1) waterTiles.push(i);
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
  cabCv.forEach(c => { c.width = WW * T; c.height = WH * T; });
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
  if (e.type === 'solar' && radUntil > gameT) m *= 0.4;
  { const tm = TM(); if (e.type === 'solar') m *= tm.solar || 1; else if (e.type === 'wind') m *= tm.wind || 1; else if (e.type === 'hydro') m *= tm.hydro || 1; else if (e.type === 'pump') m *= tm.pump || 1;
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
  fuelCap = 100; income = 0; upkeep = 0; alerts = [];
  const anyRestored = DISTRICTS.some(x => x.restored);
  for (const e of ents) e.linked = isLinked(e);
  const clinics = ents.filter(e => e.type === 'clinic' && e.cond > 0 && e.ok.every(Boolean));
  for (const e of ents) {
    const d = BUILD[e.type], needs = d.dem[0] + d.dem[1] + d.dem[2] > 0, allOk = d.dem.every((v, L) => v === 0 || e.ok[L]);
    e.active = needs && allOk && e.cond > 0;
    e.run = e.linked && e.cond > 0 && allOk && (!d.fuel || stock.fuel > 0) && (!d.partsUse || stock.parts > 0);
    if (d.fuelCap && e.cond > 0) fuelCap += d.fuelCap;
    if (d.upkeep && anyRestored && e.run) upkeep += d.upkeep * (Meta.has('logistics') ? 0.75 : 1) * (TM().upkeep || 1);      // idle or unwired machines cost nothing
    if (e.active && d.income) {
      income += d.income;
      if (e.type === 'house' && clinics.some(c => Math.abs(c.x - e.x) <= 8 && Math.abs(c.y - e.y) <= 8)) income += 1;
    }
    if (d.maint && e.cond <= 0) alerts.push({ e, miss: ['FAILED'], label: d.name, jump: 1 });
    else if (needs && !e.active && !(e.type === 'hub' && false)) {
      const miss = [0, 1, 2].filter(L => d.dem[L] > 0 && !e.ok[L]).map(L => RES_SHORT[L] + (tierOf(e, L) ? '*' : ''));
      alerts.push({ e, miss, label: e.district ? e.district.name + (e.district.restored ? '' : ' HUB') : d.name });
    } else if (d.bridge !== undefined && !e.live && e.on) alerts.push({ e, miss: ['NO SIGNAL'], label: d.name });
    else if (d.fuel && stock.fuel <= 0) alerts.push({ e, miss: ['NO FUEL'], label: d.name });
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
    const sr = starRating(); $('win-stars').textContent = '★'.repeat(sr) + '☆'.repeat(3 - sr); $('win-text').textContent = sr === 3 ? 'Flawless. Every machine runs and every plant is awake.' : 'Every district hums with power, clean water and a working network. Repair every fault and wake the plants for more stars.';
  }
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
      if (d.fuel) stock.fuel -= d.fuel * (activeMods.has('fuelrec') ? 0.75 : 1) * (TM().fuel || 1); if (d.fuelOut) stock.fuel += d.fuelOut;
      if (d.partsOut) stock.parts += d.partsOut * (TM().partsOut || 1); if (d.partsUse) stock.parts -= d.partsUse;
      if (d.rp) { Meta.rp += d.rp * (TM().rp || 1); Meta.dirty = true; }
    } else if (e.isHub && e.active) { if (d.partsOut) stock.parts += d.partsOut * (TM().partsOut || 1); if (d.rp) { Meta.rp += d.rp * (TM().rp || 1); Meta.dirty = true; } }
    if (d.maint && e.cond > 0 && e.run && DISTRICTS.some(x => x.restored)) e.cond = Math.max(0, e.cond - d.maint * WMOD.wear * (TM().wear || 1));   // only working machines wear
  }
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
function costText(d) { return d.cost + (d.parts ? ' +' + d.parts + 'P' : ''); }
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
  if (d.needWater) {
    let ok = false;
    for (let j = -1; j <= d.h; j++) for (let i = -1; i <= d.w; i++) if (inb(x + i, y + j) && terrain[(y + j) * WW + x + i] === 1) ok = true;
    if (!ok) return 'PUMP MUST BE NEXT TO WATER';
  }
  if (d.town && !nearRestoredHub(x, y)) return 'NEEDS A RESTORED HUB WITHIN ' + HOUSE_RADIUS + ' TILES';
  if (scrap < d.cost) return 'NOT ENOUGH SCRAP (' + d.cost + ')';
  if (d.parts && stock.parts < d.parts) return 'NOT ENOUGH PARTS (' + d.parts + ') - BUILD WORKSHOPS';
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
function toast(msg) {
  const m = $('msg'); m.textContent = msg; m.classList.add('flash'); $('msgtag').textContent = 'NEWS'; $('msgrow').classList.remove('tutorial'); $('msgbtns').style.display = 'none';
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
    const refund = Math.floor((d.cost || 100) / 2), snap = { type: e.type, x: e.x, y: e.y, on: e.on, charge: e.charge, cond: e.cond };
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
  else if (tool.kind === 'salvage') salvageAt(x, y);
  else if (tool.kind === 'repair') { const e = occ[y * WW + x]; if (e && first) repairEntity(e); else repairCable(x, y); }
  else if (tool.kind === 'inspect' && first) {
    const e = occ[y * WW + x]; sel = e || null; dirty.ui = true; if (e) showTab('status');
    if (e && BUILD[e.type].sw !== undefined) { stroke = null; toggleSwitch(e); }
    beep(520, 0.04);
  } else if (tool.kind === 'build' && first) {
    const why = canPlace(tool.type, x, y);
    if (why) { toast(why); beep(110, 0.12, 'sawtooth'); return; }
    const d = BUILD[tool.type]; scrap -= d.cost; stock.parts -= d.parts || 0;
    const e = addEntity(tool.type, x, y);
    note(() => { removeEntity(e); scrap += d.cost; stock.parts += d.parts || 0; });
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
  return ({ generator: IMG.gen, solar: IMG.solar, wind: IMG.windA, battery: batterySprite(3), pump: IMG.pump, tower: IMG.tower, router: IMG.router,
    substation: switchSprite(0, true), valve: switchSprite(1, true), node: switchSprite(2, true), house: IMG.houseOn, workshop: workshopSprite(true),
    clinic: IMG.clinic, intertie: IMG.intertie, security: IMG.security, hydro: IMG.hydro, gasturbine: IMG.gasturbine, desal: IMG.desal, relay: IMG.relay, apartments: IMG.apartments, market: IMG.market, school: IMG.school, greenhouse: IMG.greenhouse, lab: IMG.lab, depot: IMG.depot, fueldepot: IMG.fueldepot, refinery: IMG.refinery })[type];
}
function iconFor(t) {
  const c = t.kind === 'build' ? iconCanvas(t.type) : null, m = c && c.width === 8 ? 4 : 2;
  return c ? `<img src="${c.toDataURL()}" width="${c.width * m}" height="${c.height * m}" alt="">`
    : `<span class="ico" style="${t.kind === 'cable' ? 'background:' + t.color : 'color:' + t.color}">${t.kind === 'multi' ? '≡' : t.kind === 'salvage' ? '✂' : t.kind === 'inspect' ? '?' : t.kind === 'repair' ? '+' : ''}</span>`;
}
const CATS = [...new Set(TOOLS.map(t => t.cat))];
const TABS = ['build', 'status', 'sites'];
function showTab(n) { curTab = n; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === n)); TABS.forEach(t => { const el = $('tab-' + t); if (el) el.classList.toggle('on', t === n); }); }
function cycleTab() { showTab(TABS[(TABS.indexOf(curTab) + 1) % TABS.length]); }
document.querySelectorAll('#tabs button').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
function buildToolbar() {
  const cats = $('cats'); cats.innerHTML = '';
  CATS.forEach(c => { const b = document.createElement('button'); b.textContent = c; b.dataset.cat = c; b.style.borderBottomColor = CATCOL[c]; b.onclick = () => { activeCat = c; renderTools(); selectTool(TOOLS.find(t => t.cat === c)); }; cats.appendChild(b); });
  renderTools(); selectTool(TOOLS[0]);
}
function renderTools() {
  const bar = $('tools'); bar.innerHTML = ''; const box = document.createElement('div'); box.className = 'grid'; bar.appendChild(box);
  TOOLS.filter(t => t.cat === activeCat).forEach(t => {
    const b = document.createElement('button');
    b.innerHTML = `${iconFor(t)}<span class="nm">${t.name}</span><span class="ky">${t.key.toUpperCase()}</span><small></small>`;
    b.title = t.desc; b.dataset.name = t.name; b.onclick = () => selectTool(t); b._t = t; b.style.setProperty('--c', CATCOL[t.cat] || '#3a3140'); box.appendChild(b);
  });
  document.querySelectorAll('#cats button').forEach(b => b.classList.toggle('on', b.dataset.cat === activeCat));
  refreshToolbar();
}
function refreshToolbar() {
  document.querySelectorAll('#tools button').forEach(b => {
    const t = b._t, lock = t.kind === 'build' && !unlocked(t.type);
    b.classList.toggle('locked', lock);
    b.querySelector('small').textContent = lock ? 'LOCKED' : t.kind === 'build' ? costText(BUILD[t.type]) : (t.cost || '');
  });
}
function selectTool(t) {
  tool = t; if (t.cat !== activeCat) { activeCat = t.cat; renderTools(); }
  document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.name === t.name));
  $('tooldesc').textContent = t.desc + (t.kind === 'build' && !unlocked(t.type) ? '  [LOCKED: research ' + TECH[BUILD[t.type].tech].name + ']' : '');
  if (t.kind !== 'inspect' && curTab !== 'build') showTab('build');
  if (typeof renderMulti === 'function') renderMulti();
}
function refreshDistrictButtons() {
  const box = $('districts'); box.innerHTML = '';
  DISTRICTS.forEach(d => {
    const b = document.createElement('button');
    b.textContent = (d.restored ? '■ ' : '□ ') + d.name + ' ' + ({ res: '', ind: '[IND]', farm: '[FARM]', med: '[MED]', campus: '[LAB]' })[d.kind || 'res']; b.className = d.restored ? 'done' : '';
    b.onclick = () => centerOn(d.x + 1, d.y + 1); box.appendChild(b);
  });
  SITES.forEach(s => { const e = ents.find(q => q.x === s.x && q.y === s.y); const b = document.createElement('button'); const live = e && !String(e.type).startsWith('dormant'); b.textContent = '◆ ' + SITE_NAME[s.kind] + (s.kind === 'station' ? '' : ' PLANT') + (live ? ' ✓' : ''); b.className = live ? 'done' : 'site'; b.onclick = () => centerOn(s.x + 1, s.y + 1); box.appendChild(b); });
}
function buildMeters() {
  $('meters').innerHTML = RESOURCES.map((l, i) => `<div class="meter"><span class="lab" style="color:${l.css}">${l.name}</span><div class="bar"><i id="mb${i}" style="background:${l.css}"></i></div><span class="num" id="mt${i}"></span></div>`).join('');
}
function updateHud() {
  $('scrap').textContent = Math.floor(scrap);
  const net = income - upkeep; $('income').textContent = (net >= 0 ? '+' : '') + Math.round(net * 10) / 10 + '/s'; $('income').className = net < 0 ? 'neg' : 'pos';
  $('fuel').textContent = Math.floor(stock.fuel) + '/' + fuelCap; $('fuel').className = stock.fuel < 20 ? 'neg' : '';
  $('parts').textContent = Math.floor(stock.parts); $('rp').textContent = Math.floor(Meta.rp);
  $('econ').textContent = `INCOME +${income}   UPKEEP -${upkeep}` + (radUntil > gameT ? '   ☢ RADIATION STORM' : '');
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
  alerts.slice(0, 8).forEach(a => {
    const b = document.createElement('button'); b.innerHTML = `<b>${a.label}</b> ${a.miss.join(' ')}`;
    b.onclick = () => { if (a.e) { centerOn(a.e.x + 1, a.e.y + 1); sel = a.e; dirty.ui = true; } else if (a.cable !== undefined) centerOn(a.cable % WW, (a.cable / WW) | 0); };
    box.appendChild(b);
  });
  if (alerts.length > 8) { const d = document.createElement('div'); d.className = 'more'; d.textContent = '+' + (alerts.length - 8) + ' more'; box.appendChild(d); }
}
let lastInfo = '', alertIdx = 0;
function jumpAlert(dir) {
  if (!alerts.length) { toast('ALL SYSTEMS NOMINAL'); return; }
  alertIdx = (alertIdx + dir + alerts.length) % alerts.length; const a = alerts[alertIdx];
  if (a.e) { centerOn(a.e.x + 1, a.e.y + 1); sel = a.e; dirty.ui = true; } else if (a.cable !== undefined) centerOn(a.cable % WW, (a.cable / WW) | 0);
  toast((alertIdx + 1) + '/' + alerts.length + '  ' + a.label + ' ' + a.miss.join(' '));
}
// research window
function openResearch() { renderResearch(); $('research').style.display = 'flex'; }
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
  opsMini(); Loot.mini(); Camp.mini();
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
  for (const i of waterTiles) { const x = i % WW, y = (i / WW) | 0; if (x < x0 || x > x1 || y < y0 || y > y1) continue; if ((x * 7 + y * 13 + wf) % 11 === 0) px(x * T - cx + 2 + (wf & 3), y * T - cy + 3, 3, 1, 14); }
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
  for (let L = 0; L < NL; L++) { g.globalAlpha = focus < 0 || focus === LAYERS[L].res ? 1 : 0.2; g.drawImage(cabCv[L], -cx, -cy); }
  g.globalAlpha = 1;
  const ph = Math.floor(t * 14);
  for (const p of pulses) {
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
    g.globalAlpha = 0.5; px(ex - 1, ey + 1, e.w * T + 2, e.h * T + 1, 0); g.globalAlpha = 0.35; px(ex + 2, ey + e.h * T, e.w * T, 2, 0); g.globalAlpha = 1;      // foundation + shadow
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
  drawFx(t, cx, cy, dt);
  const night = Math.max(0, Math.sin((t - startT) / 40 + 3.3)) * 0.32;
  if (night > 0.03) drawLights(night, cx, cy, x0, y0, x1, y1);
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
  try {
    localStorage.setItem(SAVE_PREFIX + countyId, JSON.stringify({
      scrap: Math.floor(scrap), stock, evT, cab: cab.map(rleEnc), rub: [...cleared],
      ents: ents.filter(e => !BUILD[e.type].fixed).map(e => ({ t: e.type, x: e.x, y: e.y, on: e.on, c: Math.round(e.charge), q: Math.round(e.cond), m: e.mods, mn: e.manual ? 1 : 0 })),
      rest: DISTRICTS.map(d => d.restored ? 1 : 0), ou: outageActive ? 1 : 0, go: Variety.dump(),
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
  outageActive = !!s.ou; LOADED_GO = s.go || null; solveNow(); restoring = false; refreshDistrictButtons();
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
    initWorld(); solveNow(); refreshDistrictButtons();
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
  if (terrain[i] === 1) return warnOnce('CAN\'T LAY LINE ON WATER (USE A BRIDGE OR GO AROUND)');
  if (terrain[i] === 2) return warnOnce('RUBBLE IN THE WAY - SALVAGE IT (X)');
  if (terrain[i] === 4) return warnOnce('ROCK IN THE WAY - GO AROUND');
  if (occ[i]) return;
  if (scrap < cost) return warnOnce('NOT ENOUGH SCRAP');
  scrap -= cost; cab[L][i] = 1; note(() => { cab[L][i] = 0; scrap += cost; });
  beep(300 + L * 70, 0.03, 'square', 0.02); recompute();
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
  if (!sel || !ents.includes(sel)) { box.innerHTML = '<div class="more">Nothing selected. Use INSPECT (C) and click a building.</div>'; return; }
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
  if (d.isStation) h += stationHtml(e);
  if (d.maint) h += '<button id="i-rep">REPAIR</button> ';
  if (!d.fixed && !d.central && !d.isStation) h += '<button id="i-sal">SALVAGE</button>';
  box.innerHTML = h;
  const a = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  a('i-tog', () => toggleSwitch(e)); a('i-rep', () => repairEntity(e)); a('i-res', () => restoreSite(e)); a('i-sal', () => { beginStroke(); salvageAt(e.x, e.y); endStroke(); });
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
const TN_W = 184, TN_H = 58, TN_GX = 70, TN_GY = 16, BR_ORDER = ['POWER', 'GRID', 'WATER', 'NET', 'TOWN', 'OPS', 'STATION', 'BOOST'];
let techPos = null, techSel = null;
function techLayout() {
  const ids = Object.keys(TECH), depth = {};
  const dfs = id => depth[id] !== undefined ? depth[id] : (depth[id] = TECH[id].req.length ? 1 + Math.max(...TECH[id].req.map(dfs)) : 0);
  ids.forEach(dfs);
  const cols = []; ids.forEach(id => { (cols[depth[id]] = cols[depth[id]] || []).push(id); });
  const row = {}, pos = {};
  cols.forEach((col, ci) => {
    col.sort((a, b) => {
      const pa = TECH[a].req.length ? TECH[a].req.reduce((s, r) => s + (row[r] ?? 0), 0) / TECH[a].req.length : BR_ORDER.indexOf(TECH[a].br) * 2;
      const pb = TECH[b].req.length ? TECH[b].req.reduce((s, r) => s + (row[r] ?? 0), 0) / TECH[b].req.length : BR_ORDER.indexOf(TECH[b].br) * 2;
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
function renderResearch() {
  $('rp-have').textContent = Math.floor(Meta.rp);
  if (!techPos) techPos = techLayout();
  const nodes = $('technodes'), svg = $('techlines'), pos = techPos;
  nodes.style.width = pos._w + 'px'; nodes.style.height = pos._h + 'px'; svg.setAttribute('width', pos._w); svg.setAttribute('height', pos._h);
  let paths = '', html = '';
  Object.entries(TECH).forEach(([id, t]) => {
    const done = Meta.has(id), avail = !done && t.req.every(r => Meta.has(r)), can = avail && Meta.rp >= t.cost, p = pos[id];
    t.req.forEach(r => {
      const a = pos[r], x1 = a.x + TN_W, y1 = a.y + TN_H / 2, x2 = p.x, y2 = p.y + TN_H / 2, live = Meta.has(r);
      paths += `<path d="M${x1} ${y1} C${x1 + 36} ${y1}, ${x2 - 36} ${y2}, ${x2} ${y2}" stroke="${done ? '#8fbf5a' : live ? '#f5c95a' : '#3a3140'}" stroke-width="${live ? 3 : 2}" fill="none"/>`;
    });
    html += `<button class="tn ${done ? 'done' : avail ? (can ? 'can' : 'avail') : 'lock'} ${techSel === id ? 'sel' : ''}" data-id="${id}" style="left:${p.x}px;top:${p.y}px;--c:${BRANCH[t.br].color}"><b>${t.name}</b><span>${done ? 'DONE' : t.cost + ' RP'}</span></button>`;
  });
  svg.innerHTML = paths; nodes.innerHTML = html;
  nodes.querySelectorAll('.tn').forEach(b => { b.onclick = () => { techSel = b.dataset.id; renderResearch(); }; b.ondblclick = () => buyTech(b.dataset.id); });
  const info = $('techinfo'), id = techSel;
  if (!id) { info.innerHTML = '<span class="more">Click a node to read it. Double-click (or press RESEARCH) to buy it. Lines show what leads to what.</span>'; return; }
  const t = TECH[id], done = Meta.has(id), avail = t.req.every(r => Meta.has(r)), un = techUnlocks(id);
  info.innerHTML = `<b style="color:${BRANCH[t.br].color}">${t.name}</b> <small>${t.br}</small> - ${t.desc}${un.length ? ' <span class="pos">Unlocks: ' + un.join(', ') + '.</span>' : ''}${!done && !avail ? ' <span class="neg">Needs: ' + t.req.filter(r => !Meta.has(r)).map(r => TECH[r].name).join(', ') + '.</span>' : ''} <button id="tech-buy" ${(!done && avail && Meta.rp >= t.cost) ? '' : 'disabled'}>${done ? 'RESEARCHED' : 'RESEARCH ' + t.cost + ' RP'}</button>`;
  $('tech-buy').onclick = () => buyTech(id);
}
function buyTech(id) { if (Meta.buy(id)) { if (typeof Variety !== 'undefined') Variety.remod(); if (typeof recalcMods === 'function') recalcMods(); recompute(); storyEv('research'); beep(660, 0.1); beep(880, 0.15, 'square', 0.04, 0.08); renderResearch(); } }

Meta.load(); buildMeters(); buildToolbar();
requestAnimationFrame(frame);
