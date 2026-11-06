// ============================================================
//  ART.JS  -  all colors and pixel sprites live here.
//
//  THE PALETTE: 16 colors, chosen to look like a dusty,
//  irradiated wasteland (rust + amber + sickly green + cyan electricity).
//  Rule of pixel art: use FEW colors and reuse them everywhere.
//  Want a different mood? Change the hex values below. Nothing else
//  needs to change - every sprite uses the NUMBERS (0-15), not the hex.
//
//  Sprites are drawn with characters: 0-9 and a-f are palette numbers
//  (a=10, b=11, c=12, d=13, e=14, f=15). '.' means transparent.
// ============================================================

const PAL = [
  '#0d0b0e', //  0 void        - near black, outlines & shadows
  '#1f1a24', //  1 night       - dark purple-grey, panels
  '#3a3140', //  2 dusk        - mid dark, bevels
  '#5c4a4a', //  3 ash         - dusty grey-brown, dead wire
  '#8a6a4e', //  4 dust        - light rust-brown, horizon haze
  '#b5502b', //  5 rust        - rust orange
  '#e08a3c', //  6 amber       - warm orange, lamps & terminals
  '#f5c95a', //  7 glow        - bright yellow, light
  '#fff1b5', //  8 spark       - near white, hottest highlight
  '#2f4a3a', //  9 murk        - dark toxic green
  '#4f7a4a', // 10 moss        - mid green
  '#8fbf5a', // 11 rad         - radioactive green
  '#c8f08a', // 12 rad-light   - pale green
  '#2c6a7a', // 13 wire-teal   - powered wire body
  '#5fc4d0', // 14 volt        - powered wire core, electricity
  '#d8e6e0', // 15 bone        - white-ish, stars
];

// ---- 16x16 sprites -------------------------------------------------
// (each must be exactly 16 rows of 16 characters; tests check this)

const SPRITE_GENERATOR = [
  '................',
  '..000000000000..',
  '.05666666666650.',
  '.05444444444450.',
  '.05400000000450.',
  '.05400007700450.',
  '.05400077000450.',
  '.05400777700450.',
  '.05400007700450.',
  '.05400070000450.',
  '.05400700000450.',
  '.05400000000450.',
  '.05444444444450.',
  '.05555555555550.',
  '..000000000000..',
  '................',
];

// A ruined little house. W = window, D = door (recolored per state).
const SPRITE_HOUSE = [
  '................',
  '......0000......',
  '.....055550.....',
  '....05555550....',
  '...0555555550...',
  '..055555555550..',
  '.05555555555550.',
  '.00000000000000.',
  '..033333333330..',
  '..03WWWW3DDD30..',
  '..03WWWW3DDD30..',
  '..03WWWW3DDD30..',
  '..0333333DDD30..',
  '..0333333DDD30..',
  '..000000000000..',
  '................',
];

// Sprite "recipes": which palette numbers replace W and D.
const HOUSE_OFF = { W: '1', D: '2' };   // dark windows
const HOUSE_ON  = { W: '7', D: '6' };   // glowing windows

// Water pump: teal tank on a rust base.
const SPRITE_PUMP = [
  '................',
  '....00000000....',
  '...0dddddddd0...',
  '...0deeeeeed0...',
  '...0deeffeed0...',
  '...0dddddddd0...',
  '...0dddddddd0...',
  '....00000000....',
  '......0330......',
  '......0330......',
  '.00000000000000.',
  '.03333333333330.',
  '.03444444444430.',
  '.03333333333330.',
  '.00000000000000.',
  '................',
];

// District hub: bunker with a beacon on top.
// P/Q/R = the three status windows (power / water / network).  D = door.
const SPRITE_HUB = [
  '.......77.......',
  '.......00.......',
  '.......00.......',
  '.......00.......',
  '..000000000000..',
  '.02222222222220.',
  '.03333333333330.',
  '.03PP33QQ33RR30.',
  '.03PP33QQ33RR30.',
  '.03333333333330.',
  '.033333DD333330.',
  '.033333DD333330.',
  '.033333DD333330.',
  '.033333DD333330.',
  '.00000000000000.',
  '................',
];

// Net router: 8x8 antenna.
const SPRITE_ROUTER = [
  '...bb...',
  '..b00b..',
  '...00...',
  '...00...',
  '..0330..',
  '..0330..',
  '.000000.',
  '........',
];

// Recipes for the ruined house (same sprite as the house, drab colors).
const HOUSE_RUIN = { 5: '3', 3: '2', W: '0', D: '0' };

