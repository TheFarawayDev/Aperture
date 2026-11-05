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
  // ---- South America (land-adjacent to Panama; drawn with its own local projection) ----
  ['COL', 'COLOMBIA', 100, [[4.8, -73.8], [2.0, -74.5]], 'SA'], ['VEN', 'VENEZUELA', 80, [[7.5, -66.0]], 'SA'],
  ['GUI', 'THE GUIANAS', 45, [[5.0, -58.5], [4.0, -54.0]], 'SA'], ['ECU', 'ECUADOR', 25, [[-1.5, -78.3]], 'SA'],
  ['PEN', 'NORTH PERU', 50, [[-5.5, -77.0], [-6.0, -74.0]], 'SA'], ['PES', 'SOUTH PERU', 70, [[-13.0, -72.5], [-11.0, -75.5]], 'SA'],
  ['BOL', 'BOLIVIA', 100, [[-17.0, -64.5]], 'SA'], ['PAR', 'PARAGUAY', 38, [[-23.3, -57.8]], 'SA'], ['URU', 'URUGUAY', 16, [[-32.8, -56.0]], 'SA'],
  ['CHN', 'NORTH CHILE', 34, [[-20.0, -69.6], [-26.0, -69.8]], 'SA'], ['CHC', 'CENTRAL CHILE', 28, [[-33.0, -70.8], [-37.0, -72.0]], 'SA'],
  ['CHS', 'SOUTH CHILE', 34, [[-42.0, -72.6], [-48.0, -73.2], [-53.0, -71.0]], 'SA'],
  ['ARN', 'NORTH ARGENTINA', 90, [[-26.5, -64.5], [-27.5, -58.5]], 'SA'], ['ARP', 'THE PAMPAS', 100, [[-34.0, -63.0], [-32.5, -67.0]], 'SA'],
  ['ARS', 'PATAGONIA', 90, [[-40.0, -68.5], [-47.0, -69.5], [-51.0, -70.0]], 'SA'],
  ['BRW', 'WEST AMAZON', 190, [[-4.0, -65.5], [-9.0, -70.0], [1.0, -62.0]], 'SA'], ['BRP', 'PARA', 140, [[-4.0, -52.5], [0.5, -52.0]], 'SA'],
  ['BRE', 'BRAZIL NORTHEAST', 110, [[-8.5, -40.5], [-5.5, -44.5], [-12.5, -43.0]], 'SA'], ['BRC', 'BRAZIL HEARTLAND', 170, [[-14.0, -55.0], [-12.0, -49.0], [-9.5, -61.5]], 'SA'],
  ['BRS', 'BRAZIL SOUTHEAST', 90, [[-20.0, -44.5], [-23.0, -47.0]], 'SA'], ['BRZ', 'BRAZIL SOUTH', 50, [[-26.5, -52.5], [-29.5, -53.5]], 'SA'],
  // ---- Europe (inset in the north-east Atlantic, reached through Iceland) ----
  ['IS', 'ICELAND', 10, [[64.9, -18.8]], 'EU'], ['IE', 'IRELAND', 7, [[53.2, -8.0]], 'EU'],
  ['SCT', 'SCOTLAND', 8, [[56.8, -4.5]], 'EU'], ['ENG', 'ENGLAND', 15, [[52.6, -1.5], [51.5, -3.5]], 'EU'],
  ['NOR', 'NORWAY', 30, [[60.8, 8.5], [65.0, 13.0], [68.7, 18.5], [69.8, 26.0]], 'EU'], ['SWE', 'SWEDEN', 40, [[59.5, 15.0], [63.0, 16.5], [66.5, 19.5]], 'EU'],
  ['FIN', 'FINLAND', 34, [[62.5, 26.0], [66.5, 27.5]], 'EU'], ['DNK', 'DENMARK', 4, [[56.0, 9.3]], 'EU'], ['BNL', 'BENELUX', 7, [[51.0, 4.5], [52.3, 5.5]], 'EU'],
  ['FRN', 'NORTH FRANCE', 30, [[48.5, 2.0], [47.8, -1.0], [49.5, 3.0]], 'EU'], ['FRS', 'SOUTH FRANCE', 30, [[44.5, 2.0], [43.7, 5.0]], 'EU'],
  ['ESP', 'SPAIN', 50, [[40.0, -3.7], [42.0, -5.0], [38.0, -3.5]], 'EU'], ['PRT', 'PORTUGAL', 9, [[39.5, -8.0]], 'EU'],
  ['GEN', 'NORTH GERMANY', 18, [[53.0, 10.0], [52.5, 13.0]], 'EU'], ['GES', 'SOUTH GERMANY', 18, [[49.0, 10.0], [49.3, 8.5], [48.4, 12.0]], 'EU'],
  ['POL', 'POLAND', 31, [[52.0, 19.5]], 'EU'], ['BLT', 'THE BALTICS', 18, [[56.8, 24.5], [58.8, 25.8], [55.3, 23.8]], 'EU'],
  ['CZE', 'CZECH LANDS', 13, [[49.5, 15.5], [48.8, 19.5]], 'EU'], ['ALP', 'THE ALPS', 12, [[47.0, 9.0], [47.2, 13.5]], 'EU'],
  ['ITN', 'NORTH ITALY', 13, [[45.0, 10.0], [44.0, 11.0]], 'EU'], ['ITS', 'SOUTH ITALY', 18, [[42.5, 12.5], [40.8, 15.7], [37.5, 14.0]], 'EU'],
  ['SAR', 'SARDINIA', 3, [[40.0, 9.0], [42.2, 9.1]], 'EU'], ['BLW', 'WEST BALKANS', 25, [[44.5, 17.0], [44.0, 20.5], [42.0, 20.0], [45.5, 15.5]], 'EU'],
  ['HUN', 'HUNGARY', 9, [[47.0, 19.5]], 'EU'], ['BLE', 'EAST BALKANS', 12, [[42.7, 25.2], [41.5, 22.0]], 'EU'],
  ['GRC', 'GREECE', 13, [[39.5, 22.0], [38.5, 23.5], [35.2, 24.9]], 'EU'], ['ROM', 'ROMANIA', 24, [[45.8, 25.0], [46.5, 22.5]], 'EU'],
  ['UKW', 'WEST UKRAINE', 25, [[49.5, 26.0], [48.5, 24.0]], 'EU'], ['UKE', 'EAST UKRAINE', 35, [[49.0, 33.5], [48.5, 37.0], [46.5, 31.5], [45.2, 34.0]], 'EU'],
  ['BLR', 'BELARUS', 21, [[53.5, 28.0]], 'EU'], ['RUN', 'NORTH RUSSIA', 60, [[66.5, 33.0], [63.0, 34.0], [60.8, 31.5]], 'EU'],
  ['RUC', 'WEST RUSSIA', 50, [[56.0, 34.5], [55.5, 38.0], [52.0, 37.5], [59.5, 30.5]], 'EU'],
];
const COUNTRY_NAME = { US: 'UNITED STATES', CA: 'CANADA', MX: 'MEXICO', CM: 'CENTRAL AMERICA', CB: 'THE CARIBBEAN', AK: 'ALASKA', GL: 'GREENLAND', SA: 'SOUTH AMERICA', EU: 'EUROPE' };

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
const SA_DIV = 200, EU_DIV = 150;               // cells per county (bigger = fewer counties) for South America / Europe
const DIV_MUL = { RUN: 2.4, RUC: 2.2, NOR: 1.7, SWE: 1.5, FIN: 1.4, ITN: 0.7, GRC: 0.7, PRT: 0.8, BNL: 0.8, HUN: 0.8, CHC: 0.7, ECU: 0.8 };   // per-region tweaks to the county count (SA / EU only)
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
// South America: own local projection (equirectangular, scaled down). Points with a 3rd value of 1 are projected with the main
// (Albers) projection instead, so the Colombia/Panama border lines up exactly with the end of Central America.
const SA_INSET = { s: 0.55, cos: 0.95, lon0: -77.3, lat0: 8.7 };
const SOUTH_AMERICA = [
  [-77.9, 9.2, 1], [-76.8, 9.0], [-76.0, 9.6], [-75.5, 10.5], [-74.8, 11.1], [-73.5, 11.3], [-72.3, 11.9], [-71.3, 12.4], [-71.6, 11.2], [-71.0, 10.4], [-69.8, 11.6], [-68.3, 10.6],
  [-66.8, 10.6], [-64.5, 10.5], [-62.3, 10.7], [-61.2, 9.6], [-60.5, 8.5], [-58.5, 6.8], [-55.5, 5.9], [-52.8, 5.2], [-51.0, 4.0], [-50.0, 1.8], [-49.8, 0.2], [-48.0, -0.8],
  [-46.2, -1.0], [-44.5, -2.5], [-42.5, -2.8], [-40.0, -2.9], [-38.5, -3.7], [-37.2, -4.8], [-35.3, -5.3], [-34.8, -7.0], [-35.1, -8.7], [-36.5, -10.5], [-37.3, -11.7], [-38.6, -13.0],
  [-39.1, -15.0], [-39.2, -17.7], [-40.0, -20.0], [-40.9, -21.8], [-42.0, -23.0], [-43.5, -23.0], [-44.8, -23.5], [-46.4, -24.0], [-48.0, -25.5], [-48.6, -27.0], [-48.7, -28.6],
  [-49.9, -29.6], [-51.2, -31.0], [-52.7, -33.0], [-53.5, -33.8], [-54.8, -34.9], [-56.3, -34.9], [-57.6, -34.4], [-58.3, -34.1], [-58.4, -34.7], [-57.3, -35.8], [-57.3, -36.8],
  [-57.9, -38.2], [-59.5, -38.8], [-62.0, -39.0], [-62.3, -40.5], [-64.9, -40.9], [-65.1, -42.0], [-64.0, -42.7], [-65.4, -44.0], [-67.5, -45.5], [-65.8, -47.5], [-67.6, -48.5], [-68.3, -50.2],
  [-69.0, -51.6], [-68.4, -52.3], [-67.0, -54.0], [-65.5, -54.8], [-68.3, -55.0], [-70.5, -55.2], [-72.0, -54.0], [-74.5, -52.5], [-75.4, -50.0], [-74.5, -47.5], [-73.9, -45.5],
  [-74.3, -43.5], [-73.5, -41.5], [-73.4, -39.8], [-73.3, -37.0], [-72.0, -35.0], [-71.7, -33.0], [-71.4, -30.0], [-71.0, -27.3], [-70.5, -24.0], [-70.1, -21.0], [-70.3, -18.5],
  [-72.0, -17.0], [-73.5, -16.0], [-76.2, -14.0], [-77.2, -12.0], [-78.2, -10.0], [-79.0, -8.0], [-80.8, -6.0], [-81.3, -5.0], [-80.8, -4.0], [-80.0, -2.7], [-81.0, -2.2],
  [-80.7, -1.0], [-80.0, 0.0], [-79.0, 1.2], [-78.8, 1.8], [-77.8, 3.0], [-77.3, 4.0], [-77.4, 5.0], [-77.4, 6.2], [-77.9, 7.3, 1], [-77.3, 8.7, 1],
];
// Europe: own local projection, placed in the north-east Atlantic so that Iceland sits just east of Greenland.
// gl = the Greenland coast point Iceland is placed beside, gap = water between them in map cells
const EU_INSET = { s: 0.9, cos: 0.62, lon0: -24.0, lat0: 65.5, gl: [-34.5, 66.8], gap: 10 };
const EUROPE = [
  [-5.4, 36.0], [-6.3, 36.5], [-7.4, 37.2], [-8.9, 37.0], [-8.8, 38.5], [-9.5, 38.8], [-8.8, 40.2], [-8.8, 41.8], [-9.3, 43.0], [-8.0, 43.7], [-5.8, 43.6], [-3.0, 43.4], [-1.8, 43.4],
  [-1.2, 44.7], [-1.2, 46.0], [-2.2, 47.2], [-4.5, 47.8], [-4.7, 48.4], [-3.0, 48.8], [-1.6, 48.7], [-1.3, 49.7], [0.2, 49.5], [1.6, 50.2], [2.5, 51.1], [3.5, 51.4], [4.5, 52.5],
  [5.3, 53.3], [7.0, 53.6], [8.6, 53.9], [8.6, 55.2], [8.1, 55.8], [8.2, 56.8], [9.5, 57.2], [10.6, 57.7], [10.3, 56.5], [10.2, 55.5], [9.7, 54.8], [10.9, 54.0], [12.0, 54.2],
  [13.8, 54.0], [14.3, 53.9], [16.5, 54.5], [18.6, 54.7], [19.9, 54.5], [21.0, 55.1], [21.1, 56.5], [21.5, 57.5], [22.6, 57.7], [23.5, 57.0], [24.4, 57.2], [24.4, 58.2],
  [23.5, 59.2], [26.0, 59.6], [28.0, 59.5], [30.2, 59.9], [28.5, 60.5], [26.0, 60.3], [23.0, 59.9], [22.5, 60.0], [21.5, 60.8], [21.3, 62.0], [21.5, 63.0], [22.5, 64.0], [25.2, 65.1],
  [24.0, 65.8], [22.0, 65.6], [21.4, 65.3], [19.5, 64.0], [17.7, 62.7], [17.2, 61.0], [17.2, 60.5], [18.7, 60.0], [17.0, 58.7], [16.6, 57.5], [16.4, 56.3], [15.5, 56.1],
  [14.3, 55.5], [13.0, 55.4], [12.6, 56.1], [11.9, 57.7], [11.2, 59.0], [10.7, 59.9], [10.0, 59.0], [8.0, 58.1], [6.5, 58.1], [5.6, 59.0], [5.0, 60.5], [5.0, 61.8], [6.5, 62.7],
  [8.5, 63.4], [10.5, 64.4], [12.5, 66.0], [14.0, 67.7], [16.0, 68.8], [18.8, 70.0], [23.0, 70.8], [28.0, 71.0], [31.1, 70.2], [33.0, 69.4], [36.0, 69.2], [38.5, 68.0],
  [37.0, 64.0], [38.5, 60.0], [38.0, 56.0], [39.5, 52.0], [38.5, 49.0], [38.0, 46.6], [36.5, 45.4], [35.4, 45.0], [34.0, 44.4], [33.0, 45.0], [32.5, 45.4], [33.6, 46.0],
  [32.0, 46.5], [30.7, 46.5], [29.7, 45.4], [28.7, 44.2], [28.0, 43.2], [27.9, 42.5], [28.0, 41.9], [29.0, 41.2], [26.7, 40.4], [25.5, 40.8], [24.0, 40.7], [23.0, 40.4],
  [22.6, 40.0], [23.2, 39.2], [22.9, 38.5], [24.0, 38.2], [24.0, 37.7], [23.1, 36.5], [22.4, 36.5], [21.7, 36.8], [21.2, 37.5], [21.5, 38.3], [20.7, 38.8], [20.2, 39.7],
  [19.5, 40.4], [19.4, 41.5], [18.5, 42.4], [17.0, 43.2], [15.5, 44.0], [14.5, 45.2], [13.7, 45.5], [12.3, 45.3], [12.4, 44.2], [13.6, 43.5], [14.2, 42.2], [15.9, 41.9],
  [16.9, 41.0], [18.5, 40.2], [17.2, 40.4], [16.6, 39.8], [17.1, 39.0], [16.0, 37.9], [15.7, 38.0], [15.6, 39.8], [14.9, 40.2], [13.0, 41.3], [11.8, 42.0], [10.5, 42.9],
  [10.2, 43.9], [8.8, 44.4], [7.6, 43.8], [6.0, 43.1], [4.5, 43.4], [3.1, 43.1], [3.2, 42.0], [2.0, 41.2], [0.7, 40.8], [-0.3, 39.5], [0.2, 38.8], [-0.7, 37.6], [-2.0, 36.8], [-4.4, 36.7],
];
const EU_ISLANDS = [
  [[-5.7, 50.1], [-4.2, 50.4], [-3.0, 50.7], [-1.1, 50.7], [0.3, 50.8], [1.4, 51.2], [1.7, 52.6], [0.3, 53.0], [0.0, 53.6], [-0.5, 54.5], [-1.5, 55.5], [-2.1, 56.0], [-1.8, 57.6], [-3.5, 57.7],
    [-3.9, 58.5], [-3.0, 58.6], [-5.0, 58.6], [-5.6, 57.5], [-5.7, 56.5], [-5.2, 55.8], [-4.9, 54.9], [-3.4, 54.9], [-3.0, 54.0], [-3.2, 53.4], [-4.6, 53.4], [-4.2, 52.8], [-4.1, 52.3],
    [-5.2, 51.8], [-3.0, 51.5], [-3.7, 51.0], [-4.5, 51.2]],   // Great Britain
  [[-6.0, 52.2], [-6.2, 53.3], [-6.0, 54.0], [-5.4, 54.5], [-6.2, 55.2], [-7.3, 55.4], [-8.5, 54.9], [-10.0, 54.2], [-9.8, 53.3], [-9.5, 52.2], [-10.3, 51.9], [-9.5, 51.5], [-8.2, 51.7], [-6.4, 52.1]],   // Ireland
  [[-24.0, 65.5], [-22.2, 66.4], [-21.0, 66.1], [-18.5, 66.2], [-16.0, 66.5], [-14.5, 65.8], [-13.6, 65.0], [-14.9, 64.3], [-17.0, 63.8], [-18.8, 63.4], [-20.5, 63.7], [-22.4, 63.8], [-22.6, 64.6], [-24.3, 64.9]],   // Iceland
  [[12.4, 38.1], [13.5, 38.2], [15.6, 38.2], [15.1, 37.3], [15.1, 36.7], [14.3, 36.8], [12.6, 37.6]],   // Sicily
  [[8.2, 41.0], [9.2, 41.2], [9.6, 40.5], [9.7, 39.2], [9.0, 39.0], [8.4, 39.1], [8.4, 40.0]],   // Sardinia
  [[8.6, 42.4], [9.4, 43.0], [9.5, 42.0], [9.2, 41.4], [8.8, 41.6]],   // Corsica
  [[23.6, 35.3], [24.7, 35.4], [26.2, 35.3], [26.3, 35.0], [24.5, 34.9], [23.5, 35.2]],   // Crete
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
function biomeSA(lat, lon) {
  // the Andes axis (longitude) by latitude
  const ax = lat > 2 ? -75 : lat > -5 ? -78 : lat > -15 ? -78 + (lat + 5) * 0.3 : lat > -25 ? -75 + (lat + 15) * 0.4 : lat > -35 ? -71 + (lat + 25) * 0.1 : -70 - (lat + 35) * 0.2;
  if (lat > 2 && lat < 9 && lon < -72) return 'mountain';
  if (lat < 2 && lat > -50 && Math.abs(lon - ax) < 3.2) return 'mountain';
  if (lat < -17 && lat > -29 && lon < -68) return 'desert';                         // Atacama
  if (lat < -48) return 'tundra';
  if (lat < -38) return lon < -71 ? 'forest' : 'steppe';                            // Patagonia
  if (lat < -28 && lon > -70) return 'plains';                                      // the pampas
  if (lat > 3.5 && lat < 8 && lon < -63 && lon > -73) return 'plains';              // the llanos
  if (lat < -5 && lat > -15 && lon > -45 && lon < -37) return 'desert';             // the sertao
  if (lat > -10 && lat < 4 && lon > -73 && lon < -50) return (lat > -3 && lat < 1 && lon > -62 && lon < -50) ? 'swamp' : 'jungle';   // Amazon basin (flooded forest near the mouth)
  if (lat < -10 && lat > -22 && lon > -62 && lon < -45) return 'steppe';            // cerrado
  if (lat < -20 && lat > -28 && lon > -63 && lon < -57) return 'steppe';            // chaco
  return lat > -8 ? 'jungle' : 'forest';
}
function biomeEU(lat, lon) {
  if (lon < -12 || lat > 66.5) return 'tundra';                                     // Iceland, the far north
  if (lat > 61 && lon > 28) return lat > 64 ? 'tundra' : 'taiga';
  if (lat > 56 && lat < 66 && lon > 4 && lon < 14) return 'mountain';               // the Scandes
  if (lat > 56.5 && lon < -2 && lon > -8) return 'mountain';                        // the Highlands
  if (lat > 45.2 && lat < 48 && lon > 5.5 && lon < 15) return 'mountain';           // Alps
  if (lat > 45 && lat < 49.5 && lon > 22 && lon < 27) return 'mountain';            // Carpathians
  if (lat > 41.5 && lat < 43.5 && lon > -2.5 && lon < 3) return 'mountain';         // Pyrenees
  if (lat > 40 && lat < 46 && lon > 14 && lon < 22) return 'mountain';              // Dinaric / Balkan ranges
  if (lat > 37 && lat < 41.5 && lon > 20 && lon < 24) return 'mountain';            // Pindus
  if (lat > 38 && lat < 45 && lon > 10 && lon < 16.5) return 'mountain';            // Apennines
  if (lat > 35 && lat < 39 && lon > -7 && lon < 0.5) return 'badlands';             // Andalusia / Murcia
  if (lat > 39 && lat < 41.5 && lon > -5.5 && lon < -1) return 'steppe';            // the Meseta
  if (lat < 38 && lon > 12) return 'desert';                                        // Sicily, Crete
  if (lat < 41 && lon > 8 && lon < 10) return 'plains';                             // Sardinia
  if (lat > 51.5 && lat < 53.5 && lon > 23 && lon < 31) return 'swamp';             // Pripyat marshes
  if (lat > 50.5 && lat < 54 && lon > 2.5 && lon < 7) return 'swamp';               // Low Countries
  if (lat > 44 && lat < 52 && lon > 28) return 'steppe';                            // steppe
  if (lat > 47 && lat < 52 && lon > 22) return 'plains';
  if (lat > 52 && lat < 55 && lon > 12 && lon < 22) return 'plains';
  if (lat > 47 && lon > 17 && lon < 22) return 'plains';
  if (lat > 43 && lat < 47 && lon > 20 && lon < 28) return 'plains';
  if (lat > 48 && lat < 51 && lon > -2 && lon < 5) return 'plains';
  if (lat > 52 && lat < 54 && lon > -9 && lon < -5) return 'plains';                // Ireland
  if (lat > 56) return 'taiga';
  return 'forest';
}
function biomeAt(lat, lon, cn) {
  if (cn === 'SA') return biomeSA(lat, lon);
  if (cn === 'EU') return biomeEU(lat, lon);
  if (cn === 'GL') return lat > 72 ? 'tundra' : 'mountain';
  if (cn === 'US' && lon < -119.5 && lat < 31) return 'jungle';           // Hawaii
  if (cn === 'CA') { if (lat >= 56) return 'tundra'; if (lat >= 53.5 && lon > -125) return 'tundra'; if (lon < -118) return 'mountain'; if (lon > -112 && lon < -96 && lat < 53) return 'plains'; return lat > 49 ? 'taiga' : 'forest'; }
  if (cn === 'AK') return lat >= 66 ? 'tundra' : lat < 60 ? 'taiga' : lon > -148 ? 'mountain' : 'tundra';
  if (cn === 'CM' || cn === 'CB') return lat < 10.5 ? 'swamp' : 'jungle';
  if (cn === 'MX') { if (lat < 19.5 && lon > -94.5) return 'swamp'; if (lat < 21.5) return 'jungle'; return lon < -104 && lat > 27 ? 'badlands' : 'desert'; }
  if (lon < -104 && lon > -116.5 && lat > 36.5) return 'mountain';
  if (lon < -118 && lon > -122 && lat > 35.5 && lat < 41) return 'mountain';
  if (lon < -120.5 && lat > 41.5) return 'forest';
  if (lon < -103 && lat < 37.5) return (lon > -114 && lon < -104 && lat > 33) ? 'badlands' : 'desert';
  if (lon < -109 && lat < 42.5) return lon > -115 && lat > 37 ? 'badlands' : 'desert';
  if (lon > -103 && lon < -94 && lat > 28) return lat > 46.5 || lon < -98 ? 'steppe' : 'plains';
  if (lon > -94 && lat < 31.2) return 'swamp';
  if (lon > -84.5 && lon < -78 && lat > 35 && lat < 41.5) return 'mountain';
  if (lat > 47) return 'taiga';
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
  // South America and Europe: simple local (equirectangular) projections anchored to the main map - SA at the Colombia/Panama border,
  // Europe so that Iceland lies just east of Greenland's coast
  const [sax, say] = proj0(SA_INSET.lon0, SA_INSET.lat0);
  const saProj = (lon, lat) => [sax + SA_INSET.s * SA_INSET.cos * (lon - SA_INSET.lon0) * rad, say + SA_INSET.s * (lat - SA_INSET.lat0) * rad];
  const [egx, egy] = glProj(EU_INSET.gl[0], EU_INSET.gl[1]);
  const eax = egx + EU_INSET.gap / MAPSC, eay = egy;
  const euProj = (lon, lat) => [eax + EU_INSET.s * EU_INSET.cos * (lon - EU_INSET.lon0) * rad, eay + EU_INSET.s * (lat - EU_INSET.lat0) * rad];
  let projMode = false;                              // false = Albers, or 'GL' / 'SA' / 'EU' for the inset projections
  const proj = (lon, lat) => projMode === 'GL' ? glProj(lon, lat) : projMode === 'SA' ? saProj(lon, lat) : projMode === 'EU' ? euProj(lon, lat) : proj0(lon, lat);
  // outline of the mainland: US outline with Canada / Mexico / Central America detours spliced in
  const i1 = OUTLINE.findIndex(p => p[0] === -67.0 && p[1] === 44.8);
  const i3 = OUTLINE.findIndex(p => p[0] === -97.2 && p[1] === 25.9);
  const i4 = OUTLINE.findIndex(p => p[0] === -117.1 && p[1] === 32.5);
  const NA = [OUTLINE[0], ...CA_DETOUR, ...OUTLINE.slice(i1, i3 + 1), ...MX_DETOUR, ...OUTLINE.slice(i4)];
  const pts = [...NA, ...ALASKA, ...HAWAII.flat(), ...ISLANDS.flat()].map(([lo, la]) => proj(lo, la)).concat(GREENLAND.map(([lo, la]) => glProj(lo, la)));
  const pts2 = [...SOUTH_AMERICA.map(([lo, la, a]) => a ? proj0(lo, la) : saProj(lo, la)), ...[EUROPE, ...EU_ISLANDS].flat().map(([lo, la]) => euProj(lo, la))];
  const minx = Math.min(...pts.map(p => p[0])), maxy = Math.max(...pts.map(p => p[1]));
  const maxx = Math.max(...pts.concat(pts2).map(p => p[0])), miny = Math.min(...pts.concat(pts2).map(p => p[1]));
  const sc = MAPSC;
  MAPW = Math.ceil((maxx - minx) * sc) + 10; MAPH = Math.ceil((maxy - miny) * sc) + 10;      // the map is exactly as big as the geography needs
  const GW = MAPW, GH = MAPH;
  const toGrid = (lo, la) => { const [x, y] = proj(lo, la); return [(x - minx) * sc + 5, (maxy - y) * sc + 5]; };
  const toGridA = (lo, la) => { const [x, y] = proj0(lo, la); return [(x - minx) * sc + 5, (maxy - y) * sc + 5]; };      // always the main projection
  const albInv = (x, y) => {                         // Albers plane -> [lat, lon]
    const dy = rho0 - y, rho = Math.sqrt(x * x + dy * dy), th = Math.atan2(x, dy);
    return [Math.asin((C - rho * rho * n * n) / (2 * n)) / rad, (l0 + th / n) / rad];
  };
  const inv = (gx, gy, cn) => {                      // grid cell -> [lat, lon], undoing the projection used for that country
    const x = (gx - 5) / sc + minx, y = maxy - (gy - 5) / sc;
    if (cn === 'SA') return [SA_INSET.lat0 + (y - say) / (SA_INSET.s * rad), SA_INSET.lon0 + (x - sax) / (SA_INSET.s * SA_INSET.cos * rad)];
    if (cn === 'EU') return [EU_INSET.lat0 + (y - eay) / (EU_INSET.s * rad), EU_INSET.lon0 + (x - eax) / (EU_INSET.s * EU_INSET.cos * rad)];
    if (cn === 'GL') return albInv((x - GLX.cx - GLX.dx) / GLX.s + GLX.cx, (y - GLX.cy - GLX.dy) / GLX.s + GLX.cy);
    return albInv(x, y);
  };
  const raster = poly => {
    const m = new Uint8Array(GW * GH), P = poly.map(([lo, la, a]) => a ? toGridA(lo, la) : toGrid(lo, la));
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
  const mNA = raster(NA), mUS = raster(OUTLINE), mAK = raster(ALASKA), mGL = (projMode = 'GL', raster(GREENLAND)), mHI = new Uint8Array(GW * GH), lake = new Uint8Array(GW * GH);
  const mSA = (projMode = 'SA', raster(SOUTH_AMERICA)), mEU = (projMode = 'EU', new Uint8Array(GW * GH));
  [EUROPE, ...EU_ISLANDS].forEach(pl => { const m = raster(pl); for (let i = 0; i < m.length; i++) if (m[i]) mEU[i] = 1; });
  projMode = false;
  HAWAII.forEach(pl => { const m = raster(pl); for (let i = 0; i < m.length; i++) if (m[i]) mHI[i] = 1; });
  ISLANDS.forEach(pl => { const m = raster(pl); for (let i = 0; i < m.length; i++) if (m[i]) mNA[i] = 1; });
  LAKES.forEach(l => { const m = raster(l); for (let i = 0; i < m.length; i++) if (m[i]) lake[i] = 1; });

  // land cells -> state / province / country (area weighted nearest anchor)
  const stateOf = new Int16Array(GW * GH).fill(-1), countyOf = new Int16Array(GW * GH).fill(-1), isLake = lake;
  const anchors = STATES.map(s => { projMode = (s[4] === 'GL' || s[4] === 'SA' || s[4] === 'EU') ? s[4] : false; const r = s[3].map(([la, lo]) => toGrid(lo, la)); projMode = false; return r; });
  const idxOf = f => STATES.map((s, i) => i).filter(i => f(STATES[i][4]));
  const hiIdx = STATES.findIndex(s => s[0] === 'HI');
  const pools = { US: idxOf(c => c === 'US').filter(i => i !== hiIdx), AK: idxOf(c => c === 'AK'), GL: idxOf(c => c === 'GL'), HI: [hiIdx], SA: idxOf(c => c === 'SA'), EU: idxOf(c => c === 'EU'),
    REST: idxOf(c => c !== 'US' && c !== 'AK' && c !== 'GL' && c !== 'SA' && c !== 'EU') };
  const stateCells = STATES.map(() => []);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x;
    const isAK = mAK[i] && !lake[i], isUS = mUS[i] && !lake[i], isOther = mNA[i] && !lake[i], isGL = mGL[i] && !isOther, isHI = mHI[i] && !isOther;
    const isSA = mSA[i] && !isOther && !isGL, isEU = mEU[i] && !isOther && !isGL && !isSA;
    if (!isAK && !isUS && !isOther && !isGL && !isHI && !isSA && !isEU) continue;
    const pool = isAK ? pools.AK : isUS ? pools.US : isHI ? pools.HI : isGL ? pools.GL : isSA ? pools.SA : isEU ? pools.EU : pools.REST;
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
    let cnt = Math.max(1, Math.min(26, Math.round(cells.length / (s[0] === 'HI' ? 140 : cn === 'GL' ? 330 : cn === 'SA' ? SA_DIV * (DIV_MUL[s[0]] || 1) : cn === 'EU' ? EU_DIV * (DIV_MUL[s[0]] || 1) : cn === 'US' ? 150 : (cn === 'MX' || cn === 'CM' || cn === 'CB') ? 170 : 270))));
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
    const [la, lo] = inv(c.gx + 0.5, c.gy + 0.5, c.country);
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
  // explicit links across water, made before the generic island bridging below so that bridging cannot glue Europe / South America to anything silly:
  // Europe is reached through Iceland <-> Greenland, and South America must touch Central America (Colombia <-> Panama)
  const seaLink = (fa, fb, onlyIfNone) => {
    const A = counties.filter(fa), B = counties.filter(fb); let best = null, bd = 1e9;
    if (onlyIfNone && [...set].some(k => { const [a, b] = k.split('-').map(Number); return (fa(counties[a]) && fb(counties[b])) || (fa(counties[b]) && fb(counties[a])); })) return;
    A.forEach(a => B.forEach(b => { const dd = Math.hypot(a.gx - b.gx, a.gy - b.gy); if (dd < bd) { bd = dd; best = [a.id, b.id]; } }));
    if (best) set.add(Math.min(best[0], best[1]) + '-' + Math.max(best[0], best[1]));
  };
  seaLink(c => c.country === 'GL', c => c.country === 'EU' && STATES[c.state][0] === 'IS');
  seaLink(c => c.country === 'CM', c => c.country === 'SA', true);
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
