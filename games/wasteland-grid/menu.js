'use strict';
// ============================================================
//  MENU.JS - main menu, logo, and switching between the three scenes
//  (menu -> world map -> county builder). No server needed.
// ============================================================

const Scenes = {
  cur: 'menu',
  show(name) {
    this.cur = name;
    ['menu', 'map', 'game'].forEach(n => { $('scene-' + n).style.display = n === name ? 'flex' : 'none'; });
    if (name === 'map') Campaign.show();
    if (name === 'menu') refreshMenu();
    fit();
  },
  is(n) { return this.cur === n; },
};

// Size each canvas to the space that is really free (no overflow, sidebar always visible).
function fit() {
  const cw = document.documentElement.clientWidth, ch = document.documentElement.clientHeight, cur = Scenes.cur;
  const panel = cur === 'game' ? 352 + 14 : cur === 'map' ? 340 + 14 : 0, stacked = cw <= 1000;
  const availW = cw - (stacked ? 0 : panel) - 40, availH = ch - (cur === 'game' ? 178 : cur === 'map' ? 150 : 60) - (stacked ? 110 : 0);
  document.querySelectorAll('canvas.px').forEach(c => {
    let s = Math.min(availW / c.width, availH / c.height);
    if (c.id !== 'usmap') s = Math.max(1, Math.floor(s)); else s = Math.max(0.6, Math.floor(s * 4) / 4);   // the map may scale in quarters
    c.style.width = Math.round(c.width * s) + 'px'; c.style.height = Math.round(c.height * s) + 'px';
  });
  const g = $('game'), side = $('side'); if (side && g) side.style.maxHeight = stacked ? 'none' : (parseInt(g.style.height || '270') + 120) + 'px';
  const mp = $('mappanel'), u = $('usmap'); if (mp && u && !stacked) mp.style.minHeight = (parseInt(u.style.height || '340') + 8) + 'px';
}
addEventListener('resize', fit);

// ---------- the logo: pixel letters with extrusion, outline and neon flicker ----------
const lg = $('logo').getContext('2d');
function glyphPx(ch, x, y, s, rowCols, ext, extCol) {
  const g5 = FONT[ch]; if (!g5) return;
  const cell = (cx, cy, c) => { lg.fillStyle = PAL[c]; lg.fillRect(cx, cy, s, s); };
  for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g5[r * 3 + q] === '1') {
    for (let e = ext; e > 0; e--) cell(x + q * s + e, y + r * s + e, extCol);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) { lg.fillStyle = PAL[0]; lg.fillRect(x + q * s + dx + ext, y + r * s + dy + ext, s, s); }
  }
  for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g5[r * 3 + q] === '1') cell(x + q * s, y + r * s, rowCols[r]);
}
function drawLogo(now) {
  const t = now / 1000; lg.clearRect(0, 0, 330, 118);
  const line = (txt, y, s, gap, rows, extCol, ext) => {
    const w = txt.length * (3 * s + gap) - gap; let x = Math.round((330 - w) / 2);
    [...txt].forEach((ch, i) => {
      const dim = Math.sin(t * 7 + i * 5.3) > 0.985;
      glyphPx(ch, x, y, s, dim ? rows.map(c => (c > 9 ? c - 2 : c)) : rows, ext, extCol); x += 3 * s + gap;
    });
    return w;
  };
  line('WASTELAND', 6, 7, 5, [12, 11, 11, 10, 10], 9, 3);
  const gw = line('GRID', 56, 10, 9, [8, 7, 7, 6, 5], 5, 4);
  const x0 = (330 - gw) / 2, cy = 82;                  // crackling arcs either side of GRID
  [[8, x0 - 10], [x0 + gw + 10, 322]].forEach(([a, b]) => {
    lg.fillStyle = PAL[14];
    for (let x = a; x < b; x += 2) { const py = cy + Math.round(Math.sin(x * 0.5 + t * 20) * 5 * Math.sin((x - a) / (b - a) * Math.PI)); lg.fillRect(x, py, 2, 2); }
    lg.fillStyle = PAL[8]; lg.fillRect(a + ((t * 60) % (b - a)) | 0, cy - 1, 3, 3);
  });
}

