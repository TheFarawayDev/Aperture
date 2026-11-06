'use strict';
// ============================================================
//  HQ.JS - the long game.
//   * SKILL TREE   unlocking places earns skill points (SP). Spend them on permanent upgrades. Choose well.
//   * HEADQUARTERS your landing county, once restored, becomes the HQ: the place everything leads back to.
//                  Spend research and capacity on eight modules. The better you connect to it, the more it helps.
//   * BLUEPRINTS   found in supply caches out in the wild. The best HQ upgrades need them.
//   * SUPPLY CACHES hidden crates in every county: scrap, parts, research, skill chips and blueprints.
//  Everything feeds one table of multipliers (Mods) that the simulation reads through TM().
// ============================================================
const ADD_KEYS = new Set(['lootBP', 'imp', 'linkRegen', 'autoRepair', 'partsFlow', 'startParts', 'contractMax', 'cap', 'extraCache']);
function addMod(acc, part) { for (const k in part) { const v = part[k]; if (ADD_KEYS.has(k)) acc[k] = (acc[k] || 0) + v; else acc[k] = (acc[k] === undefined ? 1 : acc[k]) * v; } return acc; }
function scaleMod(part, f) { const o = {}; for (const k in part) o[k] = ADD_KEYS.has(k) ? part[k] * f : 1 + (part[k] - 1) * f; return o; }
function ensureMeta() { save.sk = save.sk || {}; save.items = save.items || {}; save.sp = save.sp || 0; save.spA = save.spA || { c: 0, s: {}, k: {}, t: 0 }; if (save.hq) { save.hq.cd = save.hq.cd || {}; save.hq.mods = save.hq.mods || {}; if (save.hq.doc === undefined) save.hq.doc = null; } }

// ---------- the skill tree ----------
const SK_BRANCH = {
  eng: { n: 'ENGINEERING', c: '#5fc4d0' }, pow: { n: 'POWER', c: '#f5c95a' }, log: { n: 'LOGISTICS', c: '#8fbf5a' },
  res: { n: 'RESILIENCE', c: '#e07050' }, sci: { n: 'SCIENCE & DIPLOMACY', c: '#b59cf0' }, auto: { n: 'AUTOMATION', c: '#ff9fb0' },
};
const SKILLS = [
  { id: 'rugged', br: 'eng', t: 0, n: 'RUGGED MACHINES', max: 3, cost: 1, d: 'Machines wear 8% slower per rank.', fx: r => ({ wear: 1 - 0.08 * r }) },
  { id: 'quick', br: 'eng', t: 0, n: 'QUICK REPAIRS', max: 3, cost: 1, d: 'Repairs cost 15% less per rank.', fx: r => ({ repair: 1 - 0.15 * r }) },
  { id: 'salvager', br: 'eng', t: 1, n: 'SALVAGER', max: 3, cost: 1, need: ['rugged'], d: 'Rubble pays 25% more per rank.', fx: r => ({ rubble: 1 + 0.25 * r }) },
  { id: 'crews', br: 'eng', t: 2, n: 'FIELD CREWS', max: 2, cost: 2, need: ['rugged', 'quick'], d: 'Machines slowly mend themselves (+0.04 condition per second per rank).', fx: r => ({ autoRepair: 0.04 * r }) },
  { id: 'sun', br: 'pow', t: 0, n: 'SUN SEEKER', max: 3, cost: 1, d: 'Solar arrays +10% per rank.', fx: r => ({ solar: 1 + 0.1 * r }) },
  { id: 'wind', br: 'pow', t: 0, n: 'WIND CATCHER', max: 3, cost: 1, d: 'Wind turbines +12% per rank.', fx: r => ({ wind: 1 + 0.12 * r }) },
  { id: 'burn', br: 'pow', t: 1, n: 'CLEAN BURN', max: 3, cost: 1, need: ['sun'], d: 'Generators burn 8% less fuel per rank.', fx: r => ({ fuel: 1 - 0.08 * r }) },
  { id: 'cells', br: 'pow', t: 2, n: 'DEEP CELLS', max: 2, cost: 2, need: ['burn', 'wind'], d: 'Batteries and water towers charge and release 20% faster per rank.', fx: r => ({ store: 1 + 0.2 * r }) },
  { id: 'caravan', br: 'log', t: 0, n: 'CARAVAN MASTER', max: 3, cost: 1, d: 'Start every county with 10% more scrap per rank.', fx: r => ({ startScrap: 1 + 0.1 * r }) },
  { id: 'stock', br: 'log', t: 0, n: 'SPARE STOCK', max: 3, cost: 1, d: 'Start every county with 3 more parts per rank.', fx: r => ({ startParts: 3 * r }) },
  { id: 'feeders', br: 'log', t: 1, n: 'FEEDER LINES', max: 3, cost: 1, need: ['caravan'], d: 'Imports from neighbouring counties +8% per rank.', fx: r => ({ imp: 0.08 * r }) },
  { id: 'trunk', br: 'log', t: 2, n: 'TRUNK DISCIPLINE', max: 2, cost: 2, need: ['feeders', 'stock'], d: 'Station links recover faster (+0.12 per rank).', fx: r => ({ linkRegen: 0.12 * r }) },
  { id: 'watch', br: 'res', t: 0, n: 'WEATHER WATCH', max: 3, cost: 1, d: 'Storms and faults come 12% less often per rank.', fx: r => ({ ev: 1 + 0.12 * r }) },
  { id: 'guard', br: 'res', t: 0, n: 'NIGHT WATCH', max: 3, cost: 1, d: 'Raiders come 15% less often per rank.', fx: r => ({ raid: 1 + 0.15 * r }) },
  { id: 'harden', br: 'res', t: 1, n: 'HARDENED LINES', max: 2, cost: 1, need: ['watch'], d: 'Storms damage 20% fewer lines per rank.', fx: r => ({ stormN: 1 - 0.2 * r }) },
  { id: 'steady', br: 'res', t: 2, n: 'STEADY HAND', max: 2, cost: 2, need: ['harden', 'guard'], d: 'Outages on the map are 15% rarer per rank.', fx: r => ({ outage: 1 + 0.15 * r }) },
  { id: 'scholar', br: 'sci', t: 0, n: 'SCHOLAR', max: 3, cost: 1, d: 'Research points +10% per rank.', fx: r => ({ rp: 1 + 0.1 * r }) },
  { id: 'envoy', br: 'sci', t: 0, n: 'ENVOY', max: 3, cost: 1, d: 'Factions trust you 10% faster per rank.', fx: r => ({ trust: 1 + 0.1 * r }) },
  { id: 'contractor', br: 'sci', t: 1, n: 'CONTRACTOR', max: 2, cost: 1, need: ['envoy'], d: 'Contracts pay 15% more per rank. Rank 2: one more open contract.', fx: r => ({ contractRP: 1 + 0.15 * r, contractMax: r >= 2 ? 1 : 0 }) },
  // ----- v8: deeper branches (tiers 3 and 4) and the AUTOMATION branch. New ids only, so older saves keep every rank. -----
  { id: 'mechanic', br: 'eng', t: 3, n: 'MASTER MECHANIC', max: 2, cost: 2, need: ['crews', 'salvager'], d: 'Repairs cost 20% less and machines wear 6% slower per rank.', fx: r => ({ repair: 1 - 0.2 * r, wear: 1 - 0.06 * r }) },
  { id: 'forge', br: 'eng', t: 4, n: 'PARTS FORGE', max: 2, cost: 3, need: ['mechanic'], d: 'Every county makes +0.05 parts per second per rank, from nothing.', fx: r => ({ partsFlow: 0.05 * r }) },
  { id: 'turbo', br: 'pow', t: 3, n: 'TURBOCHARGE', max: 3, cost: 2, need: ['cells'], d: 'Fuel-burning power sources make 6% more per rank.', fx: r => ({ genOut: 1 + 0.06 * r }) },
  { id: 'gridlord', br: 'pow', t: 4, n: 'GRID MASTER', max: 2, cost: 3, need: ['turbo'], d: 'Power, water and network output +4% per rank.', fx: r => ({ genOut: 1 + 0.04 * r, waterOut: 1 + 0.04 * r, netOut: 1 + 0.04 * r }) },
  { id: 'quarter', br: 'log', t: 3, n: 'HUB FOREMAN', max: 3, cost: 2, need: ['trunk'], d: 'Counties you are not playing deliver 10% more to the shared stockpile per rank.', fx: r => ({ poolEff: 0.1 * r }) },
  { id: 'express', br: 'log', t: 4, n: 'EXPRESS FREIGHT', max: 2, cost: 3, need: ['quarter'], d: 'Supply exchanges move 25% more and fuel makers produce 5% more per rank.', fx: r => ({ exportRate: 1 + 0.25 * r, fuelOut: 1 + 0.05 * r }) },
  { id: 'bulwark', br: 'res', t: 3, n: 'BULWARK', max: 2, cost: 2, need: ['steady'], d: 'Storms damage 15% fewer lines and raiders come 15% less often per rank.', fx: r => ({ stormN: 1 - 0.15 * r, raid: 1 + 0.15 * r }) },
  { id: 'unbreak', br: 'res', t: 4, n: 'UNBREAKABLE', max: 2, cost: 3, need: ['bulwark'], d: 'Outages on the map are 20% rarer and drones fix them 25% faster per rank.', fx: r => ({ outage: 1 + 0.2 * r, droneOut: 1 + 0.25 * r }) },
  { id: 'labtech', br: 'sci', t: 3, n: 'LAB TECHNICIAN', max: 3, cost: 2, need: ['archivist'], d: 'Queued research fills 15% faster per rank.', fx: r => ({ labSpeed: 1 + 0.15 * r }) },
  { id: 'polymath', br: 'sci', t: 4, n: 'POLYMATH', max: 2, cost: 3, need: ['labtech'], d: 'Research points +10% and research speed +10% per rank.', fx: r => ({ rp: 1 + 0.1 * r, labSpeed: 1 + 0.1 * r }) },
  { id: 'pilot', br: 'auto', t: 0, n: 'DRONE PILOT', max: 3, cost: 1, d: 'Repair drones work 20% faster per rank.', fx: r => ({ droneSpeed: 1 + 0.2 * r }) },
  { id: 'swarm', br: 'auto', t: 0, n: 'SWARM LOGIC', max: 2, cost: 1, d: 'Every drone bay launches 1 more drone per rank.', fx: r => ({ droneN: r }) },
  { id: 'autofix', br: 'auto', t: 1, n: 'FIELD AUTOMATION', max: 3, cost: 1, need: ['pilot'], d: 'Repairs, REPAIR ALL and auto-repair cost 10% less per rank.', fx: r => ({ repair: 1 - 0.1 * r }) },
  { id: 'remote', br: 'auto', t: 2, n: 'REMOTE OPS', max: 2, cost: 2, need: ['autofix', 'swarm'], d: 'Drones reach 8 tiles further and fix outages on the map 30% faster per rank.', fx: r => ({ droneRange: 8 * r, droneOut: 1 + 0.3 * r }) },
  { id: 'sentinel', br: 'auto', t: 3, n: 'SENTINEL PROTOCOL', max: 1, cost: 3, need: ['remote'], d: 'Tripped switches close again after 3 seconds, and machines mend themselves (+0.03 condition per second).', fx: r => ({ droneSwitch: r, autoRepair: 0.03 * r }) },
  { id: 'overmind', br: 'auto', t: 4, n: 'OVERMIND', max: 1, cost: 4, need: ['sentinel'], d: 'Drones work 50% faster and research fills 10% faster.', fx: r => ({ droneSpeed: 1 + 0.5 * r, labSpeed: 1 + 0.1 * r }) },
  { id: 'archivist', br: 'sci', t: 2, n: 'ARCHIVIST', max: 3, cost: 2, need: ['scholar', 'contractor'], d: 'Supply caches hold 10% more and blueprints turn up 3% more often per rank.', fx: r => ({ lootVal: 1 + 0.1 * r, lootBP: 0.03 * r }) },
];
const SKILL_RESET_RP = 30;
const skRank = id => (save.sk && save.sk[id]) || 0;
const skOpen = s => (s.need || []).every(n => skRank(n) >= 1);

