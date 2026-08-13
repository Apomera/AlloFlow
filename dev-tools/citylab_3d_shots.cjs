// Drive the REAL orbit viewer against REAL WebGL in a real browser.
// Three r128 is preloaded from the repo's pinned vendor copy, because
// ensureThree falls back to a CDN and a headless run has no network: without
// the preload this would silently take the no-WebGL path and prove nothing.
// Usage: node dev-tools/citylab_3d_shots.cjs   (writes PNGs to CITYLAB_SHOT_DIR or the temp dir)
//
// Renders the City Planning Lab 3D view against REAL WebGL and writes screenshots.
// Three r128 is preloaded from the repo's pinned vendor copy on purpose: ensureThree
// falls back to a CDN, and a headless run has no network, so without the preload this
// silently takes the no-WebGL path and proves nothing.
//
// This exists because two real defects in the 3D view were invisible to every jsdom
// test and to SSR: the scene rendered as a correct silhouette in total black because
// makeOrbitViewer does not add lights, and the translucent surge sheet failed to show
// which ground was submerged. Neither is detectable without a picture.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.CITYLAB_SHOT_DIR || require('os').tmpdir();
const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));

const THREE_SRC = fs.readFileSync(path.join(ROOT, 'vendor/three-r128/three.min.js'), 'utf8');
const MODULE_SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');
const TOOL_SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_citylab.js'), 'utf8');

// Build the plans in node, hand them to the page as data.
global.window = {};
new Function('window', TOOL_SRC)(global.window);
const P = global.window.__alloCityLabPure;
const useAll = (p, i, u) => i.reduce((a, x) => P.setUse(a, x, u), p);
const giAll = (p, i) => i.reduce((a, x) => P.toggleGreenInfra(a, x), p);
const roadAll = (p, pp) => pp.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), p);
const grid = (cols, rows) => {
  const pp = [];
  rows.forEach(r => { for (let i = 0; i < cols.length - 1; i++) pp.push([cols[i] + r, cols[i + 1] + r]); });
  cols.forEach(c => { for (let i = 0; i < rows.length - 1; i++) pp.push([c + rows[i], c + rows[i + 1]]); });
  return pp;
};
const homes = ['A1','B1','C1','D1','E1','F1','A5','B5','C5','A6','B6','A7'];
let coastal = useAll(P.basePlan('harborlight'), homes, 'mixed');
coastal = giAll(coastal, homes);
coastal = useAll(coastal, ['B3','B4'], 'park');
const spine = []; for (let r = 1; r <= 7; r++) spine.push(['A' + r, 'A' + (r + 1)]);
coastal = roadAll(coastal, grid(['A','B','C','D','E','F'],[1,2])
  .concat(spine, grid(['A','B','C'],[5,6]), [['B2','B3'],['B3','B4'],['A7','B7']]));

const rbHomes = [];
['A','B','C'].forEach(c => [9,10,11,12].forEach(r => rbHomes.push(c + r)));
let river = useAll(P.basePlan('riverbend'), rbHomes, 'mixed');
river = giAll(river, rbHomes);
river = useAll(river, ['D10','D12'], 'park');
river = roadAll(river, grid(['A','B','C','D'],[9,10,11,12]).concat([['C8','C9']]));

const SHOTS = [
  { name: '3d-harborlight-optimistic', plan: coastal, set: 'optimistic', cam: { rotY: 34, rotX: 26, zoom: 1 } },
  { name: '3d-harborlight-conservative', plan: coastal, set: 'conservative', cam: { rotY: 34, rotX: 26, zoom: 1 } },
  { name: '3d-harborlight-low', plan: coastal, set: 'conservative', cam: { rotY: 20, rotX: 6, zoom: 1 } },
  { name: '3d-riverbend', plan: river, set: 'central', cam: { rotY: 40, rotX: 30, zoom: 1 } }
];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 620 }, deviceScaleFactor: 2 });
  page.on('console', m => { if (m.type() === 'error') console.log('  [page error]', m.text().slice(0, 160)); });

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#0b1220}
    #bay{position:absolute;inset:0}
  </style></head><body><div id="bay"></div></body></html>`, { waitUntil: 'load' });

  await page.addScriptTag({ content: THREE_SRC });
  await page.addScriptTag({ content: MODULE_SRC });
  await page.addScriptTag({ content: TOOL_SRC });

  const ready = await page.evaluate(() => ({
    three: !!window.THREE,
    stemLab: !!window.StemLab,
    orbit: typeof (window.StemLab || {}).makeOrbitViewer,
    pure: typeof (window.__alloCityLabPure || {}).buildCityScene,
    webgl: (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } })()
  }));
  console.log('page readiness:', JSON.stringify(ready));
  if (!ready.three || ready.orbit !== 'function' || ready.pure !== 'function' || !ready.webgl) {
    console.error('FAILED: harness preconditions not met');
    await browser.close();
    process.exit(1);
  }

  await page.evaluate(() => {
    window.__v = window.StemLab.makeOrbitViewer({
      home: { yaw: 0, pitch: 0, dist: 1 },
      build: window.__alloCityLabPure.buildCityScene
    });
    window.__status = [];
    window.__v.onStatusChange(s => window.__status.push(s));
    window.__v.attach(document.getElementById('bay'));
  });

  for (const s of SHOTS) {
    const massing = P.buildMassing(s.plan, s.set, 'F8');
    await page.evaluate(({ massing, cam, sig }) => {
      window.__v.push({ sig, massing, rotY: cam.rotY, rotX: cam.rotX, zoom: cam.zoom, dark: true, static: true });
    }, { massing, cam: s.cam, sig: s.name });
    await page.waitForFunction(() => window.__v.status() === 'ready', null, { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    console.log('wrote', s.name + '.png',
      'ground', massing.ground.length, 'buildings', massing.buildings.length,
      'sheets', massing.sheets.length);
  }

  const dbg = await page.evaluate(() => ({ status: window.__v.status(), seen: window.__status, debug: window.__v.debug() }));
  console.log('viewer:', JSON.stringify(dbg));
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
