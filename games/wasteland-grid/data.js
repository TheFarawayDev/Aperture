'use strict';
// ============================================================
//  DATA.JS - every number the builder uses: line types, buildings,
//  research tree, station modules and tools. Rebalance freely here!
// ============================================================

// ---------- line types ----------
// Three resources (power, water, net), each with a LOCAL line and a TRUNK line.
// Big producers (plants, hydro) and big consumers (the station) connect to TRUNKS.
// Houses, hubs and small machines connect to LOCAL lines.
// A transformer (substation / pressure station / net exchange) joins the two.
const NL = 6;
const LAYERS = [
  { name: 'POWER LINE', short: 'PWR', res: 0, dim: 4, live: 7, lane: 2, css: '#f5c95a', cost: 1 },
  { name: 'WATER PIPE', short: 'H2O', res: 1, dim: 13, live: 14, lane: 4, css: '#5fc4d0', cost: 1 },
  { name: 'NET CABLE', short: 'NET', res: 2, dim: 10, live: 11, lane: 6, css: '#8fbf5a', cost: 1 },
  { name: 'HV LINE', short: 'HV', res: 0, dim: 3, live: 8, core: 7, trunk: true, lane: 3, css: '#fff1b5', cost: 3, tech: 'hv' },
  { name: 'WATER MAIN', short: 'MAIN', res: 1, dim: 9, live: 15, core: 14, trunk: true, lane: 3, css: '#d8e6e0', cost: 3, tech: 'mains' },
  { name: 'FIBER LINE', short: 'FIB', res: 2, dim: 9, live: 12, core: 11, trunk: true, lane: 3, css: '#c8f08a', cost: 3, tech: 'fiber' },
];
const RESOURCES = [{ name: 'POWER', css: '#f5c95a' }, { name: 'WATER', css: '#5fc4d0' }, { name: 'NET', css: '#8fbf5a' }];
const WARN = 5;

