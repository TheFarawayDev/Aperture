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
  // ----- v6 fuel: more ways to keep the generators burning -----
  kiln: { name: 'CHARCOAL KILN', w: 2, h: 2, cost: 25, sup: [0, 0, 0], dem: [0, 0, 0], fuelOut: 0.35, upkeep: 1, maint: 0.09, tech: 'kilns' },
  digester: { name: 'BIOGAS DIGESTER', w: 2, h: 2, cost: 45, sup: [0, 0, 0], dem: [1, 2, 0], fuelOut: 0.8, upkeep: 1, maint: 0.05, tech: 'biogas' },
  oilwell: { name: 'OIL WELL', w: 2, h: 2, cost: 75, parts: 2, sup: [0, 0, 0], dem: [3, 0, 0], fuelOut: 1.3, upkeep: 1, maint: 0.11, tech: 'drilling' },
  synfuel: { name: 'SYNFUEL PLANT', w: 2, h: 2, cost: 150, parts: 5, sup: [0, 0, 0], dem: [6, 3, 1], fuelOut: 3.6, partsUse: 0.05, upkeep: 3, maint: 0.12, tech: 'synplant' },
  tankfarm: { name: 'TANK FARM', w: 2, h: 2, cost: 70, parts: 1, sup: [0, 0, 0], dem: [0, 0, 0], fuelCap: 400, maint: 0.02, tech: 'tankage' },
  // ----- v6 power -----
  biomass: { name: 'BIOMASS BURNER', w: 2, h: 2, cost: 35, sup: [5, 0, 0], dem: [0, 0, 0], upkeep: 1, maint: 0.08, tech: 'biomass' },
  fuelcell: { name: 'FUEL CELL STACK', w: 2, h: 2, cost: 85, parts: 3, sup: [12, 0, 0], dem: [0, 1, 0], needsAll: true, fuel: 0.12, upkeep: 1, maint: 0.05, tech: 'fuelcells' },
  geothermal: { name: 'GEOTHERMAL WELL', w: 2, h: 2, cost: 110, parts: 4, sup: [16, 0, 0], dem: [0, 2, 0], needsAll: true, upkeep: 2, maint: 0.06, tech: 'geothermal' },
  // ----- v6 water -----
  well: { name: 'WATER WELL', w: 1, h: 1, cost: 18, sup: [0, 3, 0], dem: [1, 0, 0], needsAll: true, maint: 0.05, tech: 'wells' },
  // ----- v6 industry: turn power into parts, and parts into scrap -----
  scrapyard: { name: 'SALVAGE YARD', w: 2, h: 2, cost: 35, sup: [0, 0, 0], dem: [1, 0, 0], income: 3, partsOut: 0.12, maint: 0.05, tech: 'recycling' },
  mine: { name: 'ORE MINE', w: 2, h: 2, cost: 60, parts: 1, sup: [0, 0, 0], dem: [3, 1, 0], income: 2, partsOut: 0.5, upkeep: 1, maint: 0.09, tech: 'mining' },
  foundry: { name: 'FOUNDRY', w: 2, h: 2, cost: 95, parts: 2, sup: [0, 0, 0], dem: [4, 2, 0], fuel: 0.2, partsOut: 1.2, upkeep: 2, maint: 0.1, tech: 'foundry' },
  assembly: { name: 'ASSEMBLY PLANT', w: 2, h: 2, cost: 110, parts: 3, sup: [0, 0, 0], dem: [3, 0, 2], partsUse: 0.4, income: 15, upkeep: 2, maint: 0.07, tech: 'assembly' },
  warehouse: { name: 'WAREHOUSE', w: 2, h: 2, cost: 55, sup: [0, 0, 0], dem: [0, 0, 0], scrapCap: 250, maint: 0.02, tech: 'warehousing' },
  archive: { name: 'DATA ARCHIVE', w: 2, h: 2, cost: 90, parts: 2, sup: [0, 0, 0], dem: [3, 0, 4], rp: 3, upkeep: 2, maint: 0.04, town: true, tech: 'archives' },
  // ----- v7 advanced buildings (Ages III-V). pool = build cost from the SHARED STOCKPILE, prod / poolUse = goods per second -----
  dronebay: { name: 'DRONE BAY', w: 2, h: 2, cost: 90, parts: 3, sup: [0, 0, 0], dem: [2, 0, 1], drones: { n: 3, radius: 30, rate: 1 }, upkeep: 1, maint: 0.03, tech: 'repairdrones' },
  smelter: { name: 'ALLOY SMELTER', w: 2, h: 2, cost: 140, parts: 4, sup: [0, 0, 0], dem: [6, 2, 0], fuel: 0.3, partsUse: 0.3, prod: { alloy: 0.12 }, upkeep: 3, maint: 0.1, tech: 'alloys' },
  circuitfab: { name: 'CIRCUIT FAB', w: 2, h: 2, cost: 150, parts: 4, sup: [0, 0, 0], dem: [4, 1, 4], partsUse: 0.25, prod: { circ: 0.1 }, upkeep: 3, maint: 0.06, tech: 'circuits' },
  exchange: { name: 'SUPPLY EXCHANGE', w: 2, h: 2, cost: 120, parts: 3, sup: [0, 0, 0], dem: [1, 0, 2], exchange: true, upkeep: 2, maint: 0.04, tech: 'exchange' },
  solarfarm: { name: 'SOLAR FARM', w: 2, h: 2, cost: 120, parts: 3, pool: { alloy: 2 }, sup: [14, 0, 0], dem: [0, 0, 0], maint: 0.03, tech: 'solarfarm' },
  windfarm: { name: 'WIND FARM', w: 2, h: 2, cost: 110, parts: 3, pool: { alloy: 2 }, sup: [11, 0, 0], dem: [0, 0, 0], maint: 0.05, tech: 'windfarm' },
  compworks: { name: 'COMPONENT WORKS', w: 2, h: 2, cost: 220, parts: 6, pool: { alloy: 6, circ: 6 }, sup: [0, 0, 0], dem: [8, 2, 4], poolUse: { alloy: 0.06, circ: 0.06 }, prod: { comp: 0.08 }, upkeep: 4, maint: 0.08, tech: 'components' },
  fission: { name: 'FISSION REACTOR', w: 2, h: 2, cost: 300, parts: 8, pool: { alloy: 15, comp: 4 }, sup: [60, 0, 0], dem: [0, 4, 1], tier: [1, 0, 0], needsAll: true, poolUse: { comp: 0.01 }, upkeep: 5, maint: 0.08, tech: 'fission' },
  robotdepot: { name: 'ROBOT DEPOT', w: 2, h: 2, cost: 200, parts: 5, pool: { circ: 4, comp: 2 }, sup: [0, 0, 0], dem: [4, 0, 2], repair: { radius: 26, rate: 3, max: 10 }, upkeep: 3, maint: 0.03, tech: 'robotics' },
  arcology: { name: 'ARCOLOGY', w: 2, h: 2, cost: 320, parts: 6, pool: { alloy: 10, comp: 4 }, sup: [0, 0, 0], dem: [8, 8, 6], income: 45, rp: 2, upkeep: 4, maint: 0.04, town: true, tech: 'arcology' },
  vfarm: { name: 'VERTICAL FARM', w: 2, h: 2, cost: 180, parts: 4, pool: { alloy: 4, circ: 2 }, sup: [0, 0, 0], dem: [3, 6, 1], income: 20, upkeep: 2, maint: 0.04, town: true, tech: 'vfarm' },
  quantum: { name: 'QUANTUM LAB', w: 2, h: 2, cost: 260, parts: 6, pool: { circ: 10, comp: 3 }, sup: [0, 0, 0], dem: [6, 0, 8], poolUse: { circ: 0.02 }, rp: 9, upkeep: 4, maint: 0.04, town: true, tech: 'quantum' },
  fusion: { name: 'FUSION REACTOR', w: 2, h: 2, cost: 600, parts: 12, pool: { alloy: 30, circ: 20, comp: 20 }, sup: [160, 0, 0], dem: [0, 6, 3], tier: [1, 0, 0], needsAll: true, poolUse: { comp: 0.02 }, upkeep: 8, maint: 0.06, tech: 'fusion' },
  atmo: { name: 'ATMO WATER PLANT', w: 2, h: 2, cost: 280, parts: 6, pool: { alloy: 8, comp: 4 }, sup: [0, 30, 0], dem: [8, 0, 1], needsAll: true, upkeep: 3, maint: 0.05, tech: 'atmo' },
  megafab: { name: 'MEGAFACTORY', w: 2, h: 2, cost: 500, parts: 10, pool: { alloy: 20, circ: 20, comp: 10 }, sup: [0, 0, 0], dem: [20, 6, 8], partsUse: 1, poolUse: { alloy: 0.08, circ: 0.08 }, prod: { comp: 0.3 }, upkeep: 6, maint: 0.08, tech: 'megafab' },
  orbital: { name: 'ORBITAL UPLINK', w: 2, h: 2, cost: 400, parts: 8, pool: { alloy: 15, circ: 25, comp: 8 }, sup: [0, 0, 45], dem: [12, 0, 0], needsAll: true, upkeep: 4, maint: 0.04, tech: 'orbital' },
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
  OPS: { color: '#e6dd9a' }, GRID: { color: '#b59cf0' }, STATION: { color: '#f08a8a' }, BOOST: { color: '#ff9fb0' }, INDUSTRY: { color: '#d9a066' },
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
  spans: { br: 'GRID', name: 'BRIDGE SPANS', cost: 55, req: ['hv'], desc: 'Lines can cross water, at five times the cost per tile. AUTO ROUTE uses spans too.' },
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
  // ----- more power research (passive: each one simply makes things better) -----
  pv2: { br: 'POWER', name: 'HIGH-GRADE CELLS', cost: 55, req: ['solar', 'storage'], desc: 'Solar arrays make 25% more power.', fx: { solar: 1.25 } },
  blades: { br: 'POWER', name: 'COMPOSITE BLADES', cost: 50, req: ['wind', 'storage'], desc: 'Wind turbines make 30% more power.', fx: { wind: 1.3 } },
  recup: { br: 'POWER', name: 'HEAT RECOVERY', cost: 55, req: ['efficiency'], desc: 'Generators and plants burn 12% less fuel.', fx: { fuel: 0.88 } },
  cogen: { br: 'POWER', name: 'COGENERATION', cost: 75, req: ['turbines', 'recup'], desc: 'Fuel-burning generators, turbines and plants make 10% more power.', fx: { genOut: 1.1 } },
  synfuel: { br: 'POWER', name: 'SYNTHETIC FUEL', cost: 85, req: ['recup', 'industry'], desc: 'Another 12% less fuel burned.', fx: { fuel: 0.88 } },
  supercap: { br: 'POWER', name: 'SUPERCAPACITORS', cost: 70, req: ['grid2'], desc: 'Batteries and towers charge and release 30% faster.', fx: { store: 1.3 } },
  dispatch: { br: 'POWER', name: 'AUTO DISPATCH', cost: 85, req: ['grid2', 'scada'], desc: 'Smart dispatch: +6% output from every fuel-burning source and storage 15% faster.', fx: { genOut: 1.06, store: 1.15 } },
  runner: { br: 'POWER', name: 'TURBINE OVERHAUL', cost: 70, req: ['hydro'], desc: 'Hydro turbines make 25% more power.', fx: { hydro: 1.25 } },
  rams: { br: 'WATER', name: 'HYDRAULIC RAMS', cost: 55, req: ['pumps2'], desc: 'Pumps make another 20% water.', fx: { pump: 1.2 } },
  lowloss: { br: 'POWER', name: 'LOW-LOSS CABLES', cost: 60, req: ['hv'], desc: 'Imports from neighbouring counties are 10% stronger.', fx: { imp: 0.1 } },
  micro: { br: 'POWER', name: 'MICROGRIDS', cost: 65, req: ['scada', 'solar'], desc: 'Solar and wind +10%, storage 10% faster.', fx: { solar: 1.1, wind: 1.1, store: 1.1 } },
  fusionlab: { br: 'POWER', name: 'FUSION PRIMER', cost: 140, req: ['cogen', 'supercap', 'pv2'], desc: 'Every power source makes 12% more, and generators burn 10% less fuel.', fx: { genOut: 1.12, solar: 1.12, wind: 1.12, hydro: 1.12, fuel: 0.9 } },
  // ----- research that simply buffs things -----
  thrift: { br: 'BOOST', name: 'THRIFT', cost: 25, req: ['workshop'], desc: 'Every county starts with 15% more scrap.', fx: { startScrap: 1.15 } },
  stockpile: { br: 'BOOST', name: 'STOCKPILES', cost: 30, req: ['workshop'], desc: 'Every county starts with 4 more parts.', fx: { startParts: 4 } },
  workdetail: { br: 'BOOST', name: 'WORK DETAILS', cost: 45, req: ['housing'], desc: 'Scrap income +8%.', fx: { income: 1.08 } },
  trade: { br: 'BOOST', name: 'TRADE ROUTES', cost: 60, req: ['market'], desc: 'Scrap income +10%.', fx: { income: 1.1 } },
  lean: { br: 'BOOST', name: 'LEAN UPKEEP', cost: 60, req: ['logistics'], desc: 'Upkeep costs 10% less.', fx: { upkeep: 0.9 } },
  prospect: { br: 'BOOST', name: 'PROSPECTING', cost: 50, req: ['recycling'], desc: 'Rubble pays 20% more and supply caches hold 20% more.', fx: { rubble: 1.2, lootVal: 1.2 } },
  overhaul: { br: 'BOOST', name: 'FACTORY OVERHAUL', cost: 75, req: ['industry'], desc: 'Workshops and industrial hubs make 25% more parts.', fx: { partsOut: 1.25 } },
  study: { br: 'BOOST', name: 'FIELD STUDIES', cost: 70, req: ['school'], desc: 'Research points +15%.', fx: { rp: 1.15 } },
  radar: { br: 'BOOST', name: 'WEATHER RADAR', cost: 55, req: ['scada'], desc: 'Storms and faults come 15% less often.', fx: { ev: 1.15 } },
  bunkers: { br: 'BOOST', name: 'STORM BUNKERS', cost: 65, req: ['hardening'], desc: 'Storms damage 15% fewer lines.', fx: { stormN: 0.85 } },
  patrols: { br: 'BOOST', name: 'PATROLS', cost: 65, req: ['security'], desc: 'Raiders come 20% less often.', fx: { raid: 1.2 } },
  diplomacy: { br: 'BOOST', name: 'DIPLOMATIC CORPS', cost: 80, req: ['intertie'], desc: 'Factions trust you 20% faster.', fx: { trust: 1.2 } },
  selftune: { br: 'BOOST', name: 'SELF-TUNING', cost: 80, req: ['crews'], desc: 'Machines slowly mend themselves.', fx: { autoRepair: 0.03 } },
  precision: { br: 'BOOST', name: 'PRECISION PARTS', cost: 70, req: ['maint', 'industry'], desc: 'Repairs cost 15% less and machines wear 8% slower.', fx: { repair: 0.85, wear: 0.92 } },
  mastery: { br: 'BOOST', name: 'GRID MASTERY', cost: 150, req: ['control', 'study', 'trade'], desc: 'Power, water and network output +5%, and income +5%.', fx: { genOut: 1.05, waterOut: 1.05, netOut: 1.05, income: 1.05 } },
  // ----- v6 fuel research -----
  kilns: { br: 'OPS', name: 'CHARCOAL KILNS', cost: 15, req: [], desc: 'Charcoal kilns: 0.35 fuel/s from scrap wood. No power or lines needed - the first fuel you can make.' },
  biomass: { br: 'POWER', name: 'BIOMASS BURNERS', cost: 25, req: ['kilns'], desc: 'Biomass burners: +5 power with no fuel, for 1 scrap/s upkeep.' },
  biogas: { br: 'OPS', name: 'BIOGAS', cost: 35, req: ['kilns', 'towers'], desc: 'Biogas digesters: 0.8 fuel/s from 1 power and 2 water.' },
  tankage: { br: 'OPS', name: 'TANK FARMS', cost: 35, req: ['refining'], desc: 'Tank farms: +400 fuel storage each.' },
  drilling: { br: 'OPS', name: 'OIL DRILLING', cost: 50, req: ['refining'], desc: 'Oil wells: 1.3 fuel/s for 3 power.' },
  catalysts: { br: 'OPS', name: 'CATALYSTS', cost: 50, req: ['refining'], desc: 'Every fuel maker produces 25% more fuel.', fx: { fuelOut: 1.25 } },
  bulk: { br: 'OPS', name: 'BULK STORAGE', cost: 45, req: ['tankage'], desc: 'Fuel depots and tank farms hold 50% more.', fx: { fuelStore: 1.5 } },
  synplant: { br: 'OPS', name: 'SYNFUEL PLANTS', cost: 95, req: ['drilling', 'industry'], desc: 'Synfuel plants: 3.6 fuel/s from 6 power, 3 water and 1 net. They use a few parts.' },
  cracking: { br: 'OPS', name: 'CATALYTIC CRACKING', cost: 90, req: ['catalysts', 'synplant'], desc: 'Every fuel maker produces another 20% more fuel.', fx: { fuelOut: 1.2 } },
  fuelcells: { br: 'POWER', name: 'FUEL CELLS', cost: 75, req: ['turbines', 'mains'], desc: 'Fuel cell stacks: +12 power for only 0.12 fuel/s and 1 water.' },
  geothermal: { br: 'POWER', name: 'GEOTHERMAL', cost: 80, req: ['hydro', 'drilling'], desc: 'Geothermal wells: +16 power with no fuel, for 2 water. Build them anywhere.' },
  // ----- v6 water -----
  wells: { br: 'WATER', name: 'DUG WELLS', cost: 15, req: [], desc: 'Water wells: +3 water for 1 power, and they do not need a shore.' },
  aquifers: { br: 'WATER', name: 'AQUIFER SURVEY', cost: 45, req: ['wells', 'pumps2'], desc: 'Wells make 40% more water.', fx: { well: 1.4 } },
  // ----- v6 industry -----
  mining: { br: 'INDUSTRY', name: 'MINING', cost: 30, req: ['workshop'], desc: 'Ore mines: 0.5 parts/s and 2 scrap/s for 3 power and 1 water.' },
  warehousing: { br: 'INDUSTRY', name: 'WAREHOUSING', cost: 40, req: ['workshop'], desc: 'Warehouses: the scrap warehouse cap rises by 250 each.' },
  foundry: { br: 'INDUSTRY', name: 'FOUNDRIES', cost: 55, req: ['mining', 'refining'], desc: 'Foundries: 1.2 parts/s for 4 power, 2 water and 0.2 fuel/s.' },
  smelting: { br: 'INDUSTRY', name: 'SMELTING', cost: 65, req: ['foundry'], desc: 'Every parts maker produces 20% more parts.', fx: { partsOut: 1.2 } },
  assembly: { br: 'INDUSTRY', name: 'ASSEMBLY LINES', cost: 70, req: ['foundry', 'market'], desc: 'Assembly plants turn 0.4 parts/s into 15 scrap/s.' },
  conveyors: { br: 'INDUSTRY', name: 'CONVEYORS', cost: 80, req: ['assembly'], desc: 'Machines wear 8% slower and scrap income +5%.', fx: { wear: 0.92, income: 1.05 } },
  automation: { br: 'INDUSTRY', name: 'AUTOMATION', cost: 100, req: ['conveyors', 'scada'], desc: 'Upkeep costs 12% less.', fx: { upkeep: 0.88 } },
  archives: { br: 'TOWN', name: 'DATA ARCHIVES', cost: 80, req: ['school'], desc: 'Data archives: 3 research points/s for 3 power and 4 net.' },

  // ===== v8: research speed, repair drones and less hassle =====
  labs1: { age: 1, br: 'BOOST', name: 'RESEARCH SPEED I', cost: 30, req: ['workshop'], desc: 'Queued research fills 25% faster.', fx: { labSpeed: 1.25 } },
  labs2: { age: 2, br: 'BOOST', name: 'RESEARCH SPEED II', cost: 80, req: ['labs1', 'school'], desc: 'Queued research fills another 25% faster.', fx: { labSpeed: 1.25 } },
  labs3: { age: 3, br: 'BOOST', name: 'RESEARCH SPEED III', cost: 160, req: ['labs2', 'trades'], desc: 'Queued research fills another 30% faster.', fx: { labSpeed: 1.3 } },
  labs4: { age: 4, br: 'BOOST', name: 'RESEARCH SPEED IV', cost: 300, req: ['labs3', 'institutes'], desc: 'Queued research fills another 35% faster.', fx: { labSpeed: 1.35 } },
  labs5: { age: 5, br: 'BOOST', name: 'RESEARCH SPEED V', cost: 600, req: ['labs4', 'singularity'], desc: 'Queued research fills another 50% faster.', fx: { labSpeed: 1.5 } },
  reclosers: { age: 2, br: 'GRID', name: 'AUTO-RECLOSERS', cost: 50, req: ['scada'], desc: 'Tripped switches close again by themselves after 3 seconds instead of 10.' },
  fuelreserve: { age: 1, br: 'OPS', name: 'EMERGENCY FUEL', cost: 30, req: ['refining'], desc: 'When the fuel tank is almost empty, 30 scrap is turned into 25 fuel automatically.' },
  repairdrones: { age: 2, br: 'OPS', name: 'REPAIR DRONES', cost: 60, req: ['maint'], desc: 'Drone bays: 3 drones that fly out and repair machines and lines within 30 tiles for free. A county with a drone bay fixes its own outages while you are away, and suffers half as many.' },
  predictive: { age: 2, br: 'OPS', name: 'PREDICTIVE MAINTENANCE', cost: 70, req: ['repairdrones'], desc: 'Machines wear 12% slower.', fx: { wear: 0.88 } },
  drones2: { age: 3, br: 'OPS', name: 'DRONE SWARMS', cost: 130, req: ['repairdrones', 'circuits'], desc: 'Every drone bay launches 2 more drones and reaches 10 tiles further.', fx: { droneN: 2, droneRange: 10 } },
  drones3: { age: 4, br: 'OPS', name: 'AUTONOMOUS DRONES', cost: 260, req: ['drones2', 'gridai'], desc: 'Drones repair 50% faster and fix outages on the map twice as fast.', fx: { droneSpeed: 1.5, droneOut: 2 } },
  drones4: { age: 5, br: 'OPS', name: 'NANO-DRONE CLOUD', cost: 550, req: ['drones3', 'selfheal'], desc: 'Every drone bay launches 3 more drones that reach 20 tiles further and work 50% faster.', fx: { droneN: 3, droneRange: 20, droneSpeed: 1.5 } },
  // ===== AGE III - ELECTRIC =====
  alloys: { age: 3, br: 'INDUSTRY', name: 'ALLOY SMELTING', cost: 120, req: ['foundry', 'hv'], desc: 'Alloy smelters: 0.12 ALLOYS/s into the shared stockpile, from power, water, fuel and parts.' },
  circuits: { age: 3, br: 'INDUSTRY', name: 'CIRCUIT FABRICATION', cost: 130, req: ['fiber', 'mining'], desc: 'Circuit fabs: 0.1 CIRCUITS/s into the shared stockpile, from power, water, net and parts.' },
  exchange: { age: 3, br: 'GRID', name: 'SUPPLY EXCHANGES', cost: 110, req: ['intertie'], desc: 'Supply exchanges trade PARTS and FUEL with the shared stockpile: they export your surplus and import when you run short.' },
  solarfarm: { age: 3, br: 'POWER', name: 'SOLAR FARMS', cost: 110, req: ['pv2'], desc: 'Solar farms: +14 power with no fuel. Built with alloys.' },
  windfarm: { age: 3, br: 'POWER', name: 'WIND FARMS', cost: 100, req: ['blades'], desc: 'Wind farms: +11 power with no fuel. Built with alloys.' },
  alloy2: { age: 3, br: 'INDUSTRY', name: 'ALLOY RECIPES', cost: 140, req: ['alloys'], desc: 'Smelters make 25% more alloys.', fx: { alloyOut: 1.25 } },
  circ2: { age: 3, br: 'INDUSTRY', name: 'PHOTOLITHOGRAPHY', cost: 150, req: ['circuits'], desc: 'Circuit fabs make 25% more circuits.', fx: { circOut: 1.25 } },
  freight: { age: 3, br: 'GRID', name: 'FREIGHT RAIL', cost: 130, req: ['exchange'], desc: 'Counties you are not playing deliver 15% more of their output to the shared stockpile.', fx: { poolEff: 0.15 } },
  depots2: { age: 3, br: 'GRID', name: 'REGIONAL DEPOTS', cost: 120, req: ['exchange'], desc: 'Supply exchanges move 50% more each second.', fx: { exportRate: 1.5 } },
  gridsync: { age: 3, br: 'POWER', name: 'GRID SYNC', cost: 140, req: ['dispatch'], desc: 'Power, water and network output +5%.', fx: { genOut: 1.05, waterOut: 1.05, netOut: 1.05 } },
  hvdc: { age: 3, br: 'GRID', name: 'HVDC LINKS', cost: 130, req: ['lowloss'], desc: 'Imports from neighbouring counties are 15% stronger.', fx: { imp: 0.15 } },
  metering: { age: 3, br: 'BOOST', name: 'SMART METERS', cost: 110, req: ['scada', 'market'], desc: 'Scrap income +6%.', fx: { income: 1.06 } },
  cleanroom: { age: 3, br: 'INDUSTRY', name: 'CLEAN ROOMS', cost: 120, req: ['circuits'], desc: 'Machines wear 8% slower.', fx: { wear: 0.92 } },
  trades: { age: 3, br: 'TOWN', name: 'TRADE SCHOOLS', cost: 120, req: ['school'], desc: 'Research points +10%.', fx: { rp: 1.1 } },
  civil: { age: 3, br: 'OPS', name: 'CIVIL ENGINEERING', cost: 130, req: ['automation'], desc: 'Upkeep costs 8% less.', fx: { upkeep: 0.92 } },
  drains: { age: 3, br: 'BOOST', name: 'STORM DRAINS', cost: 110, req: ['bunkers'], desc: 'Storms damage 15% fewer lines.', fx: { stormN: 0.85 } },
  militia: { age: 3, br: 'BOOST', name: 'CIVIL DEFENCE', cost: 120, req: ['patrols'], desc: 'Raiders come 20% less often.', fx: { raid: 1.2 } },
  pipeline: { age: 3, br: 'OPS', name: 'PIPELINES', cost: 130, req: ['cracking'], desc: 'Every fuel maker produces 15% more fuel.', fx: { fuelOut: 1.15 } },
  waterworks: { age: 3, br: 'WATER', name: 'WATERWORKS', cost: 120, req: ['aquifers'], desc: 'Water output +10%, pumps and wells +10% more.', fx: { waterOut: 1.1, pump: 1.1, well: 1.1 } },
  netcore: { age: 3, br: 'NET', name: 'NETWORK CORES', cost: 120, req: ['mesh'], desc: 'Network output +12%.', fx: { netOut: 1.12 } },
  thermal: { age: 3, br: 'POWER', name: 'THERMAL STORAGE', cost: 120, req: ['supercap'], desc: 'Batteries and towers work 25% faster.', fx: { store: 1.25 } },
  salvage2: { age: 3, br: 'BOOST', name: 'DEEP SALVAGE', cost: 110, req: ['prospect'], desc: 'Rubble pays 30% more and supply caches hold 15% more.', fx: { rubble: 1.3, lootVal: 1.15 } },
  bonds: { age: 3, br: 'BOOST', name: 'INFRASTRUCTURE BONDS', cost: 120, req: ['trade'], desc: 'Every county starts with 20% more scrap.', fx: { startScrap: 1.2 } },
  kits: { age: 3, br: 'BOOST', name: 'PREFAB KITS', cost: 110, req: ['stockpile'], desc: 'Every county starts with 6 more parts.', fx: { startParts: 6 } },
  standard: { age: 3, br: 'INDUSTRY', name: 'STANDARD PARTS', cost: 130, req: ['smelting'], desc: 'Every parts maker produces 15% more parts.', fx: { partsOut: 1.15 } },
  // ===== AGE IV - ATOMIC =====
  components: { age: 4, br: 'INDUSTRY', name: 'COMPONENT WORKS', cost: 260, req: ['alloys', 'circuits'], desc: 'Component works turn shared alloys and circuits into 0.08 COMPONENTS/s - the heart of every advanced machine.' },
  fission: { age: 4, br: 'POWER', name: 'FISSION POWER', cost: 300, req: ['components', 'industry'], desc: 'Fission reactors: +60 power on the HV trunk. They use a trickle of components.' },
  robotics: { age: 4, br: 'OPS', name: 'ROBOTICS', cost: 260, req: ['components', 'crews'], desc: 'Robot depots repair up to 10 buildings within 26 tiles, fast.' },
  arcology: { age: 4, br: 'TOWN', name: 'ARCOLOGIES', cost: 300, req: ['components', 'housing'], desc: 'Arcologies: one huge tower earning 45 scrap/s and 2 research/s.' },
  vfarm: { age: 4, br: 'TOWN', name: 'VERTICAL FARMS', cost: 240, req: ['agri', 'components'], desc: 'Vertical farms: 20 scrap/s from lots of water.' },
  quantum: { age: 4, br: 'NET', name: 'QUANTUM COMPUTING', cost: 300, req: ['circ2', 'archives'], desc: 'Quantum labs: 9 research/s. They use a few shared circuits.' },
  comp2: { age: 4, br: 'INDUSTRY', name: 'PRECISION ASSEMBLY', cost: 280, req: ['components'], desc: 'Component makers produce 25% more components.', fx: { compOut: 1.25 } },
  reactor2: { age: 4, br: 'POWER', name: 'REACTOR TUNING', cost: 260, req: ['fission'], desc: 'Fission reactors make 20% more power.', fx: { fission: 1.2 } },
  lightsout: { age: 4, br: 'INDUSTRY', name: 'LIGHTS-OUT FACTORIES', cost: 300, req: ['robotics', 'alloy2'], desc: 'Alloys, circuits and components +15%.', fx: { alloyOut: 1.15, circOut: 1.15, compOut: 1.15 } },
  containers: { age: 4, br: 'GRID', name: 'CONTAINERISATION', cost: 260, req: ['freight'], desc: 'Counties you are not playing deliver another 15% to the shared stockpile.', fx: { poolEff: 0.15 } },
  airlift: { age: 4, br: 'GRID', name: 'AIRLIFT', cost: 240, req: ['depots2'], desc: 'Supply exchanges move 50% more.', fx: { exportRate: 1.5 } },
  smartmat: { age: 4, br: 'INDUSTRY', name: 'SMART MATERIALS', cost: 260, req: ['cleanroom'], desc: 'Machines wear 10% slower.', fx: { wear: 0.9 } },
  gridai: { age: 4, br: 'NET', name: 'GRID AI', cost: 320, req: ['quantum'], desc: 'Power output +6%, storage 20% faster, faults 15% rarer.', fx: { genOut: 1.06, store: 1.2, ev: 1.15 } },
  medtech: { age: 4, br: 'TOWN', name: 'MEDTECH', cost: 240, req: ['medicine', 'trades'], desc: 'Scrap income +5% and research +5%.', fx: { income: 1.05, rp: 1.05 } },
  supercond: { age: 4, br: 'GRID', name: 'SUPERCONDUCTORS', cost: 300, req: ['hvdc', 'alloy2'], desc: 'Imports +15% and power output +5%.', fx: { imp: 0.15, genOut: 1.05 } },
  domes: { age: 4, br: 'BOOST', name: 'STORM DOMES', cost: 260, req: ['drains'], desc: 'Storms damage 30% fewer lines.', fx: { stormN: 0.7 } },
  drones: { age: 4, br: 'BOOST', name: 'SECURITY DRONES', cost: 260, req: ['militia'], desc: 'Raiders come 30% less often.', fx: { raid: 1.3 } },
  nano: { age: 4, br: 'OPS', name: 'NANO-REPAIR', cost: 280, req: ['robotics'], desc: 'Every machine mends itself (+0.05 condition per second).', fx: { autoRepair: 0.05 } },
  tidal: { age: 4, br: 'POWER', name: 'TIDAL TURBINES', cost: 240, req: ['runner'], desc: 'Hydro turbines make 30% more power.', fx: { hydro: 1.3 } },
  perovskite: { age: 4, br: 'POWER', name: 'PEROVSKITE CELLS', cost: 240, req: ['solarfarm'], desc: 'Solar arrays and farms make 30% more power.', fx: { solar: 1.3 } },
  offshore: { age: 4, br: 'POWER', name: 'OFFSHORE WIND', cost: 240, req: ['windfarm'], desc: 'Wind turbines and farms make 30% more power.', fx: { wind: 1.3 } },
  institutes: { age: 4, br: 'TOWN', name: 'RESEARCH INSTITUTES', cost: 280, req: ['trades'], desc: 'Research points +15%.', fx: { rp: 1.15 } },
  megadepots: { age: 4, br: 'OPS', name: 'MEGA DEPOTS', cost: 220, req: ['bulk'], desc: 'Fuel depots and tank farms hold another 50% more.', fx: { fuelStore: 1.5 } },
  commonmkt: { age: 4, br: 'BOOST', name: 'COMMON MARKET', cost: 280, req: ['metering'], desc: 'Scrap income +8%.', fx: { income: 1.08 } },
  cleanburn: { age: 4, br: 'POWER', name: 'CLEAN COMBUSTION', cost: 240, req: ['pipeline'], desc: 'Generators, turbines and plants burn 15% less fuel.', fx: { fuel: 0.85 } },
  // ===== AGE V - FUSION (end game) =====
  fusion: { age: 5, br: 'POWER', name: 'FUSION IGNITION', cost: 600, req: ['fission', 'supercond', 'gridai'], desc: 'Fusion reactors: +160 power on the HV trunk. They use shared components.' },
  atmo: { age: 5, br: 'WATER', name: 'ATMOSPHERIC WATER', cost: 450, req: ['waterworks', 'gridai'], desc: 'Atmo water plants: +30 water pulled from the air, anywhere.' },
  megafab: { age: 5, br: 'INDUSTRY', name: 'MEGAFACTORIES', cost: 550, req: ['lightsout', 'comp2'], desc: 'Megafactories: 0.3 COMPONENTS/s from shared alloys, circuits and a lot of parts.' },
  orbital: { age: 5, br: 'NET', name: 'ORBITAL UPLINKS', cost: 500, req: ['netcore', 'quantum'], desc: 'Orbital uplinks: +45 network from the sky.' },
  fusion2: { age: 5, br: 'POWER', name: 'MAGNETIC CONFINEMENT', cost: 650, req: ['fusion'], desc: 'Fusion reactors make 25% more power.', fx: { fusion: 1.25 } },
  megafab2: { age: 5, br: 'INDUSTRY', name: 'SELF-REPLICATING LINES', cost: 650, req: ['megafab'], desc: 'Component makers produce 25% more components.', fx: { compOut: 1.25 } },
  worldnet: { age: 5, br: 'NET', name: 'WORLD NETWORK', cost: 550, req: ['orbital'], desc: 'Network output +15%.', fx: { netOut: 1.15 } },
  abundance: { age: 5, br: 'BOOST', name: 'POST-SCARCITY', cost: 700, req: ['commonmkt', 'megafab'], desc: 'Scrap income +15% and upkeep 15% less.', fx: { income: 1.15, upkeep: 0.85 } },
  terraform: { age: 5, br: 'WATER', name: 'TERRAFORMING', cost: 550, req: ['atmo'], desc: 'Water output +15%.', fx: { waterOut: 1.15 } },
  weather: { age: 5, br: 'BOOST', name: 'WEATHER CONTROL', cost: 600, req: ['domes', 'gridai'], desc: 'Faults 40% rarer and storms damage half as many lines.', fx: { ev: 1.4, stormN: 0.5 } },
  peace: { age: 5, br: 'BOOST', name: 'LASTING PEACE', cost: 600, req: ['drones', 'diplomacy'], desc: 'Raiders come 60% less often and factions trust you 30% faster.', fx: { raid: 1.6, trust: 1.3 } },
  hyperloop: { age: 5, br: 'GRID', name: 'HYPERLOOP', cost: 650, req: ['containers', 'airlift'], desc: 'Counties you are not playing deliver 20% more, and exchanges move twice as much.', fx: { poolEff: 0.2, exportRate: 2 } },
  gardens: { age: 5, br: 'TOWN', name: 'GARDEN CITIES', cost: 550, req: ['arcology'], desc: 'Scrap income +10%.', fx: { income: 1.1 } },
  selfheal: { age: 5, br: 'OPS', name: 'SELF-HEALING GRID', cost: 600, req: ['nano'], desc: 'Machines mend themselves faster (+0.08/s) and wear 15% slower.', fx: { autoRepair: 0.08, wear: 0.85 } },
  antimatter: { age: 5, br: 'POWER', name: 'ANTIMATTER TRAPS', cost: 700, req: ['fusion2'], desc: 'Storage 50% faster and power output +8%.', fx: { store: 1.5, genOut: 1.08 } },
  reclaim: { age: 5, br: 'BOOST', name: 'MATTER RECLAMATION', cost: 600, req: ['megafab'], desc: 'Rubble +50%, caches +30%, parts +20%.', fx: { rubble: 1.5, lootVal: 1.3, partsOut: 1.2 } },
  singularity: { age: 5, br: 'BOOST', name: 'GRID SINGULARITY', cost: 900, req: ['fusion2', 'worldnet'], desc: 'Power, water and network +10%, research +20%.', fx: { genOut: 1.1, waterOut: 1.1, netOut: 1.1, rp: 1.2 } },
  worldgrid: { age: 5, br: 'STATION', name: 'WORLD GRID THEORY', cost: 1200, req: ['singularity', 'hyperloop'], desc: 'The last idea: one grid for the whole world. Needed to IGNITE THE WORLD GRID on the AGES screen (G).' },
};
(function assignAges() {
  const memo = {};
  const ageOf = id => memo[id] || (memo[id] = Math.max(TECH[id].age || (TECH[id].cost <= 45 ? 1 : 2), ...TECH[id].req.map(ageOf)));
  for (const id in TECH) TECH[id].age = ageOf(id);
})();
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
  rp: 0, done: {}, q: [], pr: {}, dirty: false,              // q = research queue, pr = research progress (both optional: older saves simply start empty)
  has(id) { return !!this.done[id]; },
  load() { try { const m = JSON.parse(localStorage.getItem(META_KEY)); if (m) { this.rp = m.rp || 0; this.done = m.done || {}; this.q = Array.isArray(m.q) ? m.q.filter(id => TECH[id] && !this.done[id]) : []; this.pr = m.pr && typeof m.pr === 'object' ? m.pr : {}; } } catch (e) { /* none */ } },
  save() { try { localStorage.setItem(META_KEY, JSON.stringify({ rp: Math.floor(this.rp * 10) / 10, done: this.done, q: this.q, pr: this.pr })); } catch (e) { /* blocked */ } this.dirty = false; },
  reset() { this.rp = 0; this.done = {}; this.q = []; this.pr = {}; this.save(); },
  buy(id) {
    const t = TECH[id]; if (!t || this.done[id] || this.rp < t.cost || !t.req.every(r => this.done[r]) || t.age > curAge()) return false;
    this.rp -= t.cost; this.done[id] = 1; this.save(); return true;
  },
};
const curAge = () => (typeof save !== 'undefined' && save && save.age) || 1;                 // the campaign's current age (ages.js)
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
  { cat: 'LINES', name: 'AUTO ROUTE', key: ';', kind: 'route', cost: 'varies', color: '#ffd27a', desc: 'Click a start (or a machine), then an end: every line type chosen below is laid along the cheapest path around obstacles. The preview shows the cost. ESC or right-click cancels.' },
  { cat: 'LINES', name: 'MULTI LINE', key: '=', kind: 'multi', cost: 'varies', color: '#d8e6e0', desc: 'Lay several line types in one drag. Choose which ones with the buttons below, or use a preset.' },
  { cat: 'POWER', name: 'GENERATOR', key: '4', kind: 'build', type: 'generator', desc: '+8 power. Burns 0.25 fuel/s and 1 scrap/s. Wears out.' },
  { cat: 'POWER', name: 'GAS TURBINE', key: '', kind: 'build', type: 'gasturbine', desc: '+18 power for 0.5 fuel/s and 2 scrap/s upkeep.' },
  { cat: 'POWER', name: 'SOLAR ARRAY', key: '5', kind: 'build', type: 'solar', desc: '+3 power, no fuel. Weak during radiation storms.' },
  { cat: 'POWER', name: 'WIND TURBINE', key: '6', kind: 'build', type: 'wind', desc: '+2 power, no fuel.' },
  { cat: 'POWER', name: 'HYDRO TURBINE', key: 'h', kind: 'build', type: 'hydro', desc: '+14 power on the HV trunk, no fuel. Must touch water.' },
  { cat: 'POWER', name: 'BATTERY BANK', key: '7', kind: 'build', type: 'battery', desc: 'Stores 60 power. Charges from surplus, covers brownouts (6/s).' },
  { cat: 'POWER', name: 'BIOMASS BURNER', key: '', kind: 'build', type: 'biomass', desc: '+5 power with no fuel. 1 scrap/s upkeep.' },
  { cat: 'POWER', name: 'FUEL CELL STACK', key: '', kind: 'build', type: 'fuelcell', desc: '+12 power for just 0.12 fuel/s. Needs 1 water.' },
  { cat: 'POWER', name: 'GEOTHERMAL WELL', key: '', kind: 'build', type: 'geothermal', desc: '+16 power, no fuel. Needs 2 water. Build it anywhere.' },
  { cat: 'POWER', name: 'SOLAR FARM', key: '', kind: 'build', type: 'solarfarm', desc: '+14 power, no fuel. Costs 2 shared alloys to build.' },
  { cat: 'POWER', name: 'WIND FARM', key: '', kind: 'build', type: 'windfarm', desc: '+11 power, no fuel. Costs 2 shared alloys to build.' },
  { cat: 'POWER', name: 'FISSION REACTOR', key: '', kind: 'build', type: 'fission', desc: '+60 power on the HV trunk. Needs 4 water + 1 net and uses 0.01 shared components/s.' },
  { cat: 'POWER', name: 'FUSION REACTOR', key: '', kind: 'build', type: 'fusion', desc: '+160 power on the HV trunk. Needs 6 water + 3 net and uses 0.02 shared components/s.' },
  { cat: 'FUEL', name: 'CHARCOAL KILN', key: '', kind: 'build', type: 'kiln', desc: 'Makes 0.35 fuel/s. Needs no power and no lines: place it anywhere.' },
  { cat: 'FUEL', name: 'BIOGAS DIGESTER', key: '', kind: 'build', type: 'digester', desc: 'Needs 1 power + 2 water. Makes 0.8 fuel/s.' },
  { cat: 'FUEL', name: 'REFINERY', key: 'i', kind: 'build', type: 'refinery', desc: 'Needs 3 power + 2 water. Makes 1.5 fuel/s.' },
  { cat: 'FUEL', name: 'OIL WELL', key: '', kind: 'build', type: 'oilwell', desc: 'Needs 3 power. Pumps 1.3 fuel/s.' },
  { cat: 'FUEL', name: 'SYNFUEL PLANT', key: '', kind: 'build', type: 'synfuel', desc: 'Needs 6 power, 3 water, 1 net and a trickle of parts. Makes 3.6 fuel/s.' },
  { cat: 'FUEL', name: 'FUEL DEPOT', key: 'u', kind: 'build', type: 'fueldepot', desc: '+150 fuel storage.' },
  { cat: 'FUEL', name: 'TANK FARM', key: '', kind: 'build', type: 'tankfarm', desc: '+400 fuel storage.' },
  { cat: 'WATER', name: 'WATER PUMP', key: '8', kind: 'build', type: 'pump', desc: '+6 water. Needs 2 power, must touch water.' },
  { cat: 'WATER', name: 'WATER WELL', key: '', kind: 'build', type: 'well', desc: '+3 water for 1 power. A small well that works away from water too.' },
  { cat: 'WATER', name: 'ATMO WATER PLANT', key: '', kind: 'build', type: 'atmo', desc: '+30 water from the air, anywhere. Needs 8 power + 1 net.' },
  { cat: 'WATER', name: 'DESALINATION', key: '', kind: 'build', type: 'desal', desc: '+12 water. Needs 4 power and must touch water.' },
  { cat: 'WATER', name: 'WATER TOWER', key: '9', kind: 'build', type: 'tower', desc: 'Stores 60 water. Covers shortages (6/s).' },
  { cat: 'NET', name: 'NET ROUTER', key: '0', kind: 'build', type: 'router', desc: '+6 network. Needs 1 power.' },
  { cat: 'NET', name: 'RELAY TOWER', key: '', kind: 'build', type: 'relay', desc: '+12 network. Needs 2 power.' },
  { cat: 'NET', name: 'ORBITAL UPLINK', key: '', kind: 'build', type: 'orbital', desc: '+45 network from orbit. Needs 12 power.' },
  { cat: 'CONTROL', name: 'SUBSTATION', key: 'q', kind: 'build', type: 'substation', desc: 'Transformer: joins the HV trunk to local power lines. Also a switch (press T). Needs a net signal to stay closed.' },
  { cat: 'CONTROL', name: 'PRESSURE STN', key: 'e', kind: 'build', type: 'valve', desc: 'Joins a water main to local pipes. Also a valve (press T). Needs 1 power.' },
  { cat: 'CONTROL', name: 'INTERTIE', key: '', kind: 'build', type: 'intertie', desc: 'Imports surplus power, water and net from neighbouring counties with online control stations. Connect it to your trunks.' },
  { cat: 'CONTROL', name: 'SECURITY POST', key: '', kind: 'build', type: 'security', desc: 'Drives off raiders within 14 tiles. Needs 1 power and 1 net.' },
  { cat: 'CONTROL', name: 'NET EXCHANGE', key: 'r', kind: 'build', type: 'node', desc: 'Joins the fiber trunk to local cable. Also a switch (press T). Needs 1 power.' },
  { cat: 'CONTROL', name: 'SUPPLY EXCHANGE', key: '', kind: 'build', type: 'exchange', desc: 'Trades PARTS and FUEL with the shared stockpile: exports your surplus, imports when you run short. Needs 1 power + 2 net.' },
  { cat: 'TOWN', name: 'HOUSE', key: 'f', kind: 'build', type: 'house', desc: 'Needs 1 power, water, net. Earns 2 scrap/s.' },
  { cat: 'TOWN', name: 'APARTMENTS', key: '', kind: 'build', type: 'apartments', desc: 'Needs 2 of each. Earns 7 scrap/s.' },
  { cat: 'TOWN', name: 'MARKET', key: '', kind: 'build', type: 'market', desc: 'Needs 2 power, 1 water, 2 net. Earns 8 scrap/s, 1 upkeep.' },
  { cat: 'TOWN', name: 'SCHOOL', key: '', kind: 'build', type: 'school', desc: 'Makes 1 research point/s and 1 scrap/s.' },
  { cat: 'TOWN', name: 'GREENHOUSE', key: '', kind: 'build', type: 'greenhouse', desc: 'Needs 3 water. Earns 6 scrap/s.' },
  { cat: 'TOWN', name: 'WORKSHOP', key: 'g', kind: 'build', type: 'workshop', desc: 'Needs 2 power + 1 net. Earns 4 scrap/s and makes PARTS.' },
  { cat: 'TOWN', name: 'CLINIC', key: 'o', kind: 'build', type: 'clinic', desc: 'Needs power, water, net. Earns 3 scrap/s and +1 for houses within 8 tiles.' },
  { cat: 'TOWN', name: 'VERTICAL FARM', key: '', kind: 'build', type: 'vfarm', desc: 'Needs 3 power, 6 water, 1 net. Earns 20 scrap/s.' },
  { cat: 'TOWN', name: 'ARCOLOGY', key: '', kind: 'build', type: 'arcology', desc: 'Needs 8 power, 8 water, 6 net. Earns 45 scrap/s and 2 research/s.' },
  { cat: 'INDUSTRY', name: 'SALVAGE YARD', key: '', kind: 'build', type: 'scrapyard', desc: 'Needs 1 power. Earns 3 scrap/s and sorts out 0.12 parts/s.' },
  { cat: 'INDUSTRY', name: 'ORE MINE', key: '', kind: 'build', type: 'mine', desc: 'Needs 3 power + 1 water. Digs 0.5 parts/s and earns 2 scrap/s.' },
  { cat: 'INDUSTRY', name: 'FOUNDRY', key: '', kind: 'build', type: 'foundry', desc: 'Needs 4 power + 2 water, burns 0.2 fuel/s. Casts 1.2 parts/s.' },
  { cat: 'INDUSTRY', name: 'ASSEMBLY PLANT', key: '', kind: 'build', type: 'assembly', desc: 'Needs 3 power + 2 net. Turns 0.4 parts/s into 15 scrap/s.' },
  { cat: 'INDUSTRY', name: 'WAREHOUSE', key: '', kind: 'build', type: 'warehouse', desc: 'Raises the scrap warehouse cap by 250.' },
  { cat: 'INDUSTRY', name: 'ALLOY SMELTER', key: '', kind: 'build', type: 'smelter', desc: 'Needs 6 power + 2 water, burns 0.3 fuel and 0.3 parts/s. Makes 0.12 ALLOYS/s for the shared stockpile.' },
  { cat: 'INDUSTRY', name: 'CIRCUIT FAB', key: '', kind: 'build', type: 'circuitfab', desc: 'Needs 4 power, 1 water, 4 net and 0.25 parts/s. Makes 0.1 CIRCUITS/s for the shared stockpile.' },
  { cat: 'INDUSTRY', name: 'COMPONENT WORKS', key: '', kind: 'build', type: 'compworks', desc: 'Turns shared alloys + circuits into 0.08 COMPONENTS/s. Needs 8 power, 2 water, 4 net.' },
  { cat: 'INDUSTRY', name: 'MEGAFACTORY', key: '', kind: 'build', type: 'megafab', desc: '0.3 COMPONENTS/s from shared alloys, circuits and 1 part/s. Needs 20 power, 6 water, 8 net.' },
  { cat: 'OPS', name: 'RESEARCH LAB', key: 'b', kind: 'build', type: 'lab', desc: 'Needs 2 power + 2 net. Makes 2 research points/s (press Y to spend them).' },
  { cat: 'OPS', name: 'DRONE BAY', key: '', kind: 'build', type: 'dronebay', desc: 'Launches 3 repair drones that fly out and fix failed machines, worn machines and damaged lines within 30 tiles - for free. While you are away, it repairs this county\'s outages by itself.' },
  { cat: 'OPS', name: 'MAINT DEPOT', key: 'n', kind: 'build', type: 'depot', desc: 'Needs 2 power. Auto-repairs buildings within 16 tiles.' },
  { cat: 'OPS', name: 'DATA ARCHIVE', key: '', kind: 'build', type: 'archive', desc: 'Needs 3 power + 4 net. Makes 3 research points/s.' },
  { cat: 'OPS', name: 'QUANTUM LAB', key: '', kind: 'build', type: 'quantum', desc: 'Needs 6 power + 8 net and a few shared circuits. Makes 9 research/s.' },
  { cat: 'OPS', name: 'ROBOT DEPOT', key: '', kind: 'build', type: 'robotdepot', desc: 'Needs 4 power + 2 net. Robots repair up to 10 machines within 26 tiles.' },
  { cat: 'TOOLS', name: 'REPAIR', key: 'v', kind: 'repair', color: '#5fc4d0', desc: 'Click a building to repair it (scrap + parts). Drag over damaged line to fix it.' },
  { cat: 'TOOLS', name: 'SALVAGE', key: 'x', kind: 'salvage', color: '#d8e6e0', desc: 'Remove rubble (+3 scrap), lines or buildings (half refund).' },
  { cat: 'TOOLS', name: 'INSPECT', key: 'c', kind: 'inspect', color: '#d8e6e0', desc: 'Click a building for status. Click a transformer to toggle it. Restore dormant plants and the station here.' },
];

