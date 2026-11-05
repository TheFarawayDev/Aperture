'use strict';
// ============================================================
//  DISPLAY.JS - screen adaptation and graphics settings.
//  * UI scale: the whole interface is zoomed to suit the screen (AUTO) or a size you pick.
//  * Pixel scaling: canvases snap to whole screen pixels when there is room (crisp), or fill the space.
//  * Quality presets: scanlines, effect density, frame limit, animation, night darkness.
//  * Touch: one finger = click / paint / drag, two fingers = pan (builder) or pinch zoom (map).
//  * Fullscreen and an FPS counter.
// ============================================================
const UI_SCALES = ['auto', 0.75, 1, 1.25, 1.5, 2];
const PRESETS = {
  MINIMAL: { scan: false, parts: 0, fps: 20, motion: false, fx: false, lite: true },
  LOW: { scan: false, parts: 0.4, fps: 30, motion: false, fx: false, lite: true },
  MEDIUM: { scan: false, parts: 0.4, fps: 60, motion: true, fx: true, lite: false },
  HIGH: { scan: true, parts: 1, fps: 60, motion: true, fx: true, lite: false },
};
const QUALITY_LADDER = ['HIGH', 'MEDIUM', 'LOW', 'MINIMAL'];
const Display = {
  z: 1, dpr: 1, vw: 1280, vh: 760, next: {},
  auto(cw, ch) {
    // narrow screens (stacked layout): fit the width. Wide screens: fit a 1280x760 design to the window.
    const z = cw < 1000 ? Math.min(1.25, cw / 620) : Math.min(cw / 1280, ch / 760);
    return Math.round(Math.max(0.5, Math.min(3, z)) * 20) / 20;
  },
  apply() {
    const root = document.documentElement, cw = root.clientWidth, ch = root.clientHeight;
    let z = Settings.ui === 'auto' ? this.auto(cw, ch) : +Settings.ui || 1;
    if (!(window.CSS && CSS.supports && CSS.supports('zoom', '1'))) z = 1;      // very old browsers: no scaling
    this.z = z; this.dpr = window.devicePixelRatio || 1; this.vw = cw / z; this.vh = ch / z;
    document.body.style.zoom = z === 1 ? '' : String(z);
    root.style.setProperty('--z', z); root.style.setProperty('--evw', (this.vw / 100) + 'px'); root.style.setProperty('--evh', (this.vh / 100) + 'px');
    root.classList.toggle('w1100', this.vw <= 1100); root.classList.toggle('w1000', this.vw <= 1000);
    root.classList.toggle('w700', this.vw <= 700); root.classList.toggle('short', this.vh <= 620);
    document.body.classList.toggle('noscan', !Settings.scan); document.body.classList.toggle('nomotion', !Settings.motion); document.body.classList.toggle('lite', !!Settings.lite);
    root.classList.toggle('touch', !!(window.matchMedia && matchMedia('(pointer:coarse)').matches));
    const fb = $('fpsbox'); if (fb) fb.style.display = Settings.showFps ? 'block' : 'none';
  },
  // size (in CSS px, before UI zoom) for a canvas of w x h that must fit in availW x availH
  canvasScale(c, availW, availH) {
    const fitS = Math.min(availW / c.width, availH / c.height), phys = this.z * this.dpr;
    if (c.id === 'usmap') return Math.max(0.5, Math.floor(fitS * 8) / 8);
    const k = Math.floor(fitS * phys), crisp = Settings.pix === 'crisp' || (Settings.pix === 'auto' && k >= 3);
    if (crisp && k >= 1) return k / phys;                                   // a whole number of screen pixels per art pixel
    return Math.max(0.4, fitS);
  },
  // frame limiter: call at the top of a loop (after re-queuing it); true = skip this frame
  skip(id, now) {
    const f = Settings.fps; if (!f) return false;
    const iv = 1000 / f, n = this.next[id] || 0; if (now < n - 1) return true;
    this.next[id] = (now - n > iv * 2 ? now : n) + iv; return false;
  },
  preset() { for (const k in PRESETS) if (Object.keys(PRESETS[k]).every(p => Settings[p] === PRESETS[k][p])) return k; return 'CUSTOM'; },
  setPreset(k) { Object.assign(Settings, PRESETS[k]); },
  // automatic quality: if the game cannot keep up for a few seconds, drop to the next lighter preset (and say so)
  degrade() {
    let i = QUALITY_LADDER.indexOf(this.preset()); if (i < 0) i = Settings.lite ? 2 : 0; if (i >= QUALITY_LADDER.length - 1) return false;
    const k = QUALITY_LADDER[i + 1]; this.setPreset(k); Settings.save(); this.apply(); if (typeof fit === 'function') fit();
    const msg = `The game was struggling to keep up, so graphics were lowered to ${k}. You can change this in Settings (O) > Graphics.`;
    try { if (typeof mapActive !== 'undefined' && mapActive && typeof mapToast === 'function') mapToast(msg); else if (typeof toast === 'function') toast(msg); } catch (e) { /* ignore */ }
    if ($('settings') && $('settings').style.display === 'flex') renderGfx();
    return true;
  },
  toggleFull() {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { /* not supported */ }
  },
};
Display.apply();