// ---------- buildings ----------
// sup/dem = [power, water, net]   tier = [t,t,t] which line each resource uses (0 local, 1 trunk)
// bridge/sw = transformer + switch for that resource   store = battery-like buffer
// fuel = burns fuel/s   fuelOut = makes fuel/s   partsOut/partsUse = parts/s   rp = research points/s
// maint = condition lost per second   needsAll = produces only while all its inputs are met
// tech = research needed   income/upkeep = scrap per second
const BUILD = {
  generator: { name: 'GENERATOR', w: 2, h: 2, cost: 30, sup: [8, 0, 0], dem: [0, 0, 0], upkeep: 1, fuel: 0.25, maint: 0.08 },
  gasturbine: { name: 'GAS TURBINE', w: 2, h: 2, cost: 90, parts: 3, sup: [18, 0, 0], dem: [0, 0, 0], upkeep: 2, fuel: 0.5, maint: 0.1, tech: 'turbines' },
  solar: { name: 'SOLAR ARRAY', w: 2, h: 2, cost: 25, sup: [3, 0, 0], dem: [0, 0, 0], maint: 0.02, tech: 'solar' },
  wind: { name: 'WIND TURBINE', w: 1, h: 1, cost: 12, sup: [2, 0, 0], dem: [0, 0, 0], maint: 0.05, tech: 'wind' },
  hydro: { name: 'HYDRO TURBINE', w: 2, h: 2, cost: 70, parts: 2, sup: [14, 0, 0], dem: [0, 0, 0], tier: [1, 1, 1], needWater: true, upkeep: 1, maint: 0.06, tech: 'hydro' },
  battery: { name: 'BATTERY BANK', w: 2, h: 2, cost: 40, sup: [0, 0, 0], dem: [0, 0, 0], store: { L: 0, cap: 60, rate: 6 }, maint: 0.03, tech: 'storage' },
  pump: { name: 'WATER PUMP', w: 2, h: 2, cost: 30, sup: [0, 6, 0], dem: [2, 0, 0], needsAll: true, needWater: true, upkeep: 1, maint: 0.08 },
  desal: { name: 'DESALINATION', w: 2, h: 2, cost: 85, parts: 3, sup: [0, 12, 0], dem: [4, 0, 0], needsAll: true, needWater: true, upkeep: 2, maint: 0.1, tech: 'desal' },
  tower: { name: 'WATER TOWER', w: 2, h: 2, cost: 35, sup: [0, 0, 0], dem: [0, 0, 0], store: { L: 1, cap: 60, rate: 6 }, maint: 0.03, tech: 'towers' },
  router: { name: 'NET ROUTER', w: 1, h: 1, cost: 20, sup: [0, 0, 6], dem: [1, 0, 0], needsAll: true, upkeep: 1, maint: 0.06 },
  relay: { name: 'RELAY TOWER', w: 1, h: 1, cost: 40, parts: 1, sup: [0, 0, 12], dem: [2, 0, 0], needsAll: true, upkeep: 2, maint: 0.06, tech: 'mesh' },
  // transformers: join the local line to the trunk line, and double as switches
  substation: { name: 'SUBSTATION', w: 2, h: 2, cost: 50, parts: 2, sup: [0, 0, 0], dem: [0, 0, 1], bridge: 0, sw: 0, maint: 0.04, tech: 'hv' },
  valve: { name: 'PRESSURE STATION', w: 2, h: 2, cost: 40, parts: 1, sup: [0, 0, 0], dem: [1, 0, 0], bridge: 1, sw: 1, maint: 0.04, tech: 'mains' },
  node: { name: 'NET EXCHANGE', w: 2, h: 2, cost: 40, parts: 1, sup: [0, 0, 0], dem: [1, 0, 0], bridge: 2, sw: 2, maint: 0.04, tech: 'fiber' },
  house: { name: 'HOUSE', w: 2, h: 2, cost: 15, sup: [0, 0, 0], dem: [1, 1, 1], income: 2, town: true },
  apartments: { name: 'APARTMENTS', w: 2, h: 2, cost: 45, sup: [0, 0, 0], dem: [2, 2, 2], income: 7, maint: 0.03, town: true, tech: 'housing' },
  market: { name: 'MARKET', w: 2, h: 2, cost: 60, sup: [0, 0, 0], dem: [2, 1, 2], income: 8, upkeep: 1, maint: 0.05, town: true, tech: 'market' },
  school: { name: 'SCHOOL', w: 2, h: 2, cost: 65, parts: 1, sup: [0, 0, 0], dem: [1, 1, 2], income: 1, rp: 1, maint: 0.04, town: true, tech: 'school' },
  greenhouse: { name: 'GREENHOUSE', w: 2, h: 2, cost: 55, sup: [0, 0, 0], dem: [1, 3, 0], income: 6, maint: 0.04, town: true, tech: 'agri' },
  workshop: { name: 'WORKSHOP', w: 2, h: 2, cost: 45, sup: [0, 0, 0], dem: [2, 0, 1], income: 4, partsOut: 0.4, upkeep: 1, maint: 0.05, town: true, tech: 'workshop' },
  clinic: { name: 'CLINIC', w: 2, h: 2, cost: 55, parts: 2, sup: [0, 0, 0], dem: [2, 2, 1], income: 3, maint: 0.05, town: true, tech: 'medicine' },
  lab: { name: 'RESEARCH LAB', w: 2, h: 2, cost: 60, sup: [0, 0, 0], dem: [2, 0, 2], rp: 2, upkeep: 1, maint: 0.05, town: true },
  depot: { name: 'MAINT DEPOT', w: 2, h: 2, cost: 50, parts: 2, sup: [0, 0, 0], dem: [2, 0, 0], upkeep: 2, maint: 0.03, repair: { radius: 16, rate: 1.5, max: 6 }, tech: 'maint' },
  fueldepot: { name: 'FUEL DEPOT', w: 2, h: 2, cost: 40, sup: [0, 0, 0], dem: [0, 0, 0], fuelCap: 150, maint: 0.02, tech: 'refining' },
  refinery: { name: 'REFINERY', w: 2, h: 2, cost: 80, parts: 3, sup: [0, 0, 0], dem: [3, 2, 0], fuelOut: 1.5, upkeep: 2, maint: 0.1, tech: 'refining' },
  // interties pull surplus power / water / net from neighbouring counties whose control stations are online
  intertie: { name: 'INTERTIE', w: 2, h: 2, cost: 120, parts: 4, sup: [0, 0, 0], dem: [0, 0, 0], tier: [1, 1, 1], importer: true, upkeep: 2, maint: 0.04, tech: 'intertie' },
  security: { name: 'SECURITY POST', w: 2, h: 2, cost: 55, parts: 1, sup: [0, 0, 0], dem: [1, 0, 1], upkeep: 1, maint: 0.04, security: { radius: 14 }, tech: 'security' },
  // central plants and the control station live on the TRUNK lines
  powerplant: { name: 'POWER PLANT', w: 3, h: 3, cost: 0, sup: [40, 0, 0], dem: [0, 3, 0], tier: [1, 1, 1], needsAll: true, fuel: 1.5, upkeep: 3, maint: 0.14, central: true },
  waterplant: { name: 'WATER PLANT', w: 3, h: 3, cost: 0, sup: [0, 30, 0], dem: [6, 0, 1], tier: [1, 1, 1], needsAll: true, partsUse: 0.1, upkeep: 3, maint: 0.12, central: true },
  datacenter: { name: 'DATA CENTER', w: 3, h: 3, cost: 0, sup: [0, 0, 30], dem: [8, 2, 0], tier: [1, 1, 1], needsAll: true, upkeep: 3, maint: 0.1, central: true },
  station: { name: 'GRID CONTROL STATION', w: 4, h: 4, cost: 0, sup: [0, 0, 0], dem: [10, 0, 3], tier: [1, 1, 1], upkeep: 3, maint: 0.05, isStation: true },
  dormant: { name: 'DORMANT PLANT', w: 3, h: 3, cost: 0, sup: [0, 0, 0], dem: [0, 0, 0], fixed: true },
  dormantStation: { name: 'DORMANT STATION', w: 4, h: 4, cost: 0, sup: [0, 0, 0], dem: [0, 0, 0], fixed: true },
  hub: { name: 'RESIDENTIAL HUB', w: 2, h: 2, cost: 0, sup: [0, 0, 0], dem: [2, 2, 2], income: 4, fixed: true, isHub: true, accent: '2' },
  hubInd: { name: 'INDUSTRIAL HUB', w: 2, h: 2, cost: 0, sup: [0, 0, 0], dem: [5, 2, 1], income: 10, partsOut: 0.3, fixed: true, isHub: true, accent: '5' },
  hubFarm: { name: 'FARMING HUB', w: 2, h: 2, cost: 0, sup: [0, 0, 0], dem: [1, 5, 1], income: 6, fixed: true, isHub: true, accent: 'a' },
  hubMed: { name: 'MEDICAL HUB', w: 2, h: 2, cost: 0, sup: [0, 0, 0], dem: [3, 3, 2], income: 3, rp: 0.5, fixed: true, isHub: true, accent: 'f' },
  hubCampus: { name: 'CAMPUS HUB', w: 2, h: 2, cost: 0, sup: [0, 0, 0], dem: [3, 1, 4], income: 4, rp: 1.5, fixed: true, isHub: true, accent: 'd' },
  ruin: { name: 'RUINED HOUSE', w: 2, h: 2, cost: 0, sup: [0, 0, 0], dem: [0, 0, 0], fixed: true },
};
const HUB_OF = { res: 'hub', ind: 'hubInd', farm: 'hubFarm', med: 'hubMed', campus: 'hubCampus' };
const SITE_OF = { power: 'powerplant', water: 'waterplant', data: 'datacenter', station: 'station' };
const SITE_NAME = { power: 'POWER', water: 'WATER', data: 'DATA', station: 'STATION' };

