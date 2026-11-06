'use strict';
// ============================================================
//  ECONOMY.JS - the loop around the grid.
//   * CREDITS      a second, campaign-wide currency. Earned by finishing counties, goals, caches, camps and by selling surplus scrap.
//   * QUARTERMASTER spend credits on supply kits for the next county, instant buys and permanent depot upgrades (map, key B).
//   * FLOWS        the RESOURCES rework: per-second flows, storage caps, time-to-empty warnings, top costs and earners.
//   * HINTS        short one-time tips that appear exactly when they matter.
//   * ROUTE        the line rework: click two points and every chosen line type is laid along the cheapest path.
// ============================================================

// ---------- hints: each one shows once, ever ----------
const Hints = {
  seen: {}, on: true,
  load() { try { this.seen = JSON.parse(localStorage.getItem('wastelandGrid.hints')) || {}; } catch (e) { this.seen = {}; } },
  once(id, text) {
    if (!Settings.hints || this.seen[id]) return false; this.seen[id] = 1;
    try { localStorage.setItem('wastelandGrid.hints', JSON.stringify(this.seen)); } catch (e) { /* ignore */ }
    const t = 'TIP: ' + text; if (typeof mapActive !== 'undefined' && mapActive && typeof mapToast === 'function') mapToast(t); else if (typeof toast === 'function') toast(t); return true;
  },
  reset() { this.seen = {}; try { localStorage.removeItem('wastelandGrid.hints'); } catch (e) { /* ignore */ } },
};
Hints.load();

// ---------- credits ----------
const QM_UPS = [
  { id: 'slots', n: 'CARGO SLOTS', d: 'Carry one more supply kit into a county.', costs: [80, 160, 300] },
  { id: 'tank', n: 'FUEL TANKS', d: '+25 fuel capacity in every county.', costs: [60, 120, 180, 260] },
  { id: 'vault', n: 'WAREHOUSE', d: '+200 scrap storage in every county.', costs: [70, 140, 210, 300] },
  { id: 'broker', n: 'BROKER', d: 'Surplus scrap sells for more credits (25, 20, 16, 13, then 10 scrap per credit).', costs: [100, 200, 300, 420] },
  { id: 'ledger', n: 'LEDGER', d: '+10% credits from everything, per level.', costs: [90, 180, 300] },
];
const BROKER_RATE = [25, 20, 16, 13, 10];
const qmEnsure = () => { save.qm = save.qm || {}; save.qm.kits = save.qm.kits || []; save.qm.up = save.qm.up || {}; save.qm.chips = save.qm.chips || 0; return save.qm; };
const qmLvl = id => (typeof save !== 'undefined' && save.qm && save.qm.up && save.qm.up[id]) || 0;
const Credits = {
  have() { return typeof save === 'undefined' ? 0 : Math.floor(save.cr || 0); },
  add(n) {
    if (!(n > 0) || typeof save === 'undefined' || save.start === undefined) return 0;
    n = Math.max(1, Math.round(n * (1 + 0.1 * qmLvl('ledger')))); save.cr = (save.cr || 0) + n; save.crT = (save.crT || 0) + n; this.show();
    if (save.start >= 0) Hints.once('credits', 'CREDITS (CR) are a second currency: earned from counties, goals, caches and selling surplus scrap. Spend them at the QUARTERMASTER on the map (press B).');
    return n;
  },
  spend(n) { if (this.have() < n) return false; save.cr -= n; this.show(); writeSave(); return true; },
  show() { const e = $('cr'); if (e) e.textContent = this.have(); },
};