// ---------- menu background: a dead skyline slowly relighting ----------
const mb = $('menubg').getContext('2d');
const GY = H - 62;
const mr = mulberry(21), mStars = Array.from({ length: 70 }, () => [mr() * W | 0, mr() * (GY * 0.6) | 0]);
const mSky = [];
for (let x = -6; x < W;) {
  const w = 14 + (mr() * 20 | 0), h = 36 + (mr() * 84 | 0), wins = [];
  for (let wy = GY - h + 6; wy < GY - 8; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (mr() < 0.6) wins.push([wx, wy, mr()]);
  mSky.push({ x, w, h, wins, ant: mr() < 0.35 });
  x += w + (mr() * 5 | 0);
}
function mpx(x, y, w, h, c) { mb.fillStyle = PAL[c]; mb.fillRect(x, y, w, h); }
function drawMenuBg(now) {
  const t = now / 1000, lit = 0.5 + 0.5 * Math.sin(t * 0.35 - 1.2), band = GY / 5;
  for (let y = 0; y < GY; y++) {
    const b = Math.min(4, Math.floor(y / band)), into = y - b * band; let c = b;
    if (b > 0 && into < 3 && ((y + into) % 2 === 0)) c = b - 1;
    mpx(0, y, W, 1, c);
  }
  mStars.forEach(([x, y], i) => mpx(x, y, 1, 1, Math.sin(t * 2 + i) > 0.6 ? 15 : 3));
  const mx = Math.round(W * 0.79), my = 62, R = 20;
  for (let dy = -R - 4; dy <= R + 4; dy++) { const h = Math.floor(Math.sqrt(Math.max(0, (R + 4) ** 2 - dy * dy))); mb.globalAlpha = 0.5; mpx(mx - h, my + dy, h * 2 + 1, 1, 9); mb.globalAlpha = 1; }
  for (let dy = -R; dy <= R; dy++) { const h = Math.floor(Math.sqrt(R * R - dy * dy)); mpx(mx - h, my + dy, h * 2 + 1, 1, 10); }
  mpx(mx - 9, my - 6, 6, 3, 9); mpx(mx + 4, my + 6, 7, 3, 9); mpx(mx - 3, my + 10, 4, 2, 9); mpx(mx - 12, my - 11, 6, 1, 12);
  mSky.forEach(b => {
    const top = GY - b.h; mpx(b.x, top, b.w, b.h, 0); mpx(b.x, top, b.w, 1, 1);
    if (b.ant) { mpx(b.x + (b.w >> 1), top - 8, 1, 8, 0); if (Math.sin(t * 3 + b.x) > 0.3 && lit > 0.5) mpx(b.x + (b.w >> 1), top - 9, 1, 1, 5); }
    b.wins.forEach(([wx, wy, r]) => {
      if (r < lit) { mb.globalAlpha = 0.18; mpx(wx - 1, wy - 1, 4, 5, 7); mb.globalAlpha = 1; mpx(wx, wy, 2, 3, Math.sin(t * 4 + wx * 3) > 0.92 ? 8 : 7); }
      else if (r < 0.2) mpx(wx, wy, 2, 3, 1);
    });
  });
  mpx(0, GY, W, H - GY, 0); mpx(0, GY, W, 1, 2);
  for (let x = 24; x < W; x += 100) { mpx(x, GY + 8, 2, 54, 3); mpx(x - 5, GY + 10, 12, 2, 3); }
  for (let x = 24; x < W - 100; x += 100) {
    for (let k = 0; k <= 98; k++) {
      const sag = Math.round(Math.sin(k / 98 * Math.PI) * 7);
      mpx(x + 1 + k, GY + 11 + sag, 1, 1, 5);
      if (Math.abs(((t * 40 + x) % 100) - k) < 2) { mpx(x + 1 + k, GY + 11 + sag, 1, 1, 8); mb.globalAlpha = 0.25; mpx(x + k, GY + 10 + sag, 3, 3, 7); mb.globalAlpha = 1; }
    }
  }
  for (let i = 0; i < 90; i++) mpx(((i * 53) % W), GY + 3 + ((i * 29) % (H - GY - 4)), 2, 1, i % 3 ? 1 : 9);
}
function menuLoop(now) { if (Scenes.is('menu')) { drawMenuBg(now); drawLogo(now); } requestAnimationFrame(menuLoop); }

// ---------- icons for the HUD (tiny pixel pictures drawn in code) ----------
function initIcons() {
  const icons = {
    scrap: c => { c(2, 0, 2, 2, 4); c(7, 0, 2, 2, 4); c(0, 2, 12, 8, 3); c(1, 3, 10, 6, 4); c(4, 4, 4, 4, 0); c(5, 5, 2, 2, 6); c(1, 3, 10, 1, 6); },
    fuel: c => { c(5, 0, 2, 2, 0); c(4, 2, 4, 2, 0); c(2, 4, 8, 6, 0); c(3, 4, 6, 6, 5); c(4, 3, 4, 1, 5); c(4, 5, 2, 3, 7); c(5, 6, 1, 1, 8); c(3, 10, 6, 1, 0); },
    parts: c => { c(1, 5, 10, 2, 0); c(2, 4, 8, 4, 4); c(0, 3, 3, 6, 0); c(1, 4, 1, 4, 3); c(9, 3, 3, 6, 0); c(10, 4, 1, 4, 3); c(5, 1, 2, 10, 0); c(5, 2, 1, 8, 6); },
    rp: c => { c(4, 0, 4, 1, 0); c(5, 1, 2, 4, 15); c(3, 5, 6, 1, 0); c(2, 6, 8, 5, 0); c(3, 6, 6, 4, 14); c(3, 6, 6, 1, 8); c(4, 8, 1, 1, 8); c(7, 9, 1, 1, 8); },
  };
  document.querySelectorAll('img[data-ic]').forEach(img => {
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 12; const k = cv2.getContext('2d');
    (icons[img.dataset.ic] || (() => { }))((x, y, w, h, col) => { k.fillStyle = PAL[col]; k.fillRect(x, y, w, h); });
    img.src = cv2.toDataURL();
  });
}

// ---------- menu buttons ----------
function refreshMenu() { $('btn-continue').style.display = hasSave() ? 'flex' : 'none'; }
$('btn-new').onclick = async () => {
  if (hasSave() && !await uiConfirm('Your saved progress, research and counties will be erased.', 'START A NEW CAMPAIGN?', 'ERASE AND START', 'KEEP MY GAME')) return;
  newCampaign(); beep(440, 0.1); Scenes.show('map'); Story.play('prologue');
};
$('btn-continue').onclick = () => { loadSave(); beep(440, 0.1); Scenes.show('map'); };
$('btn-how').onclick = () => { $('how').style.display = 'flex'; };
$('how-close').onclick = () => { $('how').style.display = 'none'; };
$('btn-map-menu').onclick = () => Scenes.show('menu');

initIcons();
requestAnimationFrame(menuLoop);
Scenes.show('menu');