// ---------- research tree ----------
// br = branch (colour / column grouping)   req = prerequisites (the tree draws lines to them)
const BRANCH = {
  POWER: { color: '#f5c95a' }, WATER: { color: '#5fc4d0' }, NET: { color: '#8fbf5a' }, TOWN: { color: '#e08a3c' },
  OPS: { color: '#e6dd9a' }, GRID: { color: '#b59cf0' }, STATION: { color: '#f08a8a' },
};
const TECH = {
  // power
  solar: { br: 'POWER', name: 'SOLAR ARRAYS', cost: 15, req: [], desc: 'Clean power with no upkeep.' },
  wind: { br: 'POWER', name: 'WIND TURBINES', cost: 15, req: [], desc: 'Small, cheap, no upkeep.' },
  storage: { br: 'POWER', name: 'ENERGY STORAGE', cost: 30, req: ['solar'], desc: 'Battery banks cover brownouts.' },
  hv: { br: 'GRID', name: 'HIGH VOLTAGE', cost: 45, req: ['storage'], desc: 'HV lines and SUBSTATIONS. Power plants and hydro feed the HV trunk; substations step it down to local lines.' },
  grid2: { br: 'POWER', name: 'SMART GRID', cost: 70, req: ['hv', 'storage'], desc: 'Batteries and towers charge and discharge 50% faster.' },
  hydro: { br: 'POWER', name: 'HYDROELECTRIC', cost: 50, req: ['storage', 'towers'], desc: 'Hydro turbines by a river or shore: +14 on the HV trunk, no fuel.' },
  efficiency: { br: 'POWER', name: 'EFFICIENT TURBINES', cost: 60, req: ['refining'], desc: '+20% output from every power source.' },
  turbines: { br: 'POWER', name: 'GAS TURBINES', cost: 65, req: ['efficiency'], desc: 'Gas turbines: +18 power for 0.5 fuel/s.' },
  // water
  towers: { br: 'WATER', name: 'WATER STORAGE', cost: 25, req: ['workshop'], desc: 'Water towers cover shortages.' },
  mains: { br: 'GRID', name: 'WATER MAINS', cost: 40, req: ['towers'], desc: 'Water mains and PRESSURE STATIONS. Plants feed the main; pressure stations feed local pipes.' },
  pumps2: { br: 'WATER', name: 'DEEP BORES', cost: 45, req: ['towers'], desc: 'Pumps deliver 25% more water.' },
  desal: { br: 'WATER', name: 'DESALINATION', cost: 60, req: ['mains', 'hv'], desc: 'Desalination plants: +12 water from sea or lake.' },
  // net
  scada: { br: 'NET', name: 'SCADA CONTROLS', cost: 40, req: ['storage'], desc: 'Remote switching. Substations need a net signal to stay closed.' },
  fiber: { br: 'GRID', name: 'FIBER BACKBONE', cost: 45, req: ['scada'], desc: 'Fiber lines and NET EXCHANGES. Data centers feed the fiber trunk.' },
  mesh: { br: 'NET', name: 'MESH RELAYS', cost: 55, req: ['fiber'], desc: 'Relay towers: +12 network on local cable.' },
  netboost: { br: 'NET', name: 'PACKET PRIORITY', cost: 50, req: ['scada'], desc: 'Routers and relays give 25% more network.' },
  // town
  workshop: { br: 'TOWN', name: 'WORKSHOPS', cost: 20, req: [], desc: 'Earn scrap and make PARTS for repairs and advanced buildings.' },
  housing: { br: 'TOWN', name: 'DENSE HOUSING', cost: 40, req: ['workshop'], desc: 'Apartments: 7 scrap/s from one lot.' },
  market: { br: 'TOWN', name: 'MARKETS', cost: 55, req: ['housing'], desc: 'Markets: 8 scrap/s.' },
  medicine: { br: 'TOWN', name: 'FIELD MEDICINE', cost: 45, req: ['maint'], desc: 'Clinics earn scrap and boost nearby houses.' },
  school: { br: 'TOWN', name: 'SCHOOLS', cost: 60, req: ['medicine', 'fiber'], desc: 'Schools produce research points.' },
  agri: { br: 'TOWN', name: 'HYDROPONICS', cost: 50, req: ['mains', 'housing'], desc: 'Greenhouses: 6 scrap/s from lots of water.' },
  // ops
  refining: { br: 'OPS', name: 'FUEL REFINING', cost: 35, req: ['workshop'], desc: 'Refineries make fuel from power + water. Fuel depots hold more.' },
  maint: { br: 'OPS', name: 'MAINTENANCE CREWS', cost: 35, req: ['workshop'], desc: 'Depots automatically repair nearby buildings.' },
  recycling: { br: 'OPS', name: 'RECYCLING', cost: 40, req: ['workshop'], desc: 'Salvaging rubble gives double scrap.' },
  logistics: { br: 'OPS', name: 'LOGISTICS', cost: 55, req: ['maint'], desc: 'Upkeep costs drop by a quarter.' },
  hardening: { br: 'OPS', name: 'HARDENED LINES', cost: 60, req: ['maint'], desc: 'Storms damage half as many lines.' },
  crews: { br: 'OPS', name: 'ELITE CREWS', cost: 70, req: ['maint'], desc: 'Depots repair twice as fast.' },
  industry: { br: 'OPS', name: 'HEAVY INDUSTRY', cost: 90, req: ['refining', 'hv', 'mains'], desc: 'Lets you restore dormant POWER, WATER and DATA plants.' },
  security: { br: 'OPS', name: 'SECURITY', cost: 55, req: ['maint', 'scada'], desc: 'Security posts: raiders are driven off within 14 tiles. Dimmer raiders will come.' },
  intertie: { br: 'GRID', name: 'INTERTIES', cost: 100, req: ['control', 'hv'], desc: 'Interties import surplus power, water and net from neighbouring counties whose control stations are online. Expansion gets much faster.' },
  // station
  control: { br: 'STATION', name: 'GRID CONTROL', cost: 110, req: ['industry', 'fiber'], desc: 'Lets you restore the dormant GRID CONTROL STATION and slot modules into it (2 slots).' },
  station2: { br: 'STATION', name: 'STATION SLOT II', cost: 90, req: ['control'], desc: 'A third module slot.' },
  station3: { br: 'STATION', name: 'STATION SLOT III', cost: 130, req: ['station2'], desc: 'A fourth module slot.' },
  mGuard: { br: 'STATION', name: 'MODULE: SURGE GUARD', cost: 60, req: ['control'], desc: 'Module: surges never trip your switches and breakdowns are rarer.' },
  mFuel: { br: 'STATION', name: 'MODULE: FUEL RECYCLER', cost: 60, req: ['control', 'refining'], desc: 'Module: generators burn 25% less fuel.' },
  mSorter: { br: 'STATION', name: 'MODULE: SCRAP SORTER', cost: 60, req: ['control', 'recycling'], desc: 'Module: +25% scrap income.' },
  mBalance: { br: 'STATION', name: 'MODULE: LOAD BALANCER', cost: 70, req: ['control', 'grid2'], desc: 'Module: batteries and towers work 50% faster.' },
  mLink: { br: 'STATION', name: 'MODULE: RESEARCH LINK', cost: 70, req: ['control', 'school'], desc: 'Module: +1.5 research points per second.' },
  mShield: { br: 'STATION', name: 'MODULE: STORM SHIELD', cost: 80, req: ['control', 'hardening'], desc: 'Module: storms damage 75% fewer lines.' },
  mRepair: { br: 'STATION', name: 'MODULE: AUTO-REPAIR', cost: 80, req: ['control', 'crews'], desc: 'Module: every machine in the county slowly repairs itself.' },
  mSentry: { br: 'STATION', name: 'MODULE: SENTRY NET', cost: 80, req: ['control', 'security'], desc: 'Module: every raid has a 50% chance of being driven off, anywhere in the county.' },
  mSwitch: { br: 'STATION', name: 'MODULE: AUTO-RECLOSER', cost: 70, req: ['control', 'scada'], desc: 'Module: tripped switches close themselves again after a few seconds.' },
  mBlack: { br: 'STATION', name: 'MODULE: BLACK START', cost: 90, req: ['control', 'industry'], desc: 'Module: power plants can restart without cooling water.' },
  mUplink: { br: 'STATION', name: 'MODULE: UPLINK', cost: 90, req: ['control', 'intertie'], desc: 'Module: interties carry 50% more.' },
  mForecast: { br: 'STATION', name: 'MODULE: FORECAST', cost: 70, req: ['control', 'mesh'], desc: 'Module: storms are announced ten seconds ahead and hit less often.' },
  mCore: { br: 'STATION', name: 'MODULE: EFFICIENCY CORE', cost: 90, req: ['control', 'efficiency'], desc: 'Module: +10% output from every producer.' },
};
// station modules: slot these into the GRID CONTROL STATION
const MODULES = {
  guard: { name: 'SURGE GUARD', tech: 'mGuard', cost: 50, parts: 2, desc: 'Surges never trip switches. Breakdowns are rarer.' },
  fuelrec: { name: 'FUEL RECYCLER', tech: 'mFuel', cost: 60, parts: 2, desc: 'Generators burn 25% less fuel.' },
  sorter: { name: 'SCRAP SORTER', tech: 'mSorter', cost: 60, parts: 3, desc: '+25% scrap income.' },
  balance: { name: 'LOAD BALANCER', tech: 'mBalance', cost: 70, parts: 3, desc: 'Storage works 50% faster.' },
  link: { name: 'RESEARCH LINK', tech: 'mLink', cost: 70, parts: 3, desc: '+1.5 research points per second.' },
  shield: { name: 'STORM SHIELD', tech: 'mShield', cost: 80, parts: 4, desc: 'Storms damage 75% fewer lines.' },
  repair: { name: 'AUTO-REPAIR', tech: 'mRepair', cost: 80, parts: 4, desc: 'All machines slowly repair themselves.' },
  sentry: { name: 'SENTRY NET', tech: 'mSentry', cost: 80, parts: 4, desc: '50% of raids are driven off anywhere.' },
  autoswitch: { name: 'AUTO-RECLOSER', tech: 'mSwitch', cost: 70, parts: 3, desc: 'Tripped switches close again by themselves.' },
  blackstart: { name: 'BLACK START', tech: 'mBlack', cost: 90, parts: 4, desc: 'Power plants restart without cooling water.' },
  uplink: { name: 'UPLINK', tech: 'mUplink', cost: 90, parts: 4, desc: 'Interties carry 50% more.' },
  forecast: { name: 'FORECAST', tech: 'mForecast', cost: 70, parts: 3, desc: 'Storms are announced ahead and rarer.' },
  core: { name: 'EFFICIENCY CORE', tech: 'mCore', cost: 90, parts: 4, desc: '+10% output from every producer.' },
};