// ---------- supply kits: bought on the map, unloaded when you land in the next county ----------
const KITS = {
  scrap: { n: 'SCRAP CRATE', cost: 25, d: '+150 scrap on landing.', apply() { scrap += 150; } },
  parts: { n: 'PARTS CRATE', cost: 30, d: '+12 spare parts on landing.', apply() { stock.parts += 12; } },
  fuel: { n: 'FUEL DRUMS', cost: 20, d: 'Fuel tank +50 here and filled to the brim.', apply() { CUR.kitFuel = true; fuelCap = 150; stock.fuel = fuelCap; } },
  guard: { n: 'SECURITY DETAIL', cost: 40, d: 'No raids for the first six minutes, and a tip about any camp.', apply() { raidT = Math.max(raidT, 360); if (Camp.alive()) Camp.intel = true; } },
  shield: { n: 'WEATHER SHIELD', cost: 35, d: 'No storms or faults for the first eight minutes.', apply() { evT = Math.max(evT, 480); } },
  survey: { n: 'SURVEY CHARGE', cost: 30, d: 'Pings every cache here and opens the nearest one for you.', apply() { Loot.pingUntil = performance.now() + 25000; const c = Loot.list.filter(l => !l.open)[0]; if (c) { centerOn(c.x, c.y); Loot.tryOpen(c.x, c.y); } } },
  crew: { n: 'ENGINEER TEAM', cost: 60, d: 'Every machine starts at full condition and slowly mends itself all visit.', apply() { ents.forEach(e => { if (BUILD[e.type].maint) e.cond = 100; }); CUR.mod.autoRepair = (CUR.mod.autoRepair || 0) + 0.05; } },
};
const Kits = {
  slots() { return 2 + qmLvl('slots'); },
  landing() {                                                       // called when a fresh county starts
    if (typeof save === 'undefined' || !save.qm || !save.qm.kits || !save.qm.kits.length) return;
    const names = []; save.qm.kits.forEach(k => { const K = KITS[k]; if (K) { try { K.apply(); names.push(K.n); } catch (e) { /* skip a broken kit */ } } }); save.qm.kits = []; writeSave(); recompute();
    if (names.length) toast('SUPPLIES UNLOADED: ' + names.join(', ') + '.');
  },
};