// ---------------- v2 sprites ----------------
// Solar array
const SPRITE_SOLAR = [
  '................',
  '0000000000000000',
  '0ddde0ddde0ddde0',
  '0dddd0dddd0dddd0',
  '0dddd0dddd0dddd0',
  '0000000000000000',
  '0ddde0ddde0ddde0',
  '0dddd0dddd0dddd0',
  '0dddd0dddd0dddd0',
  '0000000000000000',
  '.......33.......',
  '.......33.......',
  '....33333333....',
  '...0000000000...',
  '................',
  '................',
];
// Battery bank. P/Q/R = the three charge cells (lit by how full it is).
const SPRITE_BATTERY = [
  '................',
  '................',
  '..000000000000..',
  '.02222222222220.',
  '.02PPP2QQQ2RRR0.',
  '.02PPP2QQQ2RRR0.',
  '.02PPP2QQQ2RRR0.',
  '.02PPP2QQQ2RRR0.',
  '.02222222222220.',
  '.03333333333330.',
  '.03333333333330.',
  '.00000000000000.',
  '..00........00..',
  '................',
  '................',
  '................',
];
// Wind turbine, 8x8, two animation frames.
const SPRITE_WIND_A = [
  '...ff...',
  '...ff...',
  '...ff...',
  '..f00f..',
  '...00...',
  '...33...',
  '...33...',
  '..3333..',
];
const SPRITE_WIND_B = [
  '.f....f.',
  '..f..f..',
  '...00...',
  '..f00f..',
  '.f.00.f.',
  '...33...',
  '...33...',
  '..3333..',
];
// Water tower
const SPRITE_TOWER = [
  '................',
  '....00000000....',
  '...0dddddddd0...',
  '...0deeeeeed0...',
  '...0dddddddd0...',
  '...0dddddddd0...',
  '....00000000....',
  '....0......0....',
  '....0......0....',
  '....0......0....',
  '....0......0....',
  '....0......0....',
  '...00......00...',
  '.00000000000000.',
  '................',
  '................',
];
// Switchgear (substation / valve house / net node). A = layer accent, L = status lamp.
const SPRITE_SWITCH = [
  '................',
  '...A..A..A..A...',
  '...0..0..0..0...',
  '...0..0..0..0...',
  '.00000000000000.',
  '.02222222222220.',
  '.02AA22AA22AA20.',
  '.02AA22AA22AA20.',
  '.02222222222220.',
  '.022222LL222220.',
  '.02222222222220.',
  '.00000000000000.',
  '..033333333330..',
  '..000000000000..',
  '................',
  '................',
];
// Workshop: chimney factory. W = windows, D = door.
const SPRITE_WORKSHOP = [
  '................',
  '..........00....',
  '..........00....',
  '..........00....',
  '.00000000000000.',
  '.05555555555550.',
  '.05666666666650.',
  '.03333333333330.',
  '.03WW33WW33WW30.',
  '.03WW33WW33WW30.',
  '.03333333333330.',
  '.033333DD333330.',
  '.033333DD333330.',
  '.00000000000000.',
  '................',
  '................',
];

// ---------------- v3: procedural sprites (drawn with rectangles) ----------------
// paint(w, h, fn): fn gets r(x,y,w,h,colour) to draw. 'dead' = washed-out ruin version.
function paint(w, h, fn, dead) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const k = c.getContext('2d');
  const dull = n => n === 0 ? 0 : (n % 2 ? 2 : 3);
  fn((x, y, ww, hh, col) => { k.fillStyle = PAL[dead ? dull(col) : col]; k.fillRect(x, y, ww, hh); });
  return weatherize(c, fn.toString().length * 13 + w + (dead ? 5 : 0));
}
const paintLab = dead => paint(16, 16, r => {
  r(7, 0, 2, 1, 15); r(5, 1, 6, 1, 15); r(6, 2, 4, 1, 14); r(7, 3, 2, 3, 0);          // dish on a mast
  r(1, 6, 14, 9, 0); r(2, 7, 12, 7, 3); r(2, 7, 12, 1, 4);
  r(3, 9, 3, 2, 14); r(7, 9, 2, 2, 14); r(10, 9, 3, 2, 14); r(3, 9, 3, 1, 8);
  r(6, 12, 4, 3, 1); r(2, 14, 12, 1, 0);
});
const paintDepot = dead => paint(16, 16, r => {
  r(1, 5, 14, 10, 0); r(2, 6, 12, 8, 3); r(1, 4, 14, 2, 0); r(2, 5, 12, 1, 5);
  r(4, 8, 8, 6, 1); r(4, 8, 8, 1, 2); for (let i = 0; i < 4; i++) r(4, 9 + i * 1.5 | 0, 8, 1, 2);   // roller door
  r(6, 1, 4, 1, 6); r(7, 2, 2, 3, 6); r(6, 1, 1, 2, 6); r(9, 1, 1, 2, 6);                         // wrench sign
  r(2, 14, 12, 1, 0);
});
const paintFuelDepot = dead => paint(16, 16, r => {
  r(1, 4, 6, 10, 0); r(2, 5, 4, 8, 4); r(2, 5, 1, 8, 6); r(2, 5, 4, 1, 3);
  r(9, 4, 6, 10, 0); r(10, 5, 4, 8, 4); r(10, 5, 1, 8, 6); r(10, 5, 4, 1, 3);
  r(6, 10, 4, 2, 3); r(7, 1, 2, 3, 0); r(7, 1, 2, 1, 5); r(4, 13, 8, 2, 0);
});
const paintRefinery = dead => paint(16, 16, r => {
  r(10, 1, 3, 12, 0); r(11, 2, 1, 10, 3); r(10, 0, 3, 1, 6); r(11, -1, 1, 1, 7);               // tall stack
  r(1, 6, 8, 8, 0); r(2, 7, 6, 6, 4); r(2, 7, 6, 1, 6); r(3, 9, 4, 1, 3); r(3, 11, 4, 1, 3);
  r(8, 10, 3, 1, 3); r(1, 14, 14, 1, 0);
  if (!dead) { r(11, 0, 1, 1, 8); r(10, 0, 1, 1, 5); }
});
const paintClinic = dead => paint(16, 16, r => {
  r(1, 4, 14, 11, 0); r(2, 5, 12, 9, 15); r(2, 5, 12, 1, 3);
  r(6, 6, 4, 6, 5); r(5, 8, 6, 2, 5);                                                          // red cross
  r(3, 11, 2, 2, 14); r(11, 11, 2, 2, 14); r(2, 14, 12, 1, 0);
});
const paintPowerPlant = dead => paint(24, 24, r => {
  r(2, 6, 12, 1, 0); r(3, 7, 10, 1, 0); r(4, 8, 8, 12, 3); r(3, 8, 1, 12, 0); r(12, 8, 1, 12, 0);   // cooling tower
  r(4, 8, 8, 1, 4); r(5, 11, 6, 1, 2); r(5, 15, 6, 1, 2); r(2, 7, 2, 13, 0); r(12, 7, 2, 13, 0);
  r(3, 4, 10, 2, 15); r(5, 2, 6, 2, 15);                                                       // steam
  r(16, 3, 4, 17, 0); r(17, 4, 2, 15, 5); r(16, 3, 4, 1, 6);                                   // stack
  r(0, 20, 24, 4, 0); r(1, 21, 22, 2, 3); r(3, 21, 4, 1, 6); r(14, 21, 3, 1, 14);
});
const paintWaterPlant = dead => paint(24, 24, r => {
  r(1, 5, 9, 12, 0); r(2, 6, 7, 10, 13); r(2, 6, 2, 10, 14); r(1, 4, 9, 1, 0);                  // tank 1
  r(12, 8, 9, 9, 0); r(13, 9, 7, 7, 13); r(13, 9, 2, 7, 14);                                    // tank 2
  r(8, 12, 6, 2, 3); r(9, 11, 4, 1, 14);                                                         // pipe
  r(2, 18, 20, 5, 0); r(3, 19, 18, 3, 3); r(4, 19, 3, 2, 14); r(9, 19, 3, 2, 14); r(15, 19, 5, 2, 1);
});
const paintDataCenter = dead => paint(24, 24, r => {
  r(11, 1, 1, 6, 0); r(9, 2, 5, 1, 15); r(10, 4, 3, 1, 15); r(11, 0, 1, 1, dead ? 3 : 5);     // antenna
  r(1, 7, 22, 16, 0); r(2, 8, 20, 14, 2); r(2, 8, 20, 1, 3);
  for (let i = 0; i < 4; i++) { r(3 + i * 5, 10, 4, 8, 1); for (let j = 0; j < 4; j++) r(4 + i * 5, 11 + j * 2, 2, 1, (i + j) % 3 ? 11 : 14); }
  r(10, 19, 4, 3, 0); r(1, 22, 22, 1, 0);
}, false);

