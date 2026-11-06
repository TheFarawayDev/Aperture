'use strict';
// ============================================================
//  INVENTORY.JS - the SHARED INVENTORY between counties.
//  * One stockpile for every county: scrap, parts and fuel (sent by you), plus alloys, circuits and components (made by
//    factories). Open it from the stockpile chip in a county's header, or press I on the world map.
//  * SEND / TAKE: a county with a running CARGO DEPOT (research Inter-County Freight) or SUPPLY EXCHANGE can ship scrap,
//    parts and fuel in and out. Sending costs a handling fee (15%; Freight Insurance halves it, Bonded Warehouses remove it).
//  * AUTOMATION: supply exchanges keep parts and fuel between the marks you set here, and a full warehouse can ship its
//    surplus scrap to the stockpile instead of selling it.
//  * Old campaigns: the stockpile keeps what it had; the new settings start on sensible defaults.
// ============================================================
GOODS.scrap = { n: 'SCRAP', s: 'SC', c: '#d9b56a' };
if (!GOOD_IDS.includes('scrap')) GOOD_IDS.unshift('scrap');
const SHIP_IDS = ['scrap', 'parts', 'fuel'];
const Inv = {
  set() { const d = { pLo: 12, pHi: 40, fLo: 30, fHi: 85, scrapOver: true, autoParts: true, autoFuel: true }; if (typeof save === 'undefined' || !save) return d; save.xset = Object.assign(d, save.xset || {}); return save.xset; },
  fee() { const m = (typeof Builder !== 'undefined' && Builder.active) ? TM() : Mods.world(); const f = m.xferFee; return Math.max(0, 0.15 * (f === undefined ? 1 : f)); },
  dock() { return typeof Builder !== 'undefined' && Builder.active && ents.some(e => (BUILD[e.type].cargo || BUILD[e.type].exchange) && e.run); },
  open() { return typeof save !== 'undefined' && save && (curAge() >= 3 || Meta.has('freight1') || Object.values(save.pool || {}).some(v => v > 0.5)); },
  have(k) { return k === 'scrap' ? scrap : stock[k] || 0; },
  room(k) { return k === 'scrap' ? Math.max(0, Flows.scrapCap() - scrap) : k === 'fuel' ? Math.max(0, fuelCap - stock.fuel) : 1e9; },
  give(k, v) { if (k === 'scrap') scrap += v; else stock[k] = (stock[k] || 0) + v; },
  send(k, amt) {
    if (!this.dock()) return this.say('Build and power a CARGO DEPOT or SUPPLY EXCHANGE in this county to ship goods.');
    const v = Math.floor(Math.min(amt, this.have(k))); if (v <= 0) return this.say('Nothing to send.');
    const kept = v * (1 - this.fee()); this.give(k, -v); Pool.add(k, kept);
    this.say(`Sent ${v} ${GOODS[k].n.toLowerCase()} - ${Pool.fmt(kept)} reached the stockpile${this.fee() ? ' after the handling fee' : ''}.`); beep(440, 0.05); beep(660, 0.06, 'square', 0.03, 0.04);
  },
  take(k, amt) {
    if (!this.dock()) return this.say('Build and power a CARGO DEPOT or SUPPLY EXCHANGE in this county to take goods.');
    const v = Math.floor(Math.min(amt, Pool.get(k), this.room(k))); if (v <= 0) return this.say(Pool.get(k) < 1 ? 'The stockpile has none of that.' : 'No room for it here (warehouse or fuel tank full).');
    Pool.take(k, v); this.give(k, v); this.say(`Took ${v} ${GOODS[k].n.toLowerCase()} from the stockpile.`); beep(660, 0.05); beep(440, 0.06, 'square', 0.03, 0.04);
  },
  msg: '', say(t) { this.msg = t; if ($('inv').style.display === 'flex') this.render(); return false; },
  // a full warehouse ships its surplus here instead of selling it (when you want that and a dock is running)
  overflow(ex) { if (!this.set().scrapOver || !this.dock()) return false; Pool.add('scrap', ex * (1 - this.fee())); return true; },
  render() {
    const S = this.set(), inCounty = typeof Builder !== 'undefined' && Builder.active, dock = this.dock(), fee = Math.round(this.fee() * 100);
    $('inv-top').innerHTML = `<span>${inCounty ? `COUNTY <b>${Builder.name}</b>` : 'WORLD MAP'}</span><span>SHIPPING <b class="${dock ? 'pos' : 'neg'}">${dock ? 'ONLINE' : inCounty ? 'NO DOCK' : 'OPEN A COUNTY'}</b></span><span>HANDLING FEE <b>${fee}%</b></span><span>HUBS <b>${Pool.hubs().filter(h => h.on).length}</b> online</span>`;
    $('inv-pool').innerHTML = `<div class="ph">STOCKPILE <span class="r">per minute</span></div>` + GOOD_IDS.map(k => { const r = (Pool.rate[k] || 0) * 60; return `<div class="pgood" style="--c:${GOODS[k].c}">${goodIcon(k)}<span>${GOODS[k].n}</span><b>${Pool.fmt(Pool.get(k))}</b><small class="${r < -0.05 ? 'neg' : r > 0.05 ? 'pos' : ''}">${Math.abs(r) < 0.05 ? '-' : (r > 0 ? '+' : '') + r.toFixed(1)}</small></div>`; }).join('') +
      `<p class="dim">Alloys, circuits and components come from factories (production hubs keep making them while you play elsewhere). Scrap, parts and fuel are whatever counties ship here.</p>`;
    const row = k => `<div class="shiprow" style="--c:${GOODS[k].c}">${goodIcon(k)}<div class="shn"><b>${GOODS[k].n}</b><small>here ${inCounty ? Math.floor(this.have(k)) : '-'} - stockpile ${Pool.fmt(Pool.get(k))}</small></div>
      <div class="shb"><button data-s="${k}" data-n="10">SEND 10</button><button data-s="${k}" data-n="50">50</button><button data-s="${k}" data-n="1e9">ALL</button></div>
      <div class="shb"><button data-t="${k}" data-n="10">TAKE 10</button><button data-t="${k}" data-n="50">50</button><button data-t="${k}" data-n="1e9">MAX</button></div></div>`;
    $('inv-ship').innerHTML = `<div class="ph">SHIP GOODS <span class="r">${inCounty ? (dock ? 'dock online' : 'needs a cargo depot') : 'open a county to ship'}</span></div>` + SHIP_IDS.map(row).join('') +
      `<p class="invmsg ${this.msg ? '' : 'dim'}">${this.msg || (inCounty ? (dock ? `Sending loses ${fee}% to handling. Taking is free.` : 'Build a CARGO DEPOT (CONTROL tab, research Inter-County Freight) or a SUPPLY EXCHANGE and give it power and net.') : 'Shipping happens from inside a county.')}</p>`;
    const step = (key, d, unit, label) => `<div class="stp"><small>${label}</small><button data-k="${key}" data-d="${-d}" aria-label="${label} down">-</button><b>${S[key]}${unit}</b><button data-k="${key}" data-d="${d}" aria-label="${label} up">+</button></div>`;
    $('inv-auto').innerHTML = `<div class="ph">AUTOMATION <span class="r">supply exchanges</span></div>
      <div class="arule"><label class="chk"><input type="checkbox" id="xs-parts" ${S.autoParts ? 'checked' : ''}> <span>Keep <b>PARTS</b> between</span></label><div class="stps">${step('pLo', 4, '', 'LOW')}${step('pHi', 10, '', 'HIGH')}</div></div>
      <div class="arule"><label class="chk"><input type="checkbox" id="xs-fuel" ${S.autoFuel ? 'checked' : ''}> <span>Keep <b>FUEL</b> between (% of the tank)</span></label><div class="stps">${step('fLo', 5, '%', 'LOW')}${step('fHi', 5, '%', 'HIGH')}</div></div>
      <div class="arule"><label class="chk"><input type="checkbox" id="xs-scrap" ${S.scrapOver ? 'checked' : ''}> <span>A full warehouse ships its surplus <b>SCRAP</b> here instead of selling it (needs a dock)</span></label></div>
      <p class="dim">Below the low mark an exchange imports from the stockpile; above the high mark it exports. These settings apply to every county.</p>`;
    const hubs = Pool.hubs();
    $('inv-hubs').innerHTML = `<div class="ph">PRODUCTION HUBS <span class="r">offline output ${Math.round(Pool.efficiency() * 100)}%</span></div>` + (hubs.length ? hubs.map(x => `<div class="hubrow ${x.on ? '' : 'off'}"><b>${x.c.name}</b><span>${x.here ? 'YOU ARE HERE' : x.on ? 'ONLINE' : save.outage[x.id] ? 'OUTAGE' : 'NOT RESTORED'}</span><small>${x.rp ? `+${(x.rp * 60).toFixed(0)} RP ` : ''}${Object.keys(x.p).map(k => `+${(x.p[k] * 60).toFixed(1)} ${GOODS[k].s}`).join(' ')}${Object.keys(x.u).length ? ' / ' + Object.keys(x.u).map(k => `-${(x.u[k] * 60).toFixed(1)} ${GOODS[k].s}`).join(' ') : ''} per min</small></div>`).join('') : '<p class="dim">Restore a county with factories or labs and it keeps working for you while you are elsewhere.</p>');
    const bind = (sel, fn) => document.querySelectorAll(sel).forEach(b => { b.onclick = () => { fn(b); this.render(); }; });
    bind('#inv [data-s]', b => this.send(b.dataset.s, +b.dataset.n)); bind('#inv [data-t]', b => this.take(b.dataset.t, +b.dataset.n));
    document.querySelectorAll('#inv [data-s], #inv [data-t]').forEach(b => { b.disabled = !dock; });
    bind('#inv [data-k]', b => { const k = b.dataset.k, lim = { pLo: [0, 400], pHi: [10, 990], fLo: [0, 95], fHi: [10, 100] }[k]; S[k] = Math.max(lim[0], Math.min(lim[1], S[k] + +b.dataset.d)); if (S.pLo >= S.pHi) S.pHi = S.pLo + 10; if (S.fLo >= S.fHi) S.fHi = Math.min(100, S.fLo + 5); writeSave(); });
    $('xs-parts').onchange = e => { S.autoParts = e.target.checked; writeSave(); }; $('xs-fuel').onchange = e => { S.autoFuel = e.target.checked; writeSave(); }; $('xs-scrap').onchange = e => { S.scrapOver = e.target.checked; writeSave(); };
  },
  show() { if (!this.open()) { if (typeof toast === 'function' && Builder.active) toast('The shared inventory opens with Inter-County Freight research (or the Electric Age).'); else say('The shared inventory opens with Inter-County Freight research (or the Electric Age).'); return; } this.msg = ''; this.render(); $('inv').style.display = 'flex'; },
};
// the supply exchange follows the marks above
Pool.exchange = function (list) {
  const n = Math.min(3, list.filter(e => e.run && BUILD[e.type].exchange).length); if (!n) return;
  const S = Inv.set(), r = n * ((typeof TM === 'function' && TM().exportRate) || 1);
  const trade = (key, have, hi, lo, perSec) => {
    if (have > hi) { const v = Math.min(perSec * r, have - hi); this.add(key, v * (1 - Inv.fee())); return -v; }
    if (have < lo && this.get(key) > 0) return this.take(key, Math.min(perSec * r, lo - have));
    return 0;
  };
  if (S.autoParts) stock.parts += trade('parts', stock.parts, S.pHi, S.pLo, 1.5);
  if (S.autoFuel) stock.fuel += trade('fuel', stock.fuel, fuelCap * S.fHi / 100, fuelCap * S.fLo / 100, 4);
};
function goodIcon(k) { return `<i class="gi gi-${k}"></i>`; }
$('inv-close').onclick = () => { $('inv').style.display = 'none'; };
$('poolchip').onclick = () => Inv.show();
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.tagName === 'INPUT')) return;
  if ($('inv').style.display === 'flex' && (e.key === 'Escape' || (e.key.toLowerCase() === 'i' && !Builder.active))) { $('inv').style.display = 'none'; e.stopPropagation(); e.preventDefault(); return; }
  if (Scenes.is('map') && e.key.toLowerCase() === 'i' && !overlayOpen() && !anim) { e.preventDefault(); Inv.show(); }
}, true);
setInterval(() => { if ($('inv').style.display === 'flex') Inv.render(); }, 1000);
