'use strict';
// ============================================================
//  WORLD.JS - the political layer that ties the counties together.
//   * difficulty (SETTLER ... BLACKOUT)
//   * factions: trust, compacts and perks - plus the Dimmers' own diplomacy
//   * border control (open / checkpoint / closed) for every frontier
//   * station links with levels and stability, and multi-hop imports
//   * the UNION: a unity score that unlocks tiers and the true ending
//   * map views, keyboard shortcuts, settings, wide mode
//  Loaded after campaign.js (it uses `save`, `US`, `isLit` ...) and before story.js.
//  All numbers live in data.js (DIFFS, FACTIONS, TIERS, LINK_LV, BORDER_FX).
// ============================================================

const D = () => DIFFS[save.diff == null ? 1 : save.diff] || DIFFS[1];
const fac = id => (save.fac[id] = save.fac[id] || { t: id === 'compact' ? 35 : id === 'dimmers' ? 0 : 15, signed: 0 });
const cName = cn => COUNTRY_NAME[cn] || cn;
const BKEY = (a, b) => a < b ? a + '-' + b : b + '-' + a;
const LKEY = BKEY;
const FAC_COUNTRIES = { compact: ['US'], syndicate: ['US'], north: ['CA', 'AK'], sur: ['MX'], seas: ['CM', 'CB'], sila: ['GL'], andes: ['SA'], euro: ['EU'] };
let backupNagged = false, wDirty = false, facDirty = true, mapView = 'status', liveLinks = [], wtick = 0, mapToastT = 0;

// ---------- news, announcements ----------
function news(text) { save.news = save.news || []; save.news.push({ t: Date.now(), text }); if (save.news.length > 40) save.news.shift(); }
function mapToast(text) { const el = $('maptoast'); if (!el) return; el.textContent = text; el.classList.add('show'); clearTimeout(mapToastT); mapToastT = setTimeout(() => el.classList.remove('show'), 6500); }
function say(text, snd) {
  news(text);
  if (mapActive) { $('mapmsg').textContent = text; mapToast(text); wDirty = true; } else if (Builder.active) toast(text);
  if (snd) beep(150, 0.35, 'sawtooth', 0.04);
}

// ---------- factions ----------
function facOf(c) {
  const cn = c.country;
  if (cn === 'CA' || cn === 'AK') return 'north';
  if (cn === 'MX') return 'sur';
  if (cn === 'CM' || cn === 'CB') return 'seas';
  if (cn === 'GL') return 'sila';
  if (cn === 'SA') return 'andes';
  if (cn === 'EU') return 'euro';
  return c.lon > -101 ? 'compact' : 'syndicate';
}
let FAC_C = null;
function facCounties(id) { if (!FAC_C) { FAC_C = {}; FAC_IDS.forEach(f => { FAC_C[f] = []; }); US.counties.forEach(c => FAC_C[facOf(c)].push(c)); } return FAC_C[id]; }
function facStats(id) {
  let rest = 0, lit = 0, out = 0, dark = 0; const cs = facCounties(id);
  for (const c of cs) { if (isRestored(c)) rest++; if (isLit(c)) lit++; if (save.outage[c.id]) out++; if (save.dark[c.id]) dark++; }
  return { n: cs.length, rest, lit, out, dark };
}
function facWord(id) { const f = fac(id); return f.signed ? 'ALLIED' : f.t >= 50 ? 'FRIENDLY' : f.t >= 25 ? 'NEUTRAL' : 'WARY'; }
function borderFactor(id) {
  const cs = FAC_COUNTRIES[id], ps = borderPairs().filter(k => k.split('-').some(x => cs.includes(x)));
  if (!ps.length) return 1;
  const w = { open: 1.25, check: 1, closed: 0.3 };
  return ps.reduce((s, k) => { const [a, b] = k.split('-'); return s + w[borderMode(a, b)]; }, 0) / ps.length;
}
const dimTruce = () => fac('dimmers').t >= 50;

// ---------- borders ----------
let BPAIRS = null, XEDGES = null;
function borderPairs() {
  if (!BPAIRS) { const s = new Set(); US.edges.forEach(([a, b]) => { const A = US.counties[a].country, B = US.counties[b].country; if (A !== B) s.add(BKEY(A, B)); }); BPAIRS = [...s].sort(); }
  return BPAIRS;
}
const crossEdges = () => XEDGES || (XEDGES = US.edges.filter(([a, b]) => US.counties[a].country !== US.counties[b].country));
const borderMode = (a, b) => a === b ? 'open' : ((save.borders || {})[BKEY(a, b)] || 'check');
const crossOK = (a, b) => borderMode(a, b) !== 'closed';
function setBorder(k, m) {
  save.borders = save.borders || {}; const was = save.borders[k] || 'check'; if (was === m) return;
  save.borders[k] = m; const [a, b] = k.split('-');
  say(`BORDER ${cName(a)} / ${cName(b)}: ${BORDER_FX[m].n}. ${BORDER_FX[m].d}`);
  const litA = US.counties.some(c => c.country === a && isLit(c)), litB = US.counties.some(c => c.country === b && isLit(c));
  if (litA && litB) { if (m === 'closed' && was !== 'closed') Story.event('border-closed'); else if (m === 'open' && was === 'closed') Story.event('border-open'); }       // only for a border that matters, and only a real change
  facDirty = true; wDirty = true; writeSave(); refreshLinks(); afterChange(); storySoon();
}
const nextMode = m => m === 'open' ? 'check' : m === 'check' ? 'closed' : 'open';