const IMPORT_CAP = [25, 20, 15];            // per intertie: power, water, net
const META_KEY = 'wastelandGrid.meta4';
const Meta = {
  rp: 0, done: {}, dirty: false,
  has(id) { return !!this.done[id]; },
  load() { try { const m = JSON.parse(localStorage.getItem(META_KEY)); if (m) { this.rp = m.rp || 0; this.done = m.done || {}; } } catch (e) { /* none */ } },
  save() { try { localStorage.setItem(META_KEY, JSON.stringify({ rp: Math.floor(this.rp * 10) / 10, done: this.done })); } catch (e) { /* blocked */ } this.dirty = false; },
  reset() { this.rp = 0; this.done = {}; this.save(); },
  buy(id) {
    const t = TECH[id]; if (!t || this.done[id] || this.rp < t.cost || !t.req.every(r => this.done[r])) return false;
    this.rp -= t.cost; this.done[id] = 1; this.save(); return true;
  },
};
const BASE_UNLOCK = new Set(['generator', 'pump', 'router', 'house', 'lab']);
const unlocked = type => BASE_UNLOCK.has(type) || !BUILD[type].tech || Meta.has(BUILD[type].tech);
const lineUnlocked = L => !LAYERS[L].tech || Meta.has(LAYERS[L].tech);