// ---------- headquarters: doctrine, modules, orders ----------
//  DOCTRINE  the one big strategic choice: what kind of HQ are you? (free the first time, 40 RP to change)
//  MODULES   ten departments, five levels each, limited by CAPACITY. You cannot have everything.
//  ORDERS    modules unlock orders you can call down inside any county that HQ supports (they cool down).
//  SUPPLY    counties joined to HQ by lit ground get the full help; others get half (a Signal Relay raises that).
const BLUEPRINTS = {
  fusion: 'FUSION CORE', aqua: 'AQUIFER ARRAYS', quantum: 'QUANTUM RELAY', nano: 'NANO-REPAIR SWARM', assembler: 'MATTER ASSEMBLER',
  strategos: 'STRATEGOS AI', vault: 'DEEP VAULT', aegis: 'AEGIS SHIELD', beacon: 'DEEP-SPACE BEACON', survey: 'ORBITAL SURVEY',
};
const HQMODS = [
  { id: 'power', n: 'POWER CORE', c: '#f5c95a', bp: 'fusion', d: 'Every generator and power plant makes +7% and burns 8% less fuel, per level. Level 2 unlocks the GRID RESTART order.', fx: L => ({ genOut: 1 + 0.07 * L, fuel: 1 - 0.08 * L }) },
  { id: 'water', n: 'WATER WORKS', c: '#5fc4d0', bp: 'aqua', d: 'Pumps, desalination and water plants make +8% per level.', fx: L => ({ waterOut: 1 + 0.08 * L }) },
  { id: 'data', n: 'DATA CORE', c: '#8fbf5a', bp: 'quantum', d: 'Routers, relays and data centres +8%, research +5%, per level. Level 2 unlocks OVERCHARGE.', fx: L => ({ netOut: 1 + 0.08 * L, rp: 1 + 0.05 * L }) },
  { id: 'maint', n: 'MAINTENANCE BAY', c: '#d8e6e0', bp: 'nano', d: 'Wear -8% and repairs -12% per level. From level 3 machines mend themselves, and the REBUILD CREW order unlocks.', fx: L => ({ wear: 1 - 0.08 * L, repair: 1 - 0.12 * L, autoRepair: L >= 3 ? 0.03 * (L - 2) : 0 }) },
  { id: 'fab', n: 'FABRICATOR', c: '#e08a3c', bp: 'assembler', d: '+0.06 parts a second everywhere and +2 starting parts per level. Level 1 unlocks SUPPLY DROP.', fx: L => ({ partsFlow: 0.06 * L, startParts: 2 * L }) },
  { id: 'cmd', n: 'COMMAND CENTRE', c: '#b59cf0', bp: 'strategos', d: '+2 capacity per level, trust +8%, orders cool down 8% faster, and one more contract from level 3.', fx: L => ({ cap: 2 * L, trust: 1 + 0.08 * L, contractMax: L >= 3 ? 1 : 0 }) },
  { id: 'store', n: 'STOREHOUSE', c: '#a08060', bp: 'vault', d: 'Every county starts with 7% more scrap, and supply caches hold 12% more, per level.', fx: L => ({ startScrap: 1 + 0.07 * L, lootVal: 1 + 0.12 * L }) },
  { id: 'def', n: 'AEGIS GRID', c: '#e07050', bp: 'aegis', d: 'Raids and map outages 12% rarer, storms damage 10% fewer lines, per level. Level 2 unlocks LOCKDOWN.', fx: L => ({ raid: 1 + 0.12 * L, outage: 1 + 0.12 * L, stormN: 1 - 0.1 * L }) },
  { id: 'relay', n: 'SIGNAL RELAY', c: '#7fd0ff', bp: 'beacon', d: 'Counties NOT joined to HQ by lit ground get 10% more of its help per level (full help at level 5). Imports +2% per level.', fx: L => ({ imp: 0.02 * L }) },
  { id: 'scout', n: 'SURVEY OFFICE', c: '#e6a0ff', bp: 'survey', d: 'Caches hold 8% more and blueprints are 1.5% likelier per level. From level 3 every county hides one more cache. Level 1 unlocks FIELD SURVEY.', fx: L => ({ lootVal: 1 + 0.08 * L, lootBP: 0.015 * L, extraCache: L >= 3 ? 1 : 0 }) },
];
const DOCTRINES = {
  forge: { n: 'FORGE', c: '#e08a3c', d: 'Industry first. Power, water and network output +8%, +0.04 parts a second, scrap income +5%.', fx: { genOut: 1.08, waterOut: 1.08, netOut: 1.08, partsFlow: 0.04, income: 1.05 } },
  bulwark: { n: 'BULWARK', c: '#e07050', d: 'Hold the line. Raids and map outages 25% rarer, storms damage 15% fewer lines, machines wear 10% slower.', fx: { raid: 1.25, outage: 1.25, stormN: 0.85, wear: 0.9 } },
  frontier: { n: 'FRONTIER', c: '#8fbf5a', d: 'Push outward. Counties start with 20% more scrap and 4 more parts, imports +8%, factions trust you 15% faster.', fx: { startScrap: 1.2, startParts: 4, imp: 0.08, trust: 1.15 } },
  scholar: { n: 'SCHOLAR', c: '#b59cf0', d: 'Knowledge first. Research +20%, caches hold 20% more, blueprints 2% likelier, one more open contract.', fx: { rp: 1.2, lootVal: 1.2, lootBP: 0.02, contractMax: 1 } },
};
const DOC_SWITCH_RP = 40, HQ_MAXL = 5;
const hqLevel = id => (save.hq && save.hq.mods && save.hq.mods[id]) || 0;
const hqCost = L => ({ rp: 12 * L, cap: L });
const hqUsed = () => HQMODS.reduce((a, m) => { const L = hqLevel(m.id); return a + L * (L + 1) / 2; }, 0);
const hqTotal = () => HQMODS.reduce((a, m) => a + hqLevel(m.id), 0);
const HQ_RANKS = [[0, 'FIELD CAMP'], [4, 'OUTPOST'], [10, 'COMMAND POST'], [18, 'REGIONAL HQ'], [28, 'NATIONAL HQ'], [40, 'GRID CAPITAL']];
const hqRank = () => { let r = HQ_RANKS[0][1]; for (const [n, name] of HQ_RANKS) if (hqTotal() >= n) r = name; return r; };
function hqCap() {
  if (!save.hq) return 0; const done = Object.keys(save.restored || {}).length, cmd = hqLevel('cmd');
  return 4 + Math.floor(done / 12) + 2 * cmd;
}
const HQ = {
  reach: new Set(), par: {}, at: 0,
  county() { return save.hq && save.start >= 0 ? US.counties[save.start] : null; },
  online() { const c = this.county(); return !!c && !save.outage[c.id]; },
  refresh() {                                                       // which counties can reach the HQ through lit ground? (par = the supply lines)
    const c = this.county(); this.reach = new Set(); this.par = {}; this.at = Date.now(); if (!c) return;
    const q = [c.id]; this.reach.add(c.id);
    while (q.length) { const a = US.counties[q.shift()]; for (const n of a.nb) { const o = US.counties[n]; if (!this.reach.has(n) && isLit(o) && crossOK(a.country, o.country)) { this.reach.add(n); this.par[n] = a.id; q.push(n); } } }
  },
  factor(c) {                                                       // how strongly the HQ helps a county
    if (!save.hq || !this.online()) return 0;
    if (Date.now() - this.at > 4000) this.refresh();
    return !c || this.reach.has(c.id) ? 1 : Math.min(1, 0.5 + 0.1 * hqLevel('relay'));
  },
  check() {                                                         // the landing county becomes headquarters once it is restored
    if (save.hq || save.start < 0 || !isRestored(US.counties[save.start])) return false;
    ensureMeta(); save.hq = { mods: {}, since: Date.now(), doc: null, cd: {} }; this.refresh(); writeSave();
    say('YOUR LANDING SITE IS NOW HEADQUARTERS. Choose a DOCTRINE, then build modules. Press Q to open the HQ.'); Story.event('hq-online'); return true;
  },
};
const Mods = {
  for(c, tmod) {
    const acc = {}; addMod(acc, tmod || {});
    for (const s of SKILLS) { const r = skRank(s.id); if (r) addMod(acc, s.fx(r)); }
    for (const id in TECH) if (TECH[id].fx && Meta.has(id)) addMod(acc, TECH[id].fx);
    const f = HQ.factor(c);
    if (f > 0) {
      for (const m of HQMODS) { const L = hqLevel(m.id); if (L) addMod(acc, scaleMod(m.fx(L), f)); }
      const dc = save.hq.doc && DOCTRINES[save.hq.doc]; if (dc) addMod(acc, scaleMod(dc.fx, f));
    }
    return acc;
  },
  world() { return this.for(HQ.county(), {}); },
};