// ---------- station links ----------
const active = id => { const c = US.counties[id]; return isLit(c) && !!save.stationOn[id] && !save.outage[id]; };
const linkClass = st => st >= 60 ? 'STABLE' : st >= 25 ? 'UNSTABLE' : 'DROPPED';
const linkM = st => st >= 92 ? 1.1 : st >= 60 ? 1 : st >= 25 ? 0.5 : 0;
const linkLive = (a, b) => active(a) && active(b) && crossOK(US.counties[a].country, US.counties[b].country);
const exportPct = id => save.exportPct && save.exportPct[id] != null ? save.exportPct[id] : 1;
function getLink(a, b) { const k = LKEY(a, b); return save.links[k] || (save.links[k] = { lv: 1, st: 75, on: 1 }); }
function refreshLinks() {
  HQ.at = 0; liveLinks = [];
  for (const [a, b] of US.edges) if (linkLive(a, b)) liveLinks.push({ a, b, key: LKEY(a, b), L: getLink(a, b) });
}
function linkColor(a, b) {                                    // colour of a station link on the baked map (-1 = none)
  if (!linkLive(a, b)) return -1; const st = getLink(a, b).st;
  return st >= 60 ? 15 : st >= 25 ? 7 : 5;
}
const darkAdj = id => { let n = 0; for (const x of US.counties[id].nb) if (save.dark[x]) n++; return n; };
const storySoon = () => setTimeout(() => { if (typeof Scenes !== 'undefined' && Scenes.is('map') && !overlayOpen()) Story.check(); }, 800);
function linkChanged(a, b, was, now) {
  const A = US.counties[a], B = US.counties[b];
  if (now === 'DROPPED') { say(`LINK DROPPED between ${A.name} and ${B.name}. Imports there have stopped - fix it in the UNION screen.`, true); Story.event('link-drop'); storySoon(); }
  else if (now === 'UNSTABLE' && was === 'STABLE') { say(`LINK UNSTABLE: ${A.name} / ${B.name} is flickering. Reinforce or upgrade it.`); Story.event('link-unstable'); storySoon(); }
  else if (now === 'STABLE') news(`The link between ${A.name} and ${B.name} is stable again.`);
}
function linkStorm() {
  const pool = liveLinks.filter(l => l.L.lv < 3); if (liveLinks.length < 2 || !pool.length) return;
  const l = pool[Math.random() * pool.length | 0], A = US.counties[l.a], B = US.counties[l.b], hit = l.L.lv === 1 ? 28 : 14;
  l.L.st = Math.max(Math.min(l.L.st, 28), l.L.st - hit);                       // a storm can fray a link but never drop it outright
  say(`STORM on the ${A.name} / ${B.name} line: stability down ${hit} points.`);
}
function reinforce(key) { const L = save.links[key]; if (!L) return false; if (!spend(6)) return false; L.st = Math.min(100, L.st + 35); return true; }
function upgradeLink(key) {
  const L = save.links[key]; if (!L || L.lv >= 3) return false; const cost = LINK_LV[L.lv].up; if (!spend(cost)) return false;
  L.lv++; L.st = Math.min(100, L.st + 20); Story.event('link-upgrade'); return true;
}
function spend(rp) { if (Meta.rp < rp) { unMsg(`Not enough research points: that needs ${rp} RP.`); return false; } Meta.rp -= rp; Meta.dirty = true; Meta.save(); return true; }

// imports for a county: its own neighbours' surplus, plus stations further along stable links (up to WMOD.depth hops)
function hopEff(a, b) {
  const A = US.counties[a], B = US.counties[b], bm = BORDER_FX[borderMode(A.country, B.country)].imp;
  if (!(active(a) && active(b))) return 0.6 * bm;             // a county without a station yet just takes the offered feed
  const L = getLink(a, b); return LINK_LV[L.lv - 1].eff * linkM(L.st) * bm;
}
function netImports(c) {
  const r = { p: 0, w: 0, n: 0, links: 0, list: [] }, best = new Map();
  const go = (cur, eff, hop, seen) => {
    if (hop > WMOD.depth) return;
    for (const n of US.counties[cur].nb) {
      if (seen.has(n) || !active(n)) continue;
      const e = eff * hopEff(cur, n); if (e <= 0.03) continue;
      if (!best.has(n) || best.get(n).eff < e) best.set(n, { eff: e, hop });
      seen.add(n); go(n, e, hop + 1, seen); seen.delete(n);
    }
  };
  go(c.id, 1, 1, new Set([c.id]));
  best.forEach((v, n) => {
    const sur = save.surplus[n]; if (!sur || sur.p + sur.w + sur.n < 0.5) return;
    const k = v.eff * exportPct(n) * (1 + WMOD.imp);
    r.p += sur.p * k; r.w += sur.w * k; r.n += sur.n * k; r.links++; r.list.push({ name: US.counties[n].name, hop: v.hop, eff: v.eff });
  });
  r.list.sort((x, y) => y.eff - x.eff);
  return r;
}

// ---------- unity ----------
let UC = { t: 0, v: null };
function unity() {
  const now = Date.now(); if (UC.v && now - UC.t < 700) return UC.v;
  const euOpen = US.counties.some(c => c.country === 'EU' && isLit(c)) || (typeof continentDone === 'function' && (continentDone('NA') || continentDone('SA')));
  const all = euOpen ? US.counties.length : US.counties.filter(c => c.country !== 'EU').length, litBy = {}; let lit = 0, restored = 0;      // Europe only counts once it is reachable
  for (const c of US.counties) { if (isLit(c)) { lit++; litBy[c.country] = 1; } if (isRestored(c)) restored++; }
  const stable = liveLinks.filter(l => l.L.st >= 60).length, need = Math.max(4, restored * 0.45);
  const cov = lit / all, lnk = restored < 2 ? 0 : Math.min(1, stable / need);
  const accN = FAC_IDS.filter(id => fac(id).signed).length + (fac('dimmers').t >= 50 ? 1 : 0), acc = accN / ((euOpen ? FAC_IDS.length : FAC_IDS.length - 1) + 1);
  const bp = borderPairs().filter(k => k.split('-').every(x => litBy[x])), val = { open: 1, check: 0.65, closed: 0 };
  const bor = bp.length ? bp.reduce((s, k) => s + val[borderMode(...k.split('-'))], 0) / bp.length : 0;
  const pct = 25 * (cov + lnk + acc + bor); let tier = 0; TIERS.forEach((t, i) => { if (pct >= t.min) tier = i; });
  if (tier === 5 && restored < all) tier = 4;
  UC = { t: now, v: { pct, tier, cov, lnk, acc, bor, stable, nLinks: liveLinks.length, accN, restored, all } };
  return UC.v;
}
function recalcMods() {
  const d = D(), u = unity().tier;
  const m = { wear: d.wear, inc: 1, def: 1, scrap: 1 + 0.04 * u, linkRegen: 0.1 * Math.max(0, u - 1), imp: 0, rpMin: u >= 3 ? 1 : 0, depth: u >= 3 ? 3 : 2, ev: d.ev, raid: d.raid };
  FAC_IDS.forEach(id => {
    if (!fac(id).signed) return; const k = FACTIONS[id].mod;
    if (k.scrap) m.scrap += k.scrap; if (k.rpMin) m.rpMin += k.rpMin; if (k.linkRegen) m.linkRegen += k.linkRegen; if (k.wear) m.wear *= k.wear;
    if (k.inc) m.inc *= k.inc; if (k.imp) m.imp += k.imp; if (k.def) m.def *= k.def;
  });
  if (fac('dimmers').signed) { m.def *= 1.3; m.linkRegen += 0.2; }
  { const g = Mods.world(); m.imp += g.imp || 0; m.linkRegen += g.linkRegen || 0; m.def *= g.raid || 1; }
  WMOD = m; return m;
}
function checkTier() {
  const u = unity(); recalcMods();
  if (u.tier > (save.unionTier || 0)) {
    save.unionTier = u.tier; writeSave(); say(`THE UNION GROWS: ${TIERS[u.tier].n}. ${TIERS[u.tier].d}`);
    if (u.tier >= 1 && u.tier <= 4) Story.event('union-' + u.tier);
  }
  return u;
}