// ---------- build palette ----------
const TOOLS = [
  { cat: 'LINES', name: 'POWER LINE', key: '1', kind: 'cable', L: 0, cost: '1/tile', color: '#f5c95a', desc: 'Local power cable for houses and small machines. Drag over existing cable to erase. SHIFT = straight lines.' },
  { cat: 'LINES', name: 'WATER PIPE', key: '2', kind: 'cable', L: 1, cost: '1/tile', color: '#5fc4d0', desc: 'Local water pipe. Every utility has its own layer.' },
  { cat: 'LINES', name: 'NET CABLE', key: '3', kind: 'cable', L: 2, cost: '1/tile', color: '#8fbf5a', desc: 'Local network cable.' },
  { cat: 'LINES', name: 'HV LINE', key: 'k', kind: 'cable', L: 3, cost: '3/tile', color: '#fff1b5', desc: 'Thick high-voltage trunk. Power plants and hydro connect here. A substation steps it down to local power lines.' },
  { cat: 'LINES', name: 'WATER MAIN', key: 'p', kind: 'cable', L: 4, cost: '3/tile', color: '#d8e6e0', desc: 'Thick water trunk. Water plants connect here. A pressure station feeds it into local pipes.' },
  { cat: 'LINES', name: 'FIBER LINE', key: 'z', kind: 'cable', L: 5, cost: '3/tile', color: '#c8f08a', desc: 'Thick fiber trunk. Data centers and the control station connect here. A net exchange feeds local cable.' },
  { cat: 'LINES', name: 'MULTI LINE', key: '=', kind: 'multi', cost: 'varies', color: '#d8e6e0', desc: 'Lay several line types in one drag. Choose which ones with the buttons below, or use a preset.' },
  { cat: 'POWER', name: 'GENERATOR', key: '4', kind: 'build', type: 'generator', desc: '+8 power. Burns 0.25 fuel/s and 1 scrap/s. Wears out.' },
  { cat: 'POWER', name: 'GAS TURBINE', key: '', kind: 'build', type: 'gasturbine', desc: '+18 power for 0.5 fuel/s and 2 scrap/s upkeep.' },
  { cat: 'POWER', name: 'SOLAR ARRAY', key: '5', kind: 'build', type: 'solar', desc: '+3 power, no fuel. Weak during radiation storms.' },
  { cat: 'POWER', name: 'WIND TURBINE', key: '6', kind: 'build', type: 'wind', desc: '+2 power, no fuel.' },
  { cat: 'POWER', name: 'HYDRO TURBINE', key: 'h', kind: 'build', type: 'hydro', desc: '+14 power on the HV trunk, no fuel. Must touch water.' },
  { cat: 'POWER', name: 'BATTERY BANK', key: '7', kind: 'build', type: 'battery', desc: 'Stores 60 power. Charges from surplus, covers brownouts (6/s).' },
  { cat: 'WATER', name: 'WATER PUMP', key: '8', kind: 'build', type: 'pump', desc: '+6 water. Needs 2 power, must touch water.' },
  { cat: 'WATER', name: 'DESALINATION', key: '', kind: 'build', type: 'desal', desc: '+12 water. Needs 4 power and must touch water.' },
  { cat: 'WATER', name: 'WATER TOWER', key: '9', kind: 'build', type: 'tower', desc: 'Stores 60 water. Covers shortages (6/s).' },
  { cat: 'NET', name: 'NET ROUTER', key: '0', kind: 'build', type: 'router', desc: '+6 network. Needs 1 power.' },
  { cat: 'NET', name: 'RELAY TOWER', key: '', kind: 'build', type: 'relay', desc: '+12 network. Needs 2 power.' },
  { cat: 'CONTROL', name: 'SUBSTATION', key: 'q', kind: 'build', type: 'substation', desc: 'Transformer: joins the HV trunk to local power lines. Also a switch (press T). Needs a net signal to stay closed.' },
  { cat: 'CONTROL', name: 'PRESSURE STN', key: 'e', kind: 'build', type: 'valve', desc: 'Joins a water main to local pipes. Also a valve (press T). Needs 1 power.' },
  { cat: 'CONTROL', name: 'INTERTIE', key: '', kind: 'build', type: 'intertie', desc: 'Imports surplus power, water and net from neighbouring counties with online control stations. Connect it to your trunks.' },
  { cat: 'CONTROL', name: 'SECURITY POST', key: '', kind: 'build', type: 'security', desc: 'Drives off raiders within 14 tiles. Needs 1 power and 1 net.' },
  { cat: 'CONTROL', name: 'NET EXCHANGE', key: 'r', kind: 'build', type: 'node', desc: 'Joins the fiber trunk to local cable. Also a switch (press T). Needs 1 power.' },
  { cat: 'TOWN', name: 'HOUSE', key: 'f', kind: 'build', type: 'house', desc: 'Needs 1 power, water, net. Earns 2 scrap/s.' },
  { cat: 'TOWN', name: 'APARTMENTS', key: '', kind: 'build', type: 'apartments', desc: 'Needs 2 of each. Earns 7 scrap/s.' },
  { cat: 'TOWN', name: 'MARKET', key: '', kind: 'build', type: 'market', desc: 'Needs 2 power, 1 water, 2 net. Earns 8 scrap/s, 1 upkeep.' },
  { cat: 'TOWN', name: 'SCHOOL', key: '', kind: 'build', type: 'school', desc: 'Makes 1 research point/s and 1 scrap/s.' },
  { cat: 'TOWN', name: 'GREENHOUSE', key: '', kind: 'build', type: 'greenhouse', desc: 'Needs 3 water. Earns 6 scrap/s.' },
  { cat: 'TOWN', name: 'WORKSHOP', key: 'g', kind: 'build', type: 'workshop', desc: 'Needs 2 power + 1 net. Earns 4 scrap/s and makes PARTS.' },
  { cat: 'TOWN', name: 'CLINIC', key: 'o', kind: 'build', type: 'clinic', desc: 'Needs power, water, net. Earns 3 scrap/s and +1 for houses within 8 tiles.' },
  { cat: 'OPS', name: 'RESEARCH LAB', key: 'b', kind: 'build', type: 'lab', desc: 'Needs 2 power + 2 net. Makes 2 research points/s (press Y to spend them).' },
  { cat: 'OPS', name: 'MAINT DEPOT', key: 'n', kind: 'build', type: 'depot', desc: 'Needs 2 power. Auto-repairs buildings within 16 tiles.' },
  { cat: 'OPS', name: 'FUEL DEPOT', key: 'u', kind: 'build', type: 'fueldepot', desc: '+150 fuel storage.' },
  { cat: 'OPS', name: 'REFINERY', key: 'i', kind: 'build', type: 'refinery', desc: 'Needs 3 power + 2 water. Makes 1.5 fuel/s.' },
  { cat: 'TOOLS', name: 'REPAIR', key: 'v', kind: 'repair', color: '#5fc4d0', desc: 'Click a building to repair it (scrap + parts). Drag over damaged line to fix it.' },
  { cat: 'TOOLS', name: 'SALVAGE', key: 'x', kind: 'salvage', color: '#d8e6e0', desc: 'Remove rubble (+3 scrap), lines or buildings (half refund).' },
  { cat: 'TOOLS', name: 'INSPECT', key: 'c', kind: 'inspect', color: '#d8e6e0', desc: 'Click a building for status. Click a transformer to toggle it. Restore dormant plants and the station here.' },
];