// ---------- statistics and campaign objectives ----------
const STATS = () => (save.stat = save.stat || {});
const bump = (k, n = 1) => { const s = STATS(); s[k] = (s[k] || 0) + n; };
const stat = k => (save.stat && save.stat[k]) || 0;

// ---------- skill points ----------
function awardSP(n, why) { if (n <= 0) return; ensureMeta(); save.sp += n; news(`+${n} skill point${n > 1 ? 's' : ''}: ${why}`); say(`+${n} SKILL POINT${n > 1 ? 'S' : ''} (${why}). Press K to spend ${n > 1 ? 'them' : 'it'}.`); beep(740, 0.08, 'square', 0.04); beep(1100, 0.12, 'square', 0.04, 0.09); }
function checkAwards() {
  if (save.start < 0) return; ensureMeta(); const A = save.spA; let n = 0, why = [];
  const done = Object.keys(save.restored).length, c3 = Math.floor(done / 3); if (c3 > A.c) { n += c3 - A.c; A.c = c3; why.push(done + ' counties'); }
  US.states.forEach(s => { if (!A.s[s.idx] && s.counties.every(id => save.restored[id])) { A.s[s.idx] = 1; n += 1; why.push(s.name + ' complete'); } });
  for (const cn of Object.keys(COUNTRY_NAME)) { const key = 'c' + cn; const list = US.counties.filter(c => c.country === cn); if (!A.k[key] && list.length && list.every(isRestored)) { A.k[key] = 1; n += 3; why.push(COUNTRY_NAME[cn] + ' complete'); } }
  const stars3 = Object.values(save.stars).filter(v => v >= 3).length; if (stars3 > (A.t || 0)) { n += stars3 - (A.t || 0); A.t = stars3; why.push('a flawless county'); }
  if (n) { awardSP(n, why.slice(0, 2).join(', ') + (why.length > 2 ? '...' : '')); writeSave(); }
}

