'use strict';
// ============================================================
//  CAMPAIGN.JS - the world map. Pick a county, restore it in the builder,
//  the map zooms back out and a glowing network spreads to its
//  neighbours (a bit like Death Stranding's chiral network).
//
//  * Leave a county HALF restored and it still spreads the light - come back to finish.
//  * Go back to any restored county to keep building (REVISIT).
//  * Restored counties can suffer OUTAGES: go back and repair them.
//  * Finish a county tidily for up to 3 stars (bonus research).
//  * Restore the whole United States first - then Canada and Mexico call for help.
// ============================================================

const US = buildUS();
const SAVE_KEY = 'wastelandGrid.v5';
const MVW = MAPW * MC, MVH = MAPH * MC;                 // size of the map view in pixels
const freshSave = () => ({ v: 5, diff: 1, borders: {}, links: {}, fac: {}, exportPct: {}, news: [], unionTier: 0, nextLinkEv: 0, start: -1, restored: {}, partial: {}, support: {}, stars: {}, prog: {}, outage: {}, story: {}, log: [], bonus: {}, briefed: {}, nextOutage: 0, dark: {}, surplus: {}, stationOn: {}, nextDark: 0, pending: {} });
let save = freshSave();

function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 5) { save = Object.assign(freshSave(), s); return true; } } catch (e) { /* no save */ } return false; }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { if (!writeSave.warned) { writeSave.warned = true; try { say('SAVE FAILED: browser storage is full or blocked. Use Settings > EXPORT SAVE to keep your campaign.', true); } catch (x) { /* ignore */ } } } }
function hasSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return !!(s && s.v === 5 && s.start >= 0); } catch (e) { return false; } }
function newCampaign() {
  try { Object.keys(localStorage).filter(k => k.startsWith('wastelandGrid.c')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
  save = freshSave(); writeSave(); Meta.reset(); try { localStorage.removeItem('wastelandGrid.tut'); } catch (e) { /* ignore */ } Tutorial.load();
}

// --- tiny 3x5 pixel font (also used for the logo and the labels) ---
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001',
  5: '111100110001110', 6: '011100111101111', 7: '111001010100100', 8: '111101111101111', 9: '111101111001110',
  '/': '001001010100100', '-': '000000111000000', '.': '000000000000010',
};

// --- status helpers ---
const isRestored = c => !!save.restored[c.id];
const litNb = c => c.nb.some(n => { const o = US.counties[n]; return (save.restored[o.id] || save.partial[o.id]) && crossOK(c.country, o.country); });
const isLit = c => !!(save.restored[c.id] || save.partial[c.id]);
const usDone = () => US.counties.filter(c => c.country === 'US').every(isRestored);
function statusOf(c) {
  if (save.outage[c.id]) return 'outage';
  if (isRestored(c)) return 'restored';
  if (save.dark[c.id]) return litNb(c) ? 'dark' : 'darkfar';
  if (save.partial[c.id]) return 'partial';
  if (c.id === save.start) return 'frontier';                       // your landing site is always open, even if you left it unfinished
  if (save.start < 0) return c.country === 'US' ? 'landing' : 'locked';
  if (c.country !== 'US' && !usDone()) return 'locked';
  return litNb(c) ? 'frontier' : 'dead';
}
const stateDone = si => US.states[si].counties.every(id => save.restored[id]);
function hopsFromStart(id) {
  const dist = { [save.start]: 0 }, q = [save.start];
  while (q.length) { const a = q.shift(); for (const b of US.counties[a].nb) if (dist[b] === undefined) { dist[b] = dist[a] + 1; q.push(b); } }
  return dist[id] ?? 0;
}
const totalSupport = () => Object.values(save.support).reduce((a, b) => a + b, 0);
const litNbAny = c => c.nb.some(n => isLit(US.counties[n]));
const stars = n => '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i>';

// --- baking the static map layer ---
const baseCv = document.createElement('canvas'); baseCv.width = MVW; baseCv.height = MVH;
const bg = baseCv.getContext('2d');
const mcv = $('usmap'), mg = mcv.getContext('2d');
mcv.width = MVW; mcv.height = MVH;              // the map is as big as the geography (it grows when regions are added)
function bpx(x, y, w, h, c) { bg.fillStyle = PAL[c]; bg.fillRect(x, y, w, h); }
const rank = c => { const s = statusOf(c); return (s === 'restored' || s === 'outage') ? 2 : s === 'partial' ? 1.5 : (s === 'frontier' || s === 'landing') ? 1 : (s === 'dark' || s === 'darkfar') ? 0.4 : 0; };
function cellColor(c, gx, gy) {
  const st = statusOf(c), d = (gx + gy) & 1, h = ((gx * 7 + gy * 13) & 7) === 0;
  if (st === 'restored') { const s = save.support[c.id] || 0, lv = s < 25 ? 9 : s < 55 ? 10 : s < 85 ? 13 : 14; return h ? Math.min(15, lv === 14 ? 8 : lv + 1) : lv; }
  if (st === 'partial') return d ? 13 : (h ? 14 : 9);
  if (st === 'outage') return d ? 5 : (h ? 6 : 1);
  if (st === 'dark' || st === 'darkfar') return ((gx * 3 + gy * 5) % 7 === 0) ? 5 : (d ? 0 : 1);
  if (st === 'frontier' || st === 'landing') return d ? 3 : (h ? 4 : 2);
  if (c.country !== 'US') return ((gx + gy) & 3) === 0 ? ({ CA: 9, AK: 13, MX: 5, CM: 10, CB: 14, GL: 12 }[c.country] || 5) : (d ? 1 : 0);
  return d ? 1 : (h ? 2 : 0);
}
function bakeMap() {
  const GW = US.GW, GH = US.GH, img = bg.createImageData(MVW, MVH), dd = img.data;      // pixel buffer: ~100x faster than a rectangle per cell
  const set = (x, y, col) => { const o = (y * MVW + x) * 4, rgb = PALRGB[col]; dd[o] = rgb[0]; dd[o + 1] = rgb[1]; dd[o + 2] = rgb[2]; dd[o + 3] = 255; };
  for (let i = 0; i < MVW * MVH; i++) { const o = i * 4, rgb = PALRGB[0]; dd[o] = rgb[0]; dd[o + 1] = rgb[1]; dd[o + 2] = rgb[2]; dd[o + 3] = 255; }
  for (let i = 0; i < GW * GH; i++) {
    const x = i % GW, y = (i / GW) | 0, cid = US.countyOf[i];
    if (cid >= 0) set(x, y, cellColor(US.counties[cid], x, y));
    else if (US.isLake[i]) set(x, y, ((x + y) & 3) === 0 ? 13 : 9);
    else if ((((i * 2654435761) >>> 0) % 31) === 0) set(x, y, 1);
  }
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x, a = US.countyOf[i]; if (a < 0) continue;
    const A = US.counties[a];
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy, b = (nx < GW && ny < GH) ? US.countyOf[ny * GW + nx] : -1;
      if (b === a) continue;
      if (b < 0) { set(x, y, US.isLake[ny * GW + nx] ? 13 : 4); continue; }
      const B = US.counties[b];
      if (A.country !== B.country) set(x, y, 7);
      else if (A.state !== B.state) set(x, y, (stateDone(A.state) && stateDone(B.state)) ? 7 : 0);
      else { const st = Math.max(rank(A), rank(B)); set(x, y, st >= 2 ? 9 : st >= 1.5 ? 13 : st >= 1 ? 6 : 0); }
    }
  }
  bg.putImageData(img, 0, 0);
  const halo = (cx, cy, r, c, a) => { bg.globalAlpha = a; bg.fillStyle = PAL[c]; for (let k = r; k >= 1; k--) bg.fillRect(cx - k, cy - k, k * 2 + 1, k * 2 + 1); bg.globalAlpha = 1; };
  US.counties.forEach(c => { if (isLit(c)) halo(c.px | 0, c.py | 0, Math.min(9, 3 + Math.sqrt(c.cells.length) / 4 | 0), isRestored(c) ? 14 : 13, 0.035); });
  for (const [a, b] of US.edges) {
    const A = US.counties[a], B = US.counties[b]; if (!isLit(A) || !isLit(B) || !crossOK(A.country, B.country)) continue;
    lineBake(Math.round(A.px), Math.round(A.py), Math.round(B.px), Math.round(B.py), isRestored(A) && isRestored(B) ? 14 : 13);
  }
  for (const [a, b] of US.edges) {                         // linked control stations: a bright second line + diamonds
    const A = US.counties[a], B = US.counties[b], lc = linkColor(a, b);                 // colour = stability (white stable, amber unstable, rust dropped)
    if (lc >= 0) lineBake(Math.round(A.px), Math.round(A.py) + 1, Math.round(B.px), Math.round(B.py) + 1, lc);
  }
  US.counties.forEach(c => { if (isLit(c)) { bpx(c.px - 1, c.py - 1, 3, 3, 13); bpx(c.px, c.py, 1, 1, isRestored(c) ? 8 : 12); } });
  US.counties.forEach(c => { if (isLit(c) && save.stationOn[c.id]) { bpx(c.px - 3, c.py, 7, 1, 15); bpx(c.px, c.py - 3, 1, 7, 15); bpx(c.px - 1, c.py - 1, 3, 3, 8); } });
  US.states.forEach(s => {
    if (s.cells < 70) return;
    const prog = s.counties.filter(id => isLit(US.counties[id])).length, col = stateDone(s.idx) ? 7 : prog ? 15 : 4;
    const ch = [...s.ab], x0 = Math.round(s.cx - (ch.length * 4 - 1) / 2), y0 = Math.round(s.cy - 2);
    ch.forEach((cc, k) => { const g5 = FONT[cc]; if (g5) for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g5[r * 3 + q] === '1') bpx(x0 + k * 4 + q, y0 + r, 1, 1, col); });
  });
}
function lineBake(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (; ;) { bpx(x0, y0, 1, 1, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}

// --- camera: wheel zoom, drag to pan ---
const HOME = (() => {
  let x0 = 1e9, x1 = 0, y0 = 1e9, y1 = 0;
  for (let i = 0; i < US.GW * US.GH; i++) if (US.countyOf[i] >= 0) { const x = i % US.GW, y = (i / US.GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { z: Math.min(MVW / (x1 - x0 + 14), MVH / (y1 - y0 + 14)), cx: (x0 + x1) / 2 * MC, cy: (y0 + y1) / 2 * MC };
})();
const cam = { z: HOME.z, cx: HOME.cx, cy: HOME.cy };
let anim = null;
function zoomTo(z, cx, cy, ms, done) { anim = { from: { ...cam }, to: { z, cx, cy }, t0: performance.now(), ms, done }; }
const ease = t => t * t * (3 - 2 * t);
const toWorld = p => ({ x: (p.x - MVW / 2) / cam.z + cam.cx, y: (p.y - MVH / 2) / cam.z + cam.cy });
function clampCamMap() { const hw = MVW / 2 / cam.z, hh = MVH / 2 / cam.z; cam.cx = Math.max(hw, Math.min(MVW - hw, cam.cx)); cam.cy = Math.max(hh, Math.min(MVH - hh, cam.cy)); }
function zoomBy(f) { cam.z = Math.max(HOME.z, Math.min(8, cam.z * f)); clampCamMap(); }
$('mz-in').onclick = () => zoomBy(1.4); $('mz-out').onclick = () => zoomBy(1 / 1.4); $('mz-home').onclick = () => { cam.z = HOME.z; cam.cx = HOME.cx; cam.cy = HOME.cy; };

let selected = -1, hoverC = -1, mapActive = false, mmouse = { x: 0, y: 0 }, mdrag = null;
function countyAtMouse() {
  const w = toWorld(mmouse), gx = Math.floor(w.x / MC), gy = Math.floor(w.y / MC);
  return (gx < 0 || gy < 0 || gx >= US.GW || gy >= US.GH) ? -1 : US.countyOf[gy * US.GW + gx];
}
function mcoords(ev) { const r = mcv.getBoundingClientRect(), s = r.width / MVW; return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s }; }
mcv.addEventListener('contextmenu', e => e.preventDefault());
mcv.addEventListener('mousedown', e => { if (anim) return; mmouse = mcoords(e); mdrag = { x: mmouse.x, y: mmouse.y, moved: false, button: e.button }; });
addEventListener('mousemove', e => {
  if (!mapActive) return; mmouse = mcoords(e);
  if (mdrag) {
    const dx = mmouse.x - mdrag.x, dy = mmouse.y - mdrag.y;
    if (mdrag.moved || Math.hypot(dx, dy) > 4 || mdrag.button === 2) { mdrag.moved = true; cam.cx -= dx / cam.z; cam.cy -= dy / cam.z; clampCamMap(); mdrag.x = mmouse.x; mdrag.y = mmouse.y; }
  }
  hoverC = anim || mdrag?.moved ? -1 : countyAtMouse();
});
addEventListener('mouseup', e => {
  if (!mapActive || !mdrag) return;
  const d = mdrag; mdrag = null;
  if (!d.moved && d.button === 0 && !anim) { mmouse = mcoords(e); const id = countyAtMouse(); if (id >= 0) { selected = id; updatePanel(); beep(520, 0.04); } }
});
mcv.addEventListener('mouseleave', () => { hoverC = -1; });
mcv.addEventListener('wheel', e => {
  if (anim) return; e.preventDefault(); mmouse = mcoords(e);
  const before = toWorld(mmouse); cam.z = Math.max(HOME.z, Math.min(8, cam.z * (e.deltaY < 0 ? 1.25 : 0.8)));
  cam.cx = before.x - (mmouse.x - MVW / 2) / cam.z; cam.cy = before.y - (mmouse.y - MVH / 2) / cam.z; clampCamMap();
}, { passive: false });

const importsFor = c => netImports(c);
const darkNeighbours = c => c.nb.filter(n => save.dark[n] && !isRestored(US.counties[n])).length;
function onSurplus(id, v) {
  const had = !!save.stationOn[id]; save.surplus[id] = { p: v.p, w: v.w, n: v.n };
  if (v.on) save.stationOn[id] = 1; else delete save.stationOn[id];
  if (!had && v.on) Story.event('station-link');
  const now = Date.now(); if (now - (onSurplus.t || 0) > 5000) { onSurplus.t = now; writeSave(); }
}
function diffName(d) { return d < 3 ? 'EASY' : d < 6 ? 'MEDIUM' : d < 10 ? 'HARD' : 'BRUTAL'; }
function updatePanel() {
  const c = selected >= 0 ? US.counties[selected] : null, btn = $('enter');
  $('cextra').innerHTML = c ? countyExtra(c) : '';
  if (!c) {
    $('cname').textContent = save.start < 0 ? 'CHOOSE A LANDING SITE' : 'SELECT A COUNTY'; $('cwhere').textContent = '';
    $('cmeta').textContent = save.start < 0 ? 'Any American county can be your starting point. The light will spread outward from it.' : 'Amber counties touch your network and can be restored. Scroll to zoom, drag to pan.';
    $('cstatus').textContent = ''; $('cstars').innerHTML = ''; btn.style.display = 'none'; wideSync(); return;
  }
  const st = statusOf(c), S = US.states[c.state], done = S.counties.filter(id => save.restored[id]).length, hops = save.start >= 0 ? hopsFromStart(c.id) : 0;
  const imp = (st === 'frontier' || st === 'dark') ? importsFor(c) : null;
  const pr = save.prog[c.id], coast = (c.water.n + c.water.s + c.water.e + c.water.w) > 0.3;
  $('cname').textContent = c.name; $('cwhere').textContent = COUNTRY_NAME[c.country];
  $('cstars').innerHTML = (isRestored(c) ? stars(save.stars[c.id] || 1) : '');
  $('cmeta').innerHTML = `${S.name}<br>TERRAIN: ${c.biome.toUpperCase()}${coast ? ' + COAST' : ''}<br>DIFFICULTY: ${diffName(hops)}<br>${imp && imp.links ? `LINKED STATIONS: ${imp.links} (imports ${Math.round(imp.p)}P ${Math.round(imp.w)}W ${Math.round(imp.n)}N)<br>` : ''}${pr ? `DISTRICTS: ${pr.r}/${pr.t}<br>` : ''}${S.name}: ${done}/${S.counties.length} COUNTIES`;
  const sup = (save.support[c.id] ? ` - SUPPORT ${Math.floor(save.support[c.id])}%` : '') + (save.stationOn[c.id] ? ' - CONTROL STATION ONLINE' : '');
  $('cstatus').textContent = ({
    dark: 'HELD BY THE DIMMERS - liberate it before they spread', darkfar: 'HELD BY THE DIMMERS - reach it through a neighbour', restored: 'RESTORED' + sup, partial: 'PARTLY RESTORED - the light spreads, but finish it', outage: 'OUTAGE! Go back and repair it', dead: litNbAny(c) ? 'BORDER CLOSED - open it (see below) to let the light across' : 'OFFLINE - connect a neighbour first', landing: 'READY TO LAND',
    frontier: Builder.hasSave(c.id) ? 'IN PROGRESS' : 'ADJACENT - READY', locked: c.country === 'US' ? 'LOCKED' : 'LOCKED - restore all of the United States first, then they call for help',
  })[st];
  $('cstatus').className = st;
  const can = st !== 'dead' && st !== 'locked' && st !== 'darkfar';
  btn.style.display = can ? 'block' : 'none';
  btn.textContent = st === 'dark' ? 'LIBERATE COUNTY >' : st === 'landing' ? 'LAND HERE >' : st === 'outage' ? 'REPAIR THE OUTAGE >' : st === 'restored' ? 'REVISIT COUNTY >' : (st === 'partial' || Builder.hasSave(c.id)) ? 'CONTINUE COUNTY >' : 'RESTORE COUNTY >';
  wideSync();
}
function updateStats() {
  const row = (label, list) => { const n = list.filter(isRestored).length, p = list.filter(c => save.partial[c.id]).length; return `<div class="prow"><span>${label}</span><div class="pbar"><i style="width:${Math.round(n / list.length * 100)}%"></i></div><span>${n}/${list.length}${p ? ' +' + p : ''}</span></div>`; };
  const nStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('mapprog').innerHTML = ['US', 'CA', 'AK', 'MX', 'CM', 'CB', 'GL'].map(cn => row(COUNTRY_NAME[cn], US.counties.filter(c => c.country === cn))).join('')
    + `<div class="prow"><span>US STATES</span><span></span><span>${US.states.filter(s => s.country === 'US' && stateDone(s.idx)).length}/${US.states.filter(s => s.country === 'US').length}</span></div>`
    + `<div class="prow"><span>STARS</span><span></span><span style="color:var(--glow)">${nStars}</span></div>`
    + `<div class="prow"><span>DIMMER-HELD</span><span></span><span class="${darkCount() ? 'neg' : ''}">${darkCount()}</span></div>`
    + `<div class="prow"><span>STATIONS</span><span></span><span style="color:var(--bone)">${Object.keys(save.stationOn).length} linked</span></div>`
    + `<div class="prow"><span>OUTAGES</span><span></span><span class="${Object.keys(save.outage).length ? 'neg' : ''}">${Object.keys(save.outage).length}</span></div>`;
  $('chapter').textContent = chapterName();
  const un = unity(); $('mapstats').textContent = D().name + '   UNITY ' + Math.round(un.pct) + '% ' + TIERS[un.tier].n + '   ' + Math.floor(Meta.rp) + ' RP';
}

// --- entering / leaving counties ---
$('enter').onclick = () => {
  if (selected < 0 || anim) return;
  const c = US.counties[selected], st = statusOf(c);
  if (st === 'dead' || st === 'locked') return;
  if (st === 'landing') { save.start = c.id; writeSave(); bakeMap(); }
  const diff = hopsFromStart(c.id), spec = genCounty(c, diff), imports = importsFor(c), bonus = Math.min(400, Math.floor(totalSupport() / 8)) + (save.bonus.scrap || 0) + Math.min(240, imports.links * 60), startScrap = Math.round((100 + bonus) * D().scrap * WMOD.scrap);
  if (save.bonus.scrap) { save.bonus.scrap = 0; writeSave(); }
  mapActive = false; beep(300, 0.2, 'sawtooth'); beep(600, 0.2, 'square', 0.03, 0.1);
  zoomTo(8, c.px, c.py, 1000, () => {
    Scenes.show('game');
    Builder.start(spec, {
      imports, refresh: () => netImports(c), hostile: !!save.dark[c.id], threat: darkNeighbours(c), onSurplus,
      id: c.id, name: c.name + ' COUNTY', where: `${c.name} COUNTY`, sub: US.states[c.state].name, scrap: startScrap, outage: !!save.outage[c.id],
      onExit: r => leaveCounty(c, r), onOutageCleared: () => clearOutage(c),
    });
    Story.briefing(c, spec);
    if (imports.links) Story.event('link');
    if (save.dark[c.id]) Story.event('hostile');
    if (st === 'restored' || st === 'partial' || st === 'outage') Story.event('revisit');
  });
};
function leaveCounty(c, r) {
  Builder.stop(); Scenes.show('map');
  const wasLit = isLit(c), wasFull = isRestored(c), hadUS = usDone(), stateWas = stateDone(c.state);
  save.prog[c.id] = { r: r.restored, t: r.total };
  let msg = 'Back on the map.';
  if (save.dark[c.id] && (r.full || r.partial)) { delete save.dark[c.id]; fac('dimmers').t = Math.max(0, fac('dimmers').t - 6); msg = `${c.name} COUNTY LIBERATED! The Dimmers fall back.`; Story.event('liberated'); }
  if (r.full) {
    save.restored[c.id] = 1; delete save.partial[c.id]; if (!wasFull) save.support[c.id] = Math.max(save.support[c.id] || 0, 20);
    const gain = r.stars - (save.stars[c.id] || 0);
    if (gain > 0) { save.stars[c.id] = r.stars; Meta.rp += gain * 10; Meta.save(); msg = `${c.name} COUNTY: ${'★'.repeat(r.stars)} +${gain * 10} research points.`; }
    else if (!wasFull) msg = `${c.name} COUNTY IS BACK ONLINE. Its network now reaches the neighbours.`;
    if (stateDone(c.state) && !stateWas) msg = `${US.states[c.state].name} IS FULLY CONNECTED! The light spreads.`;
    if (!hadUS && usDone()) msg = 'THE UNITED STATES IS CONNECTED! Calls for help are coming in from Canada, Mexico, Alaska, Central America, the islands and Greenland - their counties are now open.';
  } else if (r.partial && !wasFull) {
    save.partial[c.id] = 1; save.support[c.id] = Math.max(save.support[c.id] || 0, 8);
    msg = wasLit ? `${c.name} COUNTY: progress saved.` : `${c.name} COUNTY IS PARTLY RESTORED. The light already spreads to its neighbours - come back to finish it.`;
  } else if (!wasLit && !msg.includes('LIBERATED')) msg = `${c.name} COUNTY: progress saved. Restore at least half its districts for the light to spread.`;
  if (US.counties.every(isRestored)) msg = 'EVERY COUNTY IS CONNECTED. NORTH AMERICA HAS A GRID AGAIN.';
  graceTimers(60000); refreshLinks(); recalcMods(); checkTier(); writeSave(); bakeMap(); selected = c.id; updatePanel(); updateStats();
  if (isLit(c) && !wasLit) { cam.z = 8; cam.cx = c.px; cam.cy = c.py; zoomTo(HOME.z, HOME.cx, HOME.cy, 2200); [392, 523, 659].forEach((f, k) => beep(f, 0.2, 'square', 0.04, k * 0.12)); }
  else { cam.z = HOME.z; cam.cx = HOME.cx; cam.cy = HOME.cy; }
  $('mapmsg').textContent = msg;
  const wait = () => { if (!Scenes.is('map')) return; if (anim) return setTimeout(wait, 400); Story.check(); };   // let the zoom-out finish first
  setTimeout(wait, 700);
}
function clearOutage(c) {
  delete save.outage[c.id]; save.support[c.id] = Math.max(60, save.support[c.id] || 0); Meta.rp += 15; Meta.save(); writeSave();
  Story.event('outage-fixed'); setTimeout(() => { bakeMap(); updateStats(); }, 50);
}

const Campaign = {
  show() {
    mapActive = true; anim = null; cam.z = HOME.z; cam.cx = HOME.cx; cam.cy = HOME.cy; mdrag = null;
    selected = -1; refreshLinks(); recalcMods(); maybeOutage(true); bakeMap(); updatePanel(); updateStats(); checkTier(); Story.check();
    $('mapmsg').textContent = save.start < 0 ? 'The old network is dark. Pick a county to restore first - from there the light will spread.' : 'Amber counties touch your network. Click a county, then press the green button. Restored counties can be revisited.';
  },
};

// --- slow events on the map: support grows, outages strike restored counties ---
function maybeOutage(onShow) {
  if (!eventsOn || save.start < 0) return;
  const now = Date.now();
  if (!save.nextOutage) { save.nextOutage = now + 150000; writeSave(); return; }
  if (now < save.nextOutage) return;
  const pool = US.counties.filter(c => isRestored(c) && !save.outage[c.id] && Builder.hasSave(c.id));
  save.nextOutage = now + (240 + Math.random() * 240) * 1000 * D().ev;
  if (Object.keys(save.restored).length < 6 || !pool.length || outageCount() >= outageCap()) { writeSave(); return; }
  const c = pool[Math.random() * pool.length | 0];
  save.outage[c.id] = 1; save.support[c.id] = (save.support[c.id] || 0) * 0.5; trustHit(facOf(c), 3); refreshLinks(); news(`Outage at ${c.name} County.`); writeSave();
  if (onShow || mapActive) { bakeMap(); updateStats(); $('mapmsg').textContent = `OUTAGE at ${c.name} COUNTY, ${US.states[c.state].ab}! A storm tore through its grid. Go back and repair it.`; beep(110, 0.5, 'sawtooth', 0.05); selected = c.id; updatePanel(); }
  Story.event('outage');
}
const outageCount = () => Object.keys(save.outage).length;
const outageCap = () => Math.min(4, 1 + Math.floor(Object.keys(save.restored).length / 12));          // storms never take down more than a few counties at once
function graceTimers(ms) {                                          // after loading or leaving a county, nothing strikes for a little while
  const t = Date.now() + ms;
  if (!save.nextOutage || save.nextOutage < t) save.nextOutage = t;
  if (!save.nextDark || save.nextDark < t) save.nextDark = t;
  if (save.nextLinkEv && save.nextLinkEv < t) save.nextLinkEv = t;
}
function darkCount() { return Object.keys(save.dark).length; }
function announceDark(text) {
  news(text); refreshLinks();
  if (mapActive) { $('mapmsg').textContent = text; bakeMap(); updateStats(); updatePanel(); } else if (Builder.active) toast(text);
  beep(90, 0.6, 'sawtooth', 0.05);
}
function tickDark() { worldDark(); }
let supTick = 0;
setInterval(() => {
  let changed = false;
  US.counties.forEach(c => {
    if (!isLit(c) || save.outage[c.id]) return;
    const live = c.nb.filter(n => isLit(US.counties[n])).length, s = save.support[c.id] || 0, cap = isRestored(c) ? 100 : 50;
    if (s < cap) { save.support[c.id] = Math.min(cap, s + (isRestored(c) ? 0.25 : 0.12) * (1 + live * 0.25)); changed = true; }
  });
  if (mapActive && supTick % 5 === 0) maybeOutage(false);
  tickDark(); worldTick();
  if (changed && ++supTick % 5 === 0) { writeSave(); if (mapActive) { bakeMap(); updateStats(); } }
}, 1000);

// --- log ---
function openLog() {
  const items = [...save.log].reverse();
  $('logbody').innerHTML = items.length ? items.map(e => `<div class="entry" style="--c:${(WHO[e.who] || WHO.NARRATOR).color}"><b>${e.title || (WHO[e.who] || {}).name || e.who}</b><p>${e.text}</p></div>`).join('') : '<p>Nothing yet. Messages from the wasteland are saved here.</p>';
  $('log').style.display = 'flex';
}
$('btn-log').onclick = openLog; $('log-close').onclick = () => { $('log').style.display = 'none'; };

// --- drawing ---
function mapFrame(now) {
  requestAnimationFrame(mapFrame);
  if (typeof Display !== 'undefined' && Display.skip('m', now)) return;
  if (anim) {
    const k = Math.min(1, (now - anim.t0) / anim.ms), e = ease(k);
    cam.z = anim.from.z + (anim.to.z - anim.from.z) * e; cam.cx = anim.from.cx + (anim.to.cx - anim.from.cx) * e; cam.cy = anim.from.cy + (anim.to.cy - anim.from.cy) * e;
    if (k >= 1) { const d = anim.done; anim = null; if (d) d(); }
  }
  if (typeof Scenes === 'undefined' || !Scenes.is('map')) return;
  const t = now / 1000;
  mg.setTransform(1, 0, 0, 1, 0, 0); mg.fillStyle = PAL[0]; mg.fillRect(0, 0, MVW, MVH);
  mg.setTransform(cam.z, 0, 0, cam.z, MVW / 2 - cam.cx * cam.z, MVH / 2 - cam.cy * cam.z); mg.imageSmoothingEnabled = false;
  mg.drawImage(baseCv, 0, 0);
  const P = (x, y, w, h, c) => { mg.fillStyle = PAL[c]; mg.fillRect(x, y, w, h); };
  worldUnder(mg, t);
  for (const [a, b] of US.edges) {
    const A = US.counties[a], B = US.counties[b]; if (!isLit(A) || !isLit(B) || !crossOK(A.country, B.country)) continue;
    const k = (t * 0.5 + a * 0.37) % 1; P(Math.round(A.px + (B.px - A.px) * k), Math.round(A.py + (B.py - A.py) * k), 1, 1, 8);
  }
  worldDraw(mg, P, t);
  const blink = Math.sin(t * 5) > 0, pulse = Math.sin(t * 6) > 0;
  US.counties.forEach(c => {
    const st = statusOf(c);
    if (st === 'frontier' || st === 'landing') { P(c.px - 1, c.py - 1, 3, 3, blink ? 7 : 6); if (blink) P(c.px, c.py, 1, 1, 8); }
    else if (st === 'dark' || st === 'darkfar') { P(c.px - 2, c.py - 2, 5, 5, 0); P(c.px - 1, c.py - 1, 3, 3, pulse ? 5 : 1); P(c.px, c.py, 1, 1, 8); }
    else if (st === 'outage') { P(c.px - 2, c.py - 2, 5, 5, pulse ? 5 : 0); P(c.px - 1, c.py - 1, 3, 3, pulse ? 8 : 5); }
  });
  [[hoverC, 0.3], [selected, 0.45]].forEach(([id, a]) => { if (id < 0) return; mg.globalAlpha = a; US.counties[id].cells.forEach(i => P(i % US.GW, (i / US.GW) | 0, 1, 1, 15)); mg.globalAlpha = 1; });
  mg.setTransform(1, 0, 0, 1, 0, 0);
  if (hoverC >= 0 && !anim) { const c = US.counties[hoverC], s = hoverText(c); const el = $('maphover'); if (el.textContent !== s) el.textContent = s; }
}
requestAnimationFrame(mapFrame);
loadSave();
