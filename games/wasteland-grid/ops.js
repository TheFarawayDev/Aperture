'use strict';
// ============================================================
//  OPS.JS - multi-line laying, soft night lighting, failure sequences,
//  Dimmer raids, and interties (sharing resources between counties).
//  Loaded after game.js; game.js calls into these at a few hooks.
// ============================================================

let refreshCb = null, impT = 0;
let IMPORTS = { p: 0, w: 0, n: 0, links: 0, list: [] }, HOSTILE = false, THREAT = 0, surplusCb = null, importedTotal = [0, 0, 0];
let multiLayers = [0, 1, 2];
let seqs = [], strain = 0, fx = [], raidT = 90, raid = null, raidQueue = 0, jamUntil = -1;
const seqNotice = (msg, snd = true) => { toast(msg); if (snd) beep(130, 0.35, 'sawtooth', 0.05); };

function opsInit(opts) {
  IMPORTS = Object.assign({ p: 0, w: 0, n: 0, links: 0 }, opts.imports || {}); HOSTILE = !!opts.hostile; THREAT = opts.threat || 0; surplusCb = opts.onSurplus || null; refreshCb = opts.refresh || null; impT = 0;
  seqs = []; fx = []; strain = 0; raid = null; raidQueue = 0; jamUntil = -1; raidT = (HOSTILE ? 50 : 150) * WMOD.raid * WMOD.def * ((typeof TM === 'function' && TM().raid) || 1); importedTotal = [0, 0, 0]; multiLayers = [0, 1, 2];
}

// ---------- multi-line: lay several line types in one drag ----------
function renderMulti() {
  const box = $('multi'); if (!box) return;
  if (!tool || (tool.kind !== 'multi' && tool.kind !== 'route')) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  const unl = L => lineUnlocked(L);
  const chip = L => `<button class="mchip ${multiLayers.includes(L) && unl(L) ? 'on' : ''} ${unl(L) ? '' : 'locked'}" data-l="${L}" style="--c:${LAYERS[L].css}" title="${LAYERS[L].name}">${LAYERS[L].short}</button>`;
  const cost = multiLayers.filter(unl).reduce((a, L) => a + (LAYERS[L].cost || 1), 0);
  box.innerHTML = `<div class="mrow">${[0, 1, 2, 3, 4, 5].map(chip).join('')}</div><div class="mrow"><button data-p="local">LOCAL x3</button><button data-p="trunk">TRUNK x3</button><button data-p="all">ALL</button></div><small>${cost} scrap per tile</small>`;
  box.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => { const L = +b.dataset.l; if (!unl(L)) return warnOnce('RESEARCH ' + TECH[LAYERS[L].tech].name + ' FIRST (Y)'); multiLayers = multiLayers.includes(L) ? multiLayers.filter(x => x !== L) : [...multiLayers, L].sort(); renderMulti(); }; });
  box.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { const p = b.dataset.p; multiLayers = (p === 'local' ? [0, 1, 2] : p === 'trunk' ? [3, 4, 5] : [0, 1, 2, 3, 4, 5]).filter(unl); renderMulti(); }; });
}
function multiAct(x, y, first) {
  const ls = multiLayers.filter(lineUnlocked), i = y * WW + x;
  if (!ls.length) return warnOnce('PICK AT LEAST ONE LINE TYPE (OR RESEARCH MORE)');
  if (first) paintMode = ls.some(L => cab[L][i] === 1) ? 'erase' : ls.some(L => cab[L][i] === 2) ? 'fix' : 'paint';
  if (paintMode === 'fix') repairCable(x, y); else for (const L of ls) cableAt(L, x, y, paintMode);
}

// ---------- interties: share resources between counties ----------
function computeImports() {
  importedTotal = [0, 0, 0];
  const its = ents.filter(e => BUILD[e.type].importer);
  its.forEach(e => { e.imp = [0, 0, 0]; });
  const live = its.filter(e => e.cond > 0), k = live.length; if (!k) return;
  const mul = activeMods.has('uplink') ? 1.5 : 1, offered = [IMPORTS.p, IMPORTS.w, IMPORTS.n];
  live.forEach(e => { e.imp = [0, 1, 2].map(R => Math.min(IMPORT_CAP[R] * mul, offered[R] / k)); e.imp.forEach((v, R) => { importedTotal[R] += v; }); });
}
function reportSurplus() {
  if (!Builder.active || !surplusCb || !totals || !totals[0]) return;
  const exp = [0, 1, 2].map(R => Math.max(0, (totals[R].sup - importedTotal[R]) - totals[R].dem));
  surplusCb(countyId, { p: exp[0], w: exp[1], n: exp[2], on: !!(stationEnt && stationEnt.run && stationEnt.cond > 0) });
}