// ============================================================
//  WORLD DATA - difficulties, factions, union tiers, link levels, settings.
//  (The logic that uses these lives in world.js.)
// ============================================================
const DIFFS = [
  { id: 'settler', name: 'SETTLER', blurb: 'Gentle. Rich starts, rare storms, slow Dimmers, forgiving neighbours.', scrap: 1.4, ev: 1.5, wear: 0.7, raid: 1.6, dark: 1.7, darkCap: 0.06, trust: 1.4, linkDecay: 0.6 },
  { id: 'survivor', name: 'SURVIVOR', blurb: 'The intended game. Storms, raids and Dimmers at a steady pace.', scrap: 1, ev: 1, wear: 1, raid: 1, dark: 1, darkCap: 0.1, trust: 1, linkDecay: 1 },
  { id: 'winter', name: 'IRON WINTER', blurb: 'Lean starts, frequent faults, aggressive Dimmers, wary factions.', scrap: 0.75, ev: 0.7, wear: 1.3, raid: 0.7, dark: 0.7, darkCap: 0.16, trust: 0.8, linkDecay: 1.3 },
  { id: 'blackout', name: 'BLACKOUT', blurb: 'Brutal. Little scrap, constant failures, Dimmers everywhere, links fray fast.', scrap: 0.55, ev: 0.5, wear: 1.6, raid: 0.5, dark: 0.5, darkCap: 0.24, trust: 0.6, linkDecay: 1.6 },
];

