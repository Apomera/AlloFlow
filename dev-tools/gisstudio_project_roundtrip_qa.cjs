// Save a GIS Studio project and open it again, in a real browser.
//
//   node dev-tools/gisstudio_project_roundtrip_qa.cjs [out-dir]
//
// The project file is how a learner's work survives the end of a lesson. Its
// format grew a great deal here: custom region packs, their boundaries, coverage
// notes, generated-mission progress, composer callouts. Unit tests check that
// the document validates; nothing has ever saved one from the real interface and
// opened it again to see what comes back.
//
// This builds a project through the UI, captures the file the download would
// have written, mounts the tool fresh, opens that file, and compares what is on
// screen and in state against what was saved.
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] || path.join('dev-tools', '.cache', 'gisstudio-roundtrip'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const scripts = [
  read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
  read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
  read('stem_lab/stem_lab_module.js'),
  read('stem_lab/stem_tool_gisstudio.js')
];

const PACK = {
  format: 'alloflow-gis-region-pack',
  version: 1,
  label: 'Harbour wards',
  scope: 'Portland, Maine',
  sourceNote: 'City open data, 2024.',
  coverage: { level: 'Three wards', represented: ['West End', 'Bayside', 'Munjoy Hill'], gaps: ['Off-peninsula wards'], note: 'Three wards do not describe the city.' },
  metrics: [
    { id: 'households', label: 'Households', unit: 'homes' },
    { id: 'treecover', label: 'Tree cover', unit: '%' }
  ],
  records: [
    { name: 'West End', lat: 43.6525, lon: -70.2712, households: 2400, treecover: 21 },
    { name: 'Bayside', lat: 43.6641, lon: -70.2585, households: 1800, treecover: 12 },
    { name: 'Munjoy Hill', lat: 43.6685, lon: -70.2418, households: 2600, treecover: 18 }
  ],
  boundaries: {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { name: 'Peninsula', density: 62 }, geometry: { type: 'Polygon', coordinates: [[[-70.278, 43.648], [-70.238, 43.648], [-70.238, 43.675], [-70.278, 43.675], [-70.278, 43.648]]] } }]
  }
};