// ---------------- weathering: scuffs, grime and wear on baked sprites ----------------
const RGB2IDX = {}; PAL.forEach((h, i) => { RGB2IDX[h.toLowerCase()] = i; });
const DARKER = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 3, 6: 5, 9: 1, 10: 9, 11: 10, 12: 10, 13: 9, 15: 4 };
const LIGHTER = { 1: 2, 2: 3, 3: 4, 5: 6, 9: 10, 10: 11, 13: 14 };
function weatherize(c, seed) {
  if (c.width < 16) return c;                                   // tiny sprites stay crisp
  const k = c.getContext('2d'), im = k.getImageData(0, 0, c.width, c.height), d = im.data, rnd = mulberry(seed), w = c.width, h = c.height;
  const hex = n => (n < 16 ? '0' : '') + n.toString(16);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; if (d[o + 3] === 0) continue;
    const idx = RGB2IDX['#' + hex(d[o]) + hex(d[o + 1]) + hex(d[o + 2])];
    if (idx === undefined || idx === 0) continue;                 // keep outlines and unknown colours
    const r = rnd(), under = y >= h - 3, damp = (x < 2 || x > w - 3) ? 0.05 : 0;      // dirt gathers low down and at the corners
    let to = -1;
    if (r < (under ? 0.17 : 0.055) + damp && DARKER[idx] !== undefined) to = DARKER[idx];
    else if (r > 0.968 && LIGHTER[idx] !== undefined) to = LIGHTER[idx];
    if (to >= 0) { const rgb = PAL[to]; d[o] = parseInt(rgb.slice(1, 3), 16); d[o + 1] = parseInt(rgb.slice(3, 5), 16); d[o + 2] = parseInt(rgb.slice(5, 7), 16); }
  }
  k.putImageData(im, 0, 0); return c;
}

// ---------------- v4: hydro turbine ----------------
const paintHydro = dead => paint(16, 16, r => {
  r(0, 9, 16, 7, 13); r(0, 9, 16, 1, 14); for (let i = 0; i < 16; i += 3) r(i, 11 + (i % 2), 2, 1, 14);                // water
  r(2, 2, 12, 9, 0); r(3, 3, 10, 7, 3); r(3, 3, 10, 1, 4); r(5, 4, 6, 5, 1);                                              // housing
  r(7, 4, 2, 5, 7); r(6, 5, 4, 3, 7); r(7, 5, 2, 3, 8);                                                                 // lightning plate
  r(1, 11, 3, 4, 0); r(2, 11, 1, 4, 3); r(12, 11, 3, 4, 0); r(13, 11, 1, 4, 3);                                          // piers
});

