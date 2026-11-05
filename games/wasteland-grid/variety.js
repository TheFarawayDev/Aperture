'use strict';
// ============================================================
//  VARIETY.JS - so no two counties play the same:
//   * TRAITS     every county has a character (sunbaked, deep freeze, old foundry...) that changes the numbers
//   * SCENARIOS  some counties start differently (derelict grid, black start, supply cache)
//   * GOALS      three optional bonus goals per county, different each time
//   * EVENTS     traders, scavengers, caravans, scouts and floods, many with a choice to make
//   * CONTRACTS  rolling jobs on the world map that point you at new places and new ideas
// ============================================================
const TRAITS = {
  sunbaked: { n: 'SUNBAKED', d: 'Solar +40%. Water is scarce: pumps -20%.', mod: { solar: 1.4, pump: 0.8 } },
  windswept: { n: 'WINDSWEPT', d: 'Wind turbines +70%. Storms strike more often.', mod: { wind: 1.7, ev: 0.8 } },
  freeze: { n: 'DEEP FREEZE', d: 'Solar -40%. Generators burn 30% more fuel.', mod: { solar: 0.6, fuel: 1.3 } },
  river: { n: 'RIVER VALLEY', d: 'Hydro turbines +50%. Flash floods now and then.', mod: { hydro: 1.5 }, flood: true },
  foundry: { n: 'OLD FOUNDRY TOWN', d: 'Parts output +50%, but machines wear 25% faster.', mod: { partsOut: 1.5, wear: 1.25 } },
  outpost: { n: 'DIMMER OUTPOST', d: 'Raiders strike often. Rubble pays double.', mod: { rubble: 2 }, threat: 2 },
  archive: { n: 'ARCHIVE TOWN', d: 'Labs and schools make double research.', mod: { rp: 2 } },
  scrapyard: { n: 'SCRAPYARD', d: 'Rubble pays double, but income is 20% lower.', mod: { rubble: 2, income: 0.8 } },
  fertile: { n: 'FERTILE LAND', d: 'Income +20%.', mod: { income: 1.2 } },
  quiet: { n: 'QUIET VALLEY', d: 'No random faults here, but income is 15% lower.', mod: { income: 0.85, ev: 0 } },
};
const TRAIT_POOL = {
  desert: ['sunbaked', 'sunbaked', 'sunbaked', 'foundry', 'scrapyard', 'quiet', 'outpost'],
  tundra: ['freeze', 'freeze', 'freeze', 'windswept', 'quiet', 'archive'],
  mountain: ['windswept', 'river', 'foundry', 'archive', 'outpost', 'freeze'],
  plains: ['windswept', 'fertile', 'fertile', 'fertile', 'foundry', 'outpost', 'scrapyard'],
  forest: ['river', 'fertile', 'archive', 'scrapyard', 'quiet', 'foundry'],
  swamp: ['river', 'river', 'scrapyard', 'quiet', 'outpost'],
};
const SCENARIOS = {
  derelict: { n: 'DERELICT GRID', d: 'An old network survives, half broken. Repair it, then build on it.' },
  blackstart: { n: 'BLACK START', d: 'The generator is dead and fuel is short. Get clean power running first.' },
  cache: { n: 'SUPPLY CACHE', d: 'A forgotten hoard of parts and scrap. Spend it wisely.' },
};
function traitOf(c) {
  const r = mulberry(c.id * 131 + 7); if (r() < 0.12) return null;
  const pool = TRAIT_POOL[c.biome] || ['foundry', 'scrapyard', 'outpost', 'archive'];
  return pool[r() * pool.length | 0];
}
function scenarioOf(c, diff) {
  if (diff < 1) return null;                                      // your first county is always a plain one
  const r = mulberry(c.id * 977 + 3)(); return r < 0.2 ? 'derelict' : r < 0.34 ? 'blackstart' : r < 0.44 ? 'cache' : null;
}
function traitLine(c, hops) {
  const t = traitOf(c), s = scenarioOf(c, hops);
  return (t ? `TRAIT: ${TRAITS[t].n}<br>` : '') + (s ? `START: ${SCENARIOS[s].n}<br>` : '');
}

