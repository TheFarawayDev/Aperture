'use strict';
// ============================================================
//  USMAP.JS - builds the pixel map of North America: the USA, southern
//  Canada and northern/central Mexico, with states/provinces, counties,
//  the Great Lakes, coasts, and which counties touch which.
//  Everything is generated from the data below (no images).
//
//  STATES rows: [abbr, name, weight, [[lat,lon] anchors...], country]
//  weight ~ relative size. Anchors pull land toward that state.
// ============================================================

let MAPW = 420, MAPH = 340;                 // the grid is sized automatically from the geography below
const MC = 1, MAPSC = 392;               // pixels per cell, cells per projected unit      // map cells, pixels per cell

const STATES = [
  ['AL', 'ALABAMA', 52, [[32.8, -86.8]], 'US'], ['AZ', 'ARIZONA', 114, [[34.3, -111.7]], 'US'],
  ['AR', 'ARKANSAS', 53, [[34.9, -92.4]], 'US'], ['CA', 'CALIFORNIA', 164, [[37.2, -119.5], [34.6, -117.6]], 'US'],
  ['CO', 'COLORADO', 104, [[39.0, -105.5]], 'US'], ['CT', 'CONNECTICUT', 5, [[41.6, -72.7]], 'US'],
  ['DE', 'DELAWARE', 2, [[39.0, -75.5]], 'US'], ['FL', 'FLORIDA', 66, [[28.6, -82.0], [30.4, -85.0]], 'US'],
  ['GA', 'GEORGIA', 59, [[32.7, -83.4]], 'US'], ['ID', 'IDAHO', 84, [[44.4, -114.6], [47.5, -116.4]], 'US'],
  ['IL', 'ILLINOIS', 58, [[40.0, -89.2]], 'US'], ['IN', 'INDIANA', 36, [[39.9, -86.3]], 'US'],
  ['IA', 'IOWA', 56, [[42.1, -93.5]], 'US'], ['KS', 'KANSAS', 82, [[38.5, -98.4]], 'US'],
  ['KY', 'KENTUCKY', 40, [[37.5, -85.3]], 'US'], ['LA', 'LOUISIANA', 52, [[31.0, -92.0]], 'US'],
  ['ME', 'MAINE', 36, [[45.3, -69.2]], 'US'], ['MD', 'MARYLAND', 12, [[39.0, -76.8], [39.5, -78.6]], 'US'],
  ['MA', 'MASSACHUSETTS', 11, [[42.3, -71.8]], 'US'], ['MI', 'MICHIGAN', 70, [[43.7, -84.6], [46.3, -87.0]], 'US'],
  ['MN', 'MINNESOTA', 87, [[46.3, -94.3]], 'US'], ['MS', 'MISSISSIPPI', 48, [[32.7, -89.7]], 'US'],
  ['MO', 'MISSOURI', 70, [[38.4, -92.5]], 'US'], ['MT', 'MONTANA', 147, [[47.0, -109.6]], 'US'],
  ['NE', 'NEBRASKA', 77, [[41.5, -99.8]], 'US'], ['NV', 'NEVADA', 111, [[39.3, -116.6]], 'US'],
  ['NH', 'NEW HAMPSHIRE', 9, [[43.7, -71.6]], 'US'], ['NJ', 'NEW JERSEY', 9, [[40.1, -74.7]], 'US'],
  ['NM', 'NEW MEXICO', 122, [[34.4, -106.1]], 'US'], ['NY', 'NEW YORK', 55, [[42.9, -75.5], [43.5, -77.0]], 'US'],
  ['NC', 'NORTH CAROLINA', 54, [[35.5, -79.4], [35.3, -77.0]], 'US'], ['ND', 'NORTH DAKOTA', 71, [[47.5, -100.5]], 'US'],
  ['OH', 'OHIO', 45, [[40.3, -82.8]], 'US'], ['OK', 'OKLAHOMA', 70, [[35.6, -97.5], [36.8, -101.5]], 'US'],
  ['OR', 'OREGON', 98, [[43.9, -120.6]], 'US'], ['PA', 'PENNSYLVANIA', 46, [[40.9, -77.8]], 'US'],
  ['RI', 'RHODE ISLAND', 1.5, [[41.7, -71.5]], 'US'], ['SC', 'SOUTH CAROLINA', 32, [[33.9, -80.9]], 'US'],
  ['SD', 'SOUTH DAKOTA', 77, [[44.4, -100.2]], 'US'], ['TN', 'TENNESSEE', 42, [[35.8, -86.3], [35.4, -89.3]], 'US'],
  ['TX', 'TEXAS', 269, [[31.5, -99.3], [35.3, -101.8]], 'US'], ['UT', 'UTAH', 85, [[39.3, -111.7]], 'US'],
  ['VT', 'VERMONT', 10, [[44.0, -72.7]], 'US'], ['VA', 'VIRGINIA', 43, [[37.5, -78.8]], 'US'],
  ['WA', 'WASHINGTON', 71, [[47.4, -120.5]], 'US'], ['WV', 'WEST VIRGINIA', 24, [[38.6, -80.6]], 'US'],
  ['WI', 'WISCONSIN', 65, [[44.6, -90.0]], 'US'], ['WY', 'WYOMING', 98, [[43.0, -107.5]], 'US'],
  // ---- Canada (southern part) ----
  ['BC', 'BRITISH COLUMBIA', 150, [[53.5, -125.5], [50.0, -120.0]], 'CA'], ['AB', 'ALBERTA', 140, [[54.0, -114.5]], 'CA'],
  ['SK', 'SASKATCHEWAN', 150, [[53.8, -106.0]], 'CA'], ['MB', 'MANITOBA', 130, [[53.5, -98.5]], 'CA'],
  ['ON', 'ONTARIO', 200, [[53.0, -86.0], [44.5, -79.8]], 'CA'], ['QC', 'QUEBEC', 220, [[51.0, -72.0], [46.8, -72.5], [58.0, -72.0]], 'CA'],
  ['NB', 'NEW BRUNSWICK', 28, [[46.5, -66.3]], 'CA'], ['NS', 'NOVA SCOTIA', 21, [[45.2, -63.2]], 'CA'],
  ['NL', 'LABRADOR', 60, [[53.5, -61.0]], 'CA'], ['YT', 'YUKON', 90, [[64.0, -136.0], [68.5, -138.5]], 'CA'], ['NT', 'NORTHWEST TERRITORIES', 130, [[65.5, -122.0], [72.5, -122.5]], 'CA'],
  ['NU', 'NUNAVUT', 150, [[68.0, -98.0], [66.5, -72.0], [71.0, -106.0]], 'CA'], ['NF', 'NEWFOUNDLAND', 45, [[48.8, -56.0]], 'CA'],
  // ---- Alaska (reached through the Yukon) ----
  ['AK', 'ALASKA', 200, [[64.5, -153.0], [61.0, -149.5], [58.2, -135.5], [68.0, -155.5], [59.0, -157.5]], 'AK'],
  // ---- Central America ----
  ['GT', 'GUATEMALA', 42, [[15.4, -90.3]], 'CM'], ['BZ', 'BELIZE', 9, [[17.1, -88.6]], 'CM'], ['HN', 'HONDURAS', 43, [[14.8, -86.6]], 'CM'],
  ['SV', 'EL SALVADOR', 8, [[13.7, -88.9]], 'CM'], ['NI', 'NICARAGUA', 50, [[12.9, -85.0]], 'CM'], ['CR', 'COSTA RICA', 20, [[10.0, -84.2]], 'CM'],
  ['PA', 'PANAMA', 29, [[8.6, -80.2]], 'CM'],
  // ---- the Caribbean ----
  ['CU', 'CUBA', 44, [[21.9, -79.5], [20.5, -76.0], [22.4, -83.0]], 'CB'], ['HT', 'HAITI', 11, [[19.0, -72.4]], 'CB'], ['DO', 'DOMINICAN REPUBLIC', 19, [[18.9, -70.4]], 'CB'],
  ['JM', 'JAMAICA', 4.2, [[18.15, -77.3]], 'CB'], ['PR', 'PUERTO RICO', 3.5, [[18.2, -66.4]], 'CB'],
  // ---- Mexico ----
  ['BCN', 'BAJA CALIFORNIA', 28, [[30.0, -115.5]], 'MX'], ['BCS', 'BAJA SUR', 28, [[25.5, -111.5]], 'MX'],
  ['SON', 'SONORA', 70, [[29.7, -110.8]], 'MX'], ['CHH', 'CHIHUAHUA', 95, [[28.8, -106.5]], 'MX'],
  ['COA', 'COAHUILA', 58, [[27.3, -102.0]], 'MX'], ['NLE', 'NUEVO LEON', 25, [[25.6, -99.9]], 'MX'],
  ['TAM', 'TAMAULIPAS', 30, [[24.5, -98.5]], 'MX'], ['SIN', 'SINALOA', 22, [[25.0, -107.5]], 'MX'],
  ['DUR', 'DURANGO', 47, [[24.9, -104.9]], 'MX'], ['ZAC', 'ZACATECAS', 29, [[23.2, -102.7]], 'MX'],
  ['SLP', 'SAN LUIS POTOSI', 24, [[22.5, -100.4]], 'MX'], ['VER', 'VERACRUZ', 28, [[19.5, -96.7]], 'MX'],
  ['JAL', 'JALISCO', 31, [[20.5, -103.7]], 'MX'], ['MIC', 'MICHOACAN', 23, [[19.2, -101.9]], 'MX'],
  ['GRO', 'GUERRERO', 25, [[17.6, -100.0]], 'MX'], ['OAX', 'OAXACA', 36, [[17.0, -96.7]], 'MX'],
  ['CHP', 'CHIAPAS', 29, [[16.5, -92.5]], 'MX'], ['YUC', 'YUCATAN', 50, [[20.5, -88.9]], 'MX'],
  ['CMX', 'CENTRAL MEXICO', 20, [[19.3, -98.4]], 'MX'], ['TAB', 'TABASCO', 14, [[18.0, -92.5]], 'MX'],
  // ---- the far north-east: Ellesmere is Canadian, Greenland is its own country ----
  ['EL', 'ELLESMERE', 45, [[79.6, -84.0]], 'CA'],
  ['GLN', 'NORTH GREENLAND', 90, [[78.0, -40.0], [77.0, -62.0]], 'GL'], ['GLW', 'WEST GREENLAND', 80, [[67.5, -50.0]], 'GL'],
  ['GLE', 'EAST GREENLAND', 70, [[70.0, -26.0]], 'GL'], ['GLS', 'SOUTH GREENLAND', 40, [[61.8, -45.0], [64.0, -41.0]], 'GL'],
  // ---- Hawaii (drawn as an inset in the Pacific, like on every US map) ----
  ['HI', 'HAWAII', 20, [[23.4, -122.0], [25.9, -126.0], [26.9, -129.0], [28.2, -131.7]], 'US'],
];
const COUNTRY_NAME = { US: 'UNITED STATES', CA: 'CANADA', MX: 'MEXICO', CM: 'CENTRAL AMERICA', CB: 'THE CARIBBEAN', AK: 'ALASKA', GL: 'GREENLAND' };