// ---------- the once-a-second world tick ----------
function worldTick() {
  if (save.start < 0) return; wtick++;
  const d = D(), regenMul = 1 + WMOD.linkRegen, MW = Mods.world();
  for (const [a, b] of US.edges) {                              // link stability
    const key = LKEY(a, b), live = linkLive(a, b); let L = save.links[key];
    if (!live) { if (L) L.on = 0; continue; }
    if (!L) L = getLink(a, b);
    if (!L.on) { L.on = 1; L.st = Math.min(L.st, 50); wDirty = true; }
    const A = US.counties[a], B = US.counties[b], cross = A.country !== B.country, jam = darkAdj(a) + darkAdj(b);
    const regen = LINK_LV[L.lv - 1].regen * regenMul * (cross && borderMode(A.country, B.country) === 'check' ? 0.8 : 1);
    const drag = (L.lv >= 3 ? 0 : 0.22 * jam * d.linkDecay) + (cross ? 0.02 : 0) * d.linkDecay + 0.03 * d.linkDecay;
    const was = linkClass(L.st); L.st = Math.max(2, Math.min(100, L.st + regen - drag)); const now = linkClass(L.st);
    if (now !== was) { wDirty = true; linkChanged(a, b, was, now); }
  }
  if (eventsOn && wtick % 5 === 0) {                           // storms fray the weakest class of link now and then
    const t = Date.now(); if (!save.nextLinkEv) save.nextLinkEv = t + 240000 * d.ev;
    else if (t > save.nextLinkEv) { save.nextLinkEv = t + (240 + Math.random() * 180) * 1000 * d.ev; linkStorm(); wDirty = true; }
  }
  for (const id of FAC_IDS) {                                  // faction trust
    const f = fac(id), st = facStats(id), fr = st.rest / Math.max(1, st.n), cap = st.rest > 0 ? 100 : 40;
    let g = (0.012 + 0.07 * fr + (st.rest > 0 ? 0.01 : 0)) * d.trust * borderFactor(id) * (MW.trust || 1);
    g -= st.out * 0.02 + st.dark * 0.008; if (f.signed) g = Math.max(0, g);
    f.t = Math.max(0, Math.min(cap, f.t + g));
    if (f.t >= 50 && !f.friendly) { f.friendly = 1; say(`${FACTIONS[id].name} now trusts you. You can sign a compact with them in the UNION screen.`); }
  }
  const dm = fac('dimmers'); if (dm.t > 0 && !dm.signed && dm.t < 50) dm.t = Math.max(0, dm.t - 0.004);
  if (dm.t >= 50 && !dm.truce) { dm.truce = 1; say('THE DIMMERS HAVE AGREED TO A TRUCE. They will hold their ground.'); Story.event('dim-truce'); }
  if (dm.t < 40 && dm.truce) dm.truce = 0;
  let toll = 0; const litBy = {}; US.counties.forEach(c => { if (isLit(c)) litBy[c.country] = 1; });
  borderPairs().forEach(k => { const [a, b] = k.split('-'); if (litBy[a] && litBy[b]) toll += BORDER_FX[borderMode(a, b)].toll; });
  Meta.rp += toll + WMOD.rpMin / 60; if (toll || WMOD.rpMin) Meta.dirty = true; if (wtick % 10 === 0 && Meta.dirty) Meta.save();
  if (wtick % 5 === 0) Contracts.tick();
  if (wtick % 10 === 0) { HQ.check(); checkAwards(); Objectives.check(); }
  if (wtick % 5 === 0) { refreshLinks(); checkTier(); if (wDirty && mapActive && !anim) { wDirty = false; bakeMap(); updateStats(); } }
  if (mapActive && !Story.cur && !anim) { if (Story.queue.length) Story.pump(); else if (save.pending && Object.keys(save.pending).length && !overlayOpen()) Story.check(); }      // waiting stories play at the next quiet moment on the map
  if (Scenes.cur !== 'menu') save.play = (save.play || 0) + 1;
  if (mapActive && !backupNagged && (save.play || 0) - (save.lastBackup || 0) > 3600) { backupNagged = true; say('It has been an hour since your last backup. Settings > EXPORT SAVE keeps your campaign safe.'); }
  if (wtick % 15 === 0) writeSave();
}

