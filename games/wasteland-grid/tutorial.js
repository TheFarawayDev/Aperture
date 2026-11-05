'use strict';
// ============================================================
//  TUTORIAL.JS - a guided, hands-on tutorial.
//  A coach card tells you what to do, glowing rings point at the exact buttons and buildings,
//  and each step waits until you really did it (or you press NEXT). Two tutorials share the engine:
//   * Tutorial     - inside a county (camera, zoom, lines, hubs, houses, research, repair, plants...)
//   * MapTutorial  - on the world map (landing, counties, contracts, the Union, search...)
//  Both can be skipped at any time, replayed from the GUIDE / SETTINGS, and are remembered per browser.
// ============================================================
const Coach = {
  side: (() => { try { return localStorage.getItem('wastelandGrid.coachSide') || 'left'; } catch (e) { return 'left'; } })(),
  owner: null, pool: [],
  hide(o) { if (o && this.owner && this.owner !== o) return; this.owner = null; $('coach').style.display = 'none'; this.rings([]); },
  rings(list) {                                                  // list of [element, label]
    const box = $('coach-rings'), z = Display.z || 1;
    while (this.pool.length < list.length) { const d = document.createElement('div'); d.className = 'cring'; box.appendChild(d); this.pool.push(d); }
    this.pool.forEach((d, i) => {
      const it = list[i]; if (!it) { d.style.display = 'none'; return; }
      const r = it[0].getBoundingClientRect(); if (r.width < 2 || r.height < 2) { d.style.display = 'none'; return; }
      d.style.display = 'block'; d.dataset.l = it[1] || '';
      d.style.left = (r.left - 5) / z + 'px'; d.style.top = (r.top - 5) / z + 'px'; d.style.width = (r.width + 10) / z + 'px'; d.style.height = (r.height + 10) / z + 'px';
    });
  },
  render(o, s) {
    this.owner = o; const c = $('coach'); c.style.display = 'block'; c.classList.toggle('right', this.side === 'right');
    $('coach-step').textContent = (o.idx + 1) + '/' + o.steps.length; { const b = $('coach-bar'); if (b && b.firstChild) b.firstChild.style.width = Math.round((o.idx + 1) / o.steps.length * 100) + '%'; } $('coach-title').textContent = s.title; $('coach-text').innerHTML = s.text;
    const sat = !!o.sat, need = $('coach-need');
    need.className = sat ? 'ok' : ''; need.innerHTML = sat ? pxi('check') + ' DONE' : s.ack ? '' : (s.need ? pxi('arrow') + ' ' + s.need : '');
    need.style.display = need.innerHTML ? 'block' : 'none';
    $('coach-next').style.display = (s.ack || sat || o.hold) ? '' : 'none'; $('coach-next').textContent = o.idx === o.steps.length - 1 ? 'FINISH' : 'NEXT';
    $('coach-back').style.display = o.idx > 0 ? '' : 'none';
    const els = []; (s.hl || []).forEach(h => { const r = typeof h === 'function' ? h() : h; (Array.isArray(r) ? r : [r]).forEach(x => { if (!x) return; const el = typeof x === 'string' ? document.querySelector(x) : x; if (el) els.push([el, el._coachLabel || '']); }); });
    (s.labels || []).forEach((l, i) => { if (els[i]) els[i][1] = l; });
    this.rings(els);
  },
};
function Tutor(key, steps, ctx) { this.key = key; this.steps = steps; this.ctx = ctx; this.idx = 0; this.entered = -1; this.sat = 0; this.hold = false; this.back = false; this.world = []; this.path = null; }
Tutor.prototype = {
  load() { try { const v = localStorage.getItem(this.key); this.idx = v === null ? 0 : Math.max(0, +v || 0); } catch (e) { this.idx = 0; } this.entered = -1; this.sat = 0; },
  persist() { try { localStorage.setItem(this.key, String(this.idx)); } catch (e) { /* ignore */ } },
  active() { return this.idx < this.steps.length; },
  step() { return this.steps[this.idx]; },
  update() {
    if (!this.active() || !this.ctx()) { this.world = []; this.path = null; Coach.hide(this); return; }
    if (Coach.owner && Coach.owner !== this) return;
    if (['story', 'dialog', 'card'].some(id => $(id) && $(id).style.display === 'flex')) { Coach.hide(this); return; }      // stories and dialogs always come first
    const s = this.step(); if (s.when && !s.when()) { this.world = []; this.path = null; Coach.hide(this); return; }
    if (this.entered !== this.idx) this.enter(s);
    if (s.check && !this.sat && s.check()) this.sat = performance.now();
    if (this.sat && !s.ack && !this.hold && performance.now() - this.sat > 1000) { this.next(); return; }
    this.world = s.world ? s.world() : []; this.path = s.path ? s.path() : null;
    Coach.render(this, s);
  },
  enter(s) {
    this.entered = this.idx; this.sat = 0; this.hold = this.back; this.back = false;
    if (s.on) s.on();
    if (s.check && s.check()) this.sat = performance.now();
    beep(520, 0.05, 'triangle');
  },
  next() { if (this.idx >= this.steps.length) return; this.idx++; this.persist(); this.entered = -1; this.sat = 0; beep(660, 0.07); beep(880, 0.09, 'square', 0.03, 0.06); if (!this.active()) { this.world = []; this.path = null; Coach.hide(this); if (this.onDone) this.onDone(); } else this.update(); },
  prev() { if (this.idx > 0) { this.idx--; this.persist(); this.entered = -1; this.back = true; this.update(); } },
  skip() { this.idx = this.steps.length; this.persist(); this.world = []; this.path = null; Coach.hide(this); if (typeof refreshTip === 'function') refreshTip(true); },
  restart() { this.idx = 0; this.persist(); this.entered = -1; this.sat = 0; if (typeof refreshTip === 'function') refreshTip(true); },
  advance() { this.next(); },
  // ----- world-space highlights (drawn inside the county view, in world pixels) -----
  drawWorld(t, cx, cy) {
    if (!this.world.length && !this.path) return;
    const pulse = 2 + Math.round(Math.sin(t * 6) * 1.5), blink = Math.floor(t * 4) % 2;
    if (this.path) {                                                // dotted guide line
      const [a, b] = this.path, n = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]) / 4 | 0);
      for (let i = 0; i <= n; i++) if ((i + Math.floor(t * 8)) % 3 === 0) { const k = i / n; px(a[0] * T + T / 2 + (b[0] - a[0]) * T * k - cx, a[1] * T + T / 2 + (b[1] - a[1]) * T * k - cy, 2, 2, 8); }
    }
    for (const r of this.world) {
      const x = r.x * T - cx, y = r.y * T - cy, w = r.w * T, h = r.h * T;
      if (x + w < 0 || y + h < 0 || x > VW || y > VH) {             // off screen: point towards it from the edge
        const mx = Math.max(8, Math.min(VW - 8, x + w / 2)), my = Math.max(8, Math.min(VH - 8, y + h / 2));
        px(mx - 3, my - 3, 7, 7, 0); px(mx - 2, my - 2, 5, 5, blink ? 8 : 6); continue;
      }
      g.strokeStyle = PAL[blink ? 8 : 6]; g.strokeRect(x - pulse + 0.5, y - pulse + 0.5, w + pulse * 2 - 1, h + pulse * 2 - 1);
      g.strokeStyle = PAL[0]; g.strokeRect(x - pulse - 0.5, y - pulse - 0.5, w + pulse * 2 + 1, h + pulse * 2 + 1);
      if (r.l) label(r.l, x + w / 2, y - 12 - pulse, 8);
    }
  },
};
// ---------- helpers for the steps ----------
const E1 = type => ents.find(e => e.type === type);
const homeD = () => DISTRICTS.find(d => d.home) || DISTRICTS[0];
const toolBtn = name => () => [...document.querySelectorAll('#tools button')].find(b => b._t && b._t.name === name) || null;
const catBtn = cat => () => document.querySelector('#cats button[data-cat="' + cat + '"]');
const tabBtn = n => () => document.querySelector('#tabs button[data-tab="' + n + '"]');
const wr = (e, l) => e ? { x: e.x, y: e.y, w: e.w, h: e.h, l } : null;
const showCat = c => { activeCat = c; renderTools(); };
const isTool = (k, L) => tool && tool.kind === k && (L === undefined || tool.L === L);
let tutCam = null, tutZoom = 1;