// ---------- the quartermaster screen ----------
function qmRender() {
  const q = qmEnsure(), used = q.kits.length, slots = Kits.slots(), cr = Credits.have();
  $('qm-top').innerHTML = `<span>CREDITS <b>${pxi('coin')} ${cr}</b></span><span>KIT SLOTS <b>${used}/${slots}</b></span><span>EARNED IN TOTAL <b>${pxi('coin')} ${Math.floor(save.crT || 0)}</b></span><span>RESEARCH <b>${Math.floor(Meta.rp)}</b> RP</span>`;
  const queued = q.kits.length ? q.kits.map((k, i) => `<button class="qmq" data-unkit="${i}" title="Refund">${KITS[k].n} ${pxi('cross')}</button>`).join('') : '<span class="dim">Nothing loaded. Kits you buy are unloaded in the NEXT county you enter.</span>';
  const kits = Object.keys(KITS).map(id => { const K = KITS[id], can = cr >= K.cost && used < slots; return `<div class="qmcard"><b>${K.n}</b><i>${K.d}</i><button data-kit="${id}" ${can ? '' : 'disabled'}>BUY - ${K.cost} ${pxi('coin')}</button></div>`; }).join('');
  const chipCost = 120 + 40 * q.chips;
  const inst = `<div class="qmcard"><b>RESEARCH GRANT</b><i>25 research points, right now.</i><button data-inst="rp" ${cr >= 50 ? '' : 'disabled'}>BUY - 50 ${pxi('coin')}</button></div><div class="qmcard"><b>SKILL CHIP</b><i>One skill point. The price rises each time (bought ${q.chips}).</i><button data-inst="sp" ${cr >= chipCost ? '' : 'disabled'}>BUY - ${chipCost} ${pxi('coin')}</button></div>`;
  const ups = QM_UPS.map(u => { const L = qmLvl(u.id), max = u.costs.length, c = u.costs[L]; return `<div class="qmcard ${L ? 'has' : ''}"><b>${u.n} <span class="pips">${pips(L, max)}</span></b><i>${u.d}</i><button data-up="${u.id}" ${L < max && cr >= c ? '' : 'disabled'}>${L >= max ? 'MAXED' : 'UPGRADE - ' + c + ' ' + pxi('coin')}</button></div>`; }).join('');
  $('qm-body').innerHTML = `<div class="qmsec">LOADED FOR THE NEXT COUNTY</div><div class="qmrow">${queued}</div><div class="qmsec">SUPPLY KITS</div><div class="qmgrid">${kits}</div><div class="qmsec">INSTANT</div><div class="qmgrid">${inst}</div><div class="qmsec">DEPOT UPGRADES <small>permanent</small></div><div class="qmgrid">${ups}</div>`;
}
function openQM() { if (!save || save.start < 0) { say('Land in your first county first: the quartermaster follows the grid.'); return; } qmRender(); $('qm').style.display = 'flex'; Hints.seen.qmOpen = 1; }
$('qm-body').onclick = e => {
  const q = qmEnsure(), b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.kit) { const K = KITS[b.dataset.kit]; if (q.kits.length >= Kits.slots() || !Credits.spend(K.cost)) return; q.kits.push(b.dataset.kit); beep(520, 0.08, 'triangle'); }
  else if (b.dataset.unkit !== undefined) { const i = +b.dataset.unkit, k = q.kits[i]; if (k === undefined) return; q.kits.splice(i, 1); save.cr += KITS[k].cost; Credits.show(); beep(300, 0.08, 'triangle'); }
  else if (b.dataset.inst === 'rp') { if (!Credits.spend(50)) return; Meta.rp += 25; Meta.dirty = true; Meta.save(); beep(660, 0.1, 'square', 0.04); }
  else if (b.dataset.inst === 'sp') { const c = 120 + 40 * q.chips; if (!Credits.spend(c)) return; q.chips++; save.sp = (save.sp || 0) + 1; beep(660, 0.1, 'square', 0.04); beep(990, 0.12, 'square', 0.04, 0.08); }
  else if (b.dataset.up) { const u = QM_UPS.find(x => x.id === b.dataset.up), L = qmLvl(u.id); if (L >= u.costs.length || !Credits.spend(u.costs[L])) return; q.up[u.id] = L + 1; beep(440, 0.1, 'square', 0.05); beep(660, 0.14, 'square', 0.05, 0.1); }
  writeSave(); qmRender(); if (typeof mapActive !== 'undefined' && mapActive) updateStats(); Objectives.check();
};
$('qm-close').onclick = () => { $('qm').style.display = 'none'; };
$('btn-qm').onclick = openQM;