// ---------- supply caches in the wild ----------
const Loot = {
  list: [], pingUntil: 0,
  init(c, taken) {
    this.list = []; if (!c) return;
    const r = mulberry(c.id * 7001 + 3), want = 1 + (r() < 0.55 ? 1 : 0) + (r() < 0.2 ? 1 : 0) + (CUR.trait === 'archive' ? 1 : 0) + Math.floor((typeof TM === 'function' && TM().extraCache) || 0), ok = t => t === 0 || t === 3 || t === 7;
    for (let tries = 0; tries < 400 && this.list.length < want; tries++) {
      const x = 8 + (r() * (WW - 16) | 0), y = 8 + (r() * (WH - 16) | 0), i = y * WW + x;
      if (!ok(terrain[i]) || occ[i] || cab.some(a => a[i])) continue;
      if (DISTRICTS.some(d => Math.abs(d.x - x) < 9 && Math.abs(d.y - y) < 9) || SITES.some(s => Math.abs(s.x - x) < 7 && Math.abs(s.y - y) < 7)) continue;
      if (this.list.some(l => Math.abs(l.x - x) < 16 && Math.abs(l.y - y) < 16)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terrain[(y + dy) * WW + x + dx] === 1)) continue;
      this.list.push({ x, y, n: this.list.length, open: false });
    }
    (taken || []).forEach(k => { const l = this.list.find(q => q.n === k); if (l) l.open = true; });
    this.cid = c.id;
  },
  taken() { return this.list.filter(l => l.open).map(l => l.n); },
  at(tx, ty) { return this.list.find(l => !l.open && l.x === tx && l.y === ty) || null; },
  roll(l) {                                                         // what is inside: decided by the county and the crate, so reloading never rerolls it
    ensureMeta(); const c = US.counties[this.cid], r = mulberry(this.cid * 313 + l.n * 17 + 5), hops = c ? hopsFromStart(c.id) : 0, tm = TM(), val = tm.lootVal || 1;
    const bpChance = 0.03 + (CUR.trait === 'archive' ? 0.04 : 0) + (tm.lootBP || 0) + Math.min(0.04, hops * 0.003), x = r();
    const owned = Object.keys(BLUEPRINTS).filter(id => save.items[id]), missing = Object.keys(BLUEPRINTS).filter(id => !save.items[id]);
    if (x < bpChance && missing.length) return { k: 'bp', id: missing[r() * missing.length | 0] };
    const y = r();
    if (x < 0.38) return { k: 'scrap', n: Math.round((40 + r() * 120) * val * (1 + hops * 0.02)) };
    if (x < 0.58) return { k: 'cr', n: Math.round((12 + r() * 28) * val) };
    if (x < 0.76) return { k: 'parts', n: Math.round((3 + r() * 7) * val) };
    if (x < 0.9) return { k: 'rp', n: Math.round((6 + r() * 16) * val) };
    if (x < 0.95 || !missing.length) return { k: 'sp', n: 1 };
    return { k: 'rp', n: 25 + (y * 10 | 0) };
  },
  tryOpen(tx, ty) {
    const l = this.at(tx, ty); if (!l) return false;
    if (!Net.covered(tx, ty)) { warnOnce('THIS CACHE IS OUTSIDE YOUR SIGNAL - REACH IT WITH SAT RELAYS FIRST'); return true; }
    l.open = true; bump('caches'); CUR.looted = (CUR.looted || 0) + 1; const it = this.roll(l); burst(tx, ty, 'spark'); burst(tx, ty, 'spark'); let msg;
    if (it.k === 'scrap') { scrap += it.n; msg = `a SUPPLY CACHE: +${it.n} scrap.`; }
    else if (it.k === 'cr') { const got = Credits.add(it.n); msg = `a SUPPLY CACHE: +${got} credits.`; }
    else if (it.k === 'parts') { stock.parts += it.n; msg = `a SUPPLY CACHE: +${it.n} parts.`; }
    else if (it.k === 'rp') { Meta.rp += it.n; Meta.dirty = true; msg = `a SUPPLY CACHE: +${it.n} research points.`; }
    else if (it.k === 'sp') { ensureMeta(); save.sp += 1; writeSave(); msg = 'a TECH CHIP: +1 skill point! (K on the map)'; }
    else { ensureMeta(); save.items[it.id] = 1; writeSave(); msg = `A BLUEPRINT: ${BLUEPRINTS[it.id]}! Headquarters can now upgrade the ${HQMODS.find(m => m.bp === it.id).n} past level 3.`; Story.event('blueprint'); }
    toast('You found ' + msg); news('Found ' + msg); beep(520, 0.08, 'triangle'); beep(780, 0.1, 'triangle', 0.04, 0.08); beep(1040, 0.14, 'square', 0.04, 0.18); dirty.mini = true; return true;
  },
  draw(t, cx, cy) {
    const blink = Math.floor(t * 3) % 2;
    for (const l of this.list) {
      if (l.open) continue; const x = l.x * T - cx, y = l.y * T - cy; if (x < -10 || y < -10 || x > VW + 2 || y > VH + 2) continue;
      px(x, y + 6, 8, 2, 0); px(x + 1, y + 2, 6, 5, 0); px(x + 2, y + 3, 4, 3, 5); px(x + 1, y + 2, 6, 1, 6); px(x + 3, y + 4, 2, 2, 6);
      g.strokeStyle = PAL[blink ? 8 : 6]; g.strokeRect(x - 2.5, y - 1.5, 13, 11);
      if (blink) { px(x - 1, y, 1, 1, 8); px(x + 8, y + 1, 1, 1, 8); px(x + 3, y - 2, 1, 1, 8); }
      if (this.pingUntil > performance.now()) { const k = (t * 1.5) % 1; g.strokeStyle = PAL[8]; g.globalAlpha = 1 - k; g.strokeRect(x + 4 - 4 - k * 20, y + 4 - 4 - k * 20, 8 + k * 40, 8 + k * 40); g.globalAlpha = 1; }
    }
  },
  mini() { for (const l of this.list) if (!l.open) { mmg.fillStyle = '#000'; mmg.fillRect(l.x * 2 - 2, l.y * 2 - 2, 6, 6); mmg.fillStyle = PAL[(Math.floor(performance.now() / 350) % 2) ? 8 : 6]; mmg.fillRect(l.x * 2 - 1, l.y * 2 - 1, 4, 4); } },
  left() { return this.list.filter(l => !l.open).length; },
};

// ---------- skill tree screen: a real tree (branches as columns, tiers as rows, lines between prerequisites) plus an inspector ----------
let skSel = null;
const SK_W = 64, SK_H = 64, SK_GAP = 8, SK_COLW = 2 * SK_W + 3 * SK_GAP, SK_ROWH = 96, SK_TOP = 38;
const SK_MAXT = () => Math.max(...SKILLS.map(s => s.t));
function skPos() {
  const pos = {}; Object.keys(SK_BRANCH).forEach((b, bi) => {
    for (let t = 0; t <= SK_MAXT(); t++) { const row = SKILLS.filter(s => s.br === b && s.t === t); row.forEach((s, k) => { pos[s.id] = { x: bi * SK_COLW + SK_COLW / 2 + (k - (row.length - 1) / 2) * (SK_W + SK_GAP) - SK_W / 2, y: SK_TOP + t * SK_ROWH }; }); }
  });
  return pos;
}
const skState = s => { const r = skRank(s.id), open = skOpen(s), maxed = r >= s.max; return { r, open, maxed, can: open && !maxed && save.sp >= s.cost }; };
function renderSkills() {
  ensureMeta(); const pos = skPos(), brs = Object.keys(SK_BRANCH), W = brs.length * SK_COLW, H = SK_TOP + SK_MAXT() * SK_ROWH + SK_H + 12;
  const spent = SKILLS.reduce((a, s) => a + skRank(s.id) * s.cost, 0), ranks = SKILLS.reduce((a, s) => a + skRank(s.id), 0);
  $('sk-top').innerHTML = `<span class="spbig">${save.sp} <small>SKILL POINTS</small></span><span>SPENT <b>${spent}</b></span><span>RANKS <b>${ranks}/${SKILLS.reduce((a, s) => a + s.max, 0)}</b></span><span class="dim">1 point per 3 counties, plus states, countries, flawless counties and caches.</span>`;
  let svg = '', html = brs.map((b, bi) => `<div class="skhead" style="left:${bi * SK_COLW}px;width:${SK_COLW}px;--c:${SK_BRANCH[b].c}">${SK_BRANCH[b].n}</div>`).join('');
  SKILLS.forEach(s => (s.need || []).forEach(n => {
    const a = pos[n], c = pos[s.id], p = SKILLS.find(x => x.id === n), x1 = a.x + SK_W / 2, y1 = a.y + SK_H, x2 = c.x + SK_W / 2, y2 = c.y, my = (y1 + y2) / 2, lit = skRank(n) >= 1;
    svg += `<path d="M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}" stroke="${lit ? SK_BRANCH[s.br].c : '#2a3238'}" stroke-width="${lit ? 3 : 2}" fill="none" ${lit && skRank(s.id) < 1 ? 'stroke-dasharray="5 4"' : ''}/>`;
  }));
  SKILLS.forEach(s => {
    const p = pos[s.id], st = skState(s), words = s.n.split(' ');
    html += `<button class="skn ${st.maxed ? 'max' : st.r ? 'has' : ''} ${st.can ? 'can' : ''} ${st.open ? '' : 'lock'} ${skSel === s.id ? 'sel' : ''}" data-sk="${s.id}" style="left:${p.x}px;top:${p.y}px;width:${SK_W}px;height:${SK_H}px;--c:${SK_BRANCH[s.br].c}"><b>${s.n}</b><span class="pips">${pips(st.r, s.max)}</span></button>`;
  });
  $('sk-tree').innerHTML = `<div id="sk-canvas" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}">${svg}</svg>${html}</div>`;
  renderSkInfo();
}
function renderSkInfo() {
  const box = $('sk-info'); if (!skSel) { box.innerHTML = '<div class="ph">INSPECTOR</div><p class="dim">Pick a skill. Lines show what leads to what: a dashed line means the next skill is unlocked and waiting for a point. Double-click a skill to buy a rank.</p>'; return; }
  const s = SKILLS.find(x => x.id === skSel), st = skState(s), B = SK_BRANCH[s.br];
  const reqs = (s.need || []).map(n => { const q = SKILLS.find(x => x.id === n), ok = skRank(n) >= 1; return `<li class="${ok ? 'ok' : 'no'}">${pxi(ok ? 'check' : 'cross')} ${q.n}</li>`; }).join('') || '<li class="ok">' + pxi('check') + ' none</li>';
  const why = st.maxed ? 'MAXED' : !st.open ? 'LOCKED' : save.sp < s.cost ? `NEED ${s.cost} POINT${s.cost > 1 ? 'S' : ''}` : `BUY RANK ${st.r + 1} - ${s.cost} SP`;
  box.innerHTML = `<div class="ph" style="color:${B.c}">${B.n}</div><h3 style="color:${B.c}">${s.n}</h3><div class="pips big" style="color:${B.c}">${pips(st.r, s.max)}</div><p>${s.d}</p>
    <div class="kv"><span>RANK</span><b>${st.r}/${s.max}</b><span>COST</span><b>${s.cost} SP</b></div><div class="rq">REQUIRES</div><ul>${reqs}</ul>
    <button id="sk-buy" class="${st.can ? 'primary' : ''}" ${st.can ? '' : 'disabled'}>${why}</button>`;
  $('sk-buy').onclick = () => skBuy(s.id);
}
function skBuy(id) {
  const s = SKILLS.find(x => x.id === id); ensureMeta(); if (!s || !skOpen(s) || skRank(s.id) >= s.max) return;
  if (save.sp < s.cost) { $('sk-msg').textContent = 'Not enough skill points. Restore more places.'; return; }
  save.sp -= s.cost; save.sk[s.id] = skRank(s.id) + 1; $('sk-msg').textContent = `${s.n} rank ${save.sk[s.id]}.`; beep(660, 0.08, 'square', 0.04); beep(990, 0.1, 'square', 0.04, 0.07);
  recalcMods(); writeSave(); renderSkills(); if (mapActive) updateStats(); if (typeof Objectives !== 'undefined') Objectives.check();
}
function openSkills() { if (!skSel) skSel = SKILLS[0].id; renderSkills(); $('skills').style.display = 'flex'; }
$('sk-tree').onclick = e => { const b = e.target.closest('[data-sk]'); if (!b) return; skSel = b.dataset.sk; renderSkills(); };
$('sk-tree').ondblclick = e => { const b = e.target.closest('[data-sk]'); if (b) skBuy(b.dataset.sk); };
$('sk-reset').onclick = async () => {
  ensureMeta(); const spent = SKILLS.reduce((a, s) => a + skRank(s.id) * s.cost, 0); if (!spent) { $('sk-msg').textContent = 'Nothing to reset.'; return; }
  if (Meta.rp < SKILL_RESET_RP) { $('sk-msg').textContent = `A reset costs ${SKILL_RESET_RP} research points.`; return; }
  if (!await uiConfirm(`Refund all ${spent} spent skill points for ${SKILL_RESET_RP} research points?`, 'RESET SKILLS?', 'RESET', 'KEEP')) return;
  Meta.rp -= SKILL_RESET_RP; Meta.dirty = true; Meta.save(); save.sp += spent; save.sk = {}; recalcMods(); writeSave(); renderSkills(); if (mapActive) updateStats();
};
$('sk-close').onclick = () => { $('skills').style.display = 'none'; };

