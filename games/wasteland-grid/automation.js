'use strict';
// ============================================================
//  AUTOMATION.JS - less hassle.
//  * REPAIR DRONES: a DRONE BAY launches drones that fly out and fix failed machines, worn machines and damaged lines
//    by themselves. While you are away, a county with drone bays repairs its own outages (and suffers fewer of them).
//  * REPAIR ALL: one button in the STATUS tab fixes everything you can afford.
//  * AUTO-REPAIR (Settings > GAME, on by default): failed machines and broken lines are repaired from your scrap and parts.
//  * EMERGENCY FUEL (research): when the tank runs dry, scrap is turned into a little fuel automatically.
// ============================================================
const AS = () => ((typeof save !== 'undefined' && save && typeof D === 'function') ? D() : DIFFS[1]).assist || DIFFS[1].assist;      // what this difficulty allows
const Drones = {
  FLY: 70,                                                     // drone speed, world pixels per second
  count(d) { return d.drones.n + Math.round((TM().droneN || 0)); },
  range(d) { return d.drones.radius + (TM().droneRange || 0); },
  power() { return (TM().droneSpeed || 1); },
  taken: new Set(),
  // one game second: give idle drones a job, finish the jobs that are done
  tick() {
    const bays = ents.filter(e => BUILD[e.type].drones && e.run);
    this.taken = new Set(); for (const b of bays) for (const dr of b._dr || []) if (dr.job) this.taken.add(dr.job.key);
    let changed = false;
    for (const b of bays) {
      const d = BUILD[b.type], n = this.count(d), R = this.range(d), hx = b.x + b.w / 2, hy = b.y + b.h / 2;
      b._dr = b._dr || []; while (b._dr.length < n) b._dr.push({ x: hx * T, y: hy * T, job: null }); b._dr.length = n;
      for (const dr of b._dr) {
        if (dr.job) {
          const j = dr.job;
          if (j.eta > 0) { j.eta--; continue; }                  // still flying there (the picture glides along in draw())
          if (j.kind === 'line') { for (let L = 0; L < NL; L++) if (cab[L][j.i] === 2) { cab[L][j.i] = 1; changed = true; } dr.job = null; }
          else if (j.kind === 'mach') {
            const e = j.e; if (!ents.includes(e)) { dr.job = null; continue; }
            const was = e.cond; e.cond = Math.min(100, (e.cond <= 0 ? 15 : e.cond) + 20 * this.power() * d.drones.rate);
            if (was <= 0 && e.cond > 0) changed = true;
            if (e.cond >= 100) dr.job = null;
            if (Math.random() < 0.4) burst(e.x + Math.random() * e.w, e.y + Math.random() * e.h, 'repel');
          } else dr.job = null;
          continue;
        }
        const job = this.find(hx, hy, R); if (job) { job.eta = Math.ceil(Math.hypot(job.px - hx * T, job.py - hy * T) / (this.FLY * this.power())); dr.job = job; this.taken.add(job.key); }
      }
    }
    if (changed) recompute();
  },
  find(hx, hy, R) {
    let best = null, bd = 1e9;
    const consider = (kind, key, tx, ty, pri, extra) => { if (this.taken.has(key)) return; const dist = Math.hypot(tx - hx, ty - hy); if (dist > R) return; const score = dist + pri * 60; if (score < bd) { bd = score; best = { kind, key, px: tx * T, py: ty * T, ...extra }; } };
    for (const e of ents) { const d = BUILD[e.type]; if (!d.maint || e.cond >= 70) continue; consider('mach', 'e' + e.x + ',' + e.y, e.x + e.w / 2, e.y + e.h / 2, e.cond <= 0 ? 0 : e.cond < 40 ? 1 : 2, { e }); }
    const x0 = Math.max(0, Math.floor(hx - R)), x1 = Math.min(WW - 1, Math.ceil(hx + R)), y0 = Math.max(0, Math.floor(hy - R)), y1 = Math.min(WH - 1, Math.ceil(hy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * WW + x; for (let L = 0; L < NL; L++) if (cab[L][i] === 2) { consider('line', 'c' + i, x + 0.5, y + 0.5, 1, { i }); break; } }
    return best;
  },
  // every frame: drones glide to their jobs and back home
  draw(t, cx, cy, dt) {
    for (const b of ents) {
      if (!b._dr || !BUILD[b.type].drones) continue;
      const hx = (b.x + b.w / 2) * T, hy = (b.y + 0.4) * T, sp = this.FLY * this.power() * dt * (speed === 0 ? 0 : speed || 1);
      b._dr.forEach((dr, k) => {
        const idle = !dr.job || !b.run, tx = idle ? hx + (k - (b._dr.length - 1) / 2) * 4 : dr.job.px, ty = idle ? hy - 3 + Math.sin(t * 3 + k) : dr.job.py - 6 + Math.sin(t * 6 + k) * 1.5;
        const dx = tx - dr.x, dy = ty - dr.y, dist = Math.hypot(dx, dy);
        if (dist > 0.5) { const m = Math.min(1, sp / dist); dr.x += dx * m; dr.y += dy * m; }
        if (idle && dist < 2) return;                              // parked on the roof: hidden under the bay sprite
        const x = Math.round(dr.x - cx), y = Math.round(dr.y - cy);
        g.globalAlpha = 0.35; px(x - 3, y + 6, 7, 2, 0); g.globalAlpha = 1;                                        // shadow on the ground
        const spin = Math.floor(t * 20 + k) % 2;
        px(x - 4, y - 2, 9, 5, 0); px(x - 3, y - 1, 7, 3, 15); px(x - 2, y - 1, 5, 1, 4);                         // body with outline
        px(x - 6, y - 3, 3, 1, spin ? 3 : 15); px(x + 4, y - 3, 3, 1, spin ? 15 : 3);                              // spinning rotors
        px(x - 5, y - 2, 1, 1, 0); px(x + 5, y - 2, 1, 1, 0);
        px(x, y + 1, 1, 1, Math.floor(t * 6 + k) % 2 ? 14 : 5);                                                   // blinking light
        if (dr.job && !idle && dist < 6 && Math.floor(t * 10 + k) % 3 === 0) { g.globalAlpha = 0.7; px(x, y + 3, 1, 4, 14); px(x - 1, y + 6, 3, 1, 8); g.globalAlpha = 1; }   // repair beam
      });
    }
  },
  // on the world map: counties with drone bays clear their own outages
  offline(ind) {
    if (typeof save === 'undefined' || !save || !save.outage) return;
    save.dfix = save.dfix || {};
    const now = Date.now(), m = Mods.world();
    for (const id in save.outage) {
      const h = ind[id], dr = h && h.dr; if (!dr) { delete save.dfix[id]; continue; }
      if (typeof Builder !== 'undefined' && Builder.active && countyId === +id) continue;
      if (!save.dfix[id]) { save.dfix[id] = now; continue; }
      const need = Math.max(20000, 120000 / dr / (m.droneOut || 1) / AS().drone);
      if (now - save.dfix[id] >= need) {
        delete save.dfix[id]; const c = US.counties[id];
        clearOutage(c); news(`Repair drones fixed the outage at ${c.name} County.`);
        if (typeof mapActive !== 'undefined' && mapActive && typeof mapToast === 'function') mapToast(`REPAIR DRONES fixed the outage at ${c.name} COUNTY.`);
      }
    }
  },
};

// ---------- repair all / auto-repair ----------
const Fix = {
  machCost(e) { const miss = 100 - e.cond; return { sc: Math.ceil(miss * 0.4 * (TM().repair || 1) * (AS().fixAll || 1)), pt: Math.ceil(miss / 50) }; },
  list(onlyBroken) {
    const m = ents.filter(e => BUILD[e.type].maint && e.cond < (onlyBroken ? 1 : 100)).sort((a, b) => a.cond - b.cond);
    const lines = []; for (let i = 0; i < N; i++) for (let L = 0; L < NL; L++) if (cab[L][i] === 2) lines.push({ i, L, c: Math.ceil((LAYERS[L].cost || 1) * (AS().fixAll || 1)) });
    return { m, lines };
  },
  cost() { const { m, lines } = this.list(false); let sc = 0, pt = 0; m.forEach(e => { const c = this.machCost(e); sc += c.sc; pt += c.pt; }); lines.forEach(l => { sc += l.c; }); return { sc, pt, n: m.length + lines.length }; },
  // fix what you can afford, worst first; returns how many things were fixed
  run(onlyBroken, reserve = 0, quiet = false) {
    const { m, lines } = this.list(onlyBroken); let n = 0, sc = 0, pt = 0;
    for (const e of m) { const c = this.machCost(e); if (scrap - c.sc < reserve || stock.parts < c.pt) continue; scrap -= c.sc; stock.parts -= c.pt; e.cond = 100; sc += c.sc; pt += c.pt; n++; }
    for (const l of lines) { if (scrap - l.c < reserve) break; scrap -= l.c; cab[l.L][l.i] = 1; sc += l.c; n++; }
    if (n) { recompute(); if (!quiet) { toast(`REPAIRED ${n} THING${n > 1 ? 'S' : ''} (-${sc} scrap${pt ? ', -' + pt + ' parts' : ''})`); beep(660, 0.08, 'triangle'); beep(880, 0.08, 'triangle', 0.03, 0.06); } }
    return { n, sc, pt };
  },
  autoT: 0, autoN: 0, fuelT: 0,
  tick() {
    if (Settings.autoFix && AS().autoFix && DISTRICTS.some(x => x.restored)) {
      const r = this.run(true, 25, true); this.autoN += r.n;
      if (this.autoN && ++this.autoT >= 20) { toast(`AUTO-REPAIR fixed ${this.autoN} thing${this.autoN > 1 ? 's' : ''} (turn it off in Settings)`); this.autoN = 0; this.autoT = 0; }
    }
    const ef = AS().efuel, efc = 30 * ef;
    if (ef && Meta.has('fuelreserve') && ents.some(e => BUILD[e.type].fuel && e.cond > 0) && stock.fuel < fuelCap * 0.08 && scrap >= efc * 2 && gameT - this.fuelT >= 10) {
      this.fuelT = gameT; scrap -= efc; stock.fuel = Math.min(fuelCap, stock.fuel + 25); toast(`EMERGENCY FUEL: ${efc} scrap bought 25 fuel`); recompute();
    }
  },
  hud() {
    const b = $('btn-fixall'); if (!b) return;
    if (!AS().fixAll) { b.disabled = true; b.textContent = 'REPAIR ALL ' + '\u2715'; b.title = `REPAIR ALL is not available on ${D().name}. Repair by hand (V) or build drone bays.`; return; }
    const c = this.cost(); b.disabled = !c.n; b.textContent = c.n ? `REPAIR ALL ${c.sc}S${c.pt ? ' ' + c.pt + 'P' : ''}` : 'ALL GOOD';
    b.title = c.n ? `Repair ${c.n} damaged machines and lines for ${c.sc} scrap${c.pt ? ' and ' + c.pt + ' parts' : ''} (whatever you can afford is fixed first, worst first).` : 'Nothing is damaged.';
  },
};
$('btn-fixall').onclick = () => { if (!Builder.active || !AS().fixAll) return; const r = Fix.run(false, 0); if (!r.n) toast('NOTHING YOU CAN AFFORD TO REPAIR RIGHT NOW'); Fix.hud(); };
setInterval(() => { if (Builder.active) Fix.hud(); }, 1000);