// ---------------- v5: more buildings ----------------
const paintGasTurbine = dead => paint(16, 16, r => {
  r(1, 5, 14, 8, 0); r(2, 6, 12, 6, 3); r(2, 6, 12, 1, 4); r(2, 11, 12, 1, 2);
  r(3, 7, 3, 4, 1); r(4, 8, 1, 2, 5); r(7, 7, 6, 4, 2); for (let i = 0; i < 6; i += 2) r(7 + i, 7, 1, 4, 3);       // turbine hall + fins
  r(11, 1, 3, 5, 0); r(12, 2, 1, 4, 3); r(11, 0, 3, 1, 5);                                                         // exhaust stack
  r(1, 13, 14, 2, 0);
});
const paintDesal = dead => paint(16, 16, r => {
  r(1, 4, 6, 9, 0); r(2, 5, 4, 7, 13); r(2, 5, 2, 7, 14); r(9, 6, 6, 7, 0); r(10, 7, 4, 5, 3); for (let i = 0; i < 4; i++) r(10, 7 + i * 1.3 | 0, 4, 1, 13);
  r(6, 8, 4, 2, 3); r(7, 7, 2, 1, 14); r(0, 13, 16, 3, 0); r(1, 14, 14, 1, 13);
});
const paintRelay = dead => paint(8, 8, r => {
  r(3, 0, 2, 1, 11); r(2, 1, 1, 1, 11); r(5, 1, 1, 1, 11); r(3, 1, 2, 1, 0); r(3, 2, 2, 3, 0); r(2, 5, 4, 1, 3); r(1, 6, 6, 1, 3); r(0, 7, 8, 1, 0); r(3, 3, 2, 1, 4);
});
const paintApartments = dead => paint(16, 16, r => {
  r(2, 1, 12, 14, 0); r(3, 2, 10, 12, 3); r(3, 2, 10, 1, 4);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { r(4 + x * 3, 4 + y * 3, 2, 2, 1); r(4 + x * 3, 4 + y * 3, 1, 1, 7); }
  r(6, 12, 4, 3, 1); r(2, 14, 12, 1, 0);
});
const paintMarket = dead => paint(16, 16, r => {
  r(1, 7, 14, 8, 0); r(2, 8, 12, 6, 3); for (let i = 0; i < 12; i += 4) { r(1 + i, 4, 2, 4, 5); r(3 + i, 4, 2, 4, 15); } r(1, 3, 14, 1, 0);
  r(4, 10, 3, 3, 14); r(9, 10, 3, 3, 14); r(7, 12, 2, 3, 1); r(2, 14, 12, 1, 0);
});
const paintSchool = dead => paint(16, 16, r => {
  r(7, 0, 1, 4, 0); r(8, 0, 3, 2, 5);                                                         // flag
  r(1, 5, 14, 10, 0); r(2, 6, 12, 8, 4); r(2, 6, 12, 1, 6); r(6, 3, 4, 3, 0); r(7, 4, 2, 1, 7);
  r(3, 8, 2, 2, 14); r(7, 8, 2, 2, 14); r(11, 8, 2, 2, 14); r(6, 11, 4, 4, 1); r(2, 14, 12, 1, 0);
});
const paintGreenhouse = dead => paint(16, 16, r => {
  r(1, 5, 14, 10, 0); r(2, 3, 12, 2, 0); r(3, 6, 10, 8, 14); r(3, 6, 10, 1, 15);
  for (let i = 3; i < 13; i += 3) r(i, 6, 1, 8, 0); r(2, 10, 12, 1, 0);
  r(4, 11, 2, 3, 10); r(7, 12, 2, 2, 11); r(10, 11, 2, 3, 10); r(4, 11, 2, 1, 12); r(2, 14, 12, 1, 0);
});
const paintStation = dead => paint(32, 32, r => {
  r(14, 0, 2, 7, 0); r(10, 3, 10, 1, 15); r(12, 5, 6, 1, 15); r(14, 0, 2, 1, dead ? 3 : 5);                       // mast + dish
  r(2, 8, 28, 22, 0); r(3, 9, 26, 20, 2); r(3, 9, 26, 2, 3);
  r(5, 12, 22, 9, 1); for (let i = 0; i < 6; i++) { r(6 + i * 3 + (i > 2 ? 4 : 0), 14, 2, 1, i % 2 ? 7 : 11); r(6 + i * 3 + (i > 2 ? 4 : 0), 17, 2, 1, i % 3 ? 14 : 5); }
  r(5, 22, 6, 6, 1); r(6, 23, 4, 4, 14); r(13, 22, 6, 6, 3); r(14, 23, 4, 4, 1); r(21, 22, 6, 6, 1); r(22, 23, 4, 2, 7);
  r(0, 29, 32, 3, 0); r(1, 30, 30, 1, 3);
});

// ---------------- v6: intertie + security post ----------------
const paintIntertie = dead => paint(16, 16, r => {
  r(1, 6, 14, 9, 0); r(2, 7, 12, 7, 3); r(2, 7, 12, 1, 4);
  r(4, 1, 1, 6, 0); r(11, 1, 1, 6, 0); r(2, 3, 5, 1, 0); r(9, 3, 5, 1, 0); r(2, 3, 5, 1, 8); r(9, 3, 5, 1, 8);                 // two pylons
  r(3, 9, 3, 3, 1); r(4, 10, 1, 1, 7); r(10, 9, 3, 3, 1); r(11, 10, 1, 1, 14); r(7, 8, 2, 5, 2); r(7, 9, 2, 1, 11); r(2, 14, 12, 1, 0);
});
const paintSecurity = dead => paint(16, 16, r => {
  r(6, 0, 4, 2, 5); r(7, 0, 2, 1, 8); r(5, 2, 6, 5, 0); r(6, 3, 4, 3, 1); r(7, 4, 2, 1, 5);                                       // beacon tower
  r(1, 8, 14, 7, 0); r(2, 9, 12, 5, 2); r(2, 9, 12, 1, 3); r(4, 11, 3, 2, 14); r(9, 11, 3, 2, 14); r(2, 14, 12, 1, 0);
});


