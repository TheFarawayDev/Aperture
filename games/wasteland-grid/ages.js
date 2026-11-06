'use strict';
// ============================================================
//  AGES.JS - the long game.
//  * AGES: the campaign advances through five ages. Each age opens new research and buildings and gives a permanent bonus.
//  * SHARED STOCKPILE: alloys, circuits and components (plus spare parts and fuel) live in one pool shared by every county.
//    Factories add to it, advanced buildings are built from it and some run on it.
//  * PRODUCTION HUBS: a county with factories keeps producing for the pool after you leave it, while it stays restored.
//    Build one county as a central factory and every other county benefits.
//  * THE WORLD GRID: the end-game project, ignited from the AGES screen (G on the map).
// ============================================================
const GOODS = {
  alloy: { n: 'ALLOYS', s: 'AL', c: '#a9c3d8' },
  circ: { n: 'CIRCUITS', s: 'CI', c: '#93ec74' },
  comp: { n: 'COMPONENTS', s: 'CO', c: '#ffd45e' },
  parts: { n: 'PARTS', s: 'PT', c: '#e08a3c' },
  fuel: { n: 'FUEL', s: 'FU', c: '#e8743c' },
};
const GOOD_IDS = Object.keys(GOODS), MAKE_IDS = ['alloy', 'circ', 'comp'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const AGES = [
  null,
  { n: 'SCAVENGER AGE', c: '#8a6a4e', d: 'Scrap, salvage and the first generators. Light one county at a time.', perk: 'The start of everything.', fx: {} },
  { n: 'INDUSTRIAL AGE', c: '#e08a3c', d: 'High voltage, refineries, foundries, mines, the control station and its modules.', perk: 'Scrap income +5%.',
    req: { techs: 6, counties: 3, rp: 60 }, fx: { income: 1.05 } },
  { n: 'ELECTRIC AGE', c: '#5fc4d0', d: 'ALLOYS and CIRCUITS, solar and wind farms, and the SHARED STOCKPILE: counties now feed one another.', perk: 'Scrap income and power output +5%.',
    req: { techs: 28, counties: 12, rp: 250 }, fx: { income: 1.05, genOut: 1.05 } },
  { n: 'ATOMIC AGE', c: '#93ec74', d: 'COMPONENTS, fission reactors, robot depots, arcologies, vertical farms and quantum labs.', perk: 'Scrap income +5%, research +10%.',
    req: { techs: 60, counties: 35, rp: 600, pool: { alloy: 40, circ: 40 } }, fx: { income: 1.05, rp: 1.1 } },
  { n: 'FUSION AGE', c: '#ffd45e', d: 'Fusion reactors, megafactories, orbital uplinks, atmospheric water - and the World Grid.', perk: 'Scrap income and all utility output +5%.',
    req: { techs: 100, counties: 80, rp: 1500, pool: { comp: 120 } }, fx: { income: 1.05, genOut: 1.05, waterOut: 1.05, netOut: 1.05 } },
];
const WORLD_GRID = {
  n: 'IGNITE THE WORLD GRID', d: 'Tie every lit county into one planetary grid. The end of the long night.',
  req: { techs: 150, counties: 160, rp: 4000, tech: 'worldgrid', pool: { comp: 400, alloy: 250, circ: 250 } },
  fx: { income: 1.25, rp: 1.25, genOut: 1.1, waterOut: 1.1, netOut: 1.1, wear: 0.8 },
  perk: 'Forever after: scrap income and research +25%, all utilities +10%, machines wear 20% slower.',
};

// ---------- the shared stockpile ----------
const Pool = {
  rate: {}, last: null, dirty: 0,
  data() { if (typeof save === 'undefined' || !save) return {}; return (save.pool = save.pool || {}); },
  get(k) { return this.data()[k] || 0; },
  add(k, v) { if (!(v > 0)) return; const p = this.data(); p[k] = (p[k] || 0) + v; this.dirty++; },
  take(k, v) { const p = this.data(), got = Math.max(0, Math.min(p[k] || 0, v)); p[k] = (p[k] || 0) - got; if (got) this.dirty++; return got; },
  has(per) { for (const k in per) if (this.get(k) < per[k] - 1e-9) return false; return true; },
  afford(cost) { return this.has(cost); },
  pay(cost) { for (const k in cost) this.take(k, cost[k]); },
  refund(cost) { for (const k in cost) this.add(k, cost[k]); },
  costText(cost, short) { return Object.keys(cost).map(k => cost[k] + (short ? GOODS[k].s : ' ' + GOODS[k].n.toLowerCase())).join(short ? ' ' : ', '); },
  fmt(v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v >= 100 ? Math.floor(v) : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(1); },
  // the supply exchange: keep this county's parts and fuel between two marks, trading with the pool
  exchange(list) {
    const n = Math.min(3, list.filter(e => e.run && BUILD[e.type].exchange).length); if (!n) return;
    const r = n * ((typeof TM === 'function' && TM().exportRate) || 1);
    const trade = (key, have, hi, lo, perSec) => {
      if (have > hi) { const v = Math.min(perSec * r, have - hi); this.add(key, v); return -v; }
      if (have < lo && this.get(key) > 0) return this.take(key, Math.min(perSec * r, lo - have));
      return 0;
    };
    stock.parts += trade('parts', stock.parts, 40, 12, 1.5);
    stock.fuel += trade('fuel', stock.fuel, fuelCap * 0.85, fuelCap * 0.3, 4);
  },
  // what does this county make for the pool? Stored so it keeps working while you are elsewhere.
  snapshot(id) {
    if (id === null || id === undefined || typeof save === 'undefined' || !save) return;
    const p = {}, u = {};
    for (const e of ents) {
      const d = BUILD[e.type]; if (!d.prod || !e.run) continue;
      for (const k in d.prod) p[k] = (p[k] || 0) + d.prod[k] * (TM()[k + 'Out'] || 1) * (e.mult || 1);
      for (const k in d.poolUse || {}) u[k] = (u[k] || 0) + d.poolUse[k];
    }
    let rp = 0, dr = 0;
    for (const e of ents) { const d = BUILD[e.type]; if (d.rp && (e.run || (e.isHub && e.active))) rp += d.rp * (TM().rp || 1); if (d.drones && e.run) dr++; }
    save.ind = save.ind || {};
    if (Object.keys(p).length || rp > 0 || dr) save.ind[id] = { p, u, rp: Math.round(rp * 100) / 100, dr }; else delete save.ind[id];
  },
  efficiency() { const m = Mods.world(); return Math.min(1.25, 0.5 + (m.poolEff || 0)); },
  hubs() {
    const out = [], ind = (typeof save !== 'undefined' && save && save.ind) || {};
    for (const id in ind) {
      const c = US.counties[id]; if (!c) continue;
      const on = (save.restored[id] || save.partial[id]) && !save.outage[id];
      out.push({ p: {}, u: {}, id: +id, c, on, here: typeof Builder !== 'undefined' && Builder.active && countyId === +id, ...ind[id] });
    }
    return out.sort((a, b) => Object.values(b.p || {}).reduce((s, v) => s + v, 0) + (b.rp || 0) / 50 - Object.values(a.p || {}).reduce((s, v) => s + v, 0) - (a.rp || 0) / 50);
  },
  // once a second: every production hub you are not standing in keeps working
  tick() {
    if (typeof save === 'undefined' || !save || save.start < 0) return;
    const ind = save.ind || {}, eff = Object.keys(ind).length ? this.efficiency() : 0;
    for (const id in ind) {
      if (typeof Builder !== 'undefined' && Builder.active && countyId === +id) continue;
      if (!(save.restored[id] || save.partial[id]) || save.outage[id]) continue;
      const h = ind[id]; h.p = h.p || {}; h.u = h.u || {}; let scale = eff;
      for (const k in h.u) if (h.u[k] > 0) scale = Math.min(scale, this.get(k) / h.u[k]);
      if (scale <= 0) continue;
      if (h.rp) { Meta.rp += h.rp * eff; Meta.dirty = true; }                         // labs keep researching while you are away
      for (const k in h.u) this.take(k, h.u[k] * scale);
      for (const k in h.p) this.add(k, h.p[k] * scale);
    }
    const now = {}; GOOD_IDS.forEach(k => { now[k] = this.get(k); });
    if (this.last) GOOD_IDS.forEach(k => { this.rate[k] = (this.rate[k] || 0) * 0.85 + (now[k] - this.last[k]) * 0.15; });      // smoothed change per second, live and offline
    this.last = now;
    Drones.offline(ind);
    if (this.dirty > 0 && ++this.saveT % 10 === 0) { this.dirty = 0; if (!(typeof Builder !== 'undefined' && Builder.active)) writeSave(); }
  },
  saveT: 0,
};

// ---------- ages ----------
const Ages = {
  cur() { return curAge(); },
  counties() { return Object.keys(save.restored || {}).length; },
  techs() { return Object.keys(Meta.done).length; },
  checks(req) {
    const out = [];
    if (req.techs) out.push({ t: `${req.techs} research projects done`, have: this.techs(), need: req.techs });
    if (req.counties) out.push({ t: `${req.counties} counties restored`, have: this.counties(), need: req.counties });
    if (req.tech) out.push({ t: `Research ${TECH[req.tech].name}`, have: Meta.has(req.tech) ? 1 : 0, need: 1, flag: true });
    if (req.rp) out.push({ t: `${req.rp} research points (spent)`, have: Math.floor(Meta.rp), need: req.rp, pay: true });
    for (const k in req.pool || {}) out.push({ t: `${req.pool[k]} shared ${GOODS[k].n.toLowerCase()} (spent)`, have: Math.floor(Pool.get(k)), need: req.pool[k], pay: true });
    out.forEach(o => { o.ok = o.have >= o.need; });
    return out;
  },
  next() { return AGES[this.cur() + 1] || null; },
  canAdvance() { const a = this.next(); return !!a && this.checks(a.req).every(o => o.ok); },
  pay(req) { if (req.rp) { Meta.rp -= req.rp; Meta.save(); } if (req.pool) Pool.pay(req.pool); },
  advance() {
    const a = this.next(); if (!a || !this.canAdvance()) return false;
    this.pay(a.req); save.age = this.cur() + 1; techPos = null;
    news(`The ${a.n} begins.`); writeSave(); recalcMods();
    const fresh = Object.values(TECH).filter(t => t.age === save.age).length, blds = Object.values(BUILD).filter(b => b.tech && TECH[b.tech].age === save.age).map(b => b.name);
    [392, 523, 659, 784, 1047].forEach((f, k) => beep(f, 0.18, 'square', 0.045, k * 0.1));
    uiAlert(`${a.d}\n\nPermanent bonus: ${a.perk}\n${fresh} new research projects are open${blds.length ? ', unlocking ' + blds.join(', ') : ''}.`, `THE ${a.n} BEGINS`);
    return true;
  },
  canIgnite() { return this.cur() >= 5 && !save.worldGrid && this.checks(WORLD_GRID.req).every(o => o.ok); },
  ignite() {
    if (!this.canIgnite()) return false;
    this.pay(WORLD_GRID.req); save.worldGrid = Date.now(); writeSave(); recalcMods(); news('THE WORLD GRID IS LIT.');
    [262, 330, 392, 523, 659, 784, 1047, 1319].forEach((f, k) => beep(f, 0.3, 'square', 0.05, k * 0.14));
    uiAlert(`Every lit county now beats with one current. From a single landing site you carried the light across ${this.counties()} counties, through five ages, ` +
      `with ${this.techs()} discoveries. The long night is over.\n\n${WORLD_GRID.perk}\n\nYou can keep playing: the dark corners of the map are still waiting.`, 'THE WORLD GRID IS LIT');
    return true;
  },
  fx(acc) {
    if (typeof save === 'undefined' || !save) return acc;
    for (let a = 1; a <= this.cur(); a++) if (AGES[a] && AGES[a].fx) addMod(acc, AGES[a].fx);
    if (save.worldGrid) addMod(acc, WORLD_GRID.fx);
    return acc;
  },
  // older campaigns get the age their progress already deserves
  ensure() {
    if (typeof save === 'undefined' || !save || save.age) return;
    const r = AGES[2].req; save.age = this.techs() >= r.techs && this.counties() >= r.counties ? 2 : 1;
  },
};
ADD_KEYS.add('poolEff');
{ const _for = Mods.for; Mods.for = function (c, tmod) { return Ages.fx(_for.call(this, c, tmod)); }; }

// ---------- the AGES screen ----------
function renderAges() {
  Ages.ensure();
  const cur = Ages.cur();
  $('ag-track').innerHTML = AGES.slice(1).map((a, i) => {
    const n = i + 1, st = n < cur ? 'done' : n === cur ? 'now' : 'next';
    const nt = Object.values(TECH).filter(t => t.age === n).length;
    return `<div class="agecard ${st}" style="--c:${a.c}"><div class="agn">AGE ${ROMAN[n]}</div><b>${a.n}</b><i>${a.d}</i><small>${nt} research projects</small><em>${a.perk}</em>${st === 'done' ? '<span class="agst">COMPLETE</span>' : st === 'now' ? '<span class="agst">CURRENT AGE</span>' : ''}</div>`;
  }).join('');
  const nx = Ages.next(), row = o => `<li class="${o.ok ? 'ok' : 'no'}">${pxi(o.ok ? 'check' : 'cross')} ${o.t}${o.flag ? '' : ` <b>${Pool.fmt(o.have)}/${o.need}</b>`}</li>`;
  let h;
  if (nx) {
    const ok = Ages.canAdvance();
    h = `<div class="ph">NEXT: AGE ${ROMAN[cur + 1]} <span class="r">${nx.n}</span></div><p class="dim">${nx.d}</p><ul class="agreq">${Ages.checks(nx.req).map(row).join('')}</ul>` +
      `<p class="dim">Bonus: ${nx.perk}</p><button id="ag-go" class="${ok ? 'primary' : ''} big" ${ok ? '' : 'disabled'}>ADVANCE TO THE ${nx.n}</button>`;
  } else if (!save.worldGrid) {
    const ok = Ages.canIgnite();
    h = `<div class="ph">END GAME <span class="r">${WORLD_GRID.n}</span></div><p class="dim">${WORLD_GRID.d}</p><ul class="agreq">${Ages.checks(WORLD_GRID.req).map(row).join('')}</ul>` +
      `<p class="dim">Reward: ${WORLD_GRID.perk}</p><button id="ag-ignite" class="${ok ? 'primary' : ''} big" ${ok ? '' : 'disabled'}>IGNITE THE WORLD GRID</button>`;
  } else h = `<div class="ph">THE WORLD GRID IS LIT</div><p>You finished the long game. ${WORLD_GRID.perk}</p><p class="dim">Keep restoring counties: every one of them still adds to the grid.</p>`;
  $('ag-next').innerHTML = h;
  const unlocked = cur >= 3;
  $('ag-pool').innerHTML = `<div class="ph">SHARED STOCKPILE <span class="r">${unlocked ? 'per minute' : 'opens in the Electric Age'}</span></div>` +
    GOOD_IDS.map(k => { const r = (Pool.rate[k] || 0) * 60; return `<div class="pgood" style="--c:${GOODS[k].c}"><span>${GOODS[k].n}</span><b>${Pool.fmt(Pool.get(k))}</b><small class="${r < -0.05 ? 'neg' : r > 0.05 ? 'pos' : ''}">${r > 0.05 ? '+' : ''}${Math.abs(r) < 0.05 ? '-' : r.toFixed(1)}</small></div>`; }).join('') +
    `<p class="dim">Smelters, circuit fabs and component works fill it. SUPPLY EXCHANGES trade parts and fuel with it. Advanced buildings are built from it and some run on it.</p>`;
  const hubs = Pool.hubs(), eff = Math.round(Pool.efficiency() * 100);
  $('ag-hubs').innerHTML = `<div class="ph">PRODUCTION HUBS <span class="r">offline output ${eff}%</span></div>` +
    (hubs.length ? hubs.map(x => `<div class="hubrow ${x.on ? '' : 'off'}"><b>${x.c.name}</b><span>${x.here ? 'YOU ARE HERE' : x.on ? 'ONLINE' : save.outage[x.id] ? 'OUTAGE' : 'NOT RESTORED'}</span><small>${x.rp ? `+${(x.rp * 60).toFixed(0)} RP ` : ''}${x.dr ? `${x.dr} drone bay${x.dr > 1 ? 's' : ''} ` : ''}${Object.keys(x.p).map(k => `+${(x.p[k] * 60).toFixed(1)} ${GOODS[k].s}`).join(' ')}${Object.keys(x.u).length ? ' / ' + Object.keys(x.u).map(k => `-${(x.u[k] * 60).toFixed(1)} ${GOODS[k].s}`).join(' ') : ''} per min</small></div>`).join('')
      : `<p class="dim">No hubs yet. Build smelters, circuit fabs, component works or labs in a county and restore it: it keeps producing (and researching) while you play elsewhere (${eff}% speed - Freight Rail, Containerisation and Hyperloop raise it).</p>`);
  $('ag-top').innerHTML = `<span>AGE <b>${ROMAN[cur]}</b> ${AGES[cur].n}</span><span>RESEARCH <b>${Ages.techs()}</b>/${Object.keys(TECH).length}</span><span>COUNTIES <b>${Ages.counties()}</b></span><span>RP <b>${Math.floor(Meta.rp)}</b></span>${save.worldGrid ? '<span class="pos">WORLD GRID LIT</span>' : ''}`;
  const go = $('ag-go'); if (go) go.onclick = () => { if (Ages.advance()) { renderAges(); if (mapActive) updateStats(); } };
  const ig = $('ag-ignite'); if (ig) ig.onclick = () => { if (Ages.ignite()) { renderAges(); if (mapActive) updateStats(); } };
}
function openAges() { if (!save || save.start < 0) { say('Land in your first county first.'); return; } renderAges(); $('ages').style.display = 'flex'; }
$('ages-close').onclick = () => { $('ages').style.display = 'none'; };
$('btn-ages').onclick = openAges;
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.tagName === 'INPUT')) return;
  if ($('ages').style.display === 'flex' && (e.key === 'Escape' || e.key.toLowerCase() === 'g')) { $('ages').style.display = 'none'; e.stopPropagation(); e.preventDefault(); return; }
  if (Scenes.is('map') && e.key.toLowerCase() === 'g' && !overlayOpen() && !anim) { e.preventDefault(); openAges(); }
}, true);

// ---------- HUD: the county's stockpile chip, live refresh of open screens ----------
function poolHud() {
  const chip = $('poolchip'); if (!chip) return;
  const on = typeof save !== 'undefined' && save && curAge() >= 3; chip.style.display = on ? '' : 'none'; if (!on) return;
  $('pool-a').textContent = Pool.fmt(Pool.get('alloy')); $('pool-c').textContent = Pool.fmt(Pool.get('circ')); $('pool-k').textContent = Pool.fmt(Pool.get('comp'));
}
setInterval(() => {
  Pool.tick(); poolHud();
  if ($('ages').style.display === 'flex') renderAges();
}, 1000);
{ const _show = Campaign.show; Campaign.show = function () { Ages.ensure(); return _show.apply(this, arguments); }; }