// ---------- flows: the resource rework ----------
const Flows = {
  prev: null, ema: { fuel: 0, parts: 0, rp: 0 }, expBuf: 0, expTot: 0, expShown: 0, ticks: 0,
  reset() { this.prev = null; this.ema = { fuel: 0, parts: 0, rp: 0 }; this.expBuf = 0; this.expShown = 0; this.ticks = 0; },
  scrapCap() { return 600 + 200 * qmLvl('vault') + ents.reduce((n, e) => n + (e.cond > 0 ? ((e.type === 'depot' || e.type === 'fueldepot') ? 40 : (BUILD[e.type].scrapCap || 0)) : 0), 0); },
  tick() {                                                          // once per game second, after the economy has run
    this.ticks++;
    const cap = this.scrapCap();
    if (scrap > cap) {                                              // a full warehouse sells its surplus: the bridge between scrap and credits
      const ex = scrap - cap; scrap = cap;
      if (typeof Inv !== 'undefined' && Inv.overflow(ex)) { this.shipped = (this.shipped || 0) + ex; if (this.shipped >= 50) { toast(`Warehouse full: ${Math.floor(this.shipped)} surplus scrap shipped to the shared inventory.`); this.shipped = 0; } }
      else {
        this.expBuf += ex / BROKER_RATE[qmLvl('broker')]; this.expTot += ex;
        const whole = Math.floor(this.expBuf); if (whole >= 1) { this.expBuf -= whole; const got = Credits.add(whole); this.expShown += got; }
        Hints.once('overflow', 'Your WAREHOUSE is full, so surplus scrap is being SOLD for credits. Spend scrap, build storage depots, or upgrade the Warehouse at the Quartermaster. With a CARGO DEPOT you can ship it to the shared inventory instead.');
        if (this.expShown >= 8) { toast(`Warehouse full: surplus scrap sold for ${this.expShown} credits.`); this.expShown = 0; }
      }
    }
    const cur = { fuel: stock.fuel, parts: stock.parts, rp: Meta.rp };
    if (this.prev) for (const k in cur) this.ema[k] = this.ema[k] * 0.85 + Math.max(-30, Math.min(30, cur[k] - this.prev[k])) * 0.15;
    this.prev = cur;
    if (this.ticks > 8) {                                           // tips, exactly when they matter
      if (stock.fuel < 25 && ents.some(e => BUILD[e.type].fuel && e.cond > 0)) Hints.once('fuel-low', 'FUEL is running out. Generators and plants stop without it. Build a REFINERY (research Fuel Refining) or a FUEL DEPOT, and watch the FLOWS panel on the STATUS tab.');
      if (totals[0] && totals[0].sup > 0 && totals[0].dem > totals[0].sup * 1.1) Hints.once('brownout', 'Power demand is above supply. Add generators, solar or wind, or build batteries to cover the gaps. The RESOURCES bars turn orange then red.');
      if (stock.parts <= 0 && ents.some(e => BUILD[e.type].maint && e.cond <= 0)) Hints.once('parts-out', 'You are out of PARTS and machines are broken. Workshops and industrial hubs make parts; supply caches and the HQ Fabricator help too.');
      if (Loot.list.some(l => !l.open)) Hints.once('cache', 'The glowing crates are SUPPLY CACHES. Click one with any tool to open it: scrap, parts, research, credits, skill chips and blueprints.');
      if (Camp.alive()) Hints.once('camp', 'A DIMMER CAMP hides in this county: raids come from it. Click it to send a strike team, ideally with security posts nearby.');
    }
  },
  fmtT(s) { return s >= 3600 ? '60m+' : s >= 60 ? Math.floor(s / 60) + 'm ' + Math.floor(s % 60) + 's' : Math.floor(s) + 's'; },
  render() {
    const box = $('flows'); if (!box) return;
    const anyRest = DISTRICTS.some(x => x.restored), cap = this.scrapCap(), mult = WMOD.inc * (TM().income || 1), inc = income * mult, net = inc - upkeep, up = {}, gain = {};
    for (const e of ents) {
      const d = BUILD[e.type];
      if (d.upkeep && anyRest && e.run) up[d.name] = (up[d.name] || 0) + d.upkeep * (Meta.has('logistics') ? 0.75 : 1) * (TM().upkeep || 1);
      if (e.active && d.income) gain[d.name] = (gain[d.name] || 0) + d.income * mult;
    }
    const top = (o, sign) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n.toLowerCase()} ${sign}${v.toFixed(1)}`).join(', ') || 'none';
    const bar = (v, max, col) => `<i class="fb"><u style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${col}"></u></i>`;
    const row = (name, val, sub, cls) => `<div class="fr"><span>${name}</span><b class="${cls || ''}">${val}</b><small>${sub}</small></div>`;
    const fr = this.ema.fuel, fuelEmpty = fr < -0.02 ? this.fmtT(stock.fuel / -fr) : '';
    box.title = 'EARNERS: ' + top(gain, '+') + '   COSTS: ' + top(up, '-');
    box.innerHTML =
      row('SCRAP', `${Math.floor(scrap)}/${cap}`, `${net >= 0 ? '+' : ''}${net.toFixed(1)}/s${scrap >= cap - 1 ? ' SELLING' : ''}`, net < 0 ? 'neg' : '') + bar(scrap, cap, scrap >= cap - 1 ? '#e08a3c' : '#8fe870') +
      row('FUEL', `${Math.floor(stock.fuel)}/${fuelCap}`, fr < -0.02 ? `${fr.toFixed(2)}/s EMPTY ${fuelEmpty}` : fr > 0.02 ? `+${fr.toFixed(2)}/s` : 'steady', fr < -0.02 && stock.fuel / -fr < 90 ? 'neg' : '') + bar(stock.fuel, fuelCap, '#e08a3c') +
      `<div class="fline"><span>PARTS <b class="${stock.parts < 1 ? 'neg' : ''}">${Math.floor(stock.parts)}</b></span><span>RP <b>${Math.floor(Meta.rp)}</b></span><span>CR <b>${Credits.have()}</b></span></div>` +
''.concat('');
  },
};