// ---------- HQ orders: called down inside a county, cool down in real time ----------
let surgeUntil = -1, surgeMul = 1, surgeWas = false;
const ORDERS = [
  { id: 'drop', n: 'SUPPLY DROP', mod: 'fab', lvl: 1, cd: 300, d: L => `Airlift ${60 + 30 * L} scrap and ${3 + 2 * L} parts into this county.`,
    run(f, L) { const s = Math.round((60 + 30 * L) * f), p = Math.round((3 + 2 * L) * f); scrap += s; stock.parts += p; toast(`SUPPLY DROP lands: +${s} scrap, +${p} parts.`); beep(520, 0.1, 'triangle'); beep(780, 0.12, 'triangle', 0.04, 0.1); } },
  { id: 'restart', n: 'GRID RESTART', mod: 'power', lvl: 2, cd: 360, d: L => `Close every tripped switch, clear grid strain, and repair every machine by ${25 + 8 * L}% (broken ones get back on their feet).`,
    run(f, L) {
      let n = 0, m = 0; ents.forEach(e => {
        const d = BUILD[e.type]; if (d.sw !== undefined && !e.on && !e.manual) { e.on = true; n++; burst(e.x + 1, e.y + 1, 'spark'); }
        if (d.maint && !d.fixed) { e.cond = Math.min(100, Math.max(e.cond, e.cond <= 0 ? 15 : 0) + (25 + 8 * L) * f); m++; }
      });
      strain = 0; seqs = seqs.filter(q => q.kind !== 'overload' && q.kind !== 'melt'); recompute(); toast(`GRID RESTART: ${n} switch(es) closed, ${m} machines repaired.`); beep(330, 0.1, 'square', 0.05); beep(660, 0.2, 'square', 0.05, 0.1);
    } },
  { id: 'surge', n: 'OVERCHARGE', mod: 'data', lvl: 2, cd: 420, d: L => `For ${30 + 8 * L} seconds every power, water and network source makes 25% more.`,
    run(f, L) { surgeUntil = gameT + (30 + 8 * L); surgeMul = 1 + 0.25 * f; surgeWas = true; recompute(); toast(`OVERCHARGE: all sources +${Math.round((surgeMul - 1) * 100)}% for ${30 + 8 * L}s.`); beep(880, 0.2, 'sawtooth', 0.04); } },
  { id: 'survey', n: 'FIELD SURVEY', mod: 'scout', lvl: 1, cd: 150, d: L => `Ping every supply cache${L >= 2 ? ' and Dimmer camp' : ''} in the county and swing the camera to the nearest.`,
    run(f, L) {
      const open = Loot.list.filter(l => !l.open); Loot.pingUntil = performance.now() + 7000; if (L >= 2 && Camp.alive()) Camp.pingUntil = performance.now() + 7000;
      if (open.length) { const cx = camX / T + VW / T / 2, cy = camY / T + VH / T / 2, n = open.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]; centerOn(n.x, n.y); }
      toast(open.length ? `FIELD SURVEY: ${open.length} supply cache${open.length > 1 ? 's' : ''} left here.` + (L >= 2 && Camp.alive() ? ' A Dimmer camp is marked.' : '') : 'FIELD SURVEY: every cache here has been emptied.'); beep(700, 0.12, 'triangle');
    } },
  { id: 'lock', n: 'LOCKDOWN', mod: 'def', lvl: 2, cd: 420, d: L => `Call off the current raid and keep raiders away for ${150 + 30 * L} seconds.`,
    run(f, L) { raid = null; raidT = Math.max(raidT, (150 + 30 * L) * f); raidQueue = 0; toast(`LOCKDOWN: raiders are held off for ${Math.round((150 + 30 * L) * f)}s.`); beep(250, 0.2, 'square', 0.05); } },
  { id: 'rebuild', n: 'REBUILD CREW', mod: 'maint', lvl: 3, cd: 300, d: L => `Mend every damaged line tile in the county, free of charge.`,
    run() { let n = 0; for (let L = 0; L < NL; L++) for (let i = 0; i < N; i++) if (cab[L][i] === 2) { cab[L][i] = 1; n++; } dirty.cab = true; recompute(); toast(n ? `REBUILD CREW: ${n} line tiles mended.` : 'REBUILD CREW: nothing was broken.'); beep(440, 0.1, 'square', 0.04); } },
];
const Orders = {
  sig: '',
  unlocked(o) { return !!save.hq && hqLevel(o.mod) >= o.lvl; },
  cdMs(o) { return o.cd * 1000 * Math.max(0.4, 1 - 0.08 * hqLevel('cmd')); },
  left(o) { const t = (save.hq && save.hq.cd && save.hq.cd[o.id]) || 0; return Math.max(0, Math.ceil((t - Date.now()) / 1000)); },
  factor() { const c = CUR.county != null ? US.counties[CUR.county] : null; return HQ.factor(c); },
  use(id) {
    const o = ORDERS.find(x => x.id === id); if (!o || !Builder.active || !save.hq) return;
    if (!this.unlocked(o)) { toast('Build the ' + HQMODS.find(m => m.id === o.mod).n + ' to level ' + o.lvl + ' at HQ first.'); return; }
    if (this.left(o)) { toast(o.n + ' is still cooling down.'); return; }
    const f = this.factor(); if (f <= 0) { toast('HQ is offline. Repair its outage on the map to use orders.'); return; }
    save.hq.cd = save.hq.cd || {}; o.run(f, hqLevel(o.mod)); save.hq.cd[o.id] = Date.now() + this.cdMs(o);
    bump('orders'); CUR.orders = (CUR.orders || 0) + 1; writeSave(); this.render(); Objectives.check();
  },
  render() {
    const box = $('orders'), pan = $('orderbox'); if (!box || !pan) return;
    const un = save.hq ? ORDERS.filter(o => this.unlocked(o)) : [];
    if (!un.length) { pan.style.display = 'none'; box.innerHTML = ''; if (typeof fitCatalogue === 'function') setTimeout(fitCatalogue, 0); return; }      // no orders yet: the HQ screen explains how to get them
    if (pan.style.display === 'none' && typeof fitCatalogue === 'function') setTimeout(fitCatalogue, 0);
    pan.style.display = '';
    box.innerHTML = un.length ? un.map(o => `<button class="ord" data-ord="${o.id}" title="${o.d(hqLevel(o.mod))}"><b>${o.n}</b><span class="ordcd" data-o="${o.id}"></span></button>`).join('')
      : '<span class="dim">No orders yet. Build HQ modules on the map (Q): Fabricator, Power Core, Data Core, Survey Office, Aegis Grid and Maintenance Bay each unlock one.</span>';
    this.tick();
  },
  tick() {
    const f = save.hq ? this.factor() : 0;
    document.querySelectorAll('#orders .ordcd').forEach(s => {
      const o = ORDERS.find(x => x.id === s.dataset.o), l = this.left(o), b = s.parentNode;
      s.textContent = f <= 0 ? 'OFFLINE' : l ? (l >= 60 ? Math.floor(l / 60) + 'm' + (l % 60 ? ' ' + (l % 60) + 's' : '') : l + 's') : 'READY'; b.classList.toggle('rdy', f > 0 && !l);
    });
    if (surgeWas && surgeUntil <= gameT) { surgeWas = false; recompute(); toast('OVERCHARGE has run its course.'); }
  },
};
$('orders').onclick = e => { const b = e.target.closest('[data-ord]'); if (b) Orders.use(b.dataset.ord); };