// ---------------- v6: fuel, power, water and industry buildings ----------------
const paintKiln = dead => paint(16, 16, r => {
  r(3, 6, 10, 8, 0); r(2, 8, 12, 6, 0); r(4, 7, 8, 7, 4); r(3, 9, 10, 5, 4); r(4, 7, 8, 1, 6); r(5, 9, 1, 1, 5); r(10, 9, 1, 1, 5); r(4, 12, 1, 1, 5); r(11, 12, 1, 1, 5);   // brick dome
  r(6, 10, 4, 4, 0); r(7, 11, 2, 3, 6); r(7, 12, 2, 2, 7);                                                                                           // fire mouth
  r(10, 2, 2, 5, 0); r(10, 3, 2, 3, 3); r(9, 0, 3, 2, 15); r(12, 1, 2, 1, 15);                                                                      // chimney + smoke
  r(1, 14, 14, 1, 0);
});
const paintDigester = dead => paint(16, 16, r => {
  r(1, 6, 8, 8, 0); r(2, 5, 6, 1, 0); r(3, 4, 4, 1, 0); r(2, 6, 6, 7, 10); r(3, 5, 4, 1, 10); r(2, 6, 2, 7, 11); r(4, 4, 2, 1, 12);   // dome tank
  r(10, 8, 5, 6, 0); r(11, 9, 3, 4, 9); r(11, 9, 1, 4, 10); r(10, 7, 5, 1, 0);                                                       // feed tank
  r(8, 10, 3, 1, 3); r(12, 4, 1, 3, 0); r(11, 3, 3, 1, 6); r(12, 2, 1, 1, 7);                                                         // pipe + gas flare
  r(1, 14, 14, 1, 0);
});
const paintOilWell = dead => paint(16, 16, r => {
  r(1, 13, 14, 2, 0); r(2, 13, 12, 1, 3);                                                         // pad
  r(6, 6, 4, 7, 0); r(7, 7, 2, 6, 3); r(6, 12, 1, 1, 3); r(9, 12, 1, 1, 3);                     // A-frame
  r(1, 4, 13, 2, 0); r(2, 4, 11, 1, 5);                                                          // walking beam
  r(0, 3, 3, 5, 0); r(1, 4, 1, 3, 4);                                                            // horse head
  r(1, 8, 1, 5, 0);                                                                              // polished rod
  r(11, 6, 4, 4, 0); r(12, 7, 2, 2, 4); r(12, 7, 1, 1, 6);                                      // counterweight
  r(11, 10, 4, 3, 0); r(12, 11, 2, 1, 7);                                                        // motor
});
const paintSynfuel = dead => paint(16, 16, r => {
  r(1, 3, 3, 11, 0); r(2, 4, 1, 9, 3); r(1, 2, 3, 1, 6);                                         // column
  r(5, 1, 3, 13, 0); r(6, 2, 1, 11, 15); r(5, 0, 3, 1, 7); r(6, 5, 1, 1, 5); r(6, 9, 1, 1, 5);  // tall column
  r(9, 7, 6, 7, 0); r(10, 8, 4, 5, 4); r(10, 8, 4, 1, 6); r(11, 10, 2, 1, 7);                   // reactor hall
  r(3, 9, 3, 1, 5); r(8, 11, 2, 1, 5); r(0, 14, 16, 2, 0); r(1, 14, 14, 1, 3);
});
const paintTankFarm = dead => paint(16, 16, r => {
  r(1, 4, 7, 10, 0); r(2, 5, 5, 8, 15); r(2, 5, 1, 8, 4); r(2, 8, 5, 1, 5); r(3, 3, 3, 1, 0);   // big tank
  r(9, 6, 6, 8, 0); r(10, 7, 4, 6, 15); r(10, 7, 1, 6, 4); r(10, 9, 4, 1, 5); r(11, 5, 2, 1, 0);
  r(7, 11, 3, 1, 3); r(0, 14, 16, 1, 0);
});
const paintBiomass = dead => paint(16, 16, r => {
  r(1, 7, 10, 7, 0); r(2, 8, 8, 5, 3); r(2, 8, 8, 1, 4); r(4, 10, 3, 2, 6); r(4, 10, 3, 1, 7);   // boiler with fire window
  r(8, 2, 3, 6, 0); r(9, 3, 1, 4, 5); r(8, 1, 3, 1, 15); r(7, 0, 2, 1, 15);                     // stack
  r(11, 10, 4, 4, 0); r(11, 11, 4, 1, 4); r(11, 13, 4, 1, 4); r(12, 10, 1, 4, 5); r(14, 10, 1, 4, 5);   // log pile
  r(1, 14, 14, 1, 0);
});
const paintFuelCell = dead => paint(16, 16, r => {
  r(1, 5, 14, 9, 0); r(2, 6, 12, 7, 2); r(2, 6, 12, 1, 3);
  for (let i = 0; i < 4; i++) { r(3 + i * 3, 8, 2, 4, 13); r(3 + i * 3, 8, 2, 1, 14); }
  r(6, 2, 4, 3, 0); r(7, 3, 2, 1, 7); r(1, 14, 14, 1, 0);
});
const paintGeothermal = dead => paint(16, 16, r => {
  r(2, 9, 12, 5, 0); r(3, 10, 10, 3, 3); r(3, 10, 10, 1, 4); r(10, 11, 2, 1, 7); r(4, 11, 2, 1, 6);
  r(6, 5, 4, 5, 0); r(7, 6, 2, 3, 5); r(5, 4, 6, 1, 0);                                        // well head
  r(4, 1, 8, 3, 15); r(6, 0, 4, 1, 15); r(3, 2, 1, 1, 15);                                     // steam
  r(1, 14, 14, 1, 0);
});
const paintWell = dead => paint(8, 8, r => {
  r(1, 0, 6, 1, 5); r(1, 1, 1, 3, 0); r(6, 1, 1, 3, 0); r(3, 2, 2, 1, 4);                     // roof frame + bucket
  r(1, 4, 6, 4, 0); r(2, 5, 4, 2, 3); r(2, 5, 4, 1, 4); r(3, 6, 2, 1, 14);                    // stone ring + water
});
const paintScrapyard = dead => paint(16, 16, r => {
  r(1, 9, 6, 5, 0); r(2, 10, 4, 3, 3); r(3, 9, 2, 1, 5); r(2, 11, 1, 1, 6);                    // junk pile
  r(8, 10, 7, 4, 0); r(9, 11, 5, 2, 4); r(10, 10, 2, 1, 5); r(11, 12, 1, 1, 15);
  r(5, 1, 1, 9, 0); r(5, 1, 8, 1, 0); r(6, 2, 1, 1, 3); r(12, 2, 1, 3, 0); r(11, 5, 3, 2, 6);  // crane + magnet
  r(0, 14, 16, 1, 0);
});
const paintMine = dead => paint(16, 16, r => {
  r(4, 1, 8, 1, 0); r(5, 2, 1, 9, 0); r(10, 2, 1, 9, 0); r(5, 5, 6, 1, 0); r(6, 1, 4, 1, 3);   // headframe
  r(7, 2, 2, 2, 6); r(7, 2, 1, 1, 7);                                                           // wheel
  r(3, 10, 10, 4, 0); r(4, 11, 8, 3, 1); r(6, 11, 4, 3, 0); r(4, 11, 8, 1, 4);                 // shaft entrance
  r(12, 11, 3, 3, 0); r(13, 11, 1, 1, 4); r(0, 14, 16, 1, 0);                                   // ore cart
});
const paintFoundry = dead => paint(16, 16, r => {
  r(1, 5, 10, 9, 0); r(2, 6, 8, 7, 2); r(2, 6, 8, 1, 3);
  r(3, 9, 6, 3, 5); r(4, 10, 4, 1, 6); r(5, 10, 2, 1, 7);                                      // glowing mouth
  r(11, 1, 3, 13, 0); r(12, 2, 1, 11, 3); r(11, 0, 3, 1, 5);                                    // stack
  r(9, 12, 3, 2, 0); r(10, 12, 1, 1, 7); r(1, 14, 14, 1, 0);
});
const paintAssembly = dead => paint(16, 16, r => {
  r(1, 5, 14, 9, 0); r(2, 6, 12, 7, 3);
  for (let i = 0; i < 3; i++) { r(1 + i * 5, 3, 1, 3, 0); r(2 + i * 5, 4, 3, 1, 0); r(2 + i * 5, 5, 3, 1, 14); }        // sawtooth roof with skylights
  r(2, 9, 12, 2, 1); for (let i = 0; i < 4; i++) r(3 + i * 3, 9, 1, 1, 7);                                                // conveyor
  r(6, 11, 4, 3, 0); r(1, 14, 14, 1, 0);
});
const paintWarehouse = dead => paint(16, 16, r => {
  r(0, 4, 16, 2, 0); r(1, 5, 14, 9, 0); r(2, 6, 12, 7, 4); r(1, 5, 14, 1, 5);
  r(4, 8, 8, 6, 1); r(4, 8, 8, 1, 2); r(4, 10, 8, 1, 2); r(4, 12, 8, 1, 2);                    // roller door
  r(2, 11, 2, 2, 6); r(12, 11, 2, 2, 6); r(1, 14, 14, 1, 0);
});
const paintArchive = dead => paint(16, 16, r => {
  r(1, 4, 14, 11, 0); r(2, 5, 12, 9, 1); r(2, 5, 12, 1, 3);
  for (let i = 0; i < 4; i++) { r(3 + i * 3, 7, 2, 6, 2); for (let j = 0; j < 3; j++) r(3 + i * 3, 8 + j * 2, 2, 1, (i + j) % 2 ? 11 : 14); }
  r(7, 1, 2, 3, 0); r(6, 0, 4, 1, 14); r(1, 14, 14, 1, 0);
});