const COUNTY_STEPS = [
  { title: 'WELCOME, ENGINEER', ack: true, on: () => { goHome(); setSpeed(1); tutCam = { x: camX, y: camY }; tutZoom = camZ; },
    text: 'This is a <b>hands-on tutorial</b>. You will light your first district yourself. Glowing rings always show you what to look at. Skip it any time, replay it later from the GUIDE.<br><br>Three dead machines sit by your <b>HOME BASE</b>: a generator, a water pump and a network router. None of them are connected yet.',
    world: () => [wr(E1('generator'), 'GENERATOR'), wr(E1('pump'), 'PUMP'), wr(E1('router'), 'ROUTER'), wr(homeD().hub, 'HUB')].filter(Boolean) },
  { title: 'LOOK AROUND', on: () => { tutCam = { x: camX, y: camY }; }, need: 'Move the camera: WASD / arrow keys, or hold the right mouse button and drag.', hl: ['#game'],
    text: 'Pan the camera around the county. <kbd>WASD</kbd> or the arrows move it (hold <kbd>SHIFT</kbd> to go faster). You can also drag with the <b>right</b> or <b>middle</b> mouse button, drag with the left button while the <b>inspect</b> tool is active, or hold <kbd>SPACE</kbd> and drag with any tool.',
    check: () => tutCam && Math.hypot(camX - tutCam.x, camY - tutCam.y) > 40 },
  { title: 'ZOOM', need: 'Scroll the mouse wheel, or press + / -.', hl: ['#gzoom'], on: () => { tutZoom = camZ; },
    text: 'Zoom the play area with the <b>mouse wheel</b> or <kbd>+</kbd> / <kbd>-</kbd>. Zoom out to plan, zoom in to place things precisely. The buttons in the corner do the same, and <kbd>\\</kbd> resets.',
    check: () => camZ !== tutZoom },
  { title: 'THE MINIMAP', ack: true, hl: ['#minimap'],
    text: 'The <b>minimap</b> shows the whole county. Click or drag on it to jump anywhere. Red squares are hubs without power, and broken machines flash on it later.',
    on: () => { goHome(); } },
  { title: 'YOUR HUB', ack: true, on: () => { goHome(); },
    text: 'A <b>hub</b> is a small town. It wakes up when it receives <b>all three</b> utilities: <b>power</b> (yellow), <b>water</b> (blue) and <b>network</b> (green). Each utility has its own line layer; lines of different types can cross without mixing.',
    world: () => [wr(homeD().hub, 'HUB')].filter(Boolean) },
  { title: 'PICK THE POWER LINE', need: 'Click POWER LINE in the build panel (or press 1).', tab: 'build',
    on: () => { showTab('build'); showCat('LINES'); },
    hl: [toolBtn('POWER LINE')], text: 'Open the <b>BUILD</b> panel and choose <b>POWER LINE</b>. Its colour matches the lines it lays. Keys <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> pick power, water and network lines.',
    check: () => isTool('cable', 0) },
  { title: 'POWER THE PUMP', need: 'Drag from the generator to the pump. Hold SHIFT for straight lines.',
    on: () => { showTab('build'); },
    text: 'Left-drag from the <b>generator</b> to the <b>water pump</b>. The line glows when power flows. A pump needs 2 power to run, and the generator gives 8.',
    world: () => [wr(E1('generator'), 'GENERATOR'), wr(E1('pump'), 'PUMP')].filter(Boolean), path: () => { const a = E1('generator'), b = E1('pump'); return a && b ? [[a.x + 1, a.y + 1], [b.x + 1, b.y + 1]] : null; },
    check: () => { const p = E1('pump'); return !!p && p.ok[0]; } },
  { title: 'POWER THE ROUTER AND THE HUB', need: 'Connect the router and the hub to the same power line.',
    text: 'Keep going: run power to the <b>router</b> and to the <b>hub</b> too. Lines can branch, and you can drag over a line to erase it. <kbd>CTRL+Z</kbd> undoes your last stroke.',
    world: () => [wr(E1('router'), 'ROUTER'), wr(homeD().hub, 'HUB')].filter(Boolean),
    check: () => { const r = E1('router'); return !!r && r.ok[0] && homeD().hub.ok[0]; } },
  { title: 'LAY WATER PIPE', need: 'Choose WATER PIPE (key 2) and connect the pump to the hub.',
    hl: [toolBtn('WATER PIPE')], on: () => { showTab('build'); showCat('LINES'); },
    text: 'Now <b>water</b>. Pick <b>WATER PIPE</b> (<kbd>2</kbd>) and join the <b>pump</b> to the <b>hub</b>. Water pipes ignore power lines, so you can cross them.',
    world: () => [wr(E1('pump'), 'PUMP'), wr(homeD().hub, 'HUB')].filter(Boolean), path: () => { const a = E1('pump'), b = homeD().hub; return a && b ? [[a.x + 1, a.y + 1], [b.x + 1, b.y + 1]] : null; },
    check: () => homeD().hub.ok[1] },
  { title: 'LAY NETWORK CABLE', need: 'Choose NET CABLE (key 3) and connect the router to the hub.',
    hl: [toolBtn('NET CABLE')], on: () => { showTab('build'); showCat('LINES'); },
    text: 'Last one: <b>network</b>. Pick <b>NET CABLE</b> (<kbd>3</kbd>) and join the <b>router</b> to the <b>hub</b>. When all three reach it, HOME BASE comes back to life.',
    world: () => [wr(E1('router'), 'ROUTER'), wr(homeD().hub, 'HUB')].filter(Boolean), path: () => { const a = E1('router'), b = homeD().hub; return a && b ? [[a.x, a.y], [b.x + 1, b.y + 1]] : null; },
    check: () => homeD().restored },
  { title: 'DISTRICT RESTORED', ack: true, hl: ['#scrap', '#dchip'], labels: ['SCRAP', 'DISTRICTS'],
    text: 'Light! You got <b>+40 scrap</b>. <b>Scrap</b> is your money and the small number under it is your income per second. The bar shows how many districts are restored. Restore every district to finish the county.' },
  { title: 'READ THE METERS', need: 'Click the STATUS tab.', hl: [tabBtn('status')],
    text: 'Open the <b>STATUS</b> tab. The <b>RESOURCES</b> bars show demand against supply for power, water and network. If demand passes supply, things brown out.',
    check: () => curTab === 'status' },
  { title: 'ALERTS', ack: true, hl: ['#alerts'], on: () => { showTab('status'); },
    text: '<b>ALERTS</b> list everything that is wrong: unpowered hubs, broken machines, damaged lines. Click an alert to jump the camera straight to the problem.' },
  { title: 'BACK TO BUILDING', need: 'Click the BUILD tab.', hl: [tabBtn('build')], check: () => curTab === 'build', text: 'Switch back to the <b>BUILD</b> tab.' },
  { title: 'BUILD A HOUSE', need: 'Open TOWN, pick HOUSE (F), and click near the hub.', hl: [catBtn('TOWN'), toolBtn('HOUSE')], on: () => { showTab('build'); showCat('TOWN'); },
    text: 'Houses earn scrap, but only while all three utilities reach them. Choose <b>TOWN</b> then <b>HOUSE</b> (<kbd>F</kbd>) and click near the hub. A <span class="g">green</span> outline means you can build there. Then connect it with power, water and network.',
    world: () => [wr(homeD().hub, 'HUB')].filter(Boolean), check: () => ents.some(e => e.type === 'house') },
  { title: 'SALVAGE RUBBLE', need: 'Choose SALVAGE (X) and click some rubble.', hl: [catBtn('TOOLS'), toolBtn('SALVAGE')], on: () => { showTab('build'); showCat('TOOLS'); tutSalv = CUR.salv; },
    text: 'Rubble blocks building, but you can clear it for scrap (and sometimes parts). Press <kbd>X</kbd>, then click or drag over rubble piles.', check: () => CUR.salv > tutSalv },
  { title: 'LAYER VIEW', need: 'Click PWR to show only power lines.', hl: ['#viewseg'],
    text: 'When lines get crowded, the <b>layer buttons</b> fade the other utilities. Click <b>PWR</b> to see only power. (<kbd>L</kbd> cycles them.)', check: () => focus >= 0 },
  { title: 'LAYER VIEW: ALL', need: 'Click ALL to see everything again.', hl: ['#viewseg'], text: 'Click <b>ALL</b> to bring everything back.', check: () => focus < 0 },
  { title: 'PAUSE AND SPEED', need: 'Press SPACE (or click ||) to pause.', hl: ['#speedseg'],
    text: 'Planning something tricky? Press <kbd>SPACE</kbd> to <b>pause</b>. You can still build while paused. <kbd>[</kbd> and <kbd>]</kbd> change the speed.', check: () => speed === 0 },
  { title: 'RESUME', need: 'Press SPACE again (or click 1x).', hl: ['#speedseg'], text: 'Press <kbd>SPACE</kbd> again to resume.', check: () => speed > 0 },
  { title: 'RESEARCH LAB', need: 'Open OPS, pick RESEARCH LAB (B), build it near the hub.', hl: [catBtn('OPS'), toolBtn('RESEARCH LAB')], on: () => { showTab('build'); showCat('OPS'); },
    text: 'A <b>research lab</b> needs <b>power and network</b> and makes research points that carry over to <b>every county</b>. Build one near the hub and wire it up.', check: () => ents.some(e => e.type === 'lab') },
  { title: 'OPEN RESEARCH', need: 'Click RESEARCH (or press Y).', hl: ['#btn-research'], text: 'Open the <b>research tree</b> with <kbd>Y</kbd>. Nodes are joined by lines: finish the nodes that lead to a technology first.',
    check: () => $('research').style.display === 'flex' },
  { title: 'SPENDING POINTS', ack: true, text: 'Click a node to read it, double-click to buy it. <b>WORKSHOPS</b> are a great first buy: they earn scrap and make <b>parts</b>. Press <kbd>Y</kbd> or ESC to close.' },
  { title: 'FUEL AND PARTS', ack: true, hl: ['#fuel', '#parts'], labels: ['FUEL', 'PARTS'], on: () => { if ($('research').style.display === 'flex') closeResearch(); },
    text: 'Generators burn <b>fuel</b>. At zero fuel your power drops, so research <b>FUEL REFINING</b> and build a <b>refinery</b> (key <kbd>I</kbd>). <b>Parts</b> pay for repairs and advanced buildings; workshops and industrial hubs make them.' },
  { title: 'REPAIRS', ack: true, hl: [catBtn('TOOLS'), toolBtn('REPAIR')], on: () => { showTab('build'); showCat('TOOLS'); },
    text: 'Everything wears out, and storms, floods and breakdowns strike once a district is restored. Use <b>REPAIR</b> (<kbd>V</kbd>) on a broken machine or damaged line, or build a <b>maintenance depot</b> (<kbd>N</kbd>) to repair nearby things for free.' },
  { title: 'DORMANT PLANTS', ack: true, text: 'The big grey <b>3x3 sites</b> are dormant <b>power, water and data plants</b>. Research <b>HEAVY INDUSTRY</b>, then use <b>INSPECT</b> (<kbd>C</kbd>) on one and press RESTORE. Plants connect to <b>trunk</b> lines (thick lines), not to local ones.',
    world: () => ents.filter(e => e.type === 'dormant').map(e => wr(e, e.site === 'power' ? 'POWER' : e.site === 'water' ? 'WATER' : 'DATA')), on: () => { const s = ents.find(e => e.type === 'dormant'); if (s) centerOn(s.x + 1, s.y + 1); } },
  { title: 'THE CONTROL STATION', ack: true, text: 'The grand <b>GRID CONTROL STATION</b> (4x4) is the last site. Restore it, run it with trunk power and fiber, and slot upgrade modules into it. It also links this county to its neighbours and lets you export surplus.',
    world: () => ents.filter(e => e.type === 'dormantStation' || e.type === 'station').map(e => wr(e, 'CONTROL')), on: () => { const s = ents.find(e => e.type === 'dormantStation' || e.type === 'station'); if (s) centerOn(s.x + 2, s.y + 2); } },
  { title: 'SUPPLY CACHES', ack: true, on: () => { const l = Loot.list.find(x => !x.open); if (l) centerOn(l.x, l.y); },
    text: 'Look for glowing <b>supply caches</b> hidden in every county. <b>Click one</b> (with any tool) to open it: scrap, parts, research, <b>skill chips</b> and rare <b>blueprints</b> for your headquarters. They also show as blinking dots on the minimap.',
    world: () => Loot.list.filter(l => !l.open).map(l => ({ x: l.x, y: l.y, w: 1, h: 1, l: 'CACHE' })), hl: ['#minimap'], labels: ['MINIMAP'] },
  { title: 'AUTO ROUTE', need: 'Choose AUTO ROUTE (key ;), click the generator, then click the hub.', hl: [catBtn('LINES'), toolBtn('AUTO ROUTE')], on: () => { showTab('build'); showCat('LINES'); Tutorial.routed = false; },
    text: 'Laying lines by hand is fine, but <b>AUTO ROUTE</b> does it for you: click a start (or any machine), then an end. Every line type chosen in the box below the tools is laid along the cheapest path around rubble, rock and machines, and a preview shows the exact cost first. With the Bridge Spans research it can even cross water.', check: () => Tutorial.routed },
  { title: 'FLOWS AND STORAGE', ack: true, hl: ['#flows', '#scrap'], labels: ['FLOWS', 'SCRAP / CAP'], on: () => { showTab('status'); },
    text: 'The <b>FLOWS</b> panel (STATUS tab) shows every resource per second: scrap income and upkeep, how long your <b>fuel</b> will last, parts and research trends, and which machines earn or cost the most. Scrap is limited by your <b>warehouse</b> (the number after the slash).' },
  { title: 'CREDITS', ack: true, hl: ['#crchip'], labels: ['CREDITS'], on: () => { showTab('build'); },
    text: 'When the warehouse is full, surplus scrap is <b>sold for credits</b> (CR). You also earn credits from finishing counties, bonus goals, supply caches and Dimmer camps. Spend them at the <b>QUARTERMASTER</b> on the map (press <kbd>B</kbd>) on supply kits for your next county, instant buys and permanent depot upgrades. Short <b>TIP</b> messages will appear the first time something matters.' },
  { title: 'BONUS GOALS AND TRAITS', ack: true, hl: ['#goalbox', '#traitTag'], labels: ['GOALS', 'TRAIT'], on: () => { goHome(); showTab('goals'); },
    text: 'Every county is different. A <b>trait</b> (shown in the header when it has one) changes the numbers, some counties start in odd states (a derelict grid, a black start), and three optional <b>BONUS GOALS</b> pay research points and scrap.' },
  { title: 'FINISHING A COUNTY', ack: true, hl: ['#tomap'], text: 'Restore every district to finish the county. Even <b>half</b> of them makes the light spread to neighbours. When you are done, press <b>&lt; MAP</b> to return to the world. Your county autosaves. The tutorial ends here - GUIDE has all of this again.' },
];
let tutSalv = 0;
const Tutorial = new Tutor('wastelandGrid.tut', COUNTY_STEPS, () => Builder.active);
Tutorial.cam0 = null; Tutorial.repaired = false;