// Rough outline of the lower 48 as [lon, lat]
const OUTLINE = [
  [-124.7, 48.4], [-123.1, 49.0], [-95.2, 49.0], [-95.2, 49.4], [-94.6, 48.7], [-93.0, 48.6], [-91.5, 48.1], [-89.6, 48.0],
  [-88.4, 47.4], [-86.5, 46.6], [-84.6, 46.5], [-84.0, 46.0], [-83.4, 45.2], [-82.6, 44.0], [-82.4, 43.0], [-83.1, 42.3],
  [-83.4, 41.7], [-82.7, 41.5], [-81.7, 41.5], [-80.5, 42.0], [-79.0, 42.7], [-78.9, 42.9], [-79.0, 43.3], [-77.5, 43.3],
  [-76.4, 43.5], [-76.2, 44.2], [-75.0, 44.9], [-74.7, 45.0], [-71.5, 45.0], [-71.1, 45.3], [-70.5, 45.7], [-70.0, 46.7],
  [-69.2, 47.45], [-68.3, 47.35], [-67.8, 47.1], [-67.8, 45.7], [-67.4, 45.2], [-67.0, 44.8], [-68.5, 44.3], [-69.8, 43.8],
  [-70.7, 43.1], [-70.8, 42.7], [-70.5, 42.2], [-70.0, 41.8], [-70.0, 41.6], [-71.0, 41.5], [-71.9, 41.3], [-73.6, 41.0],
  [-74.0, 40.6], [-74.1, 39.8], [-74.9, 38.9], [-75.1, 38.5], [-75.9, 37.1], [-75.9, 36.6], [-75.5, 35.3], [-76.4, 34.8],
  [-77.9, 33.9], [-79.0, 33.2], [-80.4, 32.3], [-81.2, 31.7], [-81.4, 30.7], [-81.3, 30.4], [-80.6, 28.6], [-80.0, 26.8],
  [-80.1, 25.8], [-80.5, 25.2], [-81.1, 25.2], [-81.8, 26.1], [-82.3, 27.0], [-82.8, 27.8], [-82.7, 29.0], [-83.7, 29.9],
  [-84.3, 30.1], [-85.3, 29.7], [-86.5, 30.4], [-88.0, 30.3], [-89.4, 30.3], [-89.4, 29.3], [-90.2, 29.1], [-91.3, 29.3],
  [-92.5, 29.5], [-93.8, 29.7], [-94.7, 29.3], [-95.8, 28.6], [-96.8, 28.2], [-97.3, 27.3], [-97.2, 25.9], [-98.5, 26.1],
  [-99.2, 26.6], [-99.5, 27.5], [-100.4, 28.5], [-100.9, 29.4], [-101.5, 29.8], [-102.4, 29.8], [-102.8, 29.2], [-103.2, 29.0],
  [-104.0, 29.4], [-104.7, 30.1], [-105.0, 30.7], [-106.5, 31.8], [-108.2, 31.8], [-108.2, 31.3], [-111.1, 31.3], [-114.8, 32.5],
  [-117.1, 32.5], [-117.3, 33.0], [-118.4, 33.7], [-119.5, 34.4], [-120.6, 34.5], [-121.9, 36.6], [-122.5, 37.8], [-123.8, 39.4],
  [-124.4, 40.4], [-124.1, 41.9], [-124.5, 42.8], [-124.1, 44.6], [-123.9, 46.2], [-124.1, 46.9],
];
// Canada's outer edge, replacing the US northern border (from the Pacific round to New Brunswick)
const CA_DETOUR = [
  [-125.0, 49.2], [-126.5, 50.3], [-127.8, 51.0], [-128.5, 52.5], [-129.3, 53.6], [-130.2, 54.4], [-130.1, 55.9], [-132.5, 57.8],
  [-135.0, 59.5], [-137.5, 59.9], [-139.0, 60.3], [-141.0, 60.3], [-141.0, 69.6],
  [-136.0, 68.9], [-130.0, 70.0], [-124.0, 69.4], [-117.0, 68.2], [-110.0, 68.0], [-104.0, 68.1], [-98.0, 67.8], [-95.0, 68.5], [-91.0, 69.0], [-87.0, 69.4], [-84.0, 69.4],
  [-84.5, 66.5], [-86.0, 64.5], [-88.5, 63.6], [-90.7, 63.2], [-92.2, 62.8], [-94.1, 61.1], [-94.2, 58.8], [-92.8, 57.2], [-90.0, 57.1], [-87.6, 56.0],
  [-85.0, 55.3], [-82.3, 55.1], [-82.3, 53.0], [-80.8, 51.4], [-79.4, 51.5], [-79.0, 53.4], [-77.8, 55.8], [-78.2, 58.0], [-77.5, 60.0], [-78.0, 62.3],
  [-74.0, 62.2], [-70.5, 61.6], [-69.0, 60.2], [-68.0, 58.6], [-66.0, 58.5], [-64.4, 60.4], [-62.0, 57.0], [-59.5, 54.8], [-57.5, 53.2], [-56.0, 51.6], [-58.5, 50.5], [-62.5, 50.2], [-65.5, 49.6],
  [-67.5, 49.2], [-65.2, 49.2], [-64.4, 48.8], [-64.8, 47.8], [-65.0, 46.9], [-64.0, 46.0], [-62.5, 45.8], [-61.0, 46.2],
  [-60.4, 47.0], [-59.8, 45.9], [-61.2, 45.1], [-63.5, 44.5], [-65.4, 43.6], [-66.2, 44.4], [-66.9, 45.0],
];
// Alaska: separate land mass reached through the Yukon
const ALASKA = [
  [-130.1, 55.9], [-131.5, 54.7], [-133.5, 55.5], [-135.5, 57.5], [-137.0, 58.5], [-140.0, 59.7], [-144.0, 60.0], [-147.0, 60.8], [-150.0, 59.2], [-151.5, 59.5],
  [-153.0, 58.0], [-156.0, 57.0], [-160.0, 55.5], [-164.0, 54.7], [-162.0, 56.5], [-158.0, 58.7], [-161.0, 59.7], [-165.0, 60.5], [-165.0, 62.5], [-161.0, 63.5],
  [-166.0, 64.5], [-168.0, 65.7], [-164.0, 66.5], [-162.0, 67.0], [-165.0, 68.8], [-157.0, 71.0], [-152.0, 70.8], [-148.0, 70.3], [-141.0, 69.7], [-141.0, 60.3],
  [-139.0, 60.3], [-137.5, 59.9], [-135.0, 59.5], [-132.5, 57.8],
];
// islands (separate land masses)
const ISLANDS = [
  [[-59.3, 47.6], [-58.4, 48.6], [-57.5, 49.4], [-56.0, 50.7], [-55.4, 51.6], [-55.9, 50.0], [-54.5, 49.5], [-53.4, 49.3], [-53.9, 48.5], [-52.6, 48.0], [-52.7, 47.0], [-54.0, 46.8], [-55.7, 47.0], [-57.5, 47.6]],   // Newfoundland
  [[-78.5, 64.2], [-73.0, 64.3], [-68.0, 62.6], [-65.0, 61.9], [-64.0, 63.8], [-62.0, 66.5], [-63.5, 68.7], [-66.5, 70.3], [-70.5, 72.0], [-75.5, 73.0], [-81.0, 73.8], [-86.5, 73.5], [-89.0, 72.2], [-86.0, 70.8], [-82.5, 70.0], [-79.0, 69.3], [-77.5, 67.5], [-76.0, 65.5]],   // Baffin
  [[-118.0, 69.5], [-114.5, 68.9], [-110.5, 68.6], [-106.5, 68.9], [-102.0, 69.5], [-102.5, 71.0], [-105.5, 72.3], [-110.0, 73.0], [-115.0, 72.5], [-118.5, 71.5], [-119.5, 70.3]],   // Victoria
  [[-125.5, 71.5], [-122.5, 71.3], [-120.5, 72.3], [-121.5, 74.0], [-124.5, 74.5], [-125.5, 73.0]],   // Banks
  [[-84.95, 21.9], [-83.5, 22.8], [-82.3, 23.1], [-81.0, 23.0], [-79.5, 22.5], [-77.6, 21.8], [-76.0, 21.1], [-74.2, 20.3], [-75.5, 19.9], [-77.2, 19.9], [-77.8, 20.8], [-78.8, 21.6], [-80.5, 22.0], [-82.0, 22.2], [-83.5, 22.0], [-84.5, 21.8]],   // Cuba
  [[-74.4, 18.4], [-73.0, 19.9], [-71.7, 19.9], [-69.9, 19.7], [-68.4, 18.6], [-69.0, 18.3], [-70.5, 18.2], [-71.1, 17.8], [-72.5, 18.2], [-74.0, 18.3]],   // Hispaniola
  [[-78.35, 18.4], [-77.2, 18.5], [-76.2, 18.2], [-76.8, 17.85], [-77.8, 18.0]],   // Jamaica
  [[-67.2, 18.5], [-65.6, 18.4], [-65.8, 18.0], [-67.2, 18.0]],   // Puerto Rico
];
const GL_INSET = { dx: 0.30, dy: -0.33, s: 0.82 };
const GREENLAND = [
  [-44.0, 59.8], [-43.0, 60.5], [-41.5, 61.8], [-40.5, 63.2], [-38.5, 65.2], [-35.0, 66.3], [-33.0, 67.8], [-28.0, 68.5], [-25.0, 69.5], [-22.5, 70.5], [-22.0, 72.5], [-20.0, 74.5],
  [-19.0, 76.5], [-18.5, 78.0], [-18.0, 80.0], [-17.0, 81.5], [-22.0, 83.0], [-33.0, 83.6], [-45.0, 83.0], [-60.0, 82.0], [-66.0, 81.0], [-70.0, 79.5], [-72.0, 78.0], [-70.0, 76.8],
  [-67.0, 76.0], [-61.0, 75.2], [-57.5, 74.0], [-55.5, 72.5], [-54.0, 70.5], [-53.5, 68.8], [-52.5, 66.0], [-51.5, 64.2], [-50.5, 62.5], [-48.5, 61.0], [-46.0, 60.2],
];
// the Hawaiian islands, moved and enlarged to sit in the Pacific off Baja
const HAWAII = [
  [[-123.6, 22.0], [-120.8, 22.2], [-120.2, 23.6], [-121.2, 25.0], [-123.0, 25.2], [-124.0, 23.8]],
  [[-127.0, 25.0], [-125.2, 24.8], [-124.9, 26.0], [-126.0, 26.9], [-127.4, 26.2]],
  [[-130.0, 26.4], [-128.3, 26.2], [-128.0, 27.3], [-129.2, 28.0], [-130.2, 27.4]],
  [[-132.6, 27.6], [-131.0, 27.4], [-130.8, 28.4], [-131.8, 29.1], [-132.8, 28.5]],
];
ISLANDS.push([[-90.5, 76.4], [-85.0, 76.2], [-80.0, 76.3], [-79.0, 77.4], [-77.5, 78.6], [-75.5, 79.6], [-72.0, 80.6], [-69.0, 81.8], [-64.0, 82.6], [-70.0, 83.0], [-80.0, 83.1], [-90.0, 82.2], [-92.5, 80.5], [-91.0, 78.5]]);   // Ellesmere
// Mexico's outer edge, replacing the Rio Grande / southern border
const MX_DETOUR = [
  [-97.6, 24.0], [-97.8, 22.5], [-97.3, 21.0], [-96.5, 19.7], [-96.1, 19.0], [-95.2, 18.6], [-94.5, 18.2], [-93.5, 18.4],
  [-92.5, 18.6], [-91.6, 18.8], [-90.8, 19.4], [-90.4, 20.5], [-89.5, 21.1], [-88.0, 21.6], [-87.0, 21.5], [-86.8, 20.5],
  [-87.4, 19.5], [-87.8, 18.4], [-88.2, 17.5], [-88.3, 16.0], [-86.0, 15.9], [-84.0, 15.9], [-83.3, 15.0], [-83.6, 12.5], [-83.7, 11.0], [-82.5, 9.6], [-81.4, 8.9], [-79.5, 9.6], [-77.9, 9.2], [-77.3, 8.7],
  [-77.9, 7.3], [-78.5, 8.0], [-79.5, 7.4], [-80.4, 7.3], [-81.7, 8.2], [-83.0, 8.3], [-85.7, 10.0], [-87.7, 13.0], [-89.5, 13.5], [-91.4, 13.9], [-92.3, 14.6], [-94.0, 16.0], [-95.2, 15.9],
  [-96.5, 15.7], [-98.0, 16.2], [-99.5, 16.7], [-101.0, 17.2], [-102.2, 18.0], [-103.5, 18.8], [-104.5, 19.2], [-105.4, 20.3],
  [-105.5, 21.5], [-105.8, 22.6], [-106.8, 23.8], [-108.0, 25.0], [-109.2, 25.9], [-109.9, 27.0], [-110.6, 27.9], [-112.0, 29.0],
  [-112.8, 30.0], [-114.1, 31.1], [-114.8, 31.8], [-114.5, 30.8], [-113.8, 29.8], [-113.0, 28.6], [-112.2, 27.5], [-111.4, 26.0],
  [-110.5, 24.5], [-109.5, 23.2], [-110.2, 23.0], [-111.8, 24.4], [-112.4, 25.6], [-113.5, 26.8], [-114.4, 27.8], [-115.0, 28.8],
  [-115.9, 30.0], [-116.7, 31.3],
];
// Water that must be carved out of the land
const LAKES = [
  [[-86.0, 45.8], [-87.0, 45.6], [-87.6, 44.8], [-87.6, 43.5], [-87.8, 42.5], [-87.6, 41.8], [-86.9, 41.7], [-86.4, 42.4], [-86.5, 43.5], [-86.3, 44.7], [-85.6, 45.5]], // Michigan
  [[-92.1, 46.7], [-90.7, 46.85], [-89.0, 46.85], [-88.2, 47.5], [-87.4, 46.6], [-85.2, 46.7], [-84.6, 46.9], [-84.9, 47.7], [-86.0, 48.8], [-87.8, 48.8], [-89.2, 48.4], [-89.5, 48.0], [-90.9, 47.2]], // Superior
  [[-84.7, 45.85], [-83.4, 45.3], [-82.6, 44.0], [-82.4, 43.1], [-81.7, 43.3], [-81.4, 44.3], [-81.7, 45.4], [-80.3, 44.7], [-79.8, 45.0], [-80.6, 46.0], [-82.0, 46.1], [-83.5, 46.2], [-84.2, 46.1]], // Huron
  [[-83.1, 42.3], [-83.4, 41.7], [-82.7, 41.5], [-81.7, 41.5], [-80.5, 42.0], [-79.0, 42.8], [-79.6, 42.9], [-80.5, 42.6], [-81.7, 42.6], [-82.5, 42.1]], // Erie
  [[-79.0, 43.3], [-77.5, 43.3], [-76.4, 43.5], [-76.2, 44.1], [-77.5, 44.0], [-78.8, 43.8], [-79.5, 43.6]], // Ontario
];