// ---------- Dimmer expansion (replaces the old tickDark) ----------
function worldDark() {
  if (!eventsOn || save.start < 0) return;
  const now = Date.now(), d = D(), all = US.counties, usC = all.filter(c => c.country === 'US'), lit = usC.filter(isLit).length;
  if (lit < 3) return;
  if (!save.nextDark) { save.nextDark = now + 90000 * d.dark; writeSave(); return; }
  if (now < save.nextDark) return;
  save.nextDark = now + (200 + Math.random() * 120) * 1000 * d.dark * (unity().tier >= 4 ? 2 : 1);
  if (dimTruce()) { news('The Dimmers keep to their truce.'); return; }
  const cap = Math.max(3, Math.round((usDone() ? all.length * 0.6 : usC.length) * d.darkCap));
  const crossRoll = (a, b) => a === b || Math.random() < BORDER_FX[borderMode(a, b)].cross;
  if (!darkCount()) {
    const far = usC.filter(c => !isLit(c) && hopsFromStart(c.id) >= 5 && !c.nb.some(n => isLit(US.counties[n])));
    if (!far.length) return;
    const c = far[Math.random() * far.length | 0]; save.dark[c.id] = 1; const wn = newWarlord(c.id); writeSave();
    announceDark(`THE DIMMERS HAVE CLAIMED ${c.name} COUNTY, ${US.states[c.state].ab}. WARLORD ${wn} leads them. They will spread unless you push them back.`); Story.event('dark'); if (mapActive) Story.check(); return;
  }
  const keys = Object.keys(save.dark).map(Number), src = US.counties[keys[Math.random() * keys.length | 0]];
  const here = Builder.active ? countyId : -1;                                  // never sabotage the county you are standing in
  const victims = src.nb.map(n => US.counties[n]).filter(o => o.id !== here && isRestored(o) && !save.outage[o.id] && Builder.hasSave(o.id) && crossRoll(src.country, o.country));
  if (victims.length && !fac('dimmers').signed && outageCount() < outageCap() && Math.random() < 0.45) {
    const v = victims[Math.random() * victims.length | 0]; save.outage[v.id] = 1; save.support[v.id] = (save.support[v.id] || 0) * 0.5; writeSave();
    announceDark(`DIMMER SABOTAGE at ${v.name} COUNTY! Its grid is down - go back and repair it.`); Story.event('sabotage'); trustHit(facOf(v), 4); return;
  }
  if (darkCount() >= cap) return;
  const free = src.nb.map(n => US.counties[n]).filter(o => !isLit(o) && !save.dark[o.id] && (o.country === 'US' || usDone()) && crossRoll(src.country, o.country));
  if (!free.length) return;
  const o = free[Math.random() * free.length | 0]; save.dark[o.id] = 1; save.wl = save.wl || {}; if (save.wl[src.id]) save.wl[o.id] = save.wl[src.id]; writeSave();
  announceDark(`THE DIMMERS SPREAD TO ${o.name} COUNTY, ${US.states[o.state].ab}${save.wl[o.id] ? ' (WARLORD ' + save.wl[o.id] + ')' : ''}.`);
}
function trustHit(id, n) { const f = fac(id); if (!f.signed) f.t = Math.max(0, f.t - n); }