// regional factions (the Dimmers are handled separately in world.js)
const FACTIONS = {
  compact: { name: 'HAVEN RIDGE COMPACT', who: 'MARA', color: '#8fbf5a', region: 'the eastern United States', cost: 30, perk: 'Compact funds: +12% scrap when you start a county', mod: { scrap: 0.12 } },
  syndicate: { name: 'PRAIRIE SYNDICATE', who: 'BRAM', color: '#b59cf0', region: 'the western United States', cost: 35, perk: 'Shared research: +1 research point a minute, links recover faster', mod: { rpMin: 1, linkRegen: 0.25 } },
  north: { name: 'NORTHERN LINE', who: 'ELOISE', color: '#f5c95a', region: 'Canada and Alaska', cost: 40, perk: 'Cold-proofing: machines wear 25% slower', mod: { wear: 0.75 } },
  sur: { name: 'LINEA SUR', who: 'DIEGO', color: '#e08a3c', region: 'Mexico', cost: 40, perk: 'Sun contracts: +15% scrap income in every county', mod: { inc: 1.15 } },
  seas: { name: 'LEAGUE OF TWO SEAS', who: 'ISABEL', color: '#5fc4d0', region: 'Central America and the Caribbean', cost: 45, perk: 'Shipping lanes: +15% imports, links recover faster', mod: { imp: 0.15, linkRegen: 0.2 } },
  sila: { name: 'SILA COLLECTIVE', who: 'SILA', color: '#d8e6e0', region: 'Greenland', cost: 50, perk: 'Ice watch: Dimmer raids are 50% rarer', mod: { def: 1.5 } },
};
const FAC_IDS = ['compact', 'syndicate', 'north', 'sur', 'seas', 'sila'];
const DIMMER_FAC = { name: 'THE DIMMERS', who: 'WARDEN', color: '#b5502b' };

