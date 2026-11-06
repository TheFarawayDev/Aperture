'use strict';
// ============================================================
//  CONNECT.JS - your SIGNAL. You can only build where your connection reaches.
//  * It starts around your HOME BASE hub (the radius depends on the difficulty) and every RESTORED district hub.
//  * SAT RELAYS extend it. A new relay must sit inside your signal; it lights 2 tiles around itself and a corridor
//    2 tiles either side of the beam back to its neighbour. Chain them to build a main highway out to the districts
//    and plants. Each relay in a county costs more than the last. Research makes every relay light further.
//  * SAT TOWERS (Electric Age) reach much further and light a wide circle. SKYNET (Fusion Age) covers whole counties.
//  * When your signal first reaches a district or a dormant plant, salvagers you meet there pay a bonus.
//  * Older county saves: every tile you had already built on stays usable ("legacy" signal).
// ============================================================
ADD_KEYS.add('satRange'); ADD_KEYS.add('beam'); ADD_KEYS.add('homeR'); ADD_KEYS.add('hubR'); ADD_KEYS.add('satGrowth'); ADD_KEYS.add('fullCover');
const Net = {
  cov: null, legacy: null, links: [], nodes: [], key: '', cv: null, mini: null, reached: new Set(), first: true,
  // ---- the numbers (research, skills and difficulty move them) ----
  homeR() { const base = ((typeof save !== 'undefined' && save && typeof D === 'function') ? D().cover : 0) || 10; return base + (TM().homeR || 0); },
  hubR() { return 6 + (TM().hubR || 0); },
  beam() { return 2 + (TM().beam || 0) + (TM().satRange || 0); },                        // how far each relay lights the ground around it (and its corridor)
  range() { return this.homeR() + this.beam() + 3; },                                     // linking is generous: a relay inside your signal always finds its neighbour
  full() { return (TM().fullCover || 0) > 0; },
  satCost() {
    const n = ents.filter(e => e.type === 'sat').length, grow = Math.max(1.04, 1.12 - (TM().satGrowth || 0));
    return Math.round(12 * (TM().satCost || 1) * Math.pow(grow, n));
  },
  // ---- what is covered ----
  sources() {
    const out = [], home = DISTRICTS.find(d => d.home) || DISTRICTS[0];
    if (home) out.push({ x: home.x + 1, y: home.y + 1, r: this.homeR(), k: 'home' });
    for (const d of DISTRICTS) if (d.restored && d !== home) out.push({ x: d.x + 1, y: d.y + 1, r: this.hubR(), k: 'hub' });
    return out;
  },
  sig() { let s = DISTRICTS.map(d => d.restored ? 1 : 0).join('') + '|' + this.homeR() + this.hubR() + this.range() + this.beam() + (this.full() ? 'F' : ''); for (const e of ents) if (BUILD[e.type].relay) s += '|' + e.x + ',' + e.y; return s; },
  compute() {
    const cov = new Uint8Array(N), R = this.range(), B = this.beam();
    this.links = []; this.nodes = [];
    if (this.full()) { cov.fill(1); this.cov = cov; this.bake(); return; }
    const disk = (cx, cy, r) => { const r2 = r * r; for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(WH - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(WW - 1, Math.ceil(cx + r)); x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r2) cov[y * WW + x] = 1; } };
    const capsule = (ax, ay, bx, by, r) => {
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r)), x1 = Math.min(WW - 1, Math.ceil(Math.max(ax, bx) + r)), y0 = Math.max(0, Math.floor(Math.min(ay, by) - r)), y1 = Math.min(WH - 1, Math.ceil(Math.max(ay, by) + r));
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, r2 = r * r;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px2 = x + 0.5, py2 = y + 0.5, t = Math.max(0, Math.min(1, ((px2 - ax) * vx + (py2 - ay) * vy) / L2)), dx = px2 - (ax + vx * t), dy = py2 - (ay + vy * t); if (dx * dx + dy * dy <= r2) cov[y * WW + x] = 1; }
    };
    const srcs = this.sources(); srcs.forEach(s => disk(s.x, s.y, s.r));
    const conn = srcs.map(s => ({ x: s.x, y: s.y, reach: R, k: s.k }));
    const sats = ents.filter(e => BUILD[e.type].relay).map(e => { const d = BUILD[e.type]; return { e, x: e.x + e.w / 2, y: e.y + e.h / 2, reach: R * (d.relay.mult || 1), r: d.relay.r ? B + d.relay.r : 0, on: false }; });
    let grew = true;
    while (grew) {                                                     // relays link to the nearest connected node in range
      grew = false;
      for (const s of sats) {
        if (s.on) continue;
        let best = null, bd = 1e9;
        for (const c of conn) { const d = Math.hypot(c.x - s.x, c.y - s.y); if (d <= Math.max(c.reach, s.reach) && d < bd) { bd = d; best = c; } }
        if (best) { s.on = true; conn.push(s); this.links.push([best.x, best.y, s.x, s.y]); grew = true; }
      }
    }
    for (const [ax, ay, bx, by] of this.links) capsule(ax, ay, bx, by, B + 0.5);
    for (const s of sats) if (s.on) disk(s.x, s.y, Math.max(B + 0.5, s.r));
    if (this.legacy) for (let i = 0; i < N; i++) if (this.legacy[i]) cov[i] = 1;
    this.nodes = conn; this.sats = sats; this.cov = cov; this.bake(); this.checkReached();
  },
  refresh() { const k = this.sig(); if (k !== this.key || !this.cov) { this.key = k; this.compute(); dirty.mini = true; } },
  covered(x, y) { if (!this.cov) this.refresh(); return inb(x, y) && this.cov[y * WW + x] === 1; },
  areaCovered(x, y, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!this.covered(x + i, y + j)) return false; return true; },
  // where would a new relay at (x,y) link to?
  linkFor(x, y, d) {
    this.refresh(); const sx = x + d.w / 2, sy = y + d.h / 2, myReach = this.range() * (d.relay.mult || 1);
    let best = null, bd = 1e9;
    for (const c of this.nodes) { const dd = Math.hypot(c.x - sx, c.y - sy); if (dd <= Math.max(c.reach, myReach) && dd < bd) { bd = dd; best = c; } }
    return best;
  },
  // ---- picture: dim everything outside the signal, draw the beams ----
  bake() {
    const W = WW * T, H = WH * T;
    if (!this.cv) { this.cv = document.createElement('canvas'); this.mini = document.createElement('canvas'); }
    this.cv.width = W; this.cv.height = H; this.mini.width = WW; this.mini.height = WH;
    const k = this.cv.getContext('2d'), m = this.mini.getContext('2d'), c = this.cov;
    k.fillStyle = 'rgba(4,6,9,0.46)'; m.fillStyle = 'rgba(0,0,0,0.5)';
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (!c[y * WW + x]) { k.fillRect(x * T, y * T, T, T); m.fillRect(x, y, 1, 1); }
    k.fillStyle = PAL[14]; k.globalAlpha = 0.55;                     // a thin cyan edge where the signal ends
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      if (!c[y * WW + x]) continue;
      if (x > 0 && !c[y * WW + x - 1]) k.fillRect(x * T, y * T, 1, T); if (x < WW - 1 && !c[y * WW + x + 1]) k.fillRect(x * T + T - 1, y * T, 1, T);
      if (y > 0 && !c[(y - 1) * WW + x]) k.fillRect(x * T, y * T, T, 1); if (y < WH - 1 && !c[(y + 1) * WW + x]) k.fillRect(x * T, y * T + T - 1, T, 1);
    }
    k.globalAlpha = 1;
  },
  drawUnder(cx, cy) { this.refresh(); if (this.cv && !this.full()) g.drawImage(this.cv, -cx, -cy); },
  drawOver(t, cx, cy) {
    if (Settings.lite || !this.links.length) return;
    g.globalAlpha = 0.55;
    for (const [ax, ay, bx, by] of this.links) {                        // dashed beams with a travelling pulse
      const len = Math.hypot(bx - ax, by - ay) * T, n = Math.max(1, Math.floor(len / 6)), ph = (t * 3) % 1;
      for (let i = 0; i < n; i++) { const f = (i + ph) / n, x = (ax + (bx - ax) * f) * T - cx, y = (ay + (by - ay) * f) * T - cy; px(x - 0.5 | 0, y - 0.5 | 0, 1, 1, i % 4 === 0 ? 8 : 14); }
    }
    g.globalAlpha = 1;
  },
  // placing a relay: show where it links and how far it can reach
  ghost(t, cx, cy) {
    const d = BUILD[tool.type]; if (!d || !d.relay || !mouse.in) return;
    const best = this.linkFor(hover.x, hover.y, d), sx = (hover.x + d.w / 2) * T - cx, sy = (hover.y + d.h / 2) * T - cy;
    const near = best || this.nodes.reduce((a, c) => (!a || Math.hypot(c.x - hover.x, c.y - hover.y) < Math.hypot(a.x - hover.x, a.y - hover.y)) ? c : a, null);
    if (!near) return;
    const nx = near.x * T - cx, ny = near.y * T - cy, ok = !!best && this.areaCovered(hover.x, hover.y, d.w, d.h), lit = (d.relay.r ? this.beam() + d.relay.r : this.beam() + 0.5) * T;
    g.strokeStyle = PAL[ok ? 12 : 5]; g.globalAlpha = 0.8; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(nx, ny); g.lineTo(sx, sy); g.stroke();
    g.globalAlpha = ok ? 0.55 : 0.3; g.beginPath(); g.arc(sx, sy, lit, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  },
  drawMini() { if (this.mini && !this.full()) { mmg.imageSmoothingEnabled = false; mmg.drawImage(this.mini, 0, 0, mm.width, mm.height); } },
  // ---- the fun part: first contact with a district or a dormant plant pays ----
  checkReached() {
    if (restoring || !Builder.active) return;
    const bonus = TM().reachBonus || 1; let msg = '';
    DISTRICTS.forEach((d, k) => {
      const key = 'd' + k; if (this.reached.has(key)) return;
      if (this.areaCovered(d.x, d.y, 2, 2)) { this.reached.add(key); if (!d.home && !this.first) { const s = Math.round((25 + 10 * this.reached.size) * bonus); scrap += s; msg = `SIGNAL REACHED ${d.name}: salvagers there hand over ${s} scrap.`; } }
    });
    SITES.forEach((st, k) => {
      const key = 's' + k; if (this.reached.has(key)) return;
      if (this.covered(st.x + 1, st.y + 1)) { this.reached.add(key); if (!this.first) { const p = Math.round(3 * bonus); stock.parts += p; msg = `SIGNAL REACHED the dormant ${SITE_NAME[st.kind] || 'PLANT'} site: +${p} parts left in its stores.`; } }
    });
    this.first = false;
    if (msg) { toast(msg); beep(523, 0.1, 'square', 0.04); beep(784, 0.12, 'square', 0.04, 0.08); }
  },
  // ---- county start / save / load ----
  reset() { this.cov = null; this.legacy = null; this.key = ''; this.links = []; this.nodes = []; this.reached = new Set(); this.first = true; },
  dump() { return { lg: this.legacy ? rleEnc(this.legacy) : null, rc: [...this.reached] }; },
  restore(s) {
    if (s && s.nv) { this.legacy = s.nv.lg ? rleDec(s.nv.lg, N) : null; this.reached = new Set(s.nv.rc || []); this.first = !s.nv.rc; }
    else if (s) {                                                       // a save from before the signal existed: keep everything already built usable
      const lg = new Uint8Array(N), mark = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (inb(x + i, y + j)) lg[(y + j) * WW + x + i] = 1; };
      for (let i = 0; i < N; i++) if (cab.some(a => a[i])) mark(i % WW, (i / WW) | 0);
      for (const e of ents) if (!BUILD[e.type].fixed && !BUILD[e.type].isHub) for (let j = 0; j < e.h; j++) for (let i = 0; i < e.w; i++) mark(e.x + i, e.y + j);
      this.legacy = lg; this.first = true;
    }
    this.key = '';
  },
};