// ---------- map: view modes, faction tint, links, border gates ----------
const facCv = document.createElement('canvas'); facCv.width = MVW; facCv.height = MVH;
const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function bakeFac() {
  const k = facCv.getContext('2d'), img = k.createImageData(MVW, MVH), dd = img.data, rgb = {}; FAC_IDS.forEach(id => { rgb[id] = hex2(FACTIONS[id].color); });
  for (let i = 0; i < US.GW * US.GH; i++) {
    const cid = US.countyOf[i]; if (cid < 0) continue;
    const f = facOf(US.counties[cid]), o = i * 4, col = rgb[f]; dd[o] = col[0]; dd[o + 1] = col[1]; dd[o + 2] = col[2]; dd[o + 3] = fac(f).signed ? 170 : 105;
  }
  k.putImageData(img, 0, 0); facDirty = false;
}
function worldUnder(mg, t) {
  if (mapView === 'fac') { if (facDirty) bakeFac(); mg.drawImage(facCv, 0, 0); }
  else if (mapView === 'links') { mg.fillStyle = 'rgba(13,11,14,.62)'; mg.fillRect(0, 0, MVW, MVH); }
}
function worldDraw(mg, P, t) {
  const col = c => PAL[c];
  for (const l of liveLinks) {                                  // animated packets along every live station link
    const A = US.counties[l.a], B = US.counties[l.b], cl = linkClass(l.L.st), c = cl === 'STABLE' ? 15 : cl === 'UNSTABLE' ? 7 : 5;
    if (mapView === 'links') { mg.strokeStyle = col(c); mg.lineWidth = 0.8 + l.L.lv * 0.5; mg.globalAlpha = cl === 'DROPPED' ? 0.5 : 0.9; mg.beginPath(); mg.moveTo(A.px + 0.5, A.py + 1.5); mg.lineTo(B.px + 0.5, B.py + 1.5); mg.stroke(); mg.globalAlpha = 1; }
    if (cl === 'DROPPED') { if (Math.sin(t * 4 + l.a) > 0.6) { const k = (l.a * 0.37 + t * 0.2) % 1; P(Math.round(A.px + (B.px - A.px) * k), Math.round(A.py + (B.py - A.py) * k) + 1, 1, 1, 5); } continue; }
    const n = l.L.lv + 1, sp = (cl === 'STABLE' ? 0.32 : 0.14) + l.L.lv * 0.06;
    for (let i = 0; i < n; i++) {
      if (cl === 'UNSTABLE' && Math.sin(t * 9 + i * 2 + l.a) < -0.2) continue;
      const k = (t * sp + i / n + l.a * 0.13) % 1; P(Math.round(A.px + (B.px - A.px) * k), Math.round(A.py + (B.py - A.py) * k) + 1, 1, 1, c === 15 ? 8 : c);
    }
  }
  if (save.hq && HQ.online() && mapView !== 'fac') {                              // supply lines: gold threads from HQ along the lit ground it reaches
    if (Date.now() - HQ.at > 4000) HQ.refresh(); const ks = Object.keys(HQ.par);
    mg.strokeStyle = PAL[7]; mg.lineWidth = 0.6; mg.globalAlpha = 0.3; mg.beginPath();
    for (const k of ks) { const a = US.counties[+k], b = US.counties[HQ.par[k]]; mg.moveTo(a.px + 0.5, a.py + 1.5); mg.lineTo(b.px + 0.5, b.py + 1.5); }
    mg.stroke(); mg.globalAlpha = 1;
    if (ks.length < 400) for (const k of ks) { const a = US.counties[+k], b = US.counties[HQ.par[k]], f = 1 - ((t * 0.25 + (+k) * 0.137) % 1); P(Math.round(a.px + (b.px - a.px) * f), Math.round(a.py + (b.py - a.py) * f) + 1, 1, 1, 7); }
  }
  if (save.hq) { const H = US.counties[save.start], pu = Math.floor(t * 3) % 2; P(H.px - 3, H.py - 3, 7, 7, 0); P(H.px - 2, H.py - 2, 5, 5, pu ? 8 : 6); P(H.px - 1, H.py - 1, 3, 3, 0); P(H.px, H.py, 1, 1, 8); }       // the headquarters
  if (mapView === 'status' && cam.z < 1.2) return;
  for (const [a, b] of crossEdges()) {                          // border gates
    const A = US.counties[a], B = US.counties[b]; if (mapView !== 'links' && !isLit(A) && !isLit(B) && !(selected === a || selected === b)) continue;
    const m = borderMode(A.country, B.country), x = Math.round((A.px + B.px) / 2), y = Math.round((A.py + B.py) / 2);
    if (Math.hypot(A.px - B.px, A.py - B.py) > 60) continue;    // long sea links get no gate
    if (m === 'open') { P(x - 1, y - 1, 3, 3, 0); P(x, y, 1, 1, 11); }
    else if (m === 'check') { P(x - 2, y - 1, 5, 3, 0); P(x - 2, y, 5, 1, 7); P(x - 2, y - 1, 1, 3, 6); P(x + 2, y - 1, 1, 3, 6); }
    else { P(x - 2, y - 2, 5, 5, 0); for (let i = -1; i <= 1; i++) { P(x + i, y + i, 1, 1, 5); P(x + i, y - i, 1, 1, 5); } }
  }
}
function hoverText(c) {
  const F = FACTIONS[facOf(c)], myL = liveLinks.filter(l => l.a === c.id || l.b === c.id);
  let s = `${c.name} CO. - ${US.states[c.state].ab} - ${statusOf(c).toUpperCase()} - ${F.name}`;
  if (save.hq && c.id === save.start) s += ' - HEADQUARTERS';
  if (save.dark[c.id] && save.wl && save.wl[c.id]) s += ' - WARLORD ' + save.wl[c.id];
  { const t = traitOf(c); if (t) s += ` - ${TRAITS[t].n}`; }
  if (myL.length) { const w = myL.reduce((m, l) => Math.min(m, l.L.st), 100); s += ` - ${myL.length} LINK${myL.length > 1 ? 'S' : ''} (${linkClass(w)})`; }
  return s;
}
function setMapView(v) {
  mapView = v; document.querySelectorAll('#viewmap button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('legend2').style.display = v === 'fac' ? 'grid' : 'none'; $('legend').style.display = v === 'fac' ? 'none' : 'grid';
  if (v === 'fac') { facDirty = true; $('legend2').innerHTML = FAC_IDS.map(id => `<i style="background:${FACTIONS[id].color}"></i><span>${FACTIONS[id].name} - ${facWord(id)}</span>`).join('') + `<i style="background:${DIMMER_FAC.color}"></i><span>THE DIMMERS - ${fac('dimmers').signed ? 'KEEPERS' : dimTruce() ? 'TRUCE' : 'HOSTILE'}</span>`; }
}
document.querySelectorAll('#viewmap button').forEach(b => { b.onclick = () => setMapView(b.dataset.v); });

// ---------- the county panel extras (faction, links, export, border) ----------
function countyExtra(c) {
  const f = facOf(c), F = FACTIONS[f]; let h = `<div class="cx"><span style="color:${F.color}">${F.name}</span> <small>${facWord(f)}</small></div>`;
  if (isLit(c) && save.stationOn[c.id]) {
    const ex = exportPct(c.id); h += `<div class="cx">EXPORT SURPLUS <button data-ex="1" class="mini">${ex >= 1 ? 'FULL' : ex > 0 ? 'HALF' : 'OFF'}</button></div>`;
    liveLinks.filter(l => l.a === c.id || l.b === c.id).forEach(l => {
      const o = US.counties[l.a === c.id ? l.b : l.a], cl = linkClass(l.L.st);
      h += `<div class="cx lk">&rarr; ${o.name} <b class="${cl === 'STABLE' ? 'pos' : cl === 'DROPPED' ? 'neg' : 'warn'}">${LINK_LV[l.L.lv - 1].n} ${Math.round(l.L.st)}% ${cl}</b></div>`;
    });
  }
  [...new Set(c.nb.map(n => US.counties[n].country).filter(x => x !== c.country))].forEach(cn => {
    const m = borderMode(c.country, cn); h += `<div class="cx">BORDER ${cName(c.country)} / ${cName(cn)} <button data-bd="${BKEY(c.country, cn)}" class="mini ${m}">${BORDER_FX[m].n}</button></div>`;
  });
  return h;
}
$('cextra').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ex) { const id = selected; if (id < 0) return; const v = exportPct(id); save.exportPct = save.exportPct || {}; save.exportPct[id] = v >= 1 ? 0.5 : v > 0 ? 0 : 1; writeSave(); updatePanel(); }
  if (b.dataset.bd) { const k = b.dataset.bd, [a, c2] = k.split('-'); setBorder(k, nextMode(borderMode(a, c2))); }
});