const MAP_STEPS = [
  { title: 'CHOOSE A LANDING SITE', need: 'Click any county in the United States.', hl: ['#usmap'], when: () => save.start < 0 && !overlayOpen(),
    text: 'This is <b>North America</b>, still dark. Pick any <b>American county</b> as your landing site: from there the light spreads outward. Hover to see names, scroll to zoom, drag to pan.', check: () => selected >= 0 },
  { title: 'LAND', need: 'Press LAND HERE.', hl: ['#enter'], when: () => save.start < 0 && !overlayOpen(),
    text: 'Press <b>LAND HERE</b>. You will enter the county and the builder tutorial begins.', check: () => save.start >= 0 },
  { title: 'BACK ON THE MAP', ack: true, hl: ['#usmap'], when: () => save.start >= 0 && Scenes.is('map') && !anim && !overlayOpen(),
    text: '<b>Amber</b> counties touch your network and can be restored next. Counties that are fully lit turn bright; partly lit ones also spread the light. Click a county, then press the green button to enter it.' },
  { title: 'COUNTY INFO', ack: true, hl: ['#mappanel'], when: () => save.start >= 0 && Scenes.is('map') && !anim && !overlayOpen(), on: () => { if (selected < 0) { const c = US.counties.find(c => statusOf(c) === 'frontier'); if (c) { selected = c.id; updatePanel(); } } },
    text: 'The side panel shows the county: terrain, difficulty, its <b>trait</b> and <b>start</b> (derelict grid, black start...), progress and which faction lives there. Each county plays differently.' },
  { title: 'PROGRESS AND CONTRACTS', ack: true, hl: ['#mapprog', '#contracts'], labels: ['PROGRESS', 'CONTRACTS'], when: () => Scenes.is('map') && !anim && !overlayOpen(),
    text: '<b>Progress</b> tracks every country. <b>Contracts</b> are rolling jobs - light up a county, repair an outage, earn trust - that pay research points. New ones arrive every minute or so.' },
  { title: 'ZOOM THE MAP', need: 'Scroll the wheel on the map or click the + button.', hl: ['#mapzoom'], when: () => Scenes.is('map') && !anim && !overlayOpen(), on: () => { MapTutorial.z0 = cam.z; },
    text: 'Zoom the map with the <b>mouse wheel</b>, the <b>+ / -</b> buttons or the keys. Drag to pan, and press <kbd>FIND COUNTY</kbd> (<kbd>/</kbd>) to jump to a place by name.', check: () => cam.z !== MapTutorial.z0 },
  { title: 'THE UNION', need: 'Click UNION (or press U).', hl: ['#btn-union'], when: () => Scenes.is('map') && !anim && !overlayOpen(),
    text: 'The <b>UNION</b> screen is the heart of the campaign: <b>factions</b> to befriend and sign accords with, <b>borders</b> to open or close, <b>stable station links</b> between counties, and the <b>Dimmers</b> to talk to. Open it.', check: () => $('union').style.display === 'flex' },
  { title: 'UNITY', ack: true, hl: ['#un-head'], text: 'Four things add up to your <b>unity</b> score: coverage, stable links, signed accords and open borders. Higher tiers give permanent bonuses. Close this screen when you are done reading.' },
  { title: 'THE QUARTERMASTER', ack: true, hl: ['#btn-qm'], labels: ['SUPPLY'], when: () => Scenes.is('map') && !anim && !overlayOpen() && save.start >= 0,
    text: 'Press <kbd>B</kbd> (or SUPPLY) to visit the <b>QUARTERMASTER</b>. Credits buy <b>supply kits</b> that are unloaded in the next county you enter (extra scrap, parts, fuel, a quiet start, an engineer team), plus permanent <b>depot upgrades</b>: more kit slots, fuel tanks, a bigger warehouse and a better broker.' },
  { title: 'SKILL POINTS', ack: true, hl: ['#btn-skills'], when: () => Scenes.is('map') && !anim && !overlayOpen() && (save.sp > 0 || Object.keys(save.restored).length >= 1),
    text: 'Restoring places earns <b>skill points</b>: 1 for every 3 counties, plus bonuses for states, countries and flawless counties. Press <kbd>K</kbd> and spend them on permanent upgrades. You cannot afford everything, so choose a direction.' },
  { title: 'HEADQUARTERS', ack: true, hl: ['#btn-hq'], when: () => !!save.hq && Scenes.is('map') && !anim && !overlayOpen(),
    text: 'Your landing county is now <b>HEADQUARTERS</b>: the place everything leads back to. Press <kbd>Q</kbd> to open it. First pick a <b>doctrine</b> (Forge, Bulwark, Frontier or Scholar), then spend research on ten departments. Some unlock <b>orders</b> you can call down inside a county (supply drops, grid restarts, surveys). The better a county is connected to HQ, the more it helps. If HQ itself has an outage, the benefits stop.' },
  { title: 'EVERYTHING ELSE', ack: true, hl: ['#btn-settings2', '#btn-log', '#btn-wide'], labels: ['SETTINGS', 'EVENT LOG', 'WIDE MAP'], when: () => Scenes.is('map') && !anim && !overlayOpen(),
    text: '<b>SETTINGS</b> has difficulty, graphics and <b>save export / import</b>. The <b>EVENT LOG</b> keeps every event. <b>WIDE</b> hides the side panel for a bigger map. Press <kbd>?</kbd> on the map for every shortcut. Good luck, Engineer.' },
];
const MapTutorial = new Tutor('wastelandGrid.mtut', MAP_STEPS, () => mapActive);
MapTutorial.z0 = 1;
MapTutorial.drawWorld = () => { };