// ---------- settings panel ----------
function renderGfx() {
  const seg = (id, opts, cur, key, fmt) => {
    $(id).innerHTML = opts.map(o => `<button data-v="${o}" class="${String(o) === String(cur) ? 'on' : ''}">${fmt ? fmt(o) : o}</button>`).join('');
    $(id).onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v; Settings[key] = (v === 'auto' || v === 'crisp' || v === 'fill') ? v : +v; commitGfx();
    };
  };
  const pr = Display.preset();
  $('g-quality').innerHTML = [...Object.keys(PRESETS), 'CUSTOM'].map(k => `<button data-q="${k}" class="${k === pr ? 'on' : ''}" ${k === 'CUSTOM' ? 'disabled' : ''}>${k}</button>`).join('');
  $('g-quality').onclick = e => { const b = e.target.closest('button[data-q]'); if (b && PRESETS[b.dataset.q]) { Display.setPreset(b.dataset.q); commitGfx(); } };
  seg('g-ui', UI_SCALES, Settings.ui, 'ui', o => o === 'auto' ? 'AUTO' : Math.round(o * 100) + '%');
  seg('g-pix', ['auto', 'crisp', 'fill'], Settings.pix, 'pix', o => o.toUpperCase());
  seg('g-parts', [1, 0.4, 0], Settings.parts, 'parts', o => o === 1 ? 'FULL' : o === 0 ? 'OFF' : 'LESS');
  seg('g-fps', [20, 30, 60, 0], Settings.fps, 'fps', o => o ? o + ' FPS' : 'NONE');
  const set = (id, v) => { $(id).checked = v; };
  set('set-scan', Settings.scan); set('set-lite', Settings.lite); set('set-autoq', Settings.autoq); set('set-motion', Settings.motion); set('set-showfps', Settings.showFps); set('set-fx', Settings.fx);
  const full = !!document.fullscreenElement;
  $('g-full').textContent = full ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  $('g-info').textContent = `Screen ${innerWidth}x${innerHeight} (x${Display.dpr.toFixed(2).replace(/\.?0+$/, '')} pixel ratio). Interface zoom ${Math.round(Display.z * 100)}%${Settings.ui === 'auto' ? ' (auto)' : ''}.`;
}
function commitGfx() { Settings.save(); Display.apply(); fit(); renderGfx(); }
const _rsGfx = renderSettings; renderSettings = function () { _rsGfx(); renderGfx(); };
$('set-scan').onchange = e => { Settings.scan = e.target.checked; commitGfx(); };
$('set-motion').onchange = e => { Settings.motion = e.target.checked; commitGfx(); };
$('set-lite').onchange = e => { Settings.lite = e.target.checked; commitGfx(); };
$('set-autoq').onchange = e => { Settings.autoq = e.target.checked; commitGfx(); };
$('set-showfps').onchange = e => { Settings.showFps = e.target.checked; commitGfx(); };
const _fxChange = $('set-fx').onchange; $('set-fx').onchange = e => { _fxChange(e); renderGfx(); };
$('g-full').onclick = () => Display.toggleFull();
$('g-reset').onclick = () => { Object.assign(Settings, { ui: 'auto', pix: 'auto' }, PRESETS.HIGH); commitGfx(); };
document.addEventListener('fullscreenchange', () => { fit(); if ($('settings').style.display === 'flex') renderGfx(); });
// first run on a small screen: start on a light preset (the player can change it)
try { if (localStorage.getItem('wastelandGrid.gfxInit') == null) { localStorage.setItem('wastelandGrid.gfxInit', '1'); if (Math.min(screen.width, screen.height) < 600 || (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2) { Display.setPreset('LOW'); Settings.save(); Display.apply(); } } } catch (e) { /* ignore */ }

// ---------- automatic quality: watch how long frames really take (browser paint included) ----------
(function perfWatch() {
  let last = 0, sum = 0, n = 0, slow = 0, warm = 0;
  const f = now => {
    requestAnimationFrame(f);
    const live = typeof Scenes !== 'undefined' && (Scenes.is('map') || Scenes.is('game') || Scenes.is('menu')) && !document.hidden;
    if (!Settings.autoq || !live) { last = 0; sum = n = 0; return; }
    if (!last) { last = now; return; }
    const dt = now - last; last = now; if (dt > 400) { sum = n = 0; warm = 0; return; }     // a pause, tab switch or loading hitch: not a measurement
    if (++warm < 90) return;                                                                 // ignore the first moments after a scene change
    sum += dt; n++;
    if (n >= 150) {
      const avg = sum / n, target = Settings.fps ? Math.max(1000 / Settings.fps, 1000 / 60) : 1000 / 60; sum = n = 0;
      if (avg > target * 1.5 + 6) { if (++slow >= 2) { slow = 0; warm = 0; Display.degrade(); } } else slow = Math.max(0, slow - 1);
    }
  };
  requestAnimationFrame(f);
})();

// ---------- FPS counter ----------
(function fpsLoop() {
  let n = 0, t0 = performance.now();
  const f = now => { requestAnimationFrame(f); if (!Settings.showFps) { n = 0; t0 = now; return; } n++; if (now - t0 >= 500) { const fb = $('fpsbox'); if (fb) fb.textContent = Math.round(n * 1000 / (now - t0)) + ' FPS'; n = 0; t0 = now; } };
  requestAnimationFrame(f);
})();

// ---------- touch: one finger = mouse, two fingers = pan / pinch ----------
(function touchInput() {
  const fire = (type, t, extra) => window.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: t.x, clientY: t.y, button: 0 }), extra || {}));
  const pt = t => ({ x: t.clientX, y: t.clientY });
  const mid = ts => ({ x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 });
  const dist = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
  const dn = (el, type, p, button) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: button || 0 }));

  // ----- world map -----
  let mt = null;
  mcv.addEventListener('touchstart', e => {
    e.preventDefault(); if (anim) return;
    if (e.touches.length === 1) { mt = { last: pt(e.touches[0]), pinch: false }; dn(mcv, 'mousedown', mt.last); }
    else if (e.touches.length === 2) { mdrag = null; mt = { pinch: true, d: dist(e.touches), m: mid(e.touches) }; }
  }, { passive: false });
  mcv.addEventListener('touchmove', e => {
    e.preventDefault(); if (!mt || anim) return;
    if (mt.pinch && e.touches.length >= 2) {
      const d = dist(e.touches), m = mid(e.touches); mmouse = mcoords({ clientX: m.x, clientY: m.y });
      const before = toWorld(mmouse); cam.z = Math.max(HOME.z, Math.min(8, cam.z * (d / mt.d)));
      cam.cx = before.x - (mmouse.x - MVW / 2) / cam.z; cam.cy = before.y - (mmouse.y - MVH / 2) / cam.z;
      const dx = (m.x - mt.m.x), dy = (m.y - mt.m.y), r = mcv.getBoundingClientRect().width / MVW;
      cam.cx -= dx / r / cam.z; cam.cy -= dy / r / cam.z; clampCamMap(); mt.d = d; mt.m = m;
    } else if (!mt.pinch && e.touches.length === 1) { mt.last = pt(e.touches[0]); fire('mousemove', mt.last); }
  }, { passive: false });
  const mend = e => {
    e.preventDefault();
    if (mt && !mt.pinch && e.touches.length === 0) fire('mouseup', mt.last);
    if (e.touches.length === 0) mt = null;
  };
  mcv.addEventListener('touchend', mend, { passive: false }); mcv.addEventListener('touchcancel', mend, { passive: false });

  // ----- county builder -----
  let gt = null, gtimer = 0;
  const startPaint = p => { gt.started = true; dn(cv, 'mousedown', p, 0); };
  cv.addEventListener('touchstart', e => {
    e.preventDefault(); if (!Builder.active) return;
    if (e.touches.length === 1) {
      gt = { last: pt(e.touches[0]), started: false, pan: false };
      fire('mousemove', gt.last);
      clearTimeout(gtimer); gtimer = setTimeout(() => { if (gt && !gt.pan && !gt.started) startPaint(gt.last); }, 70);   // short delay: a second finger turns it into a pan
    } else if (e.touches.length === 2 && gt) {
      clearTimeout(gtimer);
      if (gt.started) { window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); gt.started = false; }
      gt.pan = true; gt.m = mid(e.touches); gt.d = dist(e.touches); dn(cv, 'mousedown', gt.m, 2);
    }
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    e.preventDefault(); if (!gt) return;
    if (gt.pan && e.touches.length >= 2) {
      const d = dist(e.touches), ratio = d / (gt.d || d), m = mid(e.touches);
      if (ratio > 1.3 || ratio < 0.77) { const s = toScreen({ clientX: m.x, clientY: m.y }); stepZoom(ratio > 1 ? 1 : -1, s.x, s.y); gt.d = d; }      // pinch = zoom
      gt.m = m; fire('mousemove', gt.m);
    }
    else if (!gt.pan && e.touches.length === 1) { gt.last = pt(e.touches[0]); if (!gt.started) { clearTimeout(gtimer); startPaint(gt.last); } fire('mousemove', gt.last); }
  }, { passive: false });
  const gend = e => {
    e.preventDefault(); if (!gt) return;
    clearTimeout(gtimer);
    if (!gt.pan && !gt.started) startPaint(gt.last);                        // a quick tap still places / selects
    if (e.touches.length === 0) { window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); gt = null; }
  };
  cv.addEventListener('touchend', gend, { passive: false }); cv.addEventListener('touchcancel', gend, { passive: false });

  $('gz-in').onclick = () => stepZoom(1); $('gz-out').onclick = () => stepZoom(-1); $('gz-lbl').onclick = () => setZoom(1);
  { const l = $('gz-lbl'); l.textContent = (camZ === 0.75 ? '.75' : camZ) + 'x'; }
  // ----- minimap -----
  const mmt = e => { e.preventDefault(); if (Builder.active && e.touches[0]) mmGo(e.touches[0]); };
  mm.addEventListener('touchstart', mmt, { passive: false }); mm.addEventListener('touchmove', mmt, { passive: false });
})();