// ---------- campaign objectives: long goals that pay skill points and research ----------
const nRest = () => Object.keys(save.restored || {}).length;
const nStates = () => US.states.filter(s => s.counties.every(id => save.restored[id])).length;
const nRanks = () => SKILLS.reduce((a, s) => a + skRank(s.id), 0);
const nTechs = () => Object.keys(Meta.done).length;
const maxMod = () => Math.max(0, ...HQMODS.map(m => hqLevel(m.id)));
const nBP = () => Object.keys(BLUEPRINTS).filter(id => save.items && save.items[id]).length;
const nStars3 = () => Object.values(save.stars || {}).filter(v => v >= 3).length;
const nCompacts = () => FAC_IDS.filter(id => fac(id).signed).length;
const OBJ = [];
const addObj = (key, fn, txt, goals, rew) => goals.forEach((g, i) => OBJ.push({ id: key + g, txt: txt(g), fn, goal: g, rew: rew[i] }));
addObj('rest', nRest, g => `Restore ${g} counties`, [5, 12, 25, 50, 100, 200], [{ rp: 10 }, { rp: 20 }, { sp: 1, rp: 25 }, { sp: 1, rp: 40 }, { sp: 2, rp: 60 }, { sp: 3, rp: 100 }]);
addObj('state', nStates, g => `Complete ${g} state${g > 1 ? 's' : ''}`, [1, 3, 8], [{ rp: 20 }, { sp: 1, rp: 30 }, { sp: 2, rp: 60 }]);
addObj('lib', () => stat('lib'), g => `Liberate ${g} Dimmer-held count${g > 1 ? 'ies' : 'y'}`, [1, 3, 8], [{ rp: 15 }, { sp: 1 }, { sp: 2, rp: 40 }]);
addObj('wl', () => stat('wl'), g => `Defeat ${g} Dimmer warlord${g > 1 ? 's' : ''}`, [1, 3], [{ sp: 1, rp: 25 }, { sp: 2, rp: 50 }]);
addObj('camp', () => stat('camps'), g => `Destroy ${g} Dimmer camp${g > 1 ? 's' : ''}`, [1, 4, 10], [{ rp: 20 }, { sp: 1 }, { sp: 2 }]);
addObj('rep', () => stat('repel'), g => `Repel ${g} raids`, [5, 25, 75], [{ rp: 10 }, { sp: 1 }, { sp: 2 }]);
addObj('cache', () => stat('caches'), g => `Open ${g} supply caches`, [5, 20, 50], [{ rp: 10 }, { sp: 1 }, { sp: 2 }]);
addObj('bp', nBP, g => `Find ${g} blueprint${g > 1 ? 's' : ''}`, [1, 4, 10], [{ rp: 15 }, { sp: 1 }, { sp: 3 }]);
addObj('doc', () => (save.hq && save.hq.doc) ? 1 : 0, () => 'Choose an HQ doctrine', [1], [{ rp: 10 }]);
addObj('hqtot', hqTotal, g => `Raise HQ modules by ${g} levels in total`, [3, 8, 20, 35], [{ rp: 15 }, { sp: 1 }, { sp: 2 }, { sp: 3 }]);
addObj('hqmax', maxMod, g => `Take one HQ module to level ${g}`, [3, 5], [{ rp: 20 }, { sp: 2 }]);
addObj('ord', () => stat('orders'), g => `Call down ${g} HQ order${g > 1 ? 's' : ''}`, [1, 10, 30], [{ rp: 10 }, { sp: 1 }, { sp: 2 }]);
addObj('skill', nRanks, g => `Buy ${g} skill ranks`, [5, 15, 30], [{ rp: 10 }, { sp: 1 }, { sp: 2 }]);
addObj('tech', nTechs, g => `Research ${g} technologies`, [8, 20, 35, 50], [{ rp: 15 }, { sp: 1 }, { sp: 2 }, { sp: 3 }]);
addObj('star', nStars3, g => `Earn 3 stars in ${g} counties`, [3, 10, 30], [{ rp: 20 }, { sp: 2 }, { sp: 3 }]);
addObj('goal', () => stat('goals'), g => `Finish ${g} bonus goals`, [5, 25, 60], [{ rp: 10 }, { sp: 1 }, { sp: 2 }]);
addObj('pact', nCompacts, g => `Sign ${g} faction compact${g > 1 ? 's' : ''}`, [1, 3], [{ rp: 10 }, { sp: 1 }]);
const rewText = r => [r.sp ? '+' + r.sp + ' SP' : '', r.rp ? '+' + r.rp + ' RP' : ''].filter(Boolean).join(' ');
const Objectives = {
  check() {
    if (typeof save === 'undefined' || save.start < 0) return; ensureMeta(); save.obj = save.obj || {}; let rp = 0, sp = 0; const names = [];
    for (const o of OBJ) {
      if (save.obj[o.id]) continue; let cur = 0; try { cur = o.fn(); } catch (e) { cur = 0; }
      if (cur >= o.goal) { save.obj[o.id] = 1; rp += o.rew.rp || 0; sp += o.rew.sp || 0; names.push(o.txt); }
    }
    if (!names.length) return;
    if (rp) { Meta.rp += rp; Meta.dirty = true; } if (sp) save.sp += sp; Credits.add(Math.round(rp * 0.8 + sp * 15));
    const t = `OBJECTIVE DONE: ${names[0]}${names.length > 1 ? ' (+' + (names.length - 1) + ' more)' : ''}  ${rewText({ rp, sp })}`; toast(t); news(t); say(t);
    beep(660, 0.1, 'square', 0.04); beep(880, 0.1, 'square', 0.04, 0.09); beep(1320, 0.16, 'square', 0.04, 0.18); writeSave();
    this.render();
  },
  render() {
    const box = $('objs'); if (!box || typeof save === 'undefined' || !save.obj) { if (box) box.innerHTML = ''; return; }
    const open = OBJ.filter(o => !save.obj[o.id]).map(o => { let c = 0; try { c = o.fn(); } catch (e) { c = 0; } return { o, c, r: Math.min(1, c / o.goal) }; }).sort((a, b) => b.r - a.r).slice(0, 4);
    const done = Object.keys(save.obj).length;
    box.innerHTML = `<div class="objhead">${done}/${OBJ.length} DONE</div>` + (open.length ? open.map(x => `<div class="obj"><span>${x.o.txt}</span><b>${Math.min(x.c, x.o.goal)}/${x.o.goal}</b><i style="width:${Math.round(x.r * 100)}%"></i><small>${rewText(x.o.rew)}</small></div>`).join('') : '<div class="dim">Every objective is done. Legend.</div>');
  },
};