// ---------- bonus goals ----------
const cnt = type => ents.filter(e => e.type === type).length;
const GOAL_POOL = [
  { id: 'bat3', t: 'Build 3 battery banks', f: () => cnt('battery') >= 3, rp: 6, ok: () => unlocked('battery') },
  { id: 'tow2', t: 'Build 2 water towers', f: () => cnt('tower') >= 2, rp: 5, ok: () => unlocked('tower') },
  { id: 'house6', t: 'Build 6 houses', f: () => cnt('house') >= 6, rp: 5 },
  { id: 'inc15', t: 'Reach +15 scrap per second', f: () => income - upkeep >= 15, rp: 7 },
  { id: 'clean', t: 'Make 20+ power from solar, wind or hydro', f: () => ents.filter(e => ['solar', 'wind', 'hydro'].includes(e.type) && e.cond > 0).reduce((a, e) => a + BUILD[e.type].sup[0] * (e.mult || 1), 0) >= 20, rp: 8 },
  { id: 'depot', t: 'Build a maintenance depot', f: () => cnt('depot') >= 1, rp: 4, ok: () => unlocked('depot') },
  { id: 'parts30', t: 'Stock 30 spare parts', f: () => stock.parts >= 30, rp: 6 },
  { id: 'salv20', t: 'Salvage 20 pieces of rubble', f: () => CUR.salv >= 20, rp: 4 },
  { id: 'weather', t: 'Weather 3 storms or faults', f: () => CUR.faults >= 3, rp: 6 },
  { id: 'swift', t: 'Restore every district in under 8 minutes', f: () => DISTRICTS.every(d => d.restored), rp: 10, limit: 480, ok: () => DISTRICTS.length <= 5 },
  { id: 'raid', t: 'Repel a raider attack', f: () => CUR.repel >= 1, rp: 7, ok: () => HOSTILE || THREAT > 0 },
  { id: 'plant', t: 'Wake a central plant', f: () => ents.some(e => BUILD[e.type].central && e.run), rp: 8, ok: () => SITES.some(s => s.kind !== 'station') },
  { id: 'fuel', t: 'Fill the fuel tank to 90%', f: () => stock.fuel >= fuelCap * 0.9, rp: 5, ok: () => ents.some(e => BUILD[e.type].fuel) },
  { id: 'lab2', t: 'Run 2 research labs at once', f: () => ents.filter(e => e.type === 'lab' && e.run !== false && e.active).length >= 2, rp: 6 },
  { id: 'wind4', t: 'Build 4 wind turbines', f: () => cnt('wind') >= 4, rp: 5 },
  { id: 'solar6', t: 'Build 6 solar arrays', f: () => cnt('solar') >= 6, rp: 6 },
  { id: 'sec2', t: 'Build 2 security posts', f: () => cnt('security') >= 2, rp: 6, ok: () => unlocked('security') },
  { id: 'apt3', t: 'Build 3 apartment blocks', f: () => cnt('apartments') >= 3, rp: 7, ok: () => unlocked('apartments') },
  { id: 'mkt', t: 'Build a market', f: () => cnt('market') >= 1, rp: 6, ok: () => unlocked('market') },
  { id: 'school', t: 'Build a school', f: () => cnt('school') >= 1, rp: 7, ok: () => unlocked('school') },
  { id: 'green', t: 'Build a greenhouse', f: () => cnt('greenhouse') >= 1, rp: 6, ok: () => unlocked('greenhouse') },
  { id: 'clinic', t: 'Build 2 clinics', f: () => cnt('clinic') >= 2, rp: 6, ok: () => unlocked('clinic') },
  { id: 'depot2', t: 'Build 2 maintenance depots', f: () => cnt('depot') >= 2, rp: 6, ok: () => unlocked('depot') },
  { id: 'turbine', t: 'Build a gas turbine', f: () => cnt('gasturbine') >= 1, rp: 6, ok: () => unlocked('gasturbine') },
  { id: 'desal', t: 'Build a desalination plant', f: () => cnt('desal') >= 1, rp: 6, ok: () => unlocked('desal') },
  { id: 'inc30', t: 'Reach +30 scrap per second', f: () => income - upkeep >= 30, rp: 10 },
  { id: 'scrap600', t: 'Hold 600 scrap at once', f: () => scrap >= 600, rp: 6 },
  { id: 'house12', t: 'Build 12 houses', f: () => cnt('house') >= 12, rp: 8 },
  { id: 'bat6', t: 'Build 6 battery banks', f: () => cnt('battery') >= 6, rp: 8, ok: () => unlocked('battery') },
  { id: 'rubble50', t: 'Salvage 50 pieces of rubble', f: () => CUR.salv >= 50, rp: 7 },
  { id: 'parts60', t: 'Stock 60 spare parts', f: () => stock.parts >= 60, rp: 9 },
  { id: 'cache1', t: 'Open a supply cache', f: () => Loot.list.some(l => l.open), rp: 4, ok: () => Loot.list.some(l => !l.open) },
  { id: 'cacheall', t: 'Open every supply cache here', f: () => Loot.list.length > 1 && Loot.left() === 0, rp: 8, ok: () => Loot.list.length > 1 },
  { id: 'order1', t: 'Call down an HQ order', f: () => CUR.orders >= 1, rp: 6, ok: () => !!save.hq && ORDERS.some(o => Orders.unlocked(o)) },
  { id: 'camp', t: 'Destroy the Dimmer camp', f: () => Camp.dead, rp: 14, ok: () => Camp.alive() },
  { id: 'raid3', t: 'Repel 3 raids', f: () => CUR.repel >= 3, rp: 10, ok: () => HOSTILE || THREAT > 0 },
  { id: 'allon', t: 'Run every power source at once without a brownout', f: () => ents.filter(e => BUILD[e.type].sup[0] > 0 && e.cond > 0).length >= 5 && totals[0].sup >= totals[0].dem, rp: 6 },
];
let CUR = { trait: null, mod: {}, scen: null, goals: [], salv: 0, faults: 0, repel: 0, county: null, orders: 0, looted: 0, camps: 0 };
const TM = () => CUR.mod;
const Variety = {
  begin(spec, c, loaded, saved) {
    const t = c ? traitOf(c) : null, diff = spec.diff || 0;
    CUR = { trait: t, mod: Mods.for(c, t ? TRAITS[t].mod : {}), scen: null, goals: [], salv: 0, faults: 0, repel: 0, county: c ? c.id : null, orders: 0, looted: 0, camps: 0 };
    if (t && TRAITS[t].threat) THREAT = Math.max(THREAT, TRAITS[t].threat);
    Loot.init(c, loaded && saved ? saved.lt : null); Camp.init(c, loaded && saved ? saved.cp : 0); surgeUntil = -1; surgeWas = false;      // before the goals are chosen, so they can look at caches and camps
    if (loaded && saved) { Object.assign(CUR, { scen: saved.sc || null, salv: saved.sv || 0, faults: saved.fl || 0, repel: saved.rp || 0 }); CUR.goals = (saved.g || []).map(g => ({ ...g })); }
    else {
      CUR.scen = c ? scenarioOf(c, diff) : null;
      const r = mulberry((c ? c.id : 1) * 4001 + 11), pool = GOAL_POOL.filter(g => (!g.ok || g.ok()) && !(() => { try { return g.f(); } catch (e) { return false; } })()), pick = [];      // never offer a goal that is already true
      while (pick.length < 3 && pool.length) pick.push(pool.splice(r() * pool.length | 0, 1)[0]);
      CUR.goals = pick.map(g => ({ id: g.id, done: 0 }));
      this.applyScenario();
    }
    if (!loaded) stock.parts += CUR.mod.startParts || 0;
    raidT *= CUR.mod.raid || 1;
    Orders.render();
    const tt = $('traitTag'); if (tt) { tt.textContent = t ? TRAITS[t].n : ''; tt.title = t ? TRAITS[t].d : ''; tt.style.display = t ? '' : 'none'; }
    this.render();
  },
  announce() {
    const bits = []; if (CUR.trait) bits.push(TRAITS[CUR.trait].n + ': ' + TRAITS[CUR.trait].d); if (CUR.scen) bits.push(SCENARIOS[CUR.scen].n + ': ' + SCENARIOS[CUR.scen].d);
    { const hc = CUR.county != null ? US.counties[CUR.county] : null, f = hc ? HQ.factor(hc) : 0;
      if (save.hq && f === 0) bits.push('HQ IS OFFLINE: repair its outage to get its support back.'); else if (f > 0 && f < 1 && hqUsed() > 0) bits.push('HQ SUPPORT HALVED: this county is not connected to HQ by lit ground.'); }
    if (bits.length) setTimeout(() => { if (Builder.active) toast(bits.join('  ')); }, 600);
  },
  applyScenario() {
    const s = CUR.scen; if (!s) return;
    if (s === 'blackstart') { const g = ents.find(e => e.type === 'generator'); if (g) g.cond = 0; stock.fuel = 35; scrap += 40; }
    else if (s === 'cache') { stock.parts += 12; scrap += 60; stock.fuel = Math.max(stock.fuel, 100); }
    else if (s === 'derelict') this.derelict();
    recompute();
  },
  derelict() {                                                    // an old network, half broken: the player repairs and extends it
    const home = DISTRICTS.find(d => d.home) || DISTRICTS[0], hub = home.hub, hx = hub.x, hy = hub.y;
    const rnd = mulberry(CUR.county * 61 + 5), blocked = i => terrain[i] === 1 || terrain[i] === 2 || terrain[i] === 4 || terrain[i] === 5;
    const lay = (L, a, bx, by, dmg) => {
      let x = a.x, y = a.y; const step = (nx, ny) => { x = nx; y = ny; const i = y * WW + x; if (inb(x, y) && !blocked(i) && !occ[i] && !cab[L][i]) cab[L][i] = rnd() < dmg ? 2 : 1; };
      while (x !== bx) step(x + Math.sign(bx - x), y); while (y !== by) step(x, y + Math.sign(by - y));
    };
    const g = ents.find(e => e.type === 'generator'), p = ents.find(e => e.type === 'pump'), r = ents.find(e => e.type === 'router');
    if (g) lay(0, g, hx, hy, 0.35); if (p) { lay(0, p, hx, hy, 0.3); lay(1, p, hx, hy, 0.35); } if (r) { lay(0, r, hx, hy, 0.3); lay(2, r, hx, hy, 0.4); }
    const other = DISTRICTS.filter(d => !d.home).sort((a, b) => Math.hypot(a.x - hx, a.y - hy) - Math.hypot(b.x - hx, b.y - hy))[0];
    if (other) { lay(0, hub, other.x, other.y, 0.6); lay(1, hub, other.x, other.y, 0.6); lay(2, hub, other.x, other.y, 0.6); }
    dirty.cab = true;
  },
  count(k) { if (CUR[k] !== undefined) CUR[k]++; if (k === 'repel') bump('repel'); },
  remod() { const c = CUR.county != null ? US.counties[CUR.county] : null; CUR.mod = Mods.for(c, CUR.trait ? TRAITS[CUR.trait].mod : {}); },
  dump() { return { lt: Loot.taken(), sc: CUR.scen, sv: CUR.salv, fl: CUR.faults, rp: CUR.repel, g: CUR.goals, cp: Camp.dead ? 1 : 0 }; },
  tick() {                                                        // once per game second
    let changed = false;
    for (const g of CUR.goals) {
      if (g.done) continue; const def = GOAL_POOL.find(x => x.id === g.id); if (!def) continue;
      if (def.limit && gameT > def.limit && !g.fail) { g.fail = 1; changed = true; continue; }
      if (g.fail) continue;
      if (def.f()) {
        g.done = 1; changed = true; bump('goals'); Meta.rp += def.rp; Meta.dirty = true; scrap += def.rp * 6;
        toast('BONUS GOAL: ' + def.t + '  (+' + def.rp + ' research, +' + def.rp * 6 + ' scrap)'); beep(660, 0.1, 'square', 0.04); beep(990, 0.14, 'square', 0.04, 0.1);
      }
    }
    if (changed) this.render();
    Orders.tick(); if (gameT % 10 === 0) Objectives.check();
  },
  render() {
    const box = $('goals'); if (!box) return;
    box.innerHTML = CUR.goals.map(g => { const d = GOAL_POOL.find(x => x.id === g.id); return d ? `<div class="goal ${g.done ? 'done' : g.fail ? 'fail' : ''}"><i>${g.done ? '✓' : g.fail ? '✗' : '○'}</i><span>${d.t}</span><b>+${d.rp}</b></div>` : ''; }).join('');
    const n = CUR.goals.filter(g => g.done).length; const r = $('goalrp'); if (r) r.textContent = n + '/' + CUR.goals.length;
  },
  doneCount() { return CUR.goals.filter(g => g.done).length; },
  // ----- random events beyond storms: some of them ask you to decide -----
  event() {
    if (Math.random() > 0.32) return false;
    const pause = async fn => { const sp = speed; setSpeed(0); try { await fn(); } finally { setSpeed(sp || 1); } };
    const roll = Math.random(), t = CUR.trait && TRAITS[CUR.trait];
    if (t && t.flood && roll < 0.35) {                                            // flash flood
      const tiles = []; for (let L = 0; L < NL; L++) for (let i = 0; i < N; i++) if (cab[L][i] === 1) { const x = i % WW, y = (i / WW) | 0; for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) if (inb(x + k, y + j) && terrain[(y + j) * WW + x + k] === 1) { tiles.push([L, i]); j = 9; break; } }
      if (tiles.length) { const n = Math.min(tiles.length, 3 + (Math.random() * 3 | 0)); for (let k = 0; k < n; k++) { const [L, i] = tiles[Math.random() * tiles.length | 0]; cab[L][i] = 2; } CUR.faults++; toast('FLASH FLOOD! The river took out ' + n + ' line tiles near the water. Repair them (V).'); beep(110, 0.5, 'sawtooth', 0.05); recompute(); return true; }
    }
    if ((HOSTILE || THREAT > 0) && Math.random() < 0.22) {                           // a Dimmer deserter
      pause(async () => {
        const camp = Camp.alive();
        if (await uiConfirm('A Dimmer deserter staggers in from the dark, starving and shaking. He says the raiders are tired of the cold, and he knows where they hide' + (camp ? ' (he points at the camp)' : '') + '. Shelter him for 20 scrap?', 'A DESERTER', 'SHELTER HIM (20 SCRAP)', 'TURN HIM AWAY')) {
          if (scrap < 20) { toast('You have nothing to spare. He wanders back into the dark.'); return; }
          scrap -= 20; const d = fac('dimmers'); if (!d.signed) d.t = Math.min(100, d.t + 3);
          if (camp) { Camp.intel = true; toast('The deserter draws you a map of the camp: your assault chance is +20%. The Dimmers think a little better of you.'); } else { Meta.rp += 14; Meta.dirty = true; toast('The deserter shares what the Dimmers know about the old grid: +14 research. The Dimmers think a little better of you.'); }
        } else toast('He disappears into the dark. Perhaps he was lying.');
      }); return true;
    }
    if (roll < 0.25) { const g = 45 + (Math.random() * 70 | 0), p = Math.random() < 0.4 ? 2 : 0; scrap += g; stock.parts += p; toast('A SUPPLY CARAVAN passes through and leaves ' + g + ' scrap' + (p ? ' and ' + p + ' parts' : '') + ' as thanks for the light.'); beep(520, 0.1, 'triangle'); beep(780, 0.12, 'triangle', 0.04, 0.1); return true; }
    if (roll < 0.45) {
      if (scrap < 90) return false; pause(async () => { if (await uiConfirm('A trader rolls in with spare machine parts. She wants 80 scrap for 8 parts. The light is on and she will not wait long.', 'A TRADER ARRIVES', 'BUY (80 SCRAP)', 'NOT NOW')) { scrap -= 80; stock.parts += 8; toast('Bought 8 parts for 80 scrap.'); } }); return true;
    }
    if (roll < 0.62) {
      pause(async () => {
        if (await uiConfirm('Scouts report a half-collapsed warehouse nearby. Send a crew (25 scrap)? It is a gamble: 60% it holds a good cache, 40% it is empty or worse.', 'A COLLAPSED WAREHOUSE', 'SEND A CREW', 'LEAVE IT')) {
          if (scrap < 25) { toast('Not enough scrap to equip a crew.'); return; } scrap -= 25;
          if (Math.random() < 0.6) { const g = 80 + (Math.random() * 80 | 0), p = 2 + (Math.random() * 4 | 0); scrap += g; stock.parts += p; toast('The crew came back with ' + g + ' scrap and ' + p + ' parts.'); } else toast('The warehouse was empty. The crew is back with nothing.');
        }
      }); return true;
    }
    if (roll < 0.77 && (HOSTILE || THREAT > 0 || Math.random() < 0.4)) {
      pause(async () => {
        if (await uiConfirm('Dimmer scouts appear at the edge of town. They offer to look the other way for 60 scrap. Refuse, and they will raid within a minute.', 'DIMMER SCOUTS', 'PAY 60 SCRAP', 'REFUSE')) { if (scrap >= 60) { scrap -= 60; toast('The scouts take the scrap and fade into the dark.'); } else { toast('You cannot afford it. They will be back.'); raidT = Math.min(raidT, 25); } }
        else { raidT = Math.min(raidT, 30); toast('You refused. Expect raiders soon - check your security posts.'); }
      }); return true;
    }
    if (roll < 0.9) {                                                              // a passing engineer fixes things for free
      const bad = ents.filter(e => BUILD[e.type].maint && !BUILD[e.type].fixed && e.cond < 60).sort((a, b) => a.cond - b.cond).slice(0, 2);
      if (bad.length) { bad.forEach(e => { e.cond = 100; }); toast('A TRAVELLING ENGINEER repaired ' + bad.map(e => BUILD[e.type].name).join(' and ') + ' for the price of a meal.'); recompute(); return true; }
    }
    return false;
  },
};