// ---------- the UNION screen ----------
const bar = (pct, col) => `<div class="ub"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${col || 'var(--rad)'}"></i></div>`;
function unMsg(t) { const el = $('un-msg'); if (el) el.textContent = t; }
function renderUnion() {
  const u = unity(), body = $('un-body'), top = body.scrollTop, m = WMOD, perks = [];
  if (m.scrap > 1.001) perks.push(`+${Math.round((m.scrap - 1) * 100)}% start scrap`); if (m.rpMin) perks.push(`+${m.rpMin} RP/min`); if (m.linkRegen > 0) perks.push(`links recover +${Math.round(m.linkRegen * 100)}%`);
  if (m.wear < 0.99 && m.wear < D().wear) perks.push(`wear x${(m.wear / D().wear).toFixed(2)}`); if (m.inc > 1) perks.push(`+${Math.round((m.inc - 1) * 100)}% income`); if (m.imp) perks.push(`+${Math.round(m.imp * 100)}% imports`);
  perks.push(`power reaches ${m.depth} hops`); if (m.def > 1.01) perks.push(`raids x${m.def.toFixed(2)} rarer`);
  const T = TIERS[u.tier], nxt = TIERS[u.tier + 1];
  const head = `<div class="un-top"><div class="un-big">UNITY <b>${Math.round(u.pct)}%</b></div><div class="un-tier">TIER ${u.tier} - ${T.n}</div></div>
    <div class="un-bigbar">${bar(u.pct, 'linear-gradient(90deg,#4f7a4a,#f5c95a)')}${TIERS.slice(1).map(t => `<span class="tk" style="left:${t.min}%"><i></i><small>${t.n}</small></span>`).join('')}</div>
    <p class="un-desc">${T.d}${nxt ? ` Next: ${nxt.n} at ${nxt.min}%.` : ''}</p>
    <div class="un-parts">
      <div><span>COVERAGE</span>${bar(u.cov * 100)}<b>${Math.round(u.cov * 25)}/25</b></div><div><span>STABLE LINKS</span>${bar(u.lnk * 100, 'var(--volt)')}<b>${Math.round(u.lnk * 25)}/25</b></div>
      <div><span>ACCORDS</span>${bar(u.acc * 100, '#b59cf0')}<b>${Math.round(u.acc * 25)}/25</b></div><div><span>OPEN BORDERS</span>${bar(u.bor * 100, 'var(--amber)')}<b>${Math.round(u.bor * 25)}/25</b></div>
    </div><div class="un-perks">ACTIVE: ${perks.join(' - ')}</div>`;
  // factions
  const fcard = id => {
    const F = FACTIONS[id], f = fac(id), st = facStats(id), word = st.rest === 0 && !f.signed ? 'NOT CONTACTED' : facWord(id);
    let act = '';
    if (f.signed) act = '<span class="pos">COMPACT SIGNED</span>';
    else if (st.rest === 0) act = `<small>Restore a county in ${F.region} to make contact.</small>`;
    else act = `<button data-act="sign" data-id="${id}" ${f.t >= 60 ? '' : 'disabled'}>SIGN COMPACT - ${F.cost} RP</button>${f.t < 60 ? '<small> needs 60 trust</small>' : ''}`;
    return `<div class="fc" style="--c:${F.color}"><div class="fh"><b>${F.name}</b><span>${word}</span></div><small>${F.region.toUpperCase()} - ${st.rest}/${st.n} RESTORED${st.out ? ` - <span class="neg">${st.out} OUTAGE</span>` : ''}</small>${bar(f.t, F.color)}<small class="pk">${F.perk}</small><div class="fa">${act}</div></div>`;
  };
  const dm = fac('dimmers'), dword = dm.signed ? 'KEEPERS' : dm.t >= 50 ? 'TRUCE' : dm.t >= 20 ? 'LISTENING' : 'HOSTILE', cd = Math.max(0, Math.ceil(((dm.cd || 0) - Date.now()) / 1000));
  const dcard = `<div class="fc" style="--c:${DIMMER_FAC.color}"><div class="fh"><b>${DIMMER_FAC.name}</b><span>${dword}</span></div><small>HELD COUNTIES: ${darkCount()}</small>${bar(dm.t, DIMMER_FAC.color)}
    <small class="pk">Talks build trust: at 50 they keep a truce and stop spreading, at 70 you can make them Keepers of the grid. Liberating their counties costs trust.</small>
    <div class="fa"><button data-act="talks" ${cd ? 'disabled' : ''}>HOLD TALKS - 30 RP${cd ? ' (' + cd + 's)' : ''}</button> ${dm.signed ? '<span class="pos">KEEPERS</span>' : `<button data-act="keepers" ${dm.t >= 70 ? '' : 'disabled'}>MAKE THEM KEEPERS - 40 RP</button>`}</div></div>`;
  // borders
  const bcol = borderPairs().map(k => {
    const [a, b] = k.split('-'), mode = borderMode(a, b);
    return `<div class="bd"><b>${cName(a)} / ${cName(b)}</b><div class="seg">${['open', 'check', 'closed'].map(x => `<button data-act="border" data-k="${k}" data-m="${x}" class="${mode === x ? 'on' : ''}">${BORDER_FX[x].n}</button>`).join('')}</div><small>${BORDER_FX[mode].d}</small></div>`;
  }).join('');
  // links
  const ls = liveLinks.slice().sort((x, y) => x.L.st - y.L.st), weak = ls.filter(l => l.L.st < 60).length;
  const lcol = ls.slice(0, 14).map(l => {
    const A = US.counties[l.a], B = US.counties[l.b], cl = linkClass(l.L.st), lv = LINK_LV[l.L.lv - 1];
    return `<div class="lk2"><div class="lh"><b>${A.name} / ${B.name}</b><span class="${cl === 'STABLE' ? 'pos' : cl === 'DROPPED' ? 'neg' : 'warn'}">${cl}</span></div>${bar(l.L.st, cl === 'STABLE' ? 'var(--rad)' : cl === 'UNSTABLE' ? 'var(--glow)' : 'var(--rust)')}
      <div class="la"><small>${lv.n} - ${Math.round(l.L.st)}% - x${lv.cap} capacity</small><span><button data-act="reinf" data-k="${l.key}">FIX 6RP</button>${l.L.lv < 3 ? `<button data-act="upg" data-k="${l.key}">UP ${LINK_LV[l.L.lv].up}RP</button>` : ''}</span></div></div>`;
  }).join('') || '<p class="dim">No live links yet. Restore a county, bring its control station online and keep its surplus flowing; a link appears wherever two online stations touch.</p>';
  const nws = (save.news || []).slice(-8).reverse().map(n => `<div class="nw">${n.text}</div>`).join('') || '<div class="nw">Nothing yet.</div>';
  body.innerHTML = `<div class="col c1"><div class="ch">FACTIONS</div>${FAC_IDS.map(fcard).join('')}${dcard}</div>
    <div class="col"><div class="ch">BORDERS</div>${bcol}<p class="dim">Open borders share the most and recover trust, but Dimmers cross them. Checkpoints trade a little and slow Dimmers. Closed borders stop everything, light included.</p>
      <div class="ch">DISPATCHES</div>${nws}</div>
    <div class="col"><div class="ch">STATION LINKS <span class="r">${u.stable}/${u.nLinks} stable</span></div>${weak ? '<button data-act="fixall" class="primary">FIX ALL WEAK LINKS - ' + weak * 6 + ' RP</button>' : ''}${lcol}</div>`;
  $('un-head').innerHTML = head; body.scrollTop = top; $('un-rp').textContent = Math.floor(Meta.rp);
}
function afterChange() { refreshLinks(); recalcMods(); UC.t = 0; writeSave(); if (mapActive) { bakeMap(); updateStats(); updatePanel(); } if ($('union').style.display === 'flex') renderUnion(); }
$('union').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]'); if (!b) return; unMsg('');
  const a = b.dataset.act;
  if (a === 'border') setBorder(b.dataset.k, b.dataset.m);
  else if (a === 'sign') {
    const id = b.dataset.id, F = FACTIONS[id], f = fac(id);
    if (f.t >= 60 && !f.signed && spend(F.cost)) { f.signed = 1; f.t = Math.max(f.t, 80); facDirty = true; say(`COMPACT SIGNED with ${F.name}. ${F.perk}.`); Story.event('treaty-' + id); beep(523, 0.15, 'square', 0.04); beep(784, 0.25, 'square', 0.04, 0.12); setTimeout(() => Story.check(), 400); }
  } else if (a === 'talks') {
    const dm = fac('dimmers'); if (Date.now() < (dm.cd || 0)) return;
    if (spend(30)) { dm.t = Math.min(100, dm.t + 14); dm.cd = Date.now() + 90000; say('Talks with the Dimmers: they listened. Trust +14.'); Story.event('dim-talks'); setTimeout(() => Story.check(), 400); }
  } else if (a === 'keepers') {
    const dm = fac('dimmers'); if (dm.t >= 70 && !dm.signed && spend(40)) { dm.signed = 1; dm.t = Math.max(dm.t, 90); say('THE DIMMERS BECOME KEEPERS OF THE GRID. They will guard what they once cut.'); Story.event('dim-keepers'); setTimeout(() => Story.check(), 400); }
  } else if (a === 'reinf') { if (reinforce(b.dataset.k)) { wDirty = true; beep(660, 0.08, 'triangle'); } }
  else if (a === 'upg') { if (upgradeLink(b.dataset.k)) { wDirty = true; beep(520, 0.1, 'square', 0.04); beep(780, 0.15, 'square', 0.04, 0.08); } }
  else if (a === 'fixall') { let n = 0; liveLinks.filter(l => l.L.st < 60).forEach(l => { if (Meta.rp >= 6 && reinforce(l.key)) n++; }); if (n) { wDirty = true; beep(660, 0.1, 'triangle'); } else unMsg('Not enough research points.'); }
  afterChange();
});
function openUnion() { refreshLinks(); recalcMods(); renderUnion(); unMsg(''); $('union').style.display = 'flex'; }
$('btn-union').onclick = openUnion; $('un-close').onclick = () => { $('union').style.display = 'none'; };

