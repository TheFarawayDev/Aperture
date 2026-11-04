'use strict';
// ============================================================
//  COUNTY.JS - turns a county on the world map into a playable level.
//  Same county id = same level every time (it is seeded).
//  The level matches the map: its biome comes from the county's climate,
//  and sides that touch the sea / a Great Lake get a shoreline.
//  diff = hops from where you landed (0 = easy).
// ============================================================

const DISTRICT_NAMES = ['DUSTWATER', 'RUSTBELT', 'HOLLOW CREEK', 'OLD SUBSTATION', 'SKYLINE', 'LANTERN HILL', 'COPPERTOWN',
  'SALT FLATS', 'BRIARWOOD', 'GLASSHOUSE', 'WIDOW\'S REACH', 'CINDER FORD', 'SIGNAL POINT', 'ASHFALL', 'MIRAGE', 'GRAVELTON',
  'OXBOW', 'SABLE BAY', 'IRONSIDE', 'LAST LIGHT'];
const KIND_TABLE = ['res', 'res', 'res', 'ind', 'ind', 'farm', 'med', 'campus', 'campus'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function genCounty(c, diff) {
  const r = mulberry(c.id * 7919 + 13);
  const ar = clamp(c.bw / c.bh, 0.7, 1.5), base = clamp(88 + Math.sqrt(c.cells.length) * 2.0, 100, 150);
  const WW = clamp(Math.round(base * Math.sqrt(ar)), 100, 160), WH = clamp(Math.round(base * 0.7 / Math.sqrt(ar)), 70, 110);
  const wetSides = [c.water.n, c.water.s, c.water.w, c.water.e].filter(v => v > 0.3).length, depthMax = wetSides >= 3 ? 8 : wetSides === 2 ? 14 : 20;   // islands keep room to build
  const coast = { n: Math.round(c.water.n * depthMax), s: Math.round(c.water.s * depthMax), w: Math.round(c.water.w * depthMax), e: Math.round(c.water.e * depthMax) };
  const mx0 = Math.max(10, coast.w + 7), mx1 = WW - Math.max(10, coast.e + 7), my0 = Math.max(8, coast.n + 7), my1 = WH - Math.max(9, coast.s + 8);
  const names = [...DISTRICT_NAMES].sort(() => r() - 0.5);
  const total = 4 + Math.min(4, Math.floor(diff / 2)) + (r() < 0.4 ? 1 : 0);

  // home district: you always start with a generator, pump and router (cut off from the hub)
  const hx = mx0 + 1 + (r() * Math.max(1, (mx1 - mx0) * 0.25) | 0), hy = clamp(my0 + 2 + (r() * Math.max(1, my1 - my0 - 4) | 0), 14, WH - 14);
  const districts = [{ name: 'HOME BASE', kind: 'res', x: hx, y: hy, home: true, ruins: [[hx - 5, hy + 4], [hx + 5, hy - 1], [hx, hy + 4]] }];
  const start = [
    { type: 'generator', x: hx - 5, y: hy - 3 },
    { type: 'router', x: hx + 4, y: hy - 3 },
    { type: 'pump', x: hx + 6, y: hy + 3 },
  ];
  const ponds = [{ x: hx + 10, y: hy + 4, r: 2.6 }];
  const offsets = [[-5, 0], [5, -1], [0, 4], [-5, 4], [5, 4]];
  const far = (x, y, w, h) => districts.every(d => Math.abs(d.x - x) >= w || Math.abs(d.y - y) >= h);
  for (let tries = 0; tries < 800 && districts.length < total; tries++) {
    const x = mx0 + (r() * (mx1 - mx0 - 8) | 0), y = my0 + (r() * (my1 - my0 - 6) | 0);
    if (!far(x, y, 16, 14)) continue;
    const ruins = offsets.filter(() => r() < 0.75).slice(0, 4).map(([dx, dy]) => [x + dx, y + dy]);
    districts.push({ name: names[districts.length % names.length], kind: KIND_TABLE[r() * KIND_TABLE.length | 0], x, y, ruins: ruins.length ? ruins : [[x - 5, y]] });
  }
  // dormant central sites (3x3): a power plant, a water plant and a data centre
  const sites = [];
  for (const kind of ['power', 'water', 'data', 'station']) {
    for (let tries = 0; tries < 800; tries++) {
      const x = mx0 + (r() * (mx1 - mx0 - 4) | 0), y = my0 + (r() * (my1 - my0 - 4) | 0);
      if (!far(x - 5, y - 5, 18, 16) || sites.some(s => Math.abs(s.x - x) < 11 && Math.abs(s.y - y) < 11)) continue;
      sites.push({ kind, x, y }); break;
    }
  }
  for (const kind of ['power', 'water', 'data', 'station']) {                          // cramped counties (islands, ice): relax the spacing until every site fits
    if (sites.some(s => s.kind === kind)) continue;
    for (const [fw, fh, gap] of [[14, 12, 9], [10, 9, 7], [7, 7, 5]]) {
      let ok = false;
      for (let tries = 0; tries < 600 && !ok; tries++) {
        const x = mx0 + (r() * (mx1 - mx0 - 4) | 0), y = my0 + (r() * (my1 - my0 - 4) | 0);
        if (!far(x - 4, y - 4, fw, fh) || sites.some(s => Math.abs(s.x - x) < gap && Math.abs(s.y - y) < gap)) continue;
        sites.push({ kind, x, y }); ok = true;
      }
      if (ok) break;
    }
  }
  const B = c.biome;
  return {
    seed: c.id * 104729 + 17, WW, WH, districts, start, ponds, sites, coast, biome: B, diff, county: c.name,
    rivers: B === 'swamp' ? 2 : B === 'desert' ? (r() < 0.4 ? 1 : 0) : B === 'mountain' ? 1 : (r() < 0.7 ? 1 : 0) + (r() < 0.3 ? 1 : 0),
    pondCount: ({ swamp: 14, forest: 7, plains: 5, desert: 2, mountain: 4, tundra: 9, waste: 6 })[B] ?? 6,
    rubbleClusters: 70 + diff * 8, rockDensity: ({ mountain: 0.7, desert: 0.25, tundra: 0.35, forest: 0.1 })[B] ?? 0.05,
  };
}
