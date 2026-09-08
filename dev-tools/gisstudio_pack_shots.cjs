// Render GIS Studio in a real browser with a custom region pack loaded.
//
//   node dev-tools/gisstudio_pack_shots.cjs [out-dir]
//
// Eighteen rounds of region-pack work were verified in jsdom against a stubbed
// Leaflet. That cannot see whether the real map draws, whether the graticule
// rewritten to scale with the region actually appears at city scale, or whether
// a pack's boundaries land where its places are. This mounts the shipped tool,
// loads Leaflet from the same CDN the tool uses, and screenshots the result.
//
// Map tiles are blocked deliberately. The graticule, markers and polygons are
// SVG drawn by Leaflet itself, so they render without tiles, and no viewport is
// reported to OpenStreetMap or Esri for a developer check.
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] || path.join('dev-tools', '.cache', 'gisstudio-shots'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const scripts = [
  read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
  read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
  read('stem_lab/stem_lab_module.js'),
  read('stem_lab/stem_tool_gisstudio.js')
];

const TILE_HOSTS = [/tile\.openstreetmap\.org/, /services\.arcgisonline\.com/, /basemaps\./];

// A city-scale pack: the old fixed 2-degree graticule drew nothing usable here.
const CITY_PACK = {
  format: 'alloflow-gis-region-pack',
  version: 1,
  id: 'custom-portland-neighbourhoods',
  label: 'Portland neighbourhoods',
  scope: 'Portland, Maine',
  description: 'Six neighbourhood reference points.',
  sourceNote: 'Illustrative values for a browser check.',
  defaultMetric: 'households',
  view: { center: [43.665, -70.265], zoom: 12 },
  coverage: { level: 'Six points', represented: ['Portland'], gaps: ['Everywhere else'], note: 'A browser check fixture.' },
  metrics: [
    { id: 'households', label: 'Households', unit: 'homes', maximumFractionDigits: 0 },
    { id: 'treecover', label: 'Tree cover', unit: '%', maximumFractionDigits: 1 }
  ],
  records: [
    { name: 'West End', lat: 43.6525, lon: -70.2712, households: 2400, treecover: 21 },
    { name: 'Bayside', lat: 43.6641, lon: -70.2585, households: 1800, treecover: 12 },
    { name: 'East Bayside', lat: 43.6672, lon: -70.2492, households: 1500, treecover: 15 },
    { name: 'Deering Center', lat: 43.6797, lon: -70.2884, households: 3100, treecover: 38 },
    { name: 'Riverton', lat: 43.7051, lon: -70.3128, households: 2200, treecover: 44 },
    { name: 'Munjoy Hill', lat: 43.6685, lon: -70.2418, households: 2600, treecover: 18 }
  ],
  boundaries: {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'Peninsula', density: 62 }, geometry: { type: 'Polygon', coordinates: [[[-70.278, 43.648], [-70.238, 43.648], [-70.238, 43.675], [-70.278, 43.675], [-70.278, 43.648]]] } },
      { type: 'Feature', properties: { name: 'Off peninsula', density: 24 }, geometry: { type: 'Polygon', coordinates: [[[-70.320, 43.672], [-70.276, 43.672], [-70.276, 43.712], [-70.320, 43.712], [-70.320, 43.672]]] } }
    ]
  }
};