// ---------- hint hooks that need no engine changes ----------
(function hintHooks() {
  const sel = selectTool;
  selectTool = function (t) { sel(t); if (t.kind === 'route') Hints.once('route', 'AUTO ROUTE: click a start point (or a machine), then an end point. The chosen line types are laid along the cheapest path around obstacles. The preview shows the cost.'); if (t.kind !== 'route' && typeof Route !== 'undefined') Route.a = null; };
  setInterval(() => { if (typeof mapActive !== 'undefined' && mapActive && typeof save !== 'undefined' && save.start >= 0 && Credits.have() >= 25 && !Hints.seen.qmOpen) Hints.once('qm', 'You have credits to spend. Press B (or SUPPLY) on the map to visit the QUARTERMASTER.'); }, 5000);
})();

// ---------- the line rework: auto route ----------
const Route = {
  a: null, path: null, key: '', busy: false, cost: 0,
  seeds(x, y) {                                                     // free tiles to start/end on: the tile itself, or the free tiles around the machine under it
    const i = y * WW + x, e = occ[i]; if (!e) return [[x, y]];
    const out = []; for (let j = -1; j <= e.h; j++) for (let k = -1; k <= e.w; k++) { if ((j >= 0 && j < e.h) && (k >= 0 && k < e.w)) continue; if ((j === -1 || j === e.h) && (k === -1 || k === e.w)) continue; const tx = e.x + k, ty = e.y + j; if (inb(tx, ty)) out.push([tx, ty]); }
    return out;
  },
  stepCost(i, ls) {
    const t = terrain[i]; if (occ[i] || !Net.covered(i % WW, (i / WW) | 0)) return -1;
    let c = 1; if (t === 1) { if (!Meta.has('spans')) return -1; c = 6; } else if (t === 2 || t === 4 || t === 5) return -1; else if (!(t === 0 || t === 3 || t === 7)) return -1;
    let have = 0; for (const L of ls) if (cab[L][i]) have++; if (have === ls.length) c *= 0.3; else if (have) c *= 0.7;
    return c;
  },
  find(a, b) {
    const ls = multiLayers.filter(lineUnlocked); if (!ls.length) return null;
    const S = this.seeds(a.x, a.y).filter(([x, y]) => this.stepCost(y * WW + x, ls) >= 0), G = new Set(this.seeds(b.x, b.y).filter(([x, y]) => this.stepCost(y * WW + x, ls) >= 0).map(([x, y]) => y * WW + x));
    if (!S.length || !G.size) return null;
    const NS = N * 5, g = new Float32Array(NS).fill(Infinity), from = new Int32Array(NS).fill(-1), heap = [];
    const push = (f, s) => { heap.push([f, s]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (; ;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const bx = b.x, by = b.y, h = (x, y) => Math.abs(x - bx) + Math.abs(y - by) - 1;
    for (const [x, y] of S) { const i = y * WW + x, s = i * 5 + 4, c = this.stepCost(i, ls); g[s] = c; push(g[s] + h(x, y), s); }
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; let end = -1, guard = 0;
    while (heap.length && guard++ < 60000) {
      const [f, s] = pop(), i = (s / 5) | 0, d = s % 5, x = i % WW, y = (i / WW) | 0;
      if (f - h(x, y) > g[s] + 1e-3) continue;
      if (G.has(i)) { end = s; break; }
      for (let nd = 0; nd < 4; nd++) {
        const nx = x + DX[nd], ny = y + DY[nd]; if (!inb(nx, ny)) continue; const ni = ny * WW + nx, sc = this.stepCost(ni, ls); if (sc < 0) continue;
        const ng = g[s] + sc + (d !== 4 && d !== nd ? 0.8 : 0), ns = ni * 5 + nd; if (ng < g[ns]) { g[ns] = ng; from[ns] = s; push(ng + h(nx, ny), ns); }
      }
    }
    if (end < 0) return null;
    const path = []; for (let s = end; s >= 0; s = from[s]) { const i = (s / 5) | 0; path.push([i % WW, (i / WW) | 0]); } return path.reverse();
  },
  price(path) {
    const ls = multiLayers.filter(lineUnlocked); let c = 0;
    for (const [x, y] of path) { const i = y * WW + x; for (const L of ls) if (!cab[L][i]) c += (LAYERS[L].cost || 1) * (terrain[i] === 1 ? 5 : 1); }
    return c;
  },
  click(x, y) {
    if (!this.a) { this.a = { x, y }; this.path = null; this.key = ''; toast('ROUTE START set. Click where it should end. ESC or right-click cancels.'); beep(520, 0.05); return; }
    const p = this.find(this.a, { x, y }); if (!p) { warnOnce('NO ROUTE FOUND: something is in the way'); return; }
    const ls = multiLayers.filter(lineUnlocked), cost = this.price(p);
    if (scrap < cost) { warnOnce(`NOT ENOUGH SCRAP (THIS ROUTE COSTS ${cost})`); return; }
    this.busy = true; for (const [px2, py2] of p) for (const L of ls) cableAt(L, px2, py2, 'paint'); this.busy = false;
    toast(`ROUTE LAID: ${p.length} tiles, ${cost} scrap.`); beep(440, 0.05, 'square', 0.03); beep(660, 0.08, 'square', 0.03, 0.05); this.a = null; this.path = null; this.key = ''; if (typeof Tutorial !== 'undefined') Tutorial.routed = true;
  },
  draw(cx, cy) {
    if (!this.a) return;
    const ax = this.a.x * T - cx, ay = this.a.y * T - cy; g.strokeStyle = PAL[8]; g.strokeRect(ax + 0.5, ay + 0.5, T - 1, T - 1);
    if (!(mouse.in && inb(hover.x, hover.y))) return;
    const key = this.a.x + ',' + this.a.y + ',' + hover.x + ',' + hover.y + ',' + multiLayers.join('') + scrap.toFixed(0).length;
    if (key !== this.key) { this.key = key; this.path = this.find(this.a, hover); this.cost = this.path ? this.price(this.path) : 0; }
    const ls = multiLayers.filter(lineUnlocked), col = ls.length ? LAYERS[ls[0]].live : 15;
    if (!this.path) { g.globalAlpha = 0.7; px(hover.x * T - cx, hover.y * T - cy, T, T, 5); g.globalAlpha = 1; return; }
    g.globalAlpha = 0.55; for (const [x, y] of this.path) px(x * T - cx + 2, y * T - cy + 2, T - 4, T - 4, col); g.globalAlpha = 1;
    label(`${this.path.length} TILES  ${this.cost} SCRAP`, hover.x * T - cx + 4, hover.y * T - cy - 10, this.cost > scrap ? 5 : 12);
  },
};
Credits.show();
addEventListener('load', () => {                                  // by now every script is loaded
  $('set-hints').onchange = e => { Settings.hints = e.target.checked; Settings.save(); };
  const _rsH = renderSettings; renderSettings = function () { _rsH(); $('set-hints').checked = !!Settings.hints; };
});