// ---------- effects (sparks, smoke, explosions) ----------
function burst(tx, ty, kind) {
  const x = tx * T, y = ty * T, add = (n, f) => { n = Math.round(n * Settings.parts); for (let i = 0; i < n; i++) fx.push(f(i)); };
  if (Settings.parts <= 0) return;
  if (kind === 'boom') {
    fx.push({ k: 'ring', x, y, life: 0.7, max: 0.7 });
    add(30, () => { const a = Math.random() * 6.283, s = 20 + Math.random() * 60; return { k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.6 + Math.random() * 0.8, max: 1.2, c: [5, 6, 7, 8, 3][Math.random() * 5 | 0], g: 90 }; });
    add(10, () => ({ k: 'smoke', x: x + Math.random() * 10 - 5, y, vx: Math.random() * 8 - 4, vy: -10 - Math.random() * 12, life: 1.5, max: 1.5 }));
  } else if (kind === 'repel') {
    fx.push({ k: 'ring', x, y, life: 0.5, max: 0.5, c: 14 });
    add(14, () => { const a = Math.random() * 6.283, s = 20 + Math.random() * 30; return { k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, c: 14, g: 0 }; });
  } else add(8, () => ({ k: 'dot', x: x + 4, y: y + 4, vx: Math.random() * 40 - 20, vy: -20 - Math.random() * 30, life: 0.5 + Math.random() * 0.4, max: 0.9, c: Math.random() < 0.5 ? 7 : 8, g: 120 }));   // sparks
}
function drawFx(t, cx, cy, dt) {
  for (const q of seqs) {                                  // critical machines smoke and spark
    if (q.kind === 'melt' && q.e && Math.random() < 0.25 * Settings.parts) fx.push({ k: 'smoke', x: (q.e.x + q.e.w / 2) * T + Math.random() * 6 - 3, y: q.e.y * T + 2, vx: Math.random() * 6 - 3, vy: -14, life: 1.2, max: 1.2 });
    if (q.kind === 'melt' && q.e && Math.random() < 0.12 * Settings.parts) burst(q.e.x + Math.random() * q.e.w, q.e.y + Math.random() * q.e.h, 'spark');
  }
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.life -= dt; if (p.life <= 0) { fx.splice(i, 1); continue; }
    const a = p.life / p.max;
    if (p.k === 'ring') {
      const r = (1 - a) * 30 + 2; g.globalAlpha = a; g.strokeStyle = PAL[p.c || 8]; g.strokeRect(p.x - cx - r + 0.5, p.y - cy - r + 0.5, r * 2, r * 2); g.strokeStyle = PAL[p.c ? 13 : 6]; g.strokeRect(p.x - cx - r * 0.6 + 0.5, p.y - cy - r * 0.6 + 0.5, r * 1.2, r * 1.2); g.globalAlpha = 1;
    } else if (p.k === 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = a * 0.6; px(p.x - cx, p.y - cy, 3 + (1 - a) * 3 | 0, 3 + (1 - a) * 3 | 0, a > 0.5 ? 3 : 2); g.globalAlpha = 1; }
    else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; g.globalAlpha = Math.min(1, a * 1.5); px(p.x - cx, p.y - cy, 1, 1, p.c); g.globalAlpha = 1; }
  }
  if (raid) {                                              // blinking crosshair where the raiders will strike
    const bx = raid.x * T - cx, by = raid.y * T - cy, on = Math.floor(t * 4) % 2;
    g.strokeStyle = PAL[on ? 5 : 8]; g.strokeRect(bx - 12.5, by - 12.5, 33, 33); px(bx - 14, by + 3, 8, 2, on ? 5 : 8); px(bx + 14, by + 3, 8, 2, on ? 5 : 8); px(bx + 3, by - 14, 2, 8, on ? 5 : 8); px(bx + 3, by + 14, 2, 8, on ? 5 : 8);
  }
}
function opsMini() {
  if (!raid) return;
  const on = Math.floor(performance.now() / 250) % 2, x = raid.x * 2, y = raid.y * 2; mmg.fillStyle = '#000'; mmg.fillRect(x - 4, y - 4, 9, 9); mmg.fillStyle = PAL[on ? 5 : 8]; mmg.fillRect(x - 3, y - 3, 7, 7); mmg.fillStyle = '#000'; mmg.fillRect(x - 1, y - 1, 3, 3);
}