// ============================================================
//  WORLD DATA - difficulties, factions, union tiers, link levels, settings.
//  (The logic that uses these lives in world.js.)
// ============================================================
const DIFFS = [
  { id: 'settler', name: 'SETTLER', blurb: 'Gentle. Rich starts, rare storms, slow Dimmers, forgiving neighbours.', scrap: 1.4, ev: 1.5, wear: 0.7, raid: 1.6, dark: 1.7, darkCap: 0.06, trust: 1.4, linkDecay: 0.6,
    assist: { n: 'FULL', autoFix: 1, fixAll: 1, efuel: 1, drone: 1.25, prevent: 0.6, d: 'All assists: auto-repair, REPAIR ALL, emergency fuel; drones fix map outages fast and prevent most.' } },
  { id: 'survivor', name: 'SURVIVOR', blurb: 'The intended game. Storms, raids and Dimmers at a steady pace.', scrap: 1, ev: 1, wear: 1, raid: 1, dark: 1, darkCap: 0.1, trust: 1, linkDecay: 1,
    assist: { n: 'STANDARD', autoFix: 1, fixAll: 1, efuel: 1, drone: 1, prevent: 0.5, d: 'All assists: auto-repair, REPAIR ALL, emergency fuel; drones fix map outages and prevent half of them.' } },
  { id: 'winter', name: 'IRON WINTER', blurb: 'Lean starts, frequent faults, aggressive Dimmers, wary factions.', scrap: 0.75, ev: 0.7, wear: 1.3, raid: 0.7, dark: 0.7, darkCap: 0.16, trust: 0.8, linkDecay: 1.3,
    assist: { n: 'LIMITED', autoFix: 0, fixAll: 1.25, efuel: 2, drone: 0.5, prevent: 0.3, d: 'No auto-repair. REPAIR ALL costs 25% more, emergency fuel costs double, drones fix map outages at half speed.' } },
  { id: 'blackout', name: 'BLACKOUT', blurb: 'Brutal. Little scrap, constant failures, Dimmers everywhere, links fray fast.', scrap: 0.55, ev: 0.5, wear: 1.6, raid: 0.5, dark: 0.5, darkCap: 0.24, trust: 0.6, linkDecay: 1.6,
    assist: { n: 'NONE', autoFix: 0, fixAll: 0, efuel: 0, drone: 0.33, prevent: 0, d: 'No auto-repair, no REPAIR ALL, no emergency fuel. Drones still repair inside a county, but fix map outages slowly and prevent none.' } },
];