// ---------- difficulty picker, settings, wide mode ----------
function pickDifficulty() {
  return new Promise(res => {
    const box = $('diffpick'), list = $('dp-list'), word = v => v >= 1.2 ? 'RARE' : v >= 0.9 ? 'NORMAL' : v >= 0.6 ? 'FREQUENT' : 'CONSTANT';
    list.innerHTML = DIFFS.map((d, i) => `<button class="dcard ${i === 1 ? 'rec' : ''}" data-i="${i}"><b>${d.name}</b><span>${d.blurb}</span><small>START SCRAP ${Math.round(d.scrap * 100)}% - FAULTS ${word(d.ev)} - DIMMER CAP ${Math.round(d.darkCap * 100)}%</small></button>`).join('');
    box.style.display = 'flex';
    const done = v => { box.style.display = 'none'; list.onclick = null; $('dp-cancel').onclick = null; res(v); };
    list.onclick = e => { const b = e.target.closest('.dcard'); if (b) done(+b.dataset.i); }; $('dp-cancel').onclick = () => done(-1);
  });
}
function renderSettings() {
  const cur = save.diff == null ? 1 : save.diff;
  $('set-diff').innerHTML = `<div class="seg">${DIFFS.map((d, i) => `<button data-d="${i}" class="${i === cur ? 'on' : ''}">${d.name}</button>`).join('')}</div><small>${DIFFS[cur].blurb}${save.start < 0 ? '' : ' Changing it takes effect right away.'}</small>`;
  $('set-diff').querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { save.diff = +b.dataset.d; recalcMods(); writeSave(); renderSettings(); if (mapActive) updateStats(); }; });
  const set = (id, v) => { $(id).checked = v; };
  set('set-autopause', Settings.autopause); set('set-confirm', Settings.confirmLeave); set('set-events', eventsOn); set('set-sound', !muted); set('set-wide', Settings.wide); set('set-fx', Settings.fx);
}
function openSettings() { renderSettings(); $('settings').style.display = 'flex'; }
$('btn-settings').onclick = openSettings; $('btn-settings2').onclick = openSettings; $('set-close').onclick = () => { $('settings').style.display = 'none'; };
$('set-autopause').onchange = e => { Settings.autopause = e.target.checked; Settings.save(); };
$('set-confirm').onchange = e => { Settings.confirmLeave = e.target.checked; Settings.save(); };
$('set-fx').onchange = e => { Settings.fx = e.target.checked; Settings.save(); };
$('set-events').onchange = e => { eventsOn = e.target.checked; $('chk-events').checked = eventsOn; try { localStorage.setItem('wastelandGrid.events', eventsOn ? '1' : '0'); } catch (x) { /* ignore */ } };
$('set-sound').onchange = e => { if (muted === e.target.checked) toggleMute(); };
$('set-wide').onchange = e => { Settings.wide = e.target.checked; Settings.save(); applyWide(); };
function applyWide() { $('mappanel').classList.toggle('wide', Settings.wide); $('btn-wide').classList.toggle('on', Settings.wide); wideSync(); fit(); }
$('btn-wide').onclick = () => { Settings.wide = !Settings.wide; Settings.save(); applyWide(); };
function wideSync() {
  const c = selected >= 0 ? US.counties[selected] : null, wc = $('widecard');
  if (!Settings.wide || !c) { wc.style.display = 'none'; return; }
  const st = statusOf(c); wc.style.display = 'flex'; $('wc-name').textContent = c.name + ' CO. - ' + US.states[c.state].ab + ' - ' + st.toUpperCase();
  $('wc-go').style.display = $('enter').style.display === 'none' ? 'none' : ''; $('wc-go').textContent = $('enter').textContent;
}
$('wc-go').onclick = () => $('enter').click();
document.addEventListener('visibilitychange', () => { if (document.hidden && Settings.autopause && Builder.active && speed > 0) setSpeed(0); });