const shell = `
window.__mountGIS = function (toolData) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  function Host() {
    var pair = React.useState(toolData || {});
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      update: function () {}, isDark: true, isContrast: false,
      gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function () {}, setStemLabTab: function () {}, setToolSnapshots: function () {},
      addToast: function () {}, announceToSR: function () {}, awardXP: function () {},
      beep: function () {}, celebrate: function () {}, canvasNarrate: function () {},
      canvasA11yDesc: function () {}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: 'gisStudio',
      toolSnapshots: [], props: {}, srOnly: {}, icons: Icons,
      a11yClick: function (f) { return { onClick: f }; },
      t: function (k, fallback) { return fallback != null ? fallback : k; },
      getXP: function () { return 0; },
      locale: 'en-US', language: 'English', dir: 'ltr'
    };
    return window.StemLab._registry.gisStudio.render(ctx);
  }
  var slot = document.getElementById('slot');
  ReactDOM.unmountComponentAtNode(slot);
  ReactDOM.render(React.createElement(Host), slot);
};
window.__gisMapStats = function () {
  var pane = document.querySelector('.leaflet-overlay-pane svg');
  var paths = pane ? pane.querySelectorAll('path') : [];
  var dashed = 0;
  paths.forEach(function (node) { if ((node.getAttribute('stroke-dasharray') || '').indexOf('4') === 0) dashed += 1; });
  return {
    leaflet: !!window.L,
    mapContainers: document.querySelectorAll('.leaflet-container').length,
    markers: document.querySelectorAll('.leaflet-marker-icon, .leaflet-interactive').length,
    overlayPaths: paths.length,
    graticuleLines: dashed,
    tooltips: document.querySelectorAll('.leaflet-tooltip').length
  };
};
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  const problems = [];
  const blocked = [];

  page.on('pageerror', (error) => problems.push('pageerror: ' + String((error && error.stack) || error).slice(0, 600)));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      const text = message.text();
      if (/Download the React DevTools|ReactDOM.render is no longer supported/.test(text)) return;
      // Blocked tile requests are this script's own doing, not a defect.
      if (/ERR_FAILED|Failed to load resource/.test(text)) return;
      problems.push(message.type() + ': ' + text.slice(0, 400));
    }
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (TILE_HOSTS.some((pattern) => pattern.test(url))) { blocked.push(url); return route.abort(); }
    return route.continue();
  });

  // A real origin, because localStorage is denied on about:blank and the tool
  // autosaves there. page.setContent alone made every draft path look broken.
  await page.route('https://gis-studio.test/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#06131f}#slot{min-height:100vh}</style></head><body><div id="slot"></div></body></html>'
  }));
  await page.goto('https://gis-studio.test/studio');
  for (const code of scripts.concat(shell)) await page.addScriptTag({ content: code });

  const shots = [
    { name: '01-city-pack-live-map', data: { gisTab: 'map', gisBasemap: 'street', gisCustomRegionPacks: [CITY_PACK], gisRegionPack: CITY_PACK.id }, live: true, grid: true },
    { name: '02-city-pack-schematic', data: { gisTab: 'map', gisBasemap: 'none', gisCustomRegionPacks: [CITY_PACK], gisRegionPack: CITY_PACK.id }, live: false },
    { name: '03-pack-loader', data: { gisTab: 'import', gisBasemap: 'none', gisCustomRegionPacks: [CITY_PACK], gisRegionPack: CITY_PACK.id }, live: false },
    { name: '04-generated-missions', data: { gisTab: 'missions', gisBasemap: 'none', gisCustomRegionPacks: [CITY_PACK], gisRegionPack: CITY_PACK.id }, live: false },
    { name: '05-maine-live-map', data: { gisTab: 'map', gisBasemap: 'street' }, live: true, grid: true }
  ];

  const stats = {};
  for (const shot of shots) {
    await page.evaluate((data) => window.__mountGIS(data), shot.data);
    if (shot.grid) {
      await page.waitForTimeout(300);
      const toggled = await page.evaluate(() => {
        const label = Array.from(document.querySelectorAll('label')).find((node) => node.textContent.trim().startsWith('Coordinate grid'));
        const box = label && label.querySelector('input[type="checkbox"]');
        if (!box) return false;
        box.click();
        return true;
      });
      if (!toggled) problems.push(shot.name + ': the Coordinate grid toggle was not found');
    }
    if (shot.live) {
      await page.waitForFunction(() => !!document.querySelector('.leaflet-container'), null, { timeout: 30000 }).catch(() => {
        problems.push(shot.name + ': the live map never mounted');
      });
      await page.waitForTimeout(2500);
    } else {
      await page.waitForTimeout(600);
    }
    stats[shot.name] = await page.evaluate(() => window.__gisMapStats());
    await page.screenshot({ path: path.join(OUT, shot.name + '.png'), fullPage: false, animations: 'disabled' });
    console.log(shot.name + ' ' + JSON.stringify(stats[shot.name]));
  }

  // A phone-sized pass over the pack loader, where the new controls live.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate((data) => window.__mountGIS(data), { gisTab: 'import', gisBasemap: 'none', gisCustomRegionPacks: [CITY_PACK], gisRegionPack: CITY_PACK.id });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '06-pack-loader-phone.png'), fullPage: true, animations: 'disabled' });
  const overflow = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  if (overflow.documentWidth > overflow.viewportWidth + 1) {
    problems.push('phone horizontal overflow: ' + JSON.stringify(overflow));
  }
  console.log('06-pack-loader-phone ' + JSON.stringify(overflow));

  await browser.close();
  console.log('blocked tile requests: ' + blocked.length);
  console.log('shots written to ' + OUT);
  if (problems.length) {
    console.error('\nPROBLEMS:\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log('no console errors, page errors, or overflow');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