// ---------- wiring ----------
const _coachSide = () => { Coach.side = Coach.side === 'left' ? 'right' : 'left'; try { localStorage.setItem('wastelandGrid.coachSide', Coach.side); } catch (e) { /* ignore */ } };
const curTutor = () => Coach.owner || (Builder.active ? Tutorial : mapActive ? MapTutorial : null);
$('coach-next').onclick = () => { const o = curTutor(); if (o) o.next(); };
$('coach-back').onclick = () => { const o = curTutor(); if (o) o.prev(); };
$('coach-skip').onclick = async () => { const o = curTutor(); if (o && await uiConfirm('Skip the tutorial? You can replay it any time from the GUIDE (in a county) or SETTINGS.', 'SKIP TUTORIAL?', 'SKIP', 'KEEP GOING')) o.skip(); };
$('coach-side').onclick = () => { _coachSide(); const o = curTutor(); if (o && o.active()) Coach.render(o, o.step()); };
$('tut-next').onclick = () => Tutorial.next(); $('tut-skip').onclick = () => Tutorial.skip();
Tutorial.load(); MapTutorial.load();
setInterval(() => { Tutorial.update(); MapTutorial.update(); if (!Builder.active && !mapActive) Coach.hide(); }, 200);
$('tut-replay-c').onclick = () => { Tutorial.restart(); $('settings').style.display = 'none'; if (!Builder.active) uiAlert('The county tutorial will start the next time you enter a county.', 'TUTORIAL'); };
$('tut-replay-m').onclick = () => { MapTutorial.restart(); $('settings').style.display = 'none'; if (!mapActive) uiAlert('The map tutorial will start the next time you are on the world map.', 'TUTORIAL'); };
addEventListener('resize', () => { const o = Coach.owner; if (o && o.active()) Coach.render(o, o.step()); });

addEventListener('keydown', e => {                                   // ENTER advances the coach when its NEXT button is showing
  if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
  const c = $('coach'); if (!c || c.style.display !== 'block' || $('coach-next').style.display === 'none') return;
  if (e.target && /INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
  if ([...document.querySelectorAll('.overlay')].some(o => o.style.display === 'flex')) return;
  e.preventDefault(); $('coach-next').click();
});