const shell = `
window.__mountGIS = function (toolData) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  window.__announcements = [];
  function Host() {
    var pair = React.useState(toolData || {});
    window.__toolData = pair[0];
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      update: function () {}, isDark: true, isContrast: false,
      gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function () {}, setStemLabTab: function () {}, setToolSnapshots: function () {},
      addToast: function () {}, awardXP: function () {},
      announceToSR: function (text) { window.__announcements.push(String(text)); },
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
// The tool downloads by making a blob URL and clicking a link. Keep the text.
window.__captureDownloads = function () {
  window.__saved = [];
  var realCreate = URL.createObjectURL;
  URL.createObjectURL = function (blob) {
    try { blob.text().then(function (text) { window.__saved.push(text); }); } catch (e) { /* not a blob */ }
    return realCreate.call(URL, blob);
  };
};
window.__clickText = function (label, tag) {
  var nodes = Array.from(document.querySelectorAll(tag || 'button'));
  var hit = nodes.find(function (n) { return n.textContent.trim() === label; })
    || nodes.find(function (n) { return n.textContent.trim().indexOf(label) === 0; });
  if (!hit) return false;
  hit.click();
  return true;
};
window.__setField = function (labelText, value, selector) {
  var wrapper = Array.from(document.querySelectorAll('label')).find(function (n) { return n.textContent.indexOf(labelText) >= 0; });
  var field = wrapper && wrapper.querySelector(selector || 'input, textarea, select');
  if (!field) return false;
  var proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : (field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value);
  field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  return true;
};
window.__loadFileInto = function (labelText, name, text, type) {
  var wrapper = Array.from(document.querySelectorAll('label')).find(function (n) { return n.textContent.indexOf(labelText) >= 0; });
  var input = wrapper && wrapper.querySelector('input[type=file]');
  if (!input) return false;
  var file = new File([text], name, { type: type || 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};
window.__text = function () { return document.body.innerText.replace(/\\s+/g, ' '); };
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  const problems = [];

  page.on('pageerror', (error) => problems.push('pageerror: ' + String((error && error.stack) || error).slice(0, 400)));
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const text = message.text();
    if (/DevTools|ReactDOM.render is no longer|unmountComponentAtNode is deprecated|ERR_FAILED|Failed to load resource/.test(text)) return;
    problems.push(message.type() + ': ' + text.slice(0, 300));
  });
  await page.route('**/*', (route) => (/tile\.openstreetmap|arcgisonline|unpkg\.com/.test(route.request().url()) ? route.abort() : route.continue()));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#06131f}#slot{min-height:100vh}</style></head><body><div id="slot"></div></body></html>');
  for (const code of scripts.concat(shell)) await page.addScriptTag({ content: code });
  await page.evaluate(() => window.__captureDownloads());

  // ---- Build a project through the interface ----
  await page.evaluate(() => window.__mountGIS({ gisTab: 'import', gisBasemap: 'none' }));
  await page.waitForTimeout(400);
  const loadedPack = await page.evaluate((pack) => window.__loadFileInto('Region pack file', 'wards.gispack.json', JSON.stringify(pack)), PACK);
  if (!loadedPack) problems.push('the region pack file input was not found');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__clickText('Use this pack'));
  await page.waitForTimeout(700);

  await page.evaluate(() => window.__clickText('Map Composer'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__setField('Map title', 'Households in the harbour wards'));
  await page.evaluate(() => window.__setField('Map description', 'Three harbour wards shaded by household count, highest in Munjoy Hill.', 'textarea'));
  await page.evaluate(() => window.__setField('Callout text', 'Densest ward'));
  await page.evaluate(() => window.__setField('Latitude', '43.6685'));
  await page.evaluate(() => window.__setField('Longitude', '-70.2418'));
  await page.evaluate(() => window.__clickText('Add callout'));
  await page.waitForTimeout(400);

  await page.evaluate(() => window.__clickText('Project'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__setField('Project name', 'Harbour ward study'));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => ({
    packs: (window.__toolData.gisCustomRegionPacks || []).length,
    activePack: window.__toolData.gisRegionPack,
    annotations: ((window.__toolData.gisComposer || {}).annotations || []).length,
    composerTitle: (window.__toolData.gisComposer || {}).title
  }));

  await page.evaluate(() => window.__clickText('Download project file'));
  await page.waitForTimeout(900);
  const saved = await page.evaluate(() => (window.__saved || []).filter((text) => text.indexOf('alloflow-gis-studio-project') >= 0));
  if (!saved.length) {
    problems.push('no project file was produced by the download control');
  } else {
    fs.writeFileSync(path.join(OUT, 'saved-project.json'), saved[saved.length - 1], 'utf8');
  }
  const file = saved[saved.length - 1] || '{}';
  const parsed = JSON.parse(file);
  console.log('saved project: ' + JSON.stringify({
    title: parsed.title,
    packs: (parsed.data && parsed.data.customRegionPacks || []).length,
    packBoundaries: !!(parsed.data && (parsed.data.customRegionPacks || [])[0] || {}).boundaries,
    annotations: (parsed.work && parsed.work.composer && parsed.work.composer.annotations || []).length,
    regionPack: parsed.settings && parsed.settings.regionPack,
    provenanceSource: parsed.provenance && parsed.provenance.source
  }));

  // ---- Open it in a fresh mount ----
  await page.evaluate(() => window.__mountGIS({ gisTab: 'project', gisBasemap: 'none' }));
  await page.waitForTimeout(500);
  const freshText = await page.evaluate(() => window.__text());
  if (freshText.includes('Harbour wards')) problems.push('the fresh mount already knew the pack, so the reopen proves nothing');

  const opened = await page.evaluate((text) => window.__loadFileInto('Open GIS Studio project', 'study.gisstudio.json', text), file);
  if (!opened) problems.push('the project file input was not found');
  await page.waitForTimeout(1100);

  const after = await page.evaluate(() => ({
    packs: (window.__toolData.gisCustomRegionPacks || []).length,
    activePack: window.__toolData.gisRegionPack,
    annotations: ((window.__toolData.gisComposer || {}).annotations || []).length,
    composerTitle: (window.__toolData.gisComposer || {}).title,
    projectLoaded: !!window.__toolData.gisProjectLoaded,
    announcements: window.__announcements.slice(-2)
  }));
  console.log('before save: ' + JSON.stringify(before));
  console.log('after open:  ' + JSON.stringify(after));

  if (!after.projectLoaded) problems.push('the project did not report itself as opened');
  if (after.packs !== before.packs) problems.push('region packs did not survive the round trip: ' + before.packs + ' saved, ' + after.packs + ' restored');
  if (after.activePack !== before.activePack) problems.push('the active region changed across the round trip: ' + before.activePack + ' -> ' + after.activePack);
  if (after.annotations !== before.annotations) problems.push('composer callouts did not survive: ' + before.annotations + ' -> ' + after.annotations);
  if (after.composerTitle !== before.composerTitle) problems.push('the map title did not survive: ' + JSON.stringify(before.composerTitle) + ' -> ' + JSON.stringify(after.composerTitle));

  // What a learner sees after reopening, not just what state holds.
  await page.evaluate(() => window.__clickText('Map + layers'));
  await page.waitForTimeout(700);
  const mapText = await page.evaluate(() => window.__text());
  for (const expected of ['Harbour wards', 'Munjoy Hill', 'Households']) {
    if (!mapText.includes(expected)) problems.push('after reopening, the map workspace is missing: ' + expected);
  }
  if (!mapText.includes('Peninsula')) problems.push('after reopening, the pack boundaries are not on the map');
  await page.screenshot({ path: path.join(OUT, 'reopened-map.png'), fullPage: true, animations: 'disabled' });

  // ---- Switch away and back, which is what the host does between tools ----
  // The tool remounts from ctx.toolData, so anything the reopen did not persist
  // there is gone even though it was on screen a moment ago.
  const carried = await page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData || {})));
  await page.evaluate((data) => window.__mountGIS(data), carried);
  await page.waitForTimeout(800);
  const remounted = await page.evaluate(() => ({
    activePack: window.__toolData.gisRegionPack,
    packs: (window.__toolData.gisCustomRegionPacks || []).length,
    onScreen: window.__text().slice(0, 0) || undefined,
    showsPack: window.__text().includes('Harbour wards'),
    showsWard: window.__text().includes('Munjoy Hill')
  }));
  console.log('after a remount from carried tool data: ' + JSON.stringify(remounted));
  if (!remounted.showsPack || !remounted.showsWard) {
    problems.push('after switching away and back, the opened project is gone: ' + JSON.stringify(remounted));
  }

  await browser.close();
  console.log('\nwritten to ' + OUT);
  if (problems.length) {
    console.error('\nPROBLEMS:\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log('the project saved and reopened with everything intact');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