// ---------- contracts: rolling jobs on the world map ----------
const Contracts = {
  MAX: 3,
  list() { return save.contracts || (save.contracts = []); },
  gen() {
    const have = new Set(this.list().map(k => k.k + (k.c ?? k.f ?? k.s ?? '')));
    const pickOf = a => a[Math.random() * a.length | 0], out = [];
    const add = k => { const key = k.k + (k.c ?? k.f ?? k.s ?? ''); if (!have.has(key)) out.push(k); };
    const fr = US.counties.filter(c => statusOf(c) === 'frontier');
    if (fr.length) { const c = pickOf(fr); add({ k: 'restore', c: c.id, text: `Light up ${c.name} COUNTY, ${US.states[c.state].ab}`, rp: 10, fac: facOf(c), trust: 5 }); }
    const dk = Object.keys(save.dark).map(Number).filter(id => litNb(US.counties[id])); if (dk.length) { const c = US.counties[pickOf(dk)]; add({ k: 'liberate', c: c.id, text: `Drive the Dimmers out of ${c.name} COUNTY`, rp: 14, fac: facOf(c), trust: 4 }); }
    const ou = Object.keys(save.outage).map(Number); if (ou.length) { const c = US.counties[pickOf(ou)]; add({ k: 'repair', c: c.id, text: `Repair the outage at ${c.name} COUNTY`, rp: 8, fac: facOf(c), trust: 6 }); }
    const s2 = Object.values(save.stars).filter(v => v >= 2).length; add({ k: 'stars', need: s2 + 1, c: 'x', text: `Earn 2+ stars in ${s2 ? 'another' : 'a'} county (${s2 + 1} total)`, rp: 12 });
    const st = typeof unity === 'function' ? unity().stable : 0; if (Object.keys(save.restored).length >= 5) add({ k: 'links', need: st + 2, c: 'x', text: `Hold ${st + 2} stable station links`, rp: 12 });
    const weak = FAC_IDS.filter(id => !fac(id).signed && fac(id).t < 50 && facStats(id).rest > 0); if (weak.length) { const f = pickOf(weak); add({ k: 'trust', f, text: `Earn the trust of the ${FACTIONS[f].name} (50)`, rp: 12 }); }
    const stt = US.states.filter(s => s.counties.length <= 10 && s.counties.length > 1 && !stateDone(s.idx) && s.counties.some(id => save.restored[id])); if (stt.length) { const s = pickOf(stt); add({ k: 'state', s: s.idx, text: `Finish ${s.name}`, rp: 16 }); }
    return out.length ? pickOf(out) : null;
  },
  done(k) {
    switch (k.k) {
      case 'restore': return isRestored(US.counties[k.c]);
      case 'liberate': return !save.dark[k.c];
      case 'repair': return !save.outage[k.c];
      case 'stars': return Object.values(save.stars).filter(v => v >= 2).length >= k.need;
      case 'links': return unity().stable >= k.need;
      case 'trust': return fac(k.f).t >= 50 || fac(k.f).signed;
      case 'state': return stateDone(k.s);
    }
    return false;
  },
  tick() {
    if (save.start < 0 || Object.keys(save.restored).length < 1) return;
    const L = this.list(); let changed = false;
    for (let i = L.length - 1; i >= 0; i--) {
      const k = L[i];
      if (this.done(k)) {
        L.splice(i, 1); changed = true; k.rp = Math.round(k.rp * (Mods.world().contractRP || 1)); Meta.rp += k.rp; Meta.dirty = true; save.cdone = (save.cdone || 0) + 1;
        if (k.fac && k.trust) { const f = fac(k.fac); if (!f.signed) f.t = Math.min(100, f.t + k.trust); }
        say(`CONTRACT COMPLETE: ${k.text}. +${k.rp} research${k.trust ? ' and a little trust' : ''}.`); beep(523, 0.12, 'square', 0.04); beep(784, 0.2, 'square', 0.04, 0.1);
      } else if ((k.k === 'restore' && statusOf(US.counties[k.c]) !== 'frontier' && !isRestored(US.counties[k.c]))) { L.splice(i, 1); changed = true; }   // no longer reachable: drop it quietly
    }
    const now = Date.now();
    if (L.length < this.MAX + ((Mods.world().contractMax) || 0) && now > (save.nextContract || 0)) { save.nextContract = now + 50000 + Math.random() * 40000; const k = this.gen(); if (k) { L.push(k); changed = true; news('New contract: ' + k.text); } }
    if (changed) { writeSave(); this.render(); }
  },
  render() {
    const box = $('contracts'); if (!box) return;
    const L = this.list();
    box.onclick = e => { const el = e.target.closest('[data-c]'); if (el && typeof jumpTo === 'function') { const c = US.counties[+el.dataset.c]; if (c) jumpTo(c, 3); } };
    box.innerHTML = (L.length ? L.map(k => `<div class="goal" ${k.c !== undefined && k.c !== 'x' ? `data-c="${k.c}" style="cursor:pointer" title="Click to find it on the map"` : ''}><i>◆</i><span>${k.text}</span><b>+${k.rp}</b></div>`).join('') : '<p class="dim">No open contracts. New jobs arrive every minute or so.</p>') + (save.cdone ? `<small class="dim">${save.cdone} completed</small>` : '');
  },
};