// ---------- the minimap lives on the play area: small / big / hidden ----------
(function miniBox() {
  const box = $('minibox'); if (!box) return;
  let st = 'small'; try { st = localStorage.getItem('wastelandGrid.mini') || 'small'; } catch (e) { /* ignore */ }
  const apply = () => { box.classList.toggle('big', st === 'big'); box.classList.toggle('hid', st === 'hid'); $('mm-hide').textContent = st === 'hid' ? '+' : '-'; $('mm-size').style.display = st === 'hid' ? 'none' : ''; try { localStorage.setItem('wastelandGrid.mini', st); } catch (e) { /* ignore */ } };
  $('mm-size').onclick = () => { st = st === 'big' ? 'small' : 'big'; apply(); };
  $('mm-hide').onclick = () => { st = st === 'hid' ? 'small' : 'hid'; apply(); };
  ['mousedown', 'touchstart'].forEach(ev => box.addEventListener(ev, e => e.stopPropagation()));
  apply();
})();

// ---------- no-scroll sidebar: it is exactly as tall as the stage; the map panel is tabbed ----------
function syncSide() {
  const side = $('side'), st = $('stage'); if (!side || !st) return;
  const stacked = Display.vw <= 1000; if (stacked) { side.style.height = ''; return; }
  const h = st.getBoundingClientRect().height / (Display.z || 1); if (h > 100) side.style.height = Math.round(h) + 'px';
}
(function sideWatch() {
  const st = $('stage'); if (st && window.ResizeObserver) new ResizeObserver(() => syncSide()).observe(st);
  addEventListener('load', syncSide);
  document.querySelectorAll('#maptabs button').forEach(b => { b.onclick = () => { document.querySelectorAll('#maptabs button').forEach(x => x.classList.toggle('on', x === b)); document.querySelectorAll('#mapbody > .mt').forEach(p => p.classList.toggle('on', p.id === b.dataset.mt)); }; });
})();

(function chromeWatch() {                                           // if the header or the news bar change height, refit the picture so nothing scrolls
  if (!window.ResizeObserver) return; let t = 0;
  const go = () => { clearTimeout(t); t = setTimeout(() => { if (typeof Scenes !== 'undefined' && Scenes.cur === 'game') fit(); }, 80); };
  ['topbar'].forEach(id => { const e = $(id); if (e) new ResizeObserver(go).observe(e); });
})();
