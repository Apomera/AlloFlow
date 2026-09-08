// Drive one complete GIS Studio investigation in a real browser.
//
//   node dev-tools/gisstudio_workflow_qa.cjs [out-dir]
//
// Every other check here renders a workspace, or a document, on its own. A
// teacher's actual path crosses all of them in sequence: load a region, pick up
// the mission it generates, prepare the workspace, read the analysis, write the
// evidence, compose the map, and export. State carried from one step poisons the
// next, which is how the boundary, selection and filter leaks were all found.
// This walks that path with real clicks and fails on any console error.
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] || path.join('dev-tools', '.cache', 'gisstudio-workflow'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const scripts = [
  read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
  read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
  read('stem_lab/stem_lab_module.js'),
  read('stem_lab/stem_tool_gisstudio.js')
];

const PACK_CSV = [
  'Ward,Latitude,Longitude,Households,Tree cover',
  'West End,43.6525,-70.2712,2400,21',
  'Bayside,43.6641,-70.2585,1800,12',
  'East Bayside,43.6672,-70.2492,1500,15',
  'Deering Center,43.6797,-70.2884,3100,38',
  'Riverton,43.7051,-70.3128,2200,44',
  'Munjoy Hill,43.6685,-70.2418,2600,18'
].join('\n');

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
window.__clickText = function (label, tag) {
  var nodes = Array.from(document.querySelectorAll(tag || 'button'));
  var hit = nodes.find(function (node) { return node.textContent.trim() === label; })
    || nodes.find(function (node) { return node.textContent.trim().indexOf(label) === 0; });
  if (!hit) return false;
  hit.click();
  return true;
};
window.__setField = function (labelText, value, selector) {
  var wrapper = Array.from(document.querySelectorAll('label')).find(function (node) { return node.textContent.indexOf(labelText) >= 0; });
  var field = wrapper && wrapper.querySelector(selector || 'input, textarea, select');
  if (!field) return false;
  var proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : (field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
  var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(field, value);
  field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  return true;
};
window.__text = function () { return document.body.innerText.replace(/\\s+/g, ' '); };
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  const problems = [];
  const steps = [];

  page.on('pageerror', (error) => problems.push('pageerror: ' + String((error && error.stack) || error).slice(0, 400)));
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const text = message.text();
    if (/Download the React DevTools|ReactDOM.render is no longer supported|unmountComponentAtNode is deprecated|ERR_FAILED|Failed to load resource/.test(text)) return;
    problems.push(message.type() + ': ' + text.slice(0, 300));
  });
  await page.route('**/*', (route) => (/tile\.openstreetmap|arcgisonline|unpkg\.com/.test(route.request().url()) ? route.abort() : route.continue()));

  // A real origin, because localStorage is denied on about:blank and the tool
  // autosaves there. page.setContent alone made every draft path look broken.
  await page.route('https://gis-studio.test/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#06131f}#slot{min-height:100vh}</style></head><body><div id="slot"></div></body></html>'
  }));
  await page.goto('https://gis-studio.test/studio');
  for (const code of scripts.concat(shell)) await page.addScriptTag({ content: code });
  await page.evaluate(() => window.__mountGIS({ gisTab: 'import', gisBasemap: 'none' }));
  await page.waitForTimeout(400);

  async function step(name, action, expectation) {
    const ok = await action();
    await page.waitForTimeout(450);
    const text = await page.evaluate(() => window.__text());
    const met = expectation ? expectation(text) : true;
    steps.push({ name, acted: !!ok, met });
    if (!ok) problems.push('step "' + name + '" could not act');
    else if (!met) problems.push('step "' + name + '" acted but the result was missing');
    console.log((ok && met ? 'ok   ' : 'FAIL ') + name);
    return ok && met;
  }

  // 1. Build a region from a pasted CSV, name it, and adopt it.
  await step('paste a region CSV', () => page.evaluate((csv) => window.__setField('Or paste region rows', csv, 'textarea'), PACK_CSV));
  await step('name the pack', () => page.evaluate(() => window.__setField('Pack name', 'Portland wards')));
  await step('preview the pasted region', () => page.evaluate(() => window.__clickText('Preview pasted region')),
    (text) => text.includes('Review before using') && text.includes('6 places'));
  await step('adopt the pack', () => page.evaluate(() => window.__clickText('Use this pack')),
    (text) => text.includes('Portland wards'));

  // 2. Take the mission the pack generated and let it prepare the workspace.
  await step('open the generated missions', () => page.evaluate(() => window.__clickText('Guided missions')),
    (text) => text.includes('INQUIRY SERIES') && text.includes('Households and Tree cover'));
  await step('prepare the comparison mission', () => page.evaluate(() => window.__clickText('Prepare and open comparison maps')),
    (text) => text.includes('Synchronized map comparison'));

  // 3. Read the evidence the tool offers for that mission.
  await step('return to the map', () => page.evaluate(() => window.__clickText('Map + layers')),
    (text) => text.includes('Layer workspace') && text.includes('Deering Center'));
  await step('sort the table by value', () => page.evaluate(() => window.__setField('Sort table rows', 'value-asc', 'select')),
    (text) => text.includes('mapped records shown'));

  // 4. Compose the map that gets handed in.
  await step('open the composer', () => page.evaluate(() => window.__clickText('Map Composer')),
    (text) => text.includes('Evidence annotations'));
  await step('title the map', () => page.evaluate(() => window.__setField('Map title', 'Households across Portland wards')));
  await step('describe the map', () => page.evaluate(() => window.__setField('Map description', 'Six Portland wards shaded by household count, highest in Deering Center and lowest in East Bayside.', 'textarea')));
  await step('add a callout', async () => {
    await page.evaluate(() => window.__setField('Callout text', 'Densest ward'));
    await page.evaluate(() => window.__setField('Latitude', '43.6797'));
    await page.evaluate(() => window.__setField('Longitude', '-70.2884'));
    return page.evaluate(() => window.__clickText('Add callout'));
  }, (text) => text.includes('Densest ward'));

  // 5. The quality review the teacher reads before accepting the work.
  await step('open the quality review', () => page.evaluate(() => window.__clickText('Quality Review')),
    (text) => text.includes('Evidence readiness'));

  const finalState = await page.evaluate(() => ({
    announcements: window.__announcements.length,
    lastAnnouncement: window.__announcements[window.__announcements.length - 1] || '',
    packs: (window.__toolData.gisCustomRegionPacks || []).length,
    activePack: window.__toolData.gisRegionPack,
    composerTitle: (window.__toolData.gisComposer || {}).title,
    annotations: ((window.__toolData.gisComposer || {}).annotations || []).length,
    missionProgress: Object.keys(window.__toolData.gisMissionProgress || {})
  }));
  console.log('\nfinal state: ' + JSON.stringify(finalState));
  if (finalState.packs !== 1) problems.push('expected exactly one saved pack, got ' + finalState.packs);
  if (!/^custom-portland-wards/.test(String(finalState.activePack))) problems.push('the adopted pack is not active: ' + finalState.activePack);
  if (finalState.annotations !== 1) problems.push('the callout was not saved');
  if (!finalState.missionProgress.length) problems.push('mission progress was not recorded');
  if (finalState.announcements < 5) problems.push('only ' + finalState.announcements + ' screen-reader announcements across the whole workflow');

  await page.screenshot({ path: path.join(OUT, 'workflow-end.png'), fullPage: true, animations: 'disabled' });
  await browser.close();

  const failed = steps.filter((s) => !s.acted || !s.met).length;
  console.log('\nsteps: ' + steps.length + ', failed: ' + failed);
  console.log('screenshot: ' + path.join(OUT, 'workflow-end.png'));
  if (problems.length) {
    console.error('\nPROBLEMS:\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log('the whole investigation ran with no console errors');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