// ---------- night lighting: lights are max-blended so overlaps never pile up into a blob ----------
const lightCv = document.createElement('canvas'); lightCv.width = W; lightCv.height = H; const lg2 = lightCv.getContext('2d');
function drawLights(night, cx, cy, x0, y0, x1, y1) {
  if (!Settings.fx) night *= 0.5;
  const lw = Math.ceil(VW), lh = Math.ceil(VH); if (lightCv.width !== lw || lightCv.height !== lh) { lightCv.width = lw; lightCv.height = lh; }
  g.globalAlpha = night; px(0, 0, VW + 1, VH + 1, 0); g.globalAlpha = 1;
  if (radUntil > gameT) { g.globalAlpha = 0.12; px(0, 0, VW + 1, VH + 1, 11); g.globalAlpha = 1; }
  lg2.globalCompositeOperation = 'source-over'; lg2.fillStyle = '#000'; lg2.fillRect(0, 0, lw, lh); lg2.globalCompositeOperation = 'lighten';
  for (const e of sortedEnts) {
    if (!(e.run || e.active) || e.x > x1 + 2 || e.y > y1 + 2 || e.x + e.w < x0 - 2 || e.y + e.h < y0 - 2) continue;
    const mx = (e.x + e.w / 2) * T - cx, my = (e.y + e.h / 2) * T - cy, half = Math.max(e.w, e.h) * T / 2;
    [[half + 8, '#1d1608'], [half + 5, '#3a2a10'], [half + 2, '#5f4617']].forEach(([r, c]) => { lg2.fillStyle = c; lg2.fillRect(mx - r, my - r + 1, r * 2, r * 2 - 2); lg2.fillRect(mx - r + 1, my - r, r * 2 - 2, r * 2); });
  }
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 * Math.min(1, night / 0.2 + 0.25); g.drawImage(lightCv, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}

// ---------- failure sequences, raids, auto-reclose ----------
const covered = (x, y) => ents.some(e => BUILD[e.type].security && e.run && Math.max(Math.abs(e.x + 1 - x), Math.abs(e.y + 1 - y)) <= BUILD[e.type].security.radius) || (activeMods.has('sentry') && Math.random() < 0.5);
function damageLines(cx, cy, r, p) { let n = 0; for (let L = 0; L < NL; L++) for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { if (!inb(x, y)) continue; const i = y * WW + x; if (cab[L][i] === 1 && Math.random() < p) { cab[L][i] = 2; n++; } } return n; }
function explode(e) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2; e.cond = 0;
  ents.forEach(o => { if (o !== e && BUILD[o.type].maint && Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) <= 5) o.cond = Math.max(0, o.cond - 35); });
  const n = damageLines(Math.round(cx), Math.round(cy), 3, 0.5);
  burst(cx, cy, 'boom'); seqNotice(BUILD[e.type].name + ' EXPLODED! Neighbouring machines damaged and ' + n + ' lines cut.'); beep(60, 0.7, 'sawtooth', 0.07);
  recompute(); setTimeout(() => storyEv('boom'), 2500);
}
function cascade() {
  const run = ents.filter(e => BUILD[e.type].maint && e.cond > 0 && e.run && !BUILD[e.type].fixed); let n = 0;
  for (let k = 0; k < 2 && run.length; k++) { const e = run.splice(Math.random() * run.length | 0, 1)[0]; e.cond = 0; burst(e.x + e.w / 2, e.y + e.h / 2, 'boom'); n++; }
  const l = damageLines(DISTRICTS[0].x, DISTRICTS[0].y, 14, 0.04);
  seqNotice('CASCADE FAILURE! ' + n + ' machines tripped offline and ' + l + ' lines burned out. Repair, then rebalance the grid.'); recompute(); setTimeout(() => storyEv('cascade'), 2500);
}
// ---------- Dimmer raids come in several kinds, and some counties hide a Dimmer camp ----------
const RAID_INFO = {
  saboteur: { label: 'SABOTEURS', msg: n => `DIMMER SABOTEURS spotted near ${n}! They strike in {t} seconds and will cut lines and wreck machines.` },
  looter: { label: 'SCAVENGERS', msg: n => `DIMMER SCAVENGERS are heading for the stores near ${n}! They strike in {t} seconds and will empty your stockpile.` },
  jammer: { label: 'JAMMERS', msg: n => `A DIMMER JAMMER TEAM is creeping toward ${n}! They strike in {t} seconds and will drown every router and relay in noise.` },
  arson: { label: 'ARSONISTS', msg: n => `DIMMER ARSONISTS are going for the generators near ${n}! They strike in {t} seconds.` },
  warband: { label: 'WARBAND', msg: n => `A DIMMER WARBAND is marching on ${n}! Two waves: the first strikes in {t} seconds, a second right behind it.` },
};
function raidKind() {
  const anyNet = ents.some(e => BUILD[e.type].sup[2] > 0 && !BUILD[e.type].central && e.cond > 0), anyFuel = ents.some(e => BUILD[e.type].fuel && !BUILD[e.type].fixed && e.cond > 0);
  const w = [['saboteur', 50], ['looter', scrap >= 80 ? 26 : 0], ['jammer', anyNet ? 15 : 0], ['arson', anyFuel ? 14 : 0], ['warband', (HOSTILE || THREAT >= 2) ? 12 : 0]];
  let tot = w.reduce((a, x) => a + x[1], 0), r = Math.random() * tot; for (const [k, v] of w) { if ((r -= v) < 0) return k; } return 'saboteur';
}
function startRaid(kind, left) {
  const targets = ents.filter(e => (BUILD[e.type].maint || e.isHub) && !String(e.type).startsWith('dormant'));
  if (!targets.length) return;
  kind = kind || raidKind(); left = left || 12; const e = targets[Math.random() * targets.length | 0], info = RAID_INFO[kind], tx = e.x + (e.w >> 1), ty = e.y + (e.h >> 1);
  let sx, sy; if (Camp.alive()) { sx = Camp.c.x + 1; sy = Camp.c.y + 1; } else { sx = tx + (Math.random() < 0.5 ? -1 : 1) * (24 + Math.random() * 12); sy = ty + (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 8); }
  sx = Math.max(1, Math.min(WW - 2, sx)); sy = Math.max(1, Math.min(WH - 2, sy));
  raid = { x: tx, y: ty, left, tot: left, kind, label: info.label, sx, sy };
  seqNotice(info.msg(e.district ? e.district.name : BUILD[e.type].name).replace('{t}', left) + ' Security posts drive them off.');
  Hints.once('raid', 'Raiders are coming. SECURITY POSTS repel them (and you keep the spoils). If a Dimmer camp is in this county, click it to assault it.');
}
function resolveRaid() {
  const r = raid; raid = null;
  if (covered(r.x, r.y)) {
    Variety.count('repel'); Credits.add(2); burst(r.x, r.y, 'repel'); const sc = Math.round((18 + Math.random() * 34) * (TM().lootVal || 1)); scrap += sc; let extra = '';
    if (Math.random() < 0.3) { const p = 1 + (Math.random() * 3 | 0); stock.parts += p; extra = ` and ${p} parts`; }
    if (r.kind === 'warband') raidQueue = 0;
    toast(`RAID REPELLED. The ${r.label.toLowerCase()} melted back into the dark, leaving ${sc} scrap${extra}.`); beep(660, 0.1); beep(880, 0.15, 'square', 0.04, 0.08); storyEv('repel'); return;
  }
  const dmg = () => {
    const n = damageLines(r.x, r.y, 5, 0.7), near = ents.filter(e => BUILD[e.type].maint && !BUILD[e.type].fixed && Math.hypot(e.x - r.x, e.y - r.y) <= 6 && e.cond > 0);
    let hit = 0; for (let k = 0; k < 2 && near.length; k++) { if (Math.random() < 0.6) { near.splice(Math.random() * near.length | 0, 1)[0].cond = 0; hit++; } } return [n, hit];
  };
  if (r.kind === 'looter') {
    const s = Math.round(Math.min(scrap * 0.25, 300)), p = Math.min(Math.floor(stock.parts * 0.3), 9); scrap -= s; stock.parts -= p; burst(r.x, r.y, 'boom');
    seqNotice(`SCAVENGERS raided the stores! They made off with ${s} scrap${p ? ' and ' + p + ' parts' : ''}. Security posts stop this.`);
  } else if (r.kind === 'jammer') {
    jamUntil = gameT + 30; burst(r.x, r.y, 'spark'); recompute(); seqNotice('JAMMED! Every router and relay is drowned in noise for 30 seconds. Data centres hold on.');
  } else if (r.kind === 'arson') {
    const fm = ents.filter(e => BUILD[e.type].fuel && !BUILD[e.type].fixed && e.cond > 0 && Math.hypot(e.x - r.x, e.y - r.y) <= 16); let n = 0;
    for (let k = 0; k < 3 && fm.length; k++) { const e = fm.splice(Math.random() * fm.length | 0, 1)[0]; e.cond = Math.max(0, e.cond - 70); burst(e.x + e.w / 2, e.y + e.h / 2, 'boom'); n++; }
    const l = damageLines(r.x, r.y, 3, 0.4); if (!n) { const [a, b] = dmg(); seqNotice(`RAID! The Dimmers cut ${a} lines and sabotaged ${b} machine(s).`); } else seqNotice(`ARSON! ${n} fuel-burning machine${n > 1 ? 's' : ''} set ablaze and ${l} lines scorched. Repair them.`);
  } else {
    const [n, hit] = dmg(); burst(r.x, r.y, 'boom');
    if (r.kind === 'warband') { raidQueue = 1; seqNotice(`WARBAND STRIKE! ${n} lines cut, ${hit} machine(s) sabotaged. The second wave is right behind them!`); }
    else seqNotice('RAID! The Dimmers cut ' + n + ' lines and sabotaged ' + hit + ' machine(s). Repair it and build a security post.');
  }
  recompute(); storyEv('raid');
}
const Camp = {
  c: null, dead: false, intel: false, pingUntil: 0, busy: false,
  alive() { return !!this.c && !this.dead; },
  init(county, deadSaved) {
    this.c = null; this.dead = !!deadSaved; this.intel = false; this.busy = false; this.pingUntil = 0; if (!county) return;
    const r = mulberry(county.id * 4177 + 9);
    if (!(HOSTILE || THREAT >= 2 || (THREAT > 0 && r() < 0.6))) return;
    const ok = t => t === 0 || t === 3 || t === 7;
    for (let tries = 0; tries < 600; tries++) {
      const x = 10 + (r() * (WW - 22) | 0), y = 10 + (r() * (WH - 22) | 0); let good = true;
      for (let dy = -1; dy <= 3 && good; dy++) for (let dx = -1; dx <= 3; dx++) { const i = (y + dy) * WW + x + dx; if (!ok(terrain[i]) || occ[i] || cab.some(a => a[i])) { good = false; break; } }
      if (!good) continue;
      if (DISTRICTS.some(d => Math.hypot(d.x - x, d.y - y) < 14) || SITES.some(s => Math.hypot(s.x - x, s.y - y) < 9) || Loot.list.some(l => Math.hypot(l.x - x, l.y - y) < 8)) continue;
      this.c = { x, y, str: 1 + Math.min(3, Math.floor((typeof hopsFromStart === 'function' ? hopsFromStart(county.id) : 0) / 6)) }; return;
    }
  },
  chance() {
    const c = this.c, sec = ents.filter(e => BUILD[e.type].security && e.run && Math.hypot(e.x - c.x, e.y - c.y) <= 24).length;
    return Math.max(0.15, Math.min(0.92, 0.45 + Math.min(0.35, 0.1 * sec) + (this.intel ? 0.2 : 0) - 0.06 * (c.str - 1) + ((TM().raid || 1) - 1) * 0.25));
  },
  cost() { return { scrap: 40 + 15 * this.c.str, parts: 3 + 2 * this.c.str }; },
  tryClick(tx, ty) { if (!this.alive() || this.busy || tx < this.c.x - 1 || tx > this.c.x + 3 || ty < this.c.y - 1 || ty > this.c.y + 3) return false; this.assault(); return true; },
  async assault() {
    this.busy = true; const sp = speed, cost = this.cost(), ch = this.chance(); setSpeed(0);
    const go = await uiConfirm(`A DIMMER CAMP. This is where the raiders come from. Send a strike team? Cost: ${cost.scrap} scrap and ${cost.parts} parts, win or lose. Chance of success: ${Math.round(ch * 100)}% (security posts nearby and a deserter's tip help). Win: the raids mostly stop, and the camp's stores are yours.`, 'DIMMER CAMP', 'ASSAULT', 'NOT YET');
    if (go) {
      if (scrap < cost.scrap || stock.parts < cost.parts) toast(`You need ${cost.scrap} scrap and ${cost.parts} parts to equip a strike team.`);
      else if (Math.random() < ch) this.win(cost); else this.lose(cost);
    }
    setSpeed(sp || 1); this.busy = false;
  },
  win(cost) {
    scrap -= cost.scrap; stock.parts -= cost.parts; const hops = CUR.county != null && typeof hopsFromStart === 'function' ? hopsFromStart(CUR.county) : 0;
    const sc = Math.round((110 + Math.random() * 110) * (1 + hops * 0.03)), rp = 12 + (Math.random() * 14 | 0), p = 4 + (Math.random() * 7 | 0); scrap += sc; Meta.rp += rp; Meta.dirty = true; stock.parts += p; let extra = '';
    ensureMeta();
    if (Math.random() < 0.18) { save.sp += 1; extra = ' and a captured TECH CHIP (+1 skill point)'; }
    else if (Math.random() < 0.12) { const miss = Object.keys(BLUEPRINTS).filter(id => !save.items[id]); if (miss.length) { const id = miss[Math.random() * miss.length | 0]; save.items[id] = 1; extra = ` and a BLUEPRINT: ${BLUEPRINTS[id]}`; } }
    this.dead = true; raid = null; raidQueue = 0; raidT = Math.max(raidT, 240); bump('camps'); CUR.camps = (CUR.camps || 0) + 1;
    burst(this.c.x + 1, this.c.y + 1, 'boom'); burst(this.c.x + 1, this.c.y + 1, 'repel'); beep(220, 0.3, 'sawtooth', 0.06); beep(660, 0.2, 'square', 0.05, 0.2); beep(990, 0.2, 'square', 0.05, 0.4);
    Credits.add(35 + 10 * this.c.str); toast(`DIMMER CAMP DESTROYED! Loot: ${sc} scrap, ${rp} research, ${p} parts${extra}. Raids will come far less often now.`); news('Destroyed a Dimmer camp.'); writeSave(); Objectives.check(); dirty.mini = true;
  },
  lose(cost) {
    scrap -= cost.scrap; stock.parts -= cost.parts; raidT = Math.min(raidT, 20); burst(this.c.x + 1, this.c.y + 1, 'boom'); beep(110, 0.4, 'sawtooth', 0.06);
    toast('The assault fails and the strike team falls back. The camp is alerted: expect raiders soon. Build security posts and try again.');
  },
  draw(t, cx, cy) {
    if (raid && raid.sx !== undefined) {                              // the raiding party walks in from the camp (or the edge of the map) and a ring marks where it will strike
      const p = Math.max(0, Math.min(1, 1 - raid.left / raid.tot)), rx = (raid.sx + (raid.x - raid.sx) * p) * T - cx, ry = (raid.sy + (raid.y - raid.sy) * p) * T - cy;
      const ring = (raid.kind === 'warband' ? 6 : 5) * T, k = Math.floor(t * 4) % 2;
      g.globalAlpha = 0.35 + 0.25 * k; g.strokeStyle = PAL[5]; g.strokeRect(raid.x * T - cx - ring, raid.y * T - cy - ring, ring * 2 + T, ring * 2 + T); g.globalAlpha = 1;
      for (let i = 0; i < (raid.kind === 'warband' ? 5 : 3); i++) { const bob = Math.floor(t * 6 + i) % 2, fx = rx + i * 4 - 4, fy = ry + (i % 2) * 3 + bob; px(fx, fy - 2, 2, 2, 6); px(fx, fy, 2, 3, raid.kind === 'jammer' ? 15 : 5); px(fx + 2, fy + 1, 1, 2, 3); }
    }
    const c = this.c; if (!c) return; const x = c.x * T - cx, y = c.y * T - cy; if (x < -30 || y < -30 || x > VW + 6 || y > VH + 6) return;
    if (this.dead) { px(x + 2, y + 10, 20, 3, 1); px(x + 6, y + 8, 3, 3, 3); px(x + 15, y + 9, 4, 2, 3); if (Math.floor(t * 3) % 2) px(x + 12, y + 8, 1, 1, 5); return; }
    for (let i = 0; i < 8; i++) px(x + 6 - i, y + 8 + i, i * 2 + 1, 1, i % 3 ? 5 : 4);   // big tent
    px(x + 5, y + 12, 3, 4, 0);
    for (let i = 0; i < 5; i++) px(x + 19 - i, y + 12 + i, i * 2 + 1, 1, i % 2 ? 3 : 4);  // small tent
    px(x + 11, y, 1, 14, 3); const wave = Math.floor(t * 4) % 2; px(x + 12, y + 1 + wave, 6, 3, 5); px(x + 13, y + 2 + wave, 2, 1, 0);   // flag
    px(x + 10, y + 17, 3, 2, Math.floor(t * 8) % 2 ? 6 : 8); px(x + 10, y + 19, 3, 1, 0);                                     // campfire
    for (let i = 0; i < 3; i++) { const sm = (t * 6 + i * 3) % 9; px(x + 11 + Math.sin(t + i) * 2, y + 15 - sm, 1, 1, 3); }
    g.strokeStyle = PAL[Math.floor(t * 2) % 2 ? 5 : 3]; g.strokeRect(x - 2.5, y - 2.5, 28, 26);
    if (this.pingUntil > performance.now()) { const k = (t * 1.5) % 1; g.strokeStyle = PAL[5]; g.globalAlpha = 1 - k; g.strokeRect(x + 12 - 12 - k * 30, y + 10 - 10 - k * 30, 24 + k * 60, 20 + k * 60); g.globalAlpha = 1; }
  },
  mini() { if (!this.alive()) return; const x = this.c.x * 2, y = this.c.y * 2; mmg.fillStyle = '#000'; mmg.fillRect(x - 3, y - 3, 10, 10); mmg.fillStyle = PAL[(Math.floor(performance.now() / 500) % 2) ? 5 : 3]; mmg.fillRect(x - 2, y - 2, 8, 8); },
};