// ---------------- v8: drone bay ----------------
const paintDroneBay = dead => paint(16, 16, r => {
  r(1, 7, 14, 7, 0); r(2, 8, 12, 5, 3); r(2, 8, 12, 1, 4); r(5, 10, 6, 4, 1); r(5, 10, 6, 1, 2);   // hangar with an open door
  r(1, 5, 14, 2, 0); r(2, 5, 12, 1, 14); for (let i = 3; i < 13; i += 3) r(i, 5, 1, 1, 0);            // landing pad with lights
  r(3, 1, 5, 2, 0); r(4, 2, 3, 1, 15); r(2, 1, 1, 1, 3); r(8, 1, 1, 1, 3); r(5, 3, 1, 1, 14);         // a drone above the pad
  r(10, 2, 4, 2, 0); r(11, 3, 2, 1, 15); r(9, 2, 1, 1, 3); r(14, 2, 1, 1, 3);
  r(1, 14, 14, 1, 0);
});

// ---------------- v7: advanced buildings (Ages III-V) ----------------
const paintSmelter = dead => paint(16, 16, r => {
  r(1, 6, 9, 8, 0); r(2, 7, 7, 6, 3); r(2, 7, 7, 1, 4); r(3, 9, 5, 3, 5); r(4, 10, 3, 1, 7);                 // furnace
  r(10, 2, 3, 12, 0); r(11, 3, 1, 10, 15); r(10, 1, 3, 1, 14);                                                // stack
  r(12, 10, 3, 4, 0); r(13, 11, 1, 2, 14); r(5, 13, 6, 1, 14); r(1, 14, 14, 1, 0);                             // alloy ingots
});
const paintCircuitFab = dead => paint(16, 16, r => {
  r(1, 5, 14, 9, 0); r(2, 6, 12, 7, 9); r(2, 6, 12, 1, 10);
  for (let i = 0; i < 5; i++) r(3 + i * 2, 8, 1, 4, 11); r(3, 10, 9, 1, 12); r(5, 9, 5, 2, 0); r(6, 9, 3, 1, 14);   // printed circuit
  r(6, 1, 4, 4, 0); r(7, 2, 2, 2, 12); r(1, 14, 14, 1, 0);
});
const paintExchange = dead => paint(16, 16, r => {
  r(1, 6, 14, 8, 0); r(2, 7, 12, 6, 3); r(2, 7, 12, 1, 4);
  r(3, 9, 4, 3, 5); r(9, 9, 4, 3, 14); r(7, 10, 2, 1, 7);                                                      // crates in, crates out
  r(2, 3, 5, 1, 7); r(5, 2, 1, 3, 7); r(9, 3, 5, 1, 14); r(9, 2, 1, 3, 14); r(1, 14, 14, 1, 0);              // arrows
});
const paintSolarFarm = dead => paint(16, 16, r => {
  for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) { const x = 1 + i * 7, y = 1 + j * 5; r(x, y, 7, 4, 0); r(x + 1, y + 1, 5, 2, 13); r(x + 1, y + 1, 5, 1, 14); r(x + 3, y + 1, 1, 2, 9); }
  r(0, 15, 16, 1, 0);
});
const paintWindFarm = dead => paint(16, 16, r => {
  [[3, 2], [11, 4], [7, 8]].forEach(([x, y]) => { r(x, y + 2, 1, 6, 15); r(x - 2, y, 2, 1, 15); r(x + 1, y + 1, 2, 1, 15); r(x, y - 2, 1, 2, 15); r(x, y, 1, 1, 0); });
  r(0, 14, 16, 2, 0); r(1, 14, 14, 1, 9);
});
const paintCompWorks = dead => paint(16, 16, r => {
  r(1, 4, 14, 10, 0); r(2, 5, 12, 8, 2); r(2, 5, 12, 1, 3);
  r(3, 7, 3, 3, 13); r(4, 8, 1, 1, 14); r(7, 7, 3, 3, 6); r(8, 8, 1, 1, 7); r(11, 7, 2, 3, 11);                // three chambers
  r(3, 11, 10, 1, 7); r(6, 1, 4, 3, 0); r(7, 2, 2, 1, 7); r(1, 14, 14, 1, 0);
});
const paintFission = dead => paint(16, 16, r => {
  r(3, 3, 10, 11, 0); r(2, 5, 12, 9, 0); r(4, 4, 8, 10, 15); r(3, 6, 10, 8, 15); r(4, 4, 2, 10, 4);           // containment dome
  r(6, 8, 4, 4, 0); r(7, 9, 2, 2, 11); r(7, 9, 1, 1, 12);                                                       // core glow
  r(13, 1, 2, 13, 0); r(13, 0, 2, 1, 5); r(1, 14, 14, 1, 0);
});
const paintRobotDepot = dead => paint(16, 16, r => {
  r(1, 6, 14, 8, 0); r(2, 7, 12, 6, 3); r(2, 7, 12, 1, 4); r(5, 9, 6, 5, 1);
  r(6, 1, 4, 4, 0); r(7, 2, 2, 1, 14); r(5, 0, 1, 2, 0); r(10, 0, 1, 2, 0);                                     // robot head
  r(6, 10, 1, 1, 14); r(9, 10, 1, 1, 14); r(1, 14, 14, 1, 0);
});
const paintArcology = dead => paint(16, 16, r => {
  r(4, 0, 8, 15, 0); r(5, 1, 6, 13, 3); r(2, 6, 3, 9, 0); r(11, 4, 3, 11, 0); r(3, 7, 1, 7, 2); r(12, 5, 1, 9, 2);
  for (let y = 2; y < 13; y += 2) for (let x = 6; x < 10; x += 2) r(x, y, 1, 1, y % 4 ? 7 : 14);
  r(5, 1, 6, 1, 10); r(7, 13, 2, 2, 1); r(1, 15, 14, 1, 0);
});
const paintVFarm = dead => paint(16, 16, r => {
  r(3, 1, 10, 14, 0); r(4, 2, 8, 12, 14);
  for (let y = 3; y < 13; y += 3) { r(4, y, 8, 1, 0); r(5, y + 1, 2, 1, 11); r(9, y + 1, 2, 1, 10); }
  r(1, 14, 14, 1, 0);
});
const paintQuantum = dead => paint(16, 16, r => {
  r(1, 5, 14, 9, 0); r(2, 6, 12, 7, 1); r(2, 6, 12, 1, 2);
  r(6, 7, 4, 4, 0); r(7, 8, 2, 2, 12); r(5, 8, 1, 2, 14); r(10, 8, 1, 2, 14); r(7, 6, 2, 1, 14); r(7, 11, 2, 1, 14);   // qubit ring
  r(3, 1, 1, 4, 0); r(12, 1, 1, 4, 0); r(3, 1, 10, 1, 14); r(1, 14, 14, 1, 0);
});
const paintFusion = dead => paint(16, 16, r => {
  r(1, 3, 14, 11, 0); r(2, 4, 12, 9, 2); r(2, 4, 12, 1, 3);
  r(4, 5, 8, 7, 0); r(5, 6, 6, 5, 5); r(6, 7, 4, 3, 6); r(7, 8, 2, 1, 8);                                        // plasma torus
  r(3, 6, 1, 5, 14); r(12, 6, 1, 5, 14); r(7, 0, 2, 3, 0); r(7, 0, 2, 1, 7); r(1, 14, 14, 1, 0);
});
const paintAtmo = dead => paint(16, 16, r => {
  r(2, 2, 12, 12, 0); r(3, 3, 10, 10, 13); r(3, 3, 10, 1, 14);
  for (let i = 0; i < 4; i++) r(4 + i * 2, 5, 1, 6, 9);                                                             // condenser fins
  r(5, 12, 6, 2, 14); r(1, 14, 14, 1, 0);
});
const paintMegafab = dead => paint(16, 16, r => {
  r(0, 4, 16, 10, 0); r(1, 5, 14, 8, 3); for (let i = 0; i < 4; i++) { r(1 + i * 4, 2, 1, 3, 0); r(2 + i * 4, 3, 3, 1, 0); r(2 + i * 4, 4, 3, 1, 7); }
  r(2, 8, 12, 2, 1); for (let i = 0; i < 6; i++) r(3 + i * 2, 8, 1, 1, i % 2 ? 6 : 14);
  r(6, 10, 4, 3, 0); r(0, 14, 16, 1, 0);
});
const paintOrbital = dead => paint(16, 16, r => {
  r(3, 1, 10, 2, 15); r(2, 3, 12, 2, 15); r(4, 3, 8, 1, 4); r(7, 5, 2, 7, 0); r(7, 0, 2, 1, 11);               // dish + mast
  r(3, 11, 10, 3, 0); r(4, 12, 8, 1, 3); r(6, 12, 1, 1, 11); r(9, 12, 1, 1, 14); r(1, 14, 14, 1, 0);
});

