'use strict';
// ============================================================
//  OPS.JS - multi-line laying, soft night lighting, failure sequences,
//  Dimmer raids, and interties (sharing resources between counties).
//  Loaded after game.js; game.js calls into these at a few hooks.
// ============================================================

let IMPORTS = { p: 0, w: 0, n: 0, links: 0 }, HOSTILE = false, THREAT = 0, surplusCb = null, importedTotal = [0, 0, 0];
let multiLayers = [0, 1, 2];
let seqs = [], strain = 0, fx = [], raidT = 90, raid = null;
const seqNotice = (msg, snd = true) => { toast(msg); if (snd) beep(130, 0.35, 'sawtooth', 0.05); };

function opsInit(opts) {
  IMPORTS = Object.assign({ p: 0, w: 0, n: 0, links: 0 }, opts.imports || {}); HOSTILE = !!opts.hostile; THREAT = opts.threat || 0; surplusCb = opts.onSurplus || null;
  seqs = []; fx = []; strain = 0; raid = null; raidT = HOSTILE ? 50 : 150; importedTotal = [0, 0, 0]; multiLayers = [0, 1, 2];
}

// ---------- multi-line: lay several line types in one drag ----------
function renderMulti() {
  const box = $('multi'); if (!box) return;
  if (!tool || tool.kind !== 'multi') { box.style.display = 'none'; return; }
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
  const x = tx * T, y = ty * T, add = (n, f) => { for (let i = 0; i < n; i++) fx.push(f(i)); };
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
    if (q.kind === 'melt' && q.e && Math.random() < 0.25) fx.push({ k: 'smoke', x: (q.e.x + q.e.w / 2) * T + Math.random() * 6 - 3, y: q.e.y * T + 2, vx: Math.random() * 6 - 3, vy: -14, life: 1.2, max: 1.2 });
    if (q.kind === 'melt' && q.e && Math.random() < 0.12) burst(q.e.x + Math.random() * q.e.w, q.e.y + Math.random() * q.e.h, 'spark');
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
  g.globalAlpha = night; px(0, 0, W, H, 0); g.globalAlpha = 1;
  if (radUntil > gameT) { g.globalAlpha = 0.12; px(0, 0, W, H, 11); g.globalAlpha = 1; }
  lg2.globalCompositeOperation = 'source-over'; lg2.fillStyle = '#000'; lg2.fillRect(0, 0, W, H); lg2.globalCompositeOperation = 'lighten';
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
function startRaid() {
  const targets = ents.filter(e => (BUILD[e.type].maint || e.isHub) && !String(e.type).startsWith('dormant'));
  if (!targets.length) return;
  const e = targets[Math.random() * targets.length | 0];
  raid = { x: e.x + (e.w >> 1), y: e.y + (e.h >> 1), left: 12 };
  seqNotice('DIMMER RAIDERS spotted near ' + (e.district ? e.district.name : BUILD[e.type].name) + '! They strike in 12 seconds. Security posts drive them off.');
}
function resolveRaid() {
  const r = raid; raid = null;
  if (covered(r.x, r.y)) { burst(r.x, r.y, 'repel'); toast('RAID REPELLED. The raiders melted back into the dark.'); beep(660, 0.1); beep(880, 0.15, 'square', 0.04, 0.08); storyEv('repel'); return; }
  const n = damageLines(r.x, r.y, 5, 0.7), near = ents.filter(e => BUILD[e.type].maint && !BUILD[e.type].fixed && Math.hypot(e.x - r.x, e.y - r.y) <= 6 && e.cond > 0);
  let hit = 0; for (let k = 0; k < 2 && near.length; k++) { if (Math.random() < 0.6) { near.splice(Math.random() * near.length | 0, 1)[0].cond = 0; hit++; } }
  burst(r.x, r.y, 'boom'); seqNotice('RAID! The Dimmers cut ' + n + ' lines and sabotaged ' + hit + ' machine(s). Repair it and build a security post.'); recompute(); storyEv('raid');
}
function opsTick() {
  const anyRest = DISTRICTS.some(d => d.restored), tp = totals[0];
  // 1) grid strain -> protection trip -> cascade
  const over = anyRest && tp.dem > tp.sup * 1.05 + 0.5;
  strain = over ? strain + 1 : Math.max(0, strain - 2);
  let ov = seqs.find(q => q.kind === 'overload');
  if (!ov && strain >= 10 && eventsOn) { ov = { kind: 'overload', stage: 1, left: 12 }; seqs.push(ov); seqNotice('GRID STRAIN: demand is above supply. Protection trips in 12s - add power or switch off load!'); }
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
    if (!raid && --raidT <= 0) { startRaid(); raidT = HOSTILE ? 45 + Math.random() * 40 : (170 / Math.max(1, THREAT)) + Math.random() * 90; }
  }
  if (raid && --raid.left <= 0) resolveRaid();
  // 4) station modules
  if (activeMods.has('autoswitch')) ents.forEach(e => { if (BUILD[e.type].bridge !== undefined && !e.on && !e.manual) { e.tripT = (e.tripT || 0) + 1; if (e.tripT >= 6) { e.on = true; e.tripT = 0; toast(BUILD[e.type].name + ' re-closed automatically.'); recompute(); } } else e.tripT = 0; });
  if (activeMods.has('forecast') && evT === 10) seqNotice('FORECAST: severe weather in 10 seconds.', false);
}
function opsAlerts() {
  const out = [];
  seqs.forEach(q => { if (q.kind === 'overload') out.push({ miss: [q.stage === 1 ? 'TRIP IN ' + q.left + 's' : q.stage === 2 ? 'CASCADE IN ' + q.left + 's' : 'CASCADE'], label: 'GRID STRAIN' }); if (q.kind === 'melt') out.push({ e: q.e, miss: ['BLOWS IN ' + q.left + 's'], label: BUILD[q.e.type].name + ' CRITICAL' }); });
  if (raid) out.push({ cable: raid.y * WW + raid.x, miss: ['STRIKE IN ' + raid.left + 's'], label: 'RAIDERS' });
  alerts.unshift(...out);
}
function opsHud() {
  const el = $('seq'); if (el) {
    let txt = '', cls = '';
    const q = seqs.find(s => s.kind === 'overload'), m = seqs.find(s => s.kind === 'melt');
    if (raid) { txt = '⚠ DIMMER RAIDERS - STRIKE IN ' + raid.left + 's'; cls = 'red'; }
    else if (q) { txt = q.stage === 1 ? '⚠ GRID STRAIN - TRIP IN ' + q.left + 's' : q.stage === 2 ? '⚠ PROTECTION TRIP - CASCADE IN ' + q.left + 's' : '⚠ CASCADE FAILURE'; cls = q.stage > 1 ? 'red' : 'amber'; }
    else if (m) { txt = '⚠ ' + BUILD[m.e.type].name + ' CRITICAL - ' + m.left + 's'; cls = 'red'; }
    el.textContent = txt; el.className = txt ? 'on ' + cls : '';
  }
  const gi = $('gridinfo'); if (gi) {
    const nInt = ents.filter(e => BUILD[e.type].importer && e.cond > 0).length, on = stationEnt && stationEnt.run;
    gi.innerHTML = `STATION ${on ? '<span class="pos">ONLINE</span>' : '<span class="neg">offline</span>'} - LINKED COUNTIES ${IMPORTS.links}<br>INTERTIES ${nInt}: +${Math.round(importedTotal[0])}P +${Math.round(importedTotal[1])}W +${Math.round(importedTotal[2])}N <small>(offered ${Math.round(IMPORTS.p)}/${Math.round(IMPORTS.w)}/${Math.round(IMPORTS.n)})</small>${HOSTILE ? '<br><span class="neg">HOSTILE COUNTY - raids are frequent</span>' : THREAT ? '<br><span class="neg">DIMMERS NEARBY - raids possible</span>' : ''}`;
  }
}