function opsTick() {
  if (refreshCb && ++impT >= 10) {                          // live imports: the link network changes while you play
    impT = 0; const n = refreshCb();
    if (n) { const before = IMPORTS.links; IMPORTS = Object.assign({ p: 0, w: 0, n: 0, links: 0, list: [] }, n); if (n.links < before) toast('A feeder county stopped exporting. Imports fell.'); else if (n.links > before) toast('A new feeder county is sending you power.'); }
  }
  if (jamUntil > 0 && gameT >= jamUntil) { jamUntil = -1; recompute(); toast('The jamming stops. Networks recover.'); }
  if (!raid && raidQueue > 0) { raidQueue--; startRaid('saboteur', 9); }
  const anyRest = DISTRICTS.some(d => d.restored), tp = totals[0];
  // 1) grid strain -> protection trip -> cascade
  const over = anyRest && tp.dem > tp.sup * 1.05 + 0.5;
  strain = over ? strain + 1 : Math.max(0, strain - 2);
  let ov = seqs.find(q => q.kind === 'overload');
  if (!ov && strain >= 10 && eventsOn) { ov = { kind: 'overload', stage: 1, left: 12 }; seqs.push(ov); Hints.once('strain', 'GRID STRAIN: if demand stays above supply the protection trips and a cascade follows. Add power, switch off load, or build batteries.'); seqNotice('GRID STRAIN: demand is above supply. Protection trips in 12s - add power or switch off load!'); }
  if (ov) {
    if (!over && strain === 0) { seqs.splice(seqs.indexOf(ov), 1); toast('GRID STABLE again. Crisis averted.'); beep(660, 0.1); }
    else {
      ov.left--;
      if (ov.stage === 1 && ov.left <= 0) {
        ov.stage = 2; ov.left = 8; let n = 0;
        ents.forEach(e => { const d = BUILD[e.type]; if (!activeMods.has('guard') && d.bridge === 0 && e.on) { e.on = false; e.manual = false; n++; burst(e.x + 1, e.y + 1, 'spark'); } if (d.store && d.store.L === 0) e.cond = Math.max(1, e.cond - 20); });
        seqNotice(n ? 'PROTECTION TRIP! ' + n + ' substation(s) opened to save the plants. Cascade in 8s unless you rebalance.' : 'PROTECTION TRIP blocked by the surge guard, but the batteries are cooking!'); recompute();
      } else if (ov.stage === 2 && ov.left <= 0) { ov.stage = 3; ov.left = 6; cascade(); }
      else if (ov.stage === 3 && ov.left <= 0) { seqs.splice(seqs.indexOf(ov), 1); strain = 0; }
    }
  }
  // 2) machines about to blow up
  if (eventsOn) for (const e of ents) {
    const d = BUILD[e.type]; if (!(d.fuel || d.central || d.fuelOut || d.store)) continue;
    const q = seqs.find(s => s.kind === 'melt' && s.e === e);
    if (!q && e.cond > 0 && e.cond <= 12 && (e.run || d.store)) { seqs.push({ kind: 'melt', e, left: 14 }); seqNotice(d.name + ' CRITICAL! Repair it (V) within 14 seconds or it will blow.'); }
    else if (q) {
      if (e.cond > 25 || e.cond <= 0) { if (e.cond > 25) toast(d.name + ' stabilised.'); seqs.splice(seqs.indexOf(q), 1); }
      else { q.left--; if (q.left <= 0) { explode(e); seqs.splice(seqs.indexOf(q), 1); } }
    }
  }
  // 3) raiders
  if (eventsOn && (HOSTILE || THREAT > 0) && (anyRest || HOSTILE)) {
    if (!raid && --raidT <= 0) { startRaid(); raidT = (HOSTILE ? 45 + Math.random() * 40 : (170 / Math.max(1, THREAT)) + Math.random() * 90) * WMOD.raid * WMOD.def * (TM().raid || 1) * (Camp.alive() ? 0.8 : 1) * (Camp.dead ? 2.4 : 1); }
  }
  if (raid && --raid.left <= 0) resolveRaid();
  // 4) station modules
  { const lim = activeMods.has('autoswitch') ? 3 : 10;                              // tripped transformers close again by themselves (faster with the module); only ones YOU switched off stay off
  ents.forEach(e => { if (BUILD[e.type].bridge !== undefined && !e.on && !e.manual) { e.tripT = (e.tripT || 0) + 1; if (e.tripT >= lim) { e.on = true; e.tripT = 0; toast(BUILD[e.type].name + ' re-closed automatically.'); recompute(); } } else e.tripT = 0; }); }
  if (activeMods.has('forecast') && evT === 10) seqNotice('FORECAST: severe weather in 10 seconds.', false);
}
function opsAlerts() {
  const out = [];
  seqs.forEach(q => { if (q.kind === 'overload') out.push({ miss: [q.stage === 1 ? 'TRIP IN ' + q.left + 's' : q.stage === 2 ? 'CASCADE IN ' + q.left + 's' : 'CASCADE'], label: 'GRID STRAIN' }); if (q.kind === 'melt') out.push({ e: q.e, miss: ['BLOWS IN ' + q.left + 's'], label: BUILD[q.e.type].name + ' CRITICAL' }); });
  if (raid) out.push({ cable: raid.y * WW + raid.x, miss: ['STRIKE IN ' + raid.left + 's'], label: raid.label || 'RAIDERS' });
  alerts.unshift(...out);
}
function opsHud() {
  const el = $('seq'); if (el) {
    let txt = '', cls = '';
    const q = seqs.find(s => s.kind === 'overload'), m = seqs.find(s => s.kind === 'melt');
    if (raid) { txt = 'DIMMER ' + (raid.label || 'RAIDERS') + ' - STRIKE IN ' + raid.left + 's'; cls = 'red'; }
    else if (q) { txt = q.stage === 1 ? 'GRID STRAIN - TRIP IN ' + q.left + 's' : q.stage === 2 ? 'PROTECTION TRIP - CASCADE IN ' + q.left + 's' : 'CASCADE FAILURE'; cls = q.stage > 1 ? 'red' : 'amber'; }
    else if (m) { txt = '' + BUILD[m.e.type].name + ' CRITICAL - ' + m.left + 's'; cls = 'red'; }
    el.innerHTML = txt ? pxi('warn') + ' ' + txt : ''; el.className = txt ? 'on ' + cls : '';
  }
  const gi = $('gridinfo'); if (gi) {
    const nInt = ents.filter(e => BUILD[e.type].importer && e.cond > 0).length, on = stationEnt && stationEnt.run;
    gi.innerHTML = `STATION ${on ? '<span class="pos">ONLINE</span>' : '<span class="neg">offline</span>'} - LINKED COUNTIES ${IMPORTS.links}<br>INTERTIES ${nInt}: +${Math.round(importedTotal[0])}P +${Math.round(importedTotal[1])}W +${Math.round(importedTotal[2])}N <small>(offered ${Math.round(IMPORTS.p)}/${Math.round(IMPORTS.w)}/${Math.round(IMPORTS.n)})</small>${IMPORTS.list && IMPORTS.list.length ? '<br><small>FEEDERS: ' + IMPORTS.list.slice(0, 3).map(x => x.name + ' ' + Math.round(x.eff * 100) + '%' + (x.hop > 1 ? ' (' + x.hop + ' hops)' : '')).join(', ') + '</small>' : ''}${HOSTILE ? '<br><span class="neg">HOSTILE COUNTY - raids are frequent</span>' : THREAT ? '<br><span class="neg">DIMMERS NEARBY - raids possible</span>' : ''}`;
  }
}