// ---------- the Dimmer warlords: each pocket of Dimmer-held counties has a leader. Take their last county to break them ----------
const WARLORDS = ['ASH', 'CINDER', 'HOLLOW', 'VESPER', 'MARROW', 'KESTREL', 'UMBRA', 'THORN', 'GLASS', 'RAVEN'];
function newWarlord(id) { save.wl = save.wl || {}; const used = new Set(Object.values(save.wl)); const free = WARLORDS.filter(n => !used.has(n)); const n = (free.length ? free : WARLORDS)[Math.random() * (free.length || WARLORDS.length) | 0]; save.wl[id] = n; return n; }
function warlordHolds(name) { return Object.keys(save.wl || {}).filter(k => save.wl[k] === name && save.dark[k]).length; }
function liberateWarlord(id) {                                      // returns a line to add to the liberation message, or ''
  save.wl = save.wl || {}; const wn = save.wl[id]; bump('lib'); if (!wn) return ''; delete save.wl[id];
  if (warlordHolds(wn) > 0) return ` ${wn} still holds ${warlordHolds(wn)} more.`;
  bump('wl'); ensureMeta(); save.sp += 1; Meta.rp += 20; Meta.dirty = true;
  Object.keys(save.wl).forEach(k => { if (save.wl[k] === wn) delete save.wl[k]; });
  news(`WARLORD ${wn} IS BROKEN. +1 skill point, +20 research.`); return ` WARLORD ${wn} IS BROKEN: +1 skill point, +20 research.`;
}


