'use strict';
// ============================================================
//  RESEARCH.JS - research runs like a production line.
//  * Queue projects (double-click a node, or ADD TO QUEUE). Missing prerequisites are queued first, automatically.
//  * The project at the front fills up over time: it draws research points from your bank at RESEARCH SPEED
//    (faster every age, raised by Research Speed projects and Science skills).
//  * From the Electric Age, projects also use SCIENCE PACKS from the shared stockpile (alloys, circuits, components),
//    but only goods you can already make, so nothing can deadlock.
//  * It keeps running on the world map and while you play any county. Labs in counties you have left keep feeding
//    the bank too (see ages.js, production hubs).
//  Old saves: the bank, the finished projects and every other number stay exactly as they were.
// ============================================================
const Research = {
  MAXQ: 30, stall: '', rate: 0,
  speed() { const m = Mods.world(); return Math.round((3 + 3 * curAge()) * (m.labSpeed || 1) * 10) / 10; },
  packs(id) {
    const t = TECH[id], c = t.cost, p = {}, n = d => Math.max(1, Math.round(c / d));
    if (t.age === 3) { if (Meta.has('circuits')) p.circ = n(25); if (Meta.has('alloys')) p.alloy = n(40); }
    else if (t.age === 4) { if (Meta.has('components')) p.comp = n(50); if (Meta.has('circuits')) p.circ = n(40); }
    else if (t.age >= 5) { if (Meta.has('components')) p.comp = n(30); if (Meta.has('alloys')) p.alloy = n(60); }
    return p;
  },
  progress(id) { return Math.min(1, (Meta.pr[id] || 0) / TECH[id].cost); },
  index(id) { return Meta.q.indexOf(id); },
  // everything this project still needs, prerequisites first
  chain(id, out = []) {
    if (Meta.has(id) || out.includes(id)) return out;
    TECH[id].req.forEach(r => this.chain(r, out));
    out.push(id); return out;
  },
  add(id) {
    const t = TECH[id]; if (!t || Meta.has(id)) return 'done';
    const add = this.chain(id).filter(x => !Meta.q.includes(x));
    if (!add.length) return 'queued';
    if (Meta.q.length + add.length > this.MAXQ) return 'full';
    Meta.q.push(...add); Meta.save(); beep(520, 0.05); beep(780, 0.06, 'square', 0.03, 0.05); return 'ok';
  },
  remove(id) {
    const drop = new Set([id]); let grew = true;
    while (grew) { grew = false; for (const q of Meta.q) if (!drop.has(q) && TECH[q].req.some(r => drop.has(r))) { drop.add(q); grew = true; } }
    Meta.q = Meta.q.filter(q => !drop.has(q)); Meta.save(); beep(300, 0.05);
  },
  toFront(id) { if (this.index(id) < 0) this.add(id); const chain = this.chain(id).filter(x => Meta.q.includes(x)); Meta.q = [...chain, ...Meta.q.filter(x => !chain.includes(x))]; Meta.save(); },
  current() { return Meta.q.find(id => !Meta.has(id)) || null; },
  tick() {
    if (typeof Builder !== 'undefined' && Builder.active && typeof speed !== 'undefined' && speed === 0) { this.rate = 0; return; }   // paused county: research waits too
    Meta.q = Meta.q.filter(id => TECH[id] && !Meta.has(id));
    const id = Meta.q[0]; this.rate = 0;
    if (!id) { this.stall = ''; return; }
    const t = TECH[id];
    if (t.age > curAge()) { this.stall = `${t.name} opens in AGE ${['', 'I', 'II', 'III', 'IV', 'V'][t.age]}`; return; }
    if (!t.req.every(r => Meta.has(r))) { this.toFront(id); return; }
    const have = Meta.pr[id] || 0, need = t.cost - have;
    let d = Math.min(this.speed(), Meta.rp, need);
    if (d <= 1e-6) { this.stall = 'No research points in the bank - build labs, schools and archives'; return; }
    const pk = this.packs(id);
    for (const k in pk) { const per = pk[k] / t.cost; if (Pool.get(k) < per * d) d = Math.min(d, Pool.get(k) / per); }
    if (d <= 1e-6) { this.stall = 'Waiting for ' + Object.keys(pk).filter(k => Pool.get(k) < 0.01).map(k => GOODS[k].n.toLowerCase()).join(' and ') + ' in the shared stockpile'; return; }
    for (const k in pk) Pool.take(k, pk[k] / t.cost * d);
    Meta.rp -= d; Meta.pr[id] = have + d; Meta.dirty = true; this.rate = d; this.stall = '';
    if (Meta.pr[id] >= t.cost - 1e-6) this.complete(id);
  },
  complete(id) {
    const t = TECH[id]; Meta.done[id] = 1; delete Meta.pr[id]; Meta.q = Meta.q.filter(x => x !== id); Meta.save();
    if (typeof Variety !== 'undefined' && typeof CUR !== 'undefined' && CUR.mod) Variety.remod();
    if (typeof recalcMods === 'function' && typeof save !== 'undefined' && save) recalcMods();
    if (Builder.active) { recompute(); refreshToolbar(); storyEv('research'); }
    const un = techUnlocks(id), msg = `RESEARCH COMPLETE: ${t.name}${un.length ? ' - unlocks ' + un.join(', ') : ''}`;
    beep(660, 0.1); beep(880, 0.15, 'square', 0.04, 0.08);
    if (typeof news === 'function') try { news(msg); } catch (e) { /* no campaign yet */ }
    if (Builder.active) toast(msg); else if (typeof mapActive !== 'undefined' && mapActive && typeof mapToast === 'function') mapToast(msg);
  },
  eta(id) { const left = TECH[id].cost - (Meta.pr[id] || 0), s = this.speed(); return Math.ceil(left / Math.max(0.1, s)); },
  fmtT(s) { return s >= 3600 ? Math.floor(s / 3600) + 'h ' + Math.floor(s % 3600 / 60) + 'm' : s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's'; },
  // the queue strip in the research screen
  renderQueue() {
    const box = $('rqbar'); if (!box) return;
    const cur = Meta.q[0], R = ['', 'I', 'II', 'III', 'IV', 'V'];
    const head = `<div class="ph">RESEARCH QUEUE <span class="r">SPEED ${this.speed()} RP/s - BANK ${Math.floor(Meta.rp)} RP${Meta.q.length ? ' - ' + Meta.q.length + ' QUEUED' : ''}</span></div>`;
    const items = Meta.q.map((id, i) => {
      const t = TECH[id], pg = Math.round(this.progress(id) * 100), pk = this.packs(id);
      return `<div class="rqi ${i === 0 ? 'now' : ''}" style="--c:${BRANCH[t.br].color};--pg:${pg}%" data-rq="${id}"><b>${i + 1}. ${t.name}</b><small>${pg}%${t.age > curAge() ? ' - AGE ' + R[t.age] : ''}${Object.keys(pk).length ? ' - ' + Object.keys(pk).map(k => pk[k] + ' ' + GOODS[k].s).join(' ') : ''}</small><button class="mini" data-rqx="${id}" title="Remove from the queue">X</button><i></i></div>`;
    }).join('');
    box.innerHTML = head + (Meta.q.length ? `<div class="rqrow">${items}</div>` : '<p class="dim">Nothing queued. Double-click a project (or ADD TO QUEUE) - its missing prerequisites are queued for you.</p>') +
      (cur && this.stall ? `<p class="rqstall">${pxi('warn')} ${this.stall}</p>` : cur ? `<p class="dim">Now: ${TECH[cur].name}, about ${this.fmtT(this.eta(cur))} left at full speed.</p>` : '');
    box.querySelectorAll('[data-rqx]').forEach(b => { b.onclick = e => { e.stopPropagation(); this.remove(b.dataset.rqx); renderResearch(); }; });
    box.querySelectorAll('[data-rq]').forEach(b => { b.onclick = () => { techSel = b.dataset.rq; renderResearch(); }; });
  },
  hud() {
    const sub = $('rp-sub'); if (!sub) return;
    const id = Meta.q[0];
    sub.textContent = id ? (TECH[id].name.length > 11 ? TECH[id].name.slice(0, 10) + '.' : TECH[id].name) + ' ' + Math.round(this.progress(id) * 100) + '%' : 'RESEARCH';
    sub.classList.toggle('warn', !!(id && this.stall));
  },
};
ADD_KEYS.add('droneN'); ADD_KEYS.add('droneRange'); ADD_KEYS.add('droneSwitch');
setInterval(() => {
  Research.tick(); Research.hud();
  if ($('research').style.display === 'flex') {
    const key = Meta.q.join() + '|' + Object.keys(Meta.done).length;
    if (Research.dirtyView !== key) { Research.dirtyView = key; renderResearch(); return; }      // something finished or the queue changed: redraw everything
    Research.renderQueue(); $('rp-have').textContent = Math.floor(Meta.rp);
    document.querySelectorAll('#technodes .tn').forEach(b => { const v = Meta.pr[b.dataset.id]; if (v) b.style.setProperty('--pg', Math.round(Research.progress(b.dataset.id) * 100) + '%'); });
  }
}, 1000);