const NAME_A = ['ASH', 'DUST', 'RUST', 'IRON', 'HOLLOW', 'COPPER', 'SABLE', 'CINDER', 'FALLOW', 'BRIAR', 'GLASS', 'SALT',
  'OXBOW', 'WIDOW', 'GRAVEL', 'LANTERN', 'PRAIRIE', 'CRATER', 'SIGNAL', 'RELAY', 'BONE', 'MIRAGE', 'TIN', 'EMBER', 'RAVEN', 'COLD'];
const NAME_B = ['FIELD', 'CREEK', 'FLATS', 'RIDGE', 'GATE', 'MILLS', 'BASIN', 'HILL', 'FORD', 'WELLS', 'BEND', 'POINT', 'REACH', 'VALE'];

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// climate by position -> the look of the county map
function biomeAt(lat, lon, cn) {
  if (cn === 'GL') return lat > 72 ? 'tundra' : 'mountain';
  if (cn === 'US' && lon < -119.5 && lat < 31) return 'forest';          // Hawaii
  if (cn === 'CA') { if (lat >= 56) return 'tundra'; if (lat >= 53.5 && lon > -125) return 'tundra'; if (lon < -118) return 'mountain'; if (lon > -112 && lon < -96 && lat < 53) return 'plains'; return 'forest'; }
  if (cn === 'AK') return lat >= 66 ? 'tundra' : lat < 60 ? 'forest' : lon > -148 ? 'mountain' : 'tundra';
  if (cn === 'CM' || cn === 'CB') return lat < 10.5 ? 'swamp' : 'forest';
  if (cn === 'MX') { if (lat < 19.5 && lon > -94.5) return 'swamp'; if (lat < 21.5) return 'forest'; return 'desert'; }
  if (lon < -104 && lon > -116.5 && lat > 36.5) return 'mountain';
  if (lon < -118 && lon > -122 && lat > 35.5 && lat < 41) return 'mountain';
  if (lon < -120.5 && lat > 41.5) return 'forest';
  if (lon < -103 && lat < 37.5) return 'desert';
  if (lon < -109 && lat < 42.5) return 'desert';
  if (lon > -103 && lon < -94 && lat > 28) return lat > 46.5 ? 'tundra' : 'plains';
  if (lon > -94 && lat < 31.2) return 'swamp';
  if (lon > -84.5 && lon < -78 && lat > 35 && lat < 41.5) return 'mountain';
  if (lat > 47) return 'tundra';
  return 'forest';
}