// ---------- headquarters screen ----------
let hqSel = 'power', hqAnim = 0;
const MOD_NAMES = { genOut: 'power output', fuel: 'fuel use', waterOut: 'water output', netOut: 'net output', rp: 'research', wear: 'wear', repair: 'repair cost', autoRepair: 'self-repair/s', partsFlow: 'parts/s', startParts: 'start parts', cap: 'capacity', trust: 'trust gain', contractMax: 'contracts', startScrap: 'start scrap', lootVal: 'cache value', lootBP: 'blueprint odds', raid: 'raid delay', outage: 'outage delay', stormN: 'storm damage', imp: 'imports', extraCache: 'caches per county', income: 'income' };
function hqEffectText(m, L) { const fx = m.fx(L), out = []; for (const k in fx) { const v = fx[k], nm = MOD_NAMES[k] || k; if (ADD_KEYS.has(k)) { if (v) out.push(nm + ' +' + (Math.round(v * 100) / 100)); } else if (Math.abs(v - 1) > 0.001) out.push(nm + ' ' + (v > 1 ? '+' : '') + Math.round((v - 1) * 100) + '%'); } return out.join(', ') || 'nothing yet'; }
function renderHQ() {
  ensureMeta(); const used = hqUsed(), cap = hqCap(), on = HQ.online(); HQ.refresh(); const doc = save.hq.doc;
  $('hq-top').innerHTML = `<span class="${on ? 'pos' : 'neg'}">${on ? 'ONLINE' : 'OFFLINE - repair ' + HQ.county().name + ' COUNTY'}</span><span>RANK <b>${hqRank()}</b></span><span>SUPPLY LINES <b>${HQ.reach.size}</b></span><span>CAPACITY <b>${used}/${cap}</b></span><span>RESEARCH <b>${Math.floor(Meta.rp)}</b> RP</span>`;
  $('hq-doc').innerHTML = '<div class="ph">DOCTRINE</div><div class="hqhint">' + (doc ? 'Switching costs ' + DOC_SWITCH_RP + ' RP.' : 'Choose one. The first pick is free.') + '</div>' +
    Object.keys(DOCTRINES).map(id => { const D2 = DOCTRINES[id]; return `<button class="hqdoc ${doc === id ? 'sel' : ''}" data-doc="${id}" style="--c:${D2.c}"><b>${D2.n}</b><i>${D2.d}</i><em>${doc === id ? 'ACTIVE' : !doc ? 'CHOOSE (free)' : 'SWITCH - ' + DOC_SWITCH_RP + ' RP'}</em></button>`; }).join('');
  $('hq-grid').innerHTML = HQMODS.map(m => {
    const L = hqLevel(m.id), ord = ORDERS.some(o => o.mod === m.id && L >= o.lvl), nxBP = L >= 3 && L < HQ_MAXL && !save.items[m.bp];
    return `<button class="hqtile ${hqSel === m.id ? 'sel' : ''} ${L ? 'built' : ''}" data-m="${m.id}" style="--c:${m.c}"><b>${m.n}</b><span class="pips">${pips(L, HQ_MAXL)}</span><small>${L ? hqEffectText(m, L).split(',')[0] : 'not built'}</small>${ord ? '<u class="ordled" title="Unlocks an order"></u>' : ''}${nxBP ? '<u class="bpled" title="Needs a blueprint"></u>' : ''}</button>`;
  }).join('');
  const m = HQMODS.find(x => x.id === hqSel) || HQMODS[0], L = hqLevel(m.id), nx = L + 1, cost = hqCost(nx), hasBP = !!save.items[m.bp];
  const why = L >= HQ_MAXL ? 'MAXED' : nx >= 4 && !hasBP ? 'needs blueprint: ' + BLUEPRINTS[m.bp] : used + cost.cap > cap ? 'capacity short (needs ' + cost.cap + ')' : Meta.rp < cost.rp ? 'needs ' + cost.rp + ' RP' : '';
  const ord = ORDERS.filter(o => o.mod === m.id).map(o => `<span class="ordtag ${L >= o.lvl ? 'on' : ''}">${o.n}${L >= o.lvl ? '' : ' (L' + o.lvl + ')'}</span>`).join('');
  $('hq-info').innerHTML = `<div class="ph" style="color:${m.c}">DEPARTMENT</div><h3 style="color:${m.c}">${m.n}</h3><div class="pips big" style="color:${m.c}">${pips(L, HQ_MAXL)}</div><p>${m.d}</p>
    <div class="kv"><span>NOW</span><b>${L ? hqEffectText(m, L) : 'not built'}</b>${L < HQ_MAXL ? `<span>NEXT</span><b class="nx">${hqEffectText(m, nx)}</b>` : ''}<span>BLUEPRINT</span><b class="${hasBP ? 'pos' : ''}">${hasBP ? BLUEPRINTS[m.bp] : 'not found (needed for levels 4-5)'}</b></div>${ord ? `<div class="ordline">${ord}</div>` : ''}
    <div class="hqbtns"><button data-up="${m.id}" class="${why ? '' : 'primary'}" ${why ? 'disabled' : ''}>${L >= HQ_MAXL ? 'MAXED' : (L ? 'UPGRADE' : 'BUILD') + ' - ' + cost.rp + ' RP, ' + cost.cap + ' CAP'}</button><button data-down="${m.id}" ${L ? '' : 'disabled'} title="Refund the capacity and half the research">DOWNGRADE</button></div>${why && L < HQ_MAXL ? `<small class="hqwhy">${why}</small>` : ''}`;
  $('hq-orders').innerHTML = '<div class="ph">ORDERS</div><div class="hqhint">Called down inside a county. They need HQ online and cool down in real time.</div>' + ORDERS.map(o => { const lv = hqLevel(o.mod), un = lv >= o.lvl; return `<div class="ordrow ${un ? 'on' : ''}"><b>${o.n}</b><span>${un ? 'READY' : HQMODS.find(q => q.id === o.mod).n + ' L' + o.lvl}</span><i>${o.d(Math.max(1, lv))} Cooldown ${Math.round(Orders.cdMs(o) / 1000)}s.</i></div>`; }).join('');
  const have = Object.keys(BLUEPRINTS).filter(id => save.items[id]);
  $('hq-bp').innerHTML = '<div class="ph">BLUEPRINTS <span class="r">' + have.length + '/' + Object.keys(BLUEPRINTS).length + '</span></div><div class="bpwrap">' + Object.keys(BLUEPRINTS).map(id => `<span class="bp ${save.items[id] ? 'got' : ''}">${save.items[id] ? BLUEPRINTS[id] : '? ? ?'}</span>`).join('') + '</div><div class="hqhint">Found in glowing supply caches and Dimmer camps.</div>';
}
function openHQ() { if (!save.hq) { say('Restore your landing county first: it becomes your headquarters.'); return; } renderHQ(); $('hq').style.display = 'flex'; hqLoop(); }
$('hq-doc').onclick = async e => {
  const b = e.target.closest('[data-doc]'); if (!b || !save.hq) return; const id = b.dataset.doc, cur = save.hq.doc; if (cur === id) return;
  if (cur) { if (Meta.rp < DOC_SWITCH_RP) { say(`Switching doctrine costs ${DOC_SWITCH_RP} research points.`); return; } if (!await uiConfirm(`Change doctrine from ${DOCTRINES[cur].n} to ${DOCTRINES[id].n} for ${DOC_SWITCH_RP} research points?`, 'CHANGE DOCTRINE?', 'CHANGE', 'KEEP')) return; Meta.rp -= DOC_SWITCH_RP; Meta.dirty = true; Meta.save(); }
  save.hq.doc = id; recalcMods(); writeSave(); beep(440, 0.1, 'square', 0.05); beep(660, 0.14, 'square', 0.05, 0.1); renderHQ(); if (mapActive) updateStats();
};
$('hq-main').onclick = e => {
  const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]'), card = e.target.closest('[data-m]');
  if (up) { const m = HQMODS.find(x => x.id === up.dataset.up), L = hqLevel(m.id) + 1, c = hqCost(L); if (L > HQ_MAXL || Meta.rp < c.rp || hqUsed() + c.cap > hqCap() || (L >= 4 && !save.items[m.bp])) return;
    Meta.rp -= c.rp; Meta.dirty = true; Meta.save(); save.hq.mods[m.id] = L; hqSel = m.id; recalcMods(); writeSave(); beep(440, 0.1, 'square', 0.05); beep(660, 0.14, 'square', 0.05, 0.1); Objectives.check(); renderHQ(); if (mapActive) updateStats(); return; }
  if (down) { const m = HQMODS.find(x => x.id === down.dataset.down), L = hqLevel(m.id); if (!L) return; Meta.rp += Math.floor(hqCost(L).rp / 2); Meta.dirty = true; Meta.save();
    save.hq.mods[m.id] = L - 1; hqSel = m.id; recalcMods(); writeSave(); beep(300, 0.1, 'triangle'); renderHQ(); return; }
  if (card) { hqSel = card.dataset.m; renderHQ(); }
};
$('hq-close').onclick = () => { $('hq').style.display = 'none'; cancelAnimationFrame(hqAnim); };
const HQ_X = i => i < 5 ? 10 + i * 46 : 294 + (i - 5) * 46;
function hqLoop() {                                                // the campus: every department is a building that grows with its level; the tower rises with the whole HQ
  const cv = $('hq-cv'), g2 = cv.getContext('2d'); g2.imageSmoothingEnabled = false; const t = performance.now() / 1000, CW = 520, GY = 132;
  g2.fillStyle = '#0a080c'; g2.fillRect(0, 0, CW, 170);
  for (let i = 0; i < 50; i++) { g2.fillStyle = i % 3 ? '#2a2231' : '#5c4a4a'; g2.fillRect((i * 97) % CW, (i * 53) % 80, 1, 1); }
  g2.fillStyle = '#17131b'; g2.fillRect(0, GY, CW, 38); g2.fillStyle = '#3a3140'; g2.fillRect(0, GY, CW, 2);
  const on = HQ.online(), lit = on ? 1 : 0.25, dc = save.hq && save.hq.doc ? DOCTRINES[save.hq.doc].c : '#f5c95a', tw = 260, th = 36 + hqTotal() * 1.7;
  g2.globalAlpha = on ? 0.5 : 0.15;                               // power lines from the tower to every department
  HQMODS.forEach((m, i) => { const L = hqLevel(m.id), x = HQ_X(i) + 16; if (!L) return; g2.fillStyle = m.c; for (let k = 0; k < 6; k++) { const f = ((t * 0.5 + k / 6 + i * 0.13) % 1), px2 = i < 5 ? tw - 6 - (tw - 6 - x) * f : tw + 6 + (x - tw - 6) * f; g2.fillRect(px2, GY + 4 + (i % 3) * 3, 3, 1); } });
  g2.globalAlpha = 1;
  HQMODS.forEach((m, i) => {                                       // department buildings
    const L = hqLevel(m.id), x = HQ_X(i), h = 10 + L * 14, w = 32, sel = hqSel === m.id;
    g2.fillStyle = '#000'; g2.fillRect(x - 1, GY - h - 1, w + 2, h + 1); g2.fillStyle = L ? '#241d2b' : '#17131b'; g2.fillRect(x, GY - h, w, h);
    g2.fillStyle = m.c; g2.globalAlpha = L ? 0.9 : 0.25; g2.fillRect(x, GY - h, w, 2); g2.globalAlpha = 1;
    for (let k = 0; k < L * 3; k++) { const wx = x + 4 + (k % 3) * 9, wy = GY - h + 6 + ((k / 3) | 0) * 10; if (Math.sin(t * 2 + k * 1.7 + i) > -0.8) { g2.fillStyle = m.c; g2.globalAlpha = lit * 0.9; g2.fillRect(wx, wy, 5, 4); g2.globalAlpha = 1; } }
    if (L >= 4) { g2.fillStyle = m.c; g2.fillRect(x + w / 2 - 1, GY - h - 8, 2, 8); g2.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i); g2.fillRect(x + w / 2 - 2, GY - h - 10, 4, 2); g2.globalAlpha = 1; }
    if (ORDERS.some(o => o.mod === m.id && L >= o.lvl)) { g2.fillStyle = '#fff1b5'; g2.fillRect(x + w - 5, GY - h + 4, 3, 3); }
    if (sel) { g2.strokeStyle = '#f5c95a'; g2.strokeRect(x - 2.5, GY - h - 3.5, w + 5, h + 6); }
  });
  g2.fillStyle = '#000'; g2.fillRect(tw - 9, GY - th - 1, 18, th + 1); g2.fillStyle = '#3a3140'; g2.fillRect(tw - 8, GY - th, 16, th);   // the central tower
  for (let k = 0; k < Math.floor(th / 10); k++) { g2.fillStyle = dc; g2.globalAlpha = on ? 0.5 + 0.4 * Math.sin(t * 2 + k) : 0.15; g2.fillRect(tw - 5, GY - th + 6 + k * 10, 10, 2); } g2.globalAlpha = 1;
  g2.fillStyle = on ? dc : '#5c4a4a'; g2.fillRect(tw - 3, GY - th - 8, 6, 8);
  if (on) { g2.globalAlpha = 0.2 + 0.15 * Math.sin(t * 3); g2.fillStyle = dc; g2.fillRect(tw - 1, 0, 2, GY - th - 8); for (let r = 1; r <= 3; r++) { g2.globalAlpha = Math.max(0, 0.3 - ((t * 0.6 + r / 3) % 1) * 0.3); g2.fillRect(tw - 40 * ((t * 0.6 + r / 3) % 1) - 1, 8, 80 * ((t * 0.6 + r / 3) % 1) + 2, 1); } g2.globalAlpha = 1; }
  const n = Math.min(HQ.reach.size, 60);                           // the network: one dot per connected county along the ground
  for (let i = 0; i < n; i++) { g2.fillStyle = on ? dc : '#5c4a4a'; g2.globalAlpha = on ? 0.35 + 0.5 * Math.max(0, Math.sin(t * 3 - i * 0.5)) : 0.3; g2.fillRect(8 + i * 8.4, 150, 4, 3); } g2.globalAlpha = 1;
  g2.fillStyle = '#5c4a4a'; g2.font = '8px monospace'; g2.fillText(HQ.reach.size + ' COUNTIES ON THE LINE', 8, 164);
  if ($('hq').style.display === 'flex') hqAnim = requestAnimationFrame(hqLoop);
}
$('hq-cv').onclick = e => { const r = $('hq-cv').getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 520; let i = -1; for (let k = 0; k < HQMODS.length; k++) if (x >= HQ_X(k) - 3 && x <= HQ_X(k) + 35) i = k; if (i >= 0) { hqSel = HQMODS[i].id; renderHQ(); } };
$('btn-hq').onclick = openHQ; $('btn-skills').onclick = openSkills; $('hq-open').onclick = openHQ;