// ---- pixel icons (8x8 masks). pxi('check') gives an inline icon that takes the colour of the text around it, so the UI never needs emoji ----
const PXI = {
  check: ['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........'],
  cross: ['........', '##....##', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '##....##'],
  lock: ['..####..', '.##..##.', '.#....#.', '########', '########', '###..###', '###..###', '########'],
  star: ['...##...', '...##...', '########', '.######.', '..####..', '.######.', '.##..##.', '.#....#.'],
  warn: ['...##...', '...##...', '..####..', '..#..#..', '.#.##.#.', '.#.##.#.', '########', '........'],
  arrow: ['..#.....', '..##....', '..###...', '..####..', '..###...', '..##....', '..#.....', '........'],
  coin: ['..####..', '.#....#.', '#.####.#', '#.#....#', '#.#....#', '#.####.#', '.#....#.', '..####..'],
  rad: ['..####..', '.##..##.', '#..##..#', '#.####.#', '#..##..#', '.##..##.', '..####..', '........'],
  multi: ['........', '########', '........', '########', '........', '########', '........', '........'],
  route: ['#..#....', '.#..#...', '..#..#..', '...#..#.', '..#..#..', '.#..#...', '#..#....', '........'],
  cut: ['#....#..', '.#..#...', '..##....', '..##....', '.#..#...', '##..##..', '##..##..', '........'],
  look: ['.####...', '#....#..', '#....#..', '#....#..', '.####...', '....##..', '.....##.', '......##'],
  plus: ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...'],
  sq: ['........', '.######.', '.######.', '.######.', '.######.', '.######.', '.######.', '........'],
  sqo: ['........', '.######.', '.#....#.', '.#....#.', '.#....#.', '.#....#.', '.######.', '........'],
  dia: ['...##...', '..####..', '.######.', '########', '.######.', '..####..', '...##...', '........'],
  ring: ['..####..', '.#....#.', '#......#', '#......#', '#......#', '#......#', '.#....#.', '..####..'],
};
const pxi = (name, extra) => `<i class="pxi pxi-${name}${extra ? ' ' + extra : ''}"></i>`;
const pips = (n, max) => '<u class="pip on"></u>'.repeat(Math.max(0, n)) + '<u class="pip"></u>'.repeat(Math.max(0, max - n));
const starsHtml = (n, max = 3) => pxi('star').repeat(Math.max(0, n)) + '<i class="dimst">' + pxi('star').repeat(Math.max(0, max - n)) + '</i>';
(function injectPxi() {
  let css = '.pxi { display:inline-block; width:16px; height:16px; vertical-align:-3px; background:currentColor; -webkit-mask:var(--m) center/100% 100% no-repeat; mask:var(--m) center/100% 100% no-repeat; image-rendering:pixelated; font-style:normal; } .pxi.big { width:24px; height:24px; vertical-align:-6px; }\n';
  for (const k in PXI) { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g2 = c.getContext('2d'); g2.fillStyle = '#000'; PXI[k].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g2.fillRect(x, y, 1, 1); })); css += `.pxi-${k} { --m:url(${c.toDataURL()}); }\n`; }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