// regional factions (the Dimmers are handled separately in world.js)
const FACTIONS = {
  compact: { name: 'HAVEN RIDGE COMPACT', who: 'MARA', color: '#8fbf5a', region: 'the eastern United States', cost: 30, perk: 'Compact funds: +12% scrap when you start a county', mod: { scrap: 0.12 } },
  syndicate: { name: 'PRAIRIE SYNDICATE', who: 'BRAM', color: '#b59cf0', region: 'the western United States', cost: 35, perk: 'Shared research: +1 research point a minute, links recover faster', mod: { rpMin: 1, linkRegen: 0.25 } },
  north: { name: 'NORTHERN LINE', who: 'ELOISE', color: '#f5c95a', region: 'Canada and Alaska', cost: 40, perk: 'Cold-proofing: machines wear 25% slower', mod: { wear: 0.75 } },
  sur: { name: 'LINEA SUR', who: 'DIEGO', color: '#e08a3c', region: 'Mexico', cost: 40, perk: 'Sun contracts: +15% scrap income in every county', mod: { inc: 1.15 } },
  seas: { name: 'LEAGUE OF TWO SEAS', who: 'ISABEL', color: '#5fc4d0', region: 'Central America and the Caribbean', cost: 45, perk: 'Shipping lanes: +15% imports, links recover faster', mod: { imp: 0.15, linkRegen: 0.2 } },
  andes: { name: 'ANDEAN CONCORD', who: 'INTI', color: '#e07aa8', region: 'South America', cost: 50, perk: 'Mountain crews: links recover faster, machines wear 15% slower', mod: { linkRegen: 0.3, wear: 0.85 } },
  euro: { name: 'MERIDIAN ACCORD', who: 'ASTRID', color: '#7fa6f0', region: 'Europe', cost: 55, perk: 'Clearing house: +20% imports, +10% scrap income in every county', mod: { imp: 0.2, inc: 1.1 } },
  sila: { name: 'SILA COLLECTIVE', who: 'SILA', color: '#d8e6e0', region: 'Greenland', cost: 50, perk: 'Ice watch: Dimmer raids are 50% rarer', mod: { def: 1.5 } },
};
const FAC_IDS = ['compact', 'syndicate', 'north', 'sur', 'seas', 'sila', 'andes', 'euro'];
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
  autopause: true, confirmLeave: true, wide: false, fx: true, autoFix: true,
  ui: 'auto', pix: 'auto', scan: true, parts: 1, fps: 60, motion: true, showFps: false, lite: false, autoq: true, hints: true,       // graphics (see display.js)
  KEYS: ['autopause', 'confirmLeave', 'wide', 'fx', 'autoFix', 'ui', 'pix', 'scan', 'parts', 'fps', 'motion', 'showFps', 'lite', 'autoq', 'hints'],
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