function buildUS() {
  const rad = Math.PI / 180;
  const p1 = 29.5 * rad, p2 = 45.5 * rad, p0 = 37.5 * rad, l0 = -96 * rad;
  const n = (Math.sin(p1) + Math.sin(p2)) / 2, C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
  const rho0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
  const proj0 = (lon, lat) => { const rho = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n, th = n * (lon * rad - l0); return [rho * Math.sin(th), rho0 - rho * Math.cos(th)]; };
  // Greenland is drawn as an inset (moved down into the Atlantic and shrunk) so the map stays wide instead of tall
  const GLX = { dx: GL_INSET.dx, dy: GL_INSET.dy, s: GL_INSET.s, cx: 0.45, cy: 0.66 };
  const glProj = (lon, lat) => { const [x, y] = proj0(lon, lat); return [(x - GLX.cx) * GLX.s + GLX.cx + GLX.dx, (y - GLX.cy) * GLX.s + GLX.cy + GLX.dy]; };
  let projMode = false;
  const proj = (lon, lat) => projMode ? glProj(lon, lat) : proj0(lon, lat);
  // outline of the mainland: US outline with Canada / Mexico / Central America detours spliced in
  const i1 = OUTLINE.findIndex(p => p[0] === -67.0 && p[1] === 44.8);
  const i3 = OUTLINE.findIndex(p => p[0] === -97.2 && p[1] === 25.9);
  const i4 = OUTLINE.findIndex(p => p[0] === -117.1 && p[1] === 32.5);
  const NA = [OUTLINE[0], ...CA_DETOUR, ...OUTLINE.slice(i1, i3 + 1), ...MX_DETOUR, ...OUTLINE.slice(i4)];
  const pts = [...NA, ...ALASKA, ...HAWAII.flat(), ...ISLANDS.flat()].map(([lo, la]) => proj(lo, la)).concat(GREENLAND.map(([lo, la]) => glProj(lo, la)));
  const minx = Math.min(...pts.map(p => p[0])), maxx = Math.max(...pts.map(p => p[0]));
  const miny = Math.min(...pts.map(p => p[1])), maxy = Math.max(...pts.map(p => p[1]));
  const sc = MAPSC;
  MAPW = Math.ceil((maxx - minx) * sc) + 10; MAPH = Math.ceil((maxy - miny) * sc) + 10;      // the map is exactly as big as the geography needs
  const GW = MAPW, GH = MAPH;
  const toGrid = (lo, la) => { const [x, y] = proj(lo, la); return [(x - minx) * sc + 5, (maxy - y) * sc + 5]; };
  const inv = (gx, gy) => {                          // grid cell -> lat/lon
    const x = (gx - 5) / sc + minx, y = maxy - (gy - 5) / sc, dy = rho0 - y;
    const rho = Math.sqrt(x * x + dy * dy), th = Math.atan2(x, dy);
    return [Math.asin((C - rho * rho * n * n) / (2 * n)) / rad, (l0 + th / n) / rad];
  };
  const raster = poly => {
    const m = new Uint8Array(GW * GH), P = poly.map(([lo, la]) => toGrid(lo, la));
    for (let y = 0; y < GH; y++) {
      const yy = y + 0.5, xs = [];
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j];
        if ((yi > yy) !== (yj > yy)) xs.push((xj - xi) * (yy - yi) / (yj - yi) + xi);
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(GW, xs[k + 1] - 0.5); x++) m[y * GW + x] = 1;
    }
    return m;
  };
  const mNA = raster(NA), mUS = raster(OUTLINE), mAK = raster(ALASKA), mGL = (projMode = true, raster(GREENLAND)), mHI = new Uint8Array(GW * GH), lake = new Uint8Array(GW * GH);
  projMode = false;
  HAWAII.forEach(pl => { const m = raster(pl); for (let i = 0; i < m.length; i++) if (m[i]) mHI[i] = 1; });
  ISLANDS.forEach(pl => { const m = raster(pl); for (let i = 0; i < m.length; i++) if (m[i]) mNA[i] = 1; });
  LAKES.forEach(l => { const m = raster(l); for (let i = 0; i < m.length; i++) if (m[i]) lake[i] = 1; });

  // land cells -> state / province / country (area weighted nearest anchor)
  const stateOf = new Int16Array(GW * GH).fill(-1), countyOf = new Int16Array(GW * GH).fill(-1), isLake = lake;
  const anchors = STATES.map(s => { projMode = s[4] === 'GL'; const r = s[3].map(([la, lo]) => toGrid(lo, la)); projMode = false; return r; });
  const idxOf = f => STATES.map((s, i) => i).filter(i => f(STATES[i][4]));
  const hiIdx = STATES.findIndex(s => s[0] === 'HI');
  const pools = { US: idxOf(c => c === 'US').filter(i => i !== hiIdx), AK: idxOf(c => c === 'AK'), GL: idxOf(c => c === 'GL'), HI: [hiIdx], REST: idxOf(c => c !== 'US' && c !== 'AK' && c !== 'GL') };
  const stateCells = STATES.map(() => []);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x;
    const isAK = mAK[i] && !lake[i], isUS = mUS[i] && !lake[i], isOther = mNA[i] && !lake[i], isGL = mGL[i] && !isOther, isHI = mHI[i] && !isOther;
    if (!isAK && !isUS && !isOther && !isGL && !isHI) continue;
    const pool = isAK ? pools.AK : isUS ? pools.US : isHI ? pools.HI : isGL ? pools.GL : pools.REST;
    let best = -1, bd = 1e9;
    for (const si of pool) {
      const w = Math.pow(STATES[si][2], 0.45);
      for (const [ax, ay] of anchors[si]) { const dd = Math.hypot(x + 0.5 - ax, y + 0.5 - ay) / w; if (dd < bd) { bd = dd; best = si; } }
    }
    stateOf[i] = best; stateCells[best].push([x, y]);
  }

  // counties
  const counties = [], states = [];
  STATES.forEach((s, si) => {
    const cells = stateCells[si], rnd = mulberry(99 + si * 13), cn = s[4];
    let cnt = Math.max(1, Math.min(26, Math.round(cells.length / (s[0] === 'HI' ? 140 : cn === 'GL' ? 330 : cn === 'US' ? 150 : (cn === 'MX' || cn === 'CM' || cn === 'CB') ? 170 : 270))));
    cnt = Math.max(1, Math.min(cnt, Math.floor(cells.length / 14) || 1));
    const seeds = [];
    for (let k = 0; k < cnt && cells.length; k++) {
      let bestC = null, bestD = -1;
      for (let t = 0; t < 10; t++) {
        const c = cells[rnd() * cells.length | 0];
        const md = seeds.length ? Math.min(...seeds.map(q => Math.hypot(q[0] - c[0], q[1] - c[1]))) : 1e9;
        if (md > bestD) { bestD = md; bestC = c; }
      }
      seeds.push(bestC);
    }
    const first = counties.length, mine = seeds.map((_, k) => ({ id: first + k, state: si, country: cn, cells: [], nb: [] }));
    mine.forEach(c => counties.push(c));
    for (const [x, y] of cells) {
      let bi = 0, bd = 1e9;
      seeds.forEach((q, k) => { const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; bi = k; } });
      mine[bi].cells.push(y * GW + x); countyOf[y * GW + x] = first + bi;
    }
    states.push({ ab: s[0], name: s[1], idx: si, country: cn, counties: mine.map(c => c.id), cells: cells.length });
  });
  counties.forEach(c => {
    const nr = mulberry(c.id * 31 + 5);
    c.name = NAME_A[nr() * NAME_A.length | 0] + ' ' + NAME_B[nr() * NAME_B.length | 0];
    let ax = 0, ay = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    c.cells.forEach(i => { const x = i % GW, y = (i / GW) | 0; ax += x; ay += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    ax /= c.cells.length; ay /= c.cells.length;
    let bi = c.cells[0], bd = 1e9;
    c.cells.forEach(i => { const d = Math.hypot(i % GW - ax, ((i / GW) | 0) - ay); if (d < bd) { bd = d; bi = i; } });
    c.gx = bi % GW; c.gy = (bi / GW) | 0; c.px = c.gx * MC + MC / 2; c.py = c.gy * MC + MC / 2;
    c.bw = x1 - x0 + 1; c.bh = y1 - y0 + 1;
    // which sides touch water (ocean or a lake) -> shorelines in the county map
    const wt = { n: 0, e: 0, s: 0, w: 0 };
    c.cells.forEach(i => {
      const x = i % GW, y = (i / GW) | 0;
      if (y > 0 && countyOf[i - GW] < 0) wt.n++; if (y < GH - 1 && countyOf[i + GW] < 0) wt.s++;
      if (x > 0 && countyOf[i - 1] < 0) wt.w++; if (x < GW - 1 && countyOf[i + 1] < 0) wt.e++;
    });
    c.water = { n: Math.min(1, wt.n / c.bw), s: Math.min(1, wt.s / c.bw), w: Math.min(1, wt.w / c.bh), e: Math.min(1, wt.e / c.bh) };
    const [la, lo] = inv(c.gx + 0.5, c.gy + 0.5);
    c.lat = la; c.lon = lo; c.biome = biomeAt(la, lo, c.country);
    if (c.country === 'GL') c.biome = /^GL[NE]$/.test(STATES[c.state][0]) ? 'tundra' : 'mountain';
  });
  states.forEach(s => {
    let ax = 0, ay = 0;
    s.counties.forEach(id => { ax += counties[id].gx; ay += counties[id].gy; });
    s.cx = ax / s.counties.length; s.cy = ay / s.counties.length;
  });
  const set = new Set();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const a = countyOf[y * GW + x]; if (a < 0) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x + dx >= GW || y + dy >= GH) continue;
      const b = countyOf[(y + dy) * GW + x + dx];
      if (b >= 0 && b !== a) set.add(Math.min(a, b) + '-' + Math.max(a, b));
    }
  }
  const parent = counties.map((_, i) => i), find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
  set.forEach(k => { const [a, b] = k.split('-').map(Number); parent[find(a)] = find(b); });
  for (let guard = 0; guard < 80; guard++) {                      // join each isolated land mass to its nearest neighbour across the water
    const groups = new Map(); counties.forEach(c => { const r = find(c.id); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); });
    if (groups.size < 2) break;
    const smallest = [...groups.values()].sort((a, b) => a.length - b.length)[0]; let best = null, bd = 1e9;
    smallest.forEach(c => counties.forEach(o => { if (find(o.id) !== find(c.id)) { const dd = Math.hypot(o.gx - c.gx, o.gy - c.gy) + (o.country !== c.country ? 40 : 0); if (dd < bd) { bd = dd; best = [c.id, o.id]; } } }));
    set.add(Math.min(best[0], best[1]) + '-' + Math.max(best[0], best[1])); parent[find(best[0])] = find(best[1]);
  }
  const edges = [...set].map(k => k.split('-').map(Number));
  edges.forEach(([a, b]) => { counties[a].nb.push(b); counties[b].nb.push(a); });
  return { GW, GH, stateOf, countyOf, counties, states, edges, isLake };
}