const TIERS = [
  { n: 'DIVIDED', min: 0, d: 'Scattered lights. Every county stands alone.' },
  { n: 'ALLIANCE', min: 20, d: 'Neighbours trade. Linked counties start faster.' },
  { n: 'COMPACT', min: 40, d: 'Shared standards. +4% scrap per tier, links recover faster.' },
  { n: 'FEDERATION', min: 60, d: 'Power flows three hops. +1 research point a minute.' },
  { n: 'UNION', min: 80, d: 'One network. Dimmers spread half as fast.' },
  { n: 'ONE GRID', min: 96, d: 'United under one, divided under none.' },
];
const LINK_LV = [
  { n: 'RELAY', regen: 0.10, eff: 0.70, cap: 1.0, up: 0 },
  { n: 'HARDENED', regen: 0.30, eff: 0.80, cap: 1.4, up: 30 },
  { n: 'BACKBONE', regen: 0.60, eff: 0.90, cap: 1.9, up: 70 },
];
const BORDER_FX = {
  open: { n: 'OPEN', imp: 1, cross: 1, toll: 0, d: 'Full sharing. Dimmers can cross freely.' },
  check: { n: 'CHECKPOINT', imp: 0.6, cross: 0.35, toll: 0.02, d: '60% sharing, Dimmers rarely cross, small trade income.' },
  closed: { n: 'CLOSED', imp: 0, cross: 0, toll: 0, d: 'No sharing and no spreading light. Dimmers cannot cross.' },
};
const Settings = {
  autopause: true, confirmLeave: true, wide: false, fx: true,
  ui: 'auto', pix: 'auto', scan: true, parts: 1, fps: 60, motion: true, showFps: false,       // graphics (see display.js)
  KEYS: ['autopause', 'confirmLeave', 'wide', 'fx', 'ui', 'pix', 'scan', 'parts', 'fps', 'motion', 'showFps'],
  load() {
    try {
      const o = JSON.parse(localStorage.getItem('wastelandGrid.settings')) || {};
      for (const k of this.KEYS) if (k in o) this[k] = o[k];
      if (this.ui !== 'auto' && !(+this.ui >= 0.5 && +this.ui <= 3)) this.ui = 'auto';
      if (!['auto', 'crisp', 'fill'].includes(this.pix)) this.pix = 'auto';
    } catch (e) { /* defaults */ }
  },
  save() { try { const o = {}; for (const k of this.KEYS) o[k] = this[k]; localStorage.setItem('wastelandGrid.settings', JSON.stringify(o)); } catch (e) { /* ignore */ } },
};
Settings.load();
// numbers the simulation reads every tick (recomputed by world.js from difficulty, accords and the union tier)
let WMOD = { wear: 1, inc: 1, def: 1, scrap: 1, linkRegen: 0, imp: 0, rpMin: 0, depth: 2, ev: 1, raid: 1 };