// ---------- keyboard on the map ----------
const overlayOpen = () => [...document.querySelectorAll('.overlay')].some(o => o.style.display === 'flex');
function jumpTo(c, z) { selected = c.id; updatePanel(); zoomTo(Math.max(cam.z, z || 3), c.px, c.py, 450); }
function cycleTargets(onlyTrouble) {
  const order = { outage: 0, dark: 1, partial: 2, frontier: 3, landing: 3 };
  const list = US.counties.filter(c => { const s = statusOf(c); return s in order && (!onlyTrouble || order[s] <= 1); }).sort((a, b) => order[statusOf(a)] - order[statusOf(b)] || a.id - b.id);
  if (!list.length) return say(onlyTrouble ? 'No outages or Dimmer counties right now.' : 'Nothing to jump to.');
  const i = list.findIndex(c => c.id === selected); jumpTo(list[(i + 1) % list.length]);
}
addEventListener('keydown', e => {
  if (!Scenes.is('map') || e.ctrlKey || e.metaKey || e.altKey || anim) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (overlayOpen()) { if (e.key === 'Escape') { ['union', 'settings', 'log', 'how', 'skills', 'hq', 'qm'].forEach(id => { $(id).style.display = 'none'; }); } return; }
  const k = e.key.toLowerCase(), pan = 26 / cam.z; let used = true;
  if (k === 'w' || k === 'arrowup') cam.cy -= pan; else if (k === 's' || k === 'arrowdown') cam.cy += pan; else if (k === 'a' || k === 'arrowleft') cam.cx -= pan; else if (k === 'd' || k === 'arrowright') cam.cx += pan;
  else if (k === '+' || k === '=') zoomBy(1.4); else if (k === '-' || k === '_') zoomBy(1 / 1.4); else if (k === 'h' || k === '0' || k === 'home') $('mz-home').click();
  else if (k === 'enter' || k === 'e') { if ($('enter').style.display !== 'none') $('enter').click(); }
  else if (k === 'tab') cycleTargets(false); else if (k === 'n') cycleTargets(true);
  else if (k === 'b') openQM(); else if (k === 'q') openHQ(); else if (k === 'k') openSkills(); else if (k === 'u') openUnion(); else if (k === 'l') openLog(); else if (k === 'o') openSettings(); else if (k === 'f') $('btn-wide').click();
  else if (k === 'v') setMapView(mapView === 'status' ? 'fac' : mapView === 'fac' ? 'links' : 'status');
  else if (k === 'escape') { selected = -1; updatePanel(); } else if (k === '/') $('msearch').focus(); else if (k === '?') mapHelp(); else used = false;
  if (used) { e.preventDefault(); clampCamMap(); }
});
mcv.addEventListener('dblclick', () => { if (selected >= 0 && $('enter').style.display !== 'none' && !anim) $('enter').click(); });

// ---------- start-up ----------
function worldInit() { refreshLinks(); recalcMods(); setMapView('status'); applyWide(); }
$('btn-settings3').onclick = () => { $('help').style.display = 'none'; openSettings(); };

// ---------- save export / import ----------
const SAVE_TAG = 'wasteland-grid-save';
const fmtTime = s => { s = s | 0; return Math.floor(s / 3600) + 'h ' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + 'm'; };
function allGameKeys() { const k = []; try { for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (n && n.startsWith('wastelandGrid.')) k.push(n); } } catch (e) { /* blocked */ } return k; }
function exportSave() {
  if (Builder.active) saveCounty(); writeSave(); Meta.save();
  const keys = {}; allGameKeys().forEach(k => { keys[k] = localStorage.getItem(k); });
  const blob = new Blob([JSON.stringify({ game: SAVE_TAG, version: 5, exported: new Date().toISOString(), keys })], { type: 'application/json' });
  const a = document.createElement('a'), d = new Date(); a.href = URL.createObjectURL(blob);
  a.download = `wasteland-grid-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  save.lastBackup = save.play || 0; backupNagged = false; writeSave(); renderSaveInfo();
}
async function importSave(file) {
  let data; try { data = JSON.parse(await file.text()); } catch (e) { return uiAlert('That file is not a readable save.', 'IMPORT FAILED'); }
  let main; try { main = JSON.parse(data.keys['wastelandGrid.v5']); } catch (e) { main = null; }
  if (data.game !== SAVE_TAG || !main || main.v !== 5) return uiAlert('That is not a Wasteland Grid v5 save. Saves from older versions cannot be loaded.', 'IMPORT FAILED');
  const n = Object.keys(main.restored || {}).length;
  if (!await uiConfirm(`Load this save? It has ${n} restored counties and ${fmtTime(main.play)} played. Your current campaign in this browser will be replaced.`, 'IMPORT SAVE', 'REPLACE AND LOAD', 'CANCEL')) return;
  allGameKeys().forEach(k => localStorage.removeItem(k));
  Object.entries(data.keys).forEach(([k, v]) => { if (k.startsWith('wastelandGrid.') && typeof v === 'string') localStorage.setItem(k, v); });
  location.reload();
}
function renderSaveInfo() {
  const el = $('sv-info'); if (!el) return;
  el.textContent = save.start < 0 ? 'No campaign yet. A save is one .json file you can keep, move to another browser or share.' : `Campaign: ${Object.keys(save.restored).length} counties restored, ${fmtTime(save.play)} played. Last backup: ${save.lastBackup ? fmtTime((save.play || 0) - save.lastBackup) + ' of play ago' : 'never'}.`;
}
$('sv-export').onclick = exportSave; $('sv-import').onclick = () => $('sv-file').click();
$('sv-file').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importSave(f); };
$('sv-reset').onclick = async () => { if (await uiConfirm('This erases the campaign, research and settings stored in this browser. Export first if you want a backup.', 'ERASE EVERYTHING?', 'ERASE', 'CANCEL')) { allGameKeys().forEach(k => localStorage.removeItem(k)); location.reload(); } };
const _rs = renderSettings; renderSettings = function () { _rs(); renderSaveInfo(); };

// ---------- map search + help ----------
function mapHelp() { uiAlert('WASD / arrows: pan\n+ / -: zoom, H: reset view\nTAB: next target, N: next outage or Dimmer county\nENTER or double-click: open county\nU: union, V: map view, F: wide map\n/: find a county, L: radio log, O: settings\nESC: deselect', 'MAP SHORTCUTS'); }
$('msearch').addEventListener('keydown', e => {
  e.stopPropagation(); if (e.key === 'Escape') { e.target.blur(); return; } if (e.key !== 'Enter') return;
  const q = e.target.value.trim().toUpperCase(); if (!q) return;
  const hits = US.counties.filter(c => (c.name + ' ' + US.states[c.state].name + ' ' + US.states[c.state].ab).includes(q));
  if (!hits.length) return say('No county or state matches "' + q + '".');
  const i = hits.findIndex(c => c.id === selected); jumpTo(hits[(i + 1) % hits.length]); say(hits.length + ' match' + (hits.length > 1 ? 'es' : '') + ' - press ENTER again for the next.');
});
