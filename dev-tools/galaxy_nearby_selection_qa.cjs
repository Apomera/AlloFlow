// Real WebGL checks for bounded screen-overlap browsing and close-up continuity.
// Run: node dev-tools/galaxy_nearby_selection_qa.cjs [--motion] [--ui|--reset-audit]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-nearby-selection-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start)).replace('var pair = React.useState({ galaxy: state });', 'var pair = React.useState({ galaxy: state }); window.__galaxyState = pair[0].galaxy;');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-5, why + ': ' + a + ' vs ' + b);
const samePoint = (a, b, why) => ['x', 'y', 'z'].forEach(axis => near(a[axis], b[axis], why + ' ' + axis));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const motion = process.argv.includes('--motion'), ui = process.argv.includes('--ui'), resetAudit = process.argv.includes('--reset-audit');
  const reportName = resetAudit ? (motion ? 'reset-motion-results.json' : 'reset-results.json') : (motion ? 'motion-results.json' : 'browser-results.json');
  const result = { browser: executablePath || 'Playwright Chromium', starCount: 5000, reducedMotion: !motion, errors: [], layouts: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: motion ? 'no-preference' : 'reduce' });
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      const Camera = THREE.PerspectiveCamera; THREE.PerspectiveCamera = function (...args) { const camera = new Camera(...args); window.__camera = camera; return camera; };
      window.__auditTime = Date.now(); Date.now = () => window.__auditTime;
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false }));
    await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyCycleNearby, null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const step = async ms => { await page.evaluate(ms => window.__auditTime += ms, ms); await settle(); };
    const view = () => canvas.evaluate(canvas => ({ ...canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, selectedIndex: canvas._galaxyGetSelectionVisualState().selectedIndex }));
    const cycle = async direction => { assert(await canvas.evaluate((canvas, direction) => canvas._galaxyCycleNearby(direction), direction)); await settle(); };
    await canvas.scrollIntoViewIfNeeded(); await step(1000);
    const crowded = await canvas.evaluate(canvas => {
      const rect = canvas.getBoundingClientRect(), camera = window.__camera; camera.updateMatrixWorld(true);
      const center = new THREE.Vector3(0, 0, 0).project(camera), localX = (center.x + 1) * rect.width / 2, localY = (1 - center.y) * rect.height / 2;
      const hits = [];
      for (let index = 0; index < 5000; index++) {
        const state = canvas._galaxyGetStarVisualState(index), p = new THREE.Vector3(state.animated.x, state.animated.y, state.animated.z).project(camera);
        const distance = Math.hypot((p.x + 1) * rect.width / 2 - localX, (1 - p.y) * rect.height / 2 - localY);
        if (p.x >= -1 && p.x <= 1 && p.y >= -1 && p.y <= 1 && p.z >= -1 && p.z <= 1 && distance < 12) hits.push(index);
      }
      return { x: rect.x + localX, y: rect.y + localY, hits };
    });
    assert(crowded.hits.length > 12, 'Real projected core contains more than twelve overlapping selectable stars');
    await page.mouse.click(crowded.x, crowded.y); await settle();
    const first = await view(), indices = [first.selectedIndex];
    assert.equal(first.kind, 'star'); assert.equal(first.nearbyCount, 12); assert.equal(first.nearbyIndex, 0); assert.equal(first.nearbyTotal, crowded.hits.length);
    if (resetAudit) {
      await canvas.evaluate(canvas => { canvas._galaxyOrbit.theta = 0.8; canvas._galaxyOrbit.phi = 0.65; canvas._galaxySetZoomPosition(65); });
      const before = await canvas.evaluate(canvas => ({ home: canvas._galaxyOverviewRadius, r: canvas._galaxyOrbit.r, theta: canvas._galaxyOrbit.theta, phi: canvas._galaxyOrbit.phi, height: canvas.clientHeight }));
      await canvas.evaluate(canvas => canvas._galaxyResetView()); await settle(); await step(1000); await settle();
      const after = await canvas.evaluate(canvas => ({ home: canvas._galaxyOverviewRadius, r: canvas._galaxyOrbit.r, height: canvas.clientHeight }));
      result.resetAfterCrowdedSelection = { before, after }; near(after.r, after.home, 'Reset follows the current overview as the nearby dock disappears');
      await canvas.evaluate(canvas => canvas._galaxyUndoReset()); await step(120);
      if (motion) {
        const during = (await view()).camera;
        await page.setViewportSize({ width: 820, height: 1050 }); await settle();
        samePoint((await view()).camera, during, 'Undo stays continuous while its responsive destination changes');
      }
      await step(600);
      const undo = await canvas.evaluate(canvas => ({ home: canvas._galaxyOverviewRadius, ...canvas._galaxyOrbit }));
      near(undo.r / undo.home, before.r / before.home, 'Undo restores relative zoom at the current aspect'); near(undo.theta, before.theta, 'Undo restores azimuth'); near(undo.phi, before.phi, 'Undo restores inclination');
      result.undoRelativeFraming = true;
      assert.deepEqual(result.errors, []); fs.writeFileSync(path.join(OUT, reportName), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result)); return;
    }
    for (let index = 1; index < 12; index++) { await cycle(1); const state = await view(); assert.equal(state.nearbyIndex, index); assert(crowded.hits.includes(state.selectedIndex)); indices.push(state.selectedIndex); }
    assert.equal(new Set(indices).size, 12); await cycle(1); assert.equal((await view()).selectedIndex, first.selectedIndex); await cycle(-1); assert.equal((await view()).selectedIndex, indices.at(-1));
    result.crowdedPoint = { total: first.nearbyTotal, browsable: first.nearbyCount, distinct: indices.length, wrapsBothDirections: true };
    if (ui) {
      await page.locator('[data-galaxy-nearby-next]').click(); await settle(); assert.equal((await view()).nearbyIndex, 0);
      await canvas.focus(); await page.keyboard.press(']'); await settle(); assert.equal((await view()).nearbyIndex, 1);
      await page.keyboard.press('['); await settle(); assert.equal((await view()).nearbyIndex, 0);
      assert((await page.locator('[data-galaxy-nearby-status]').innerText()).includes(String(first.nearbyTotal)), 'Visible status discloses the full overlap count');
    }
    const original = (await view()).orbit;
    await canvas.evaluate(canvas => canvas._galaxyInspectSelection()); await step(1000);
    await canvas.evaluate(canvas => { canvas._galaxyOrbit.theta = 0.6; canvas._galaxyOrbit.phi = 0.7; canvas._galaxySetZoomPosition(65); }); await settle();
    const before = await view(); await cycle(1); const immediate = await view();
    assert.equal(immediate.active, true); assert.deepEqual(immediate.orbit, before.orbit);
    if (motion) samePoint(immediate.camera, before.camera, 'A new object begins at the current camera position');
    await step(1000);
    let live = await view(), animated = await canvas.evaluate((canvas, index) => canvas._galaxyGetStarVisualState(index).animated, live.selectedIndex);
    samePoint(live.orbitCenter, animated, 'Close-up reaches the actual animated new object');
    await step(180000); live = await view(); animated = await canvas.evaluate((canvas, index) => canvas._galaxyGetStarVisualState(index).animated, live.selectedIndex); samePoint(live.orbitCenter, animated, 'Close-up follows the live moving star');
    await canvas.evaluate(canvas => canvas._galaxyExitInspection()); await settle(); assert.deepEqual((await view()).orbit, original);
    result.inspection = { retainsScaleAndAngles: true, tracksMovingTarget: true, originalReturnFramePreserved: true, transitionContinuous: motion };
    if (ui) {
      await canvas.evaluate(canvas => canvas._galaxyInspectSelection()); await step(1000);
      for (const width of [1440, 820, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1050 }); await settle(); await settle(); await canvas.scrollIntoViewIfNeeded();
        const layout = await page.evaluate(() => {
          const canvas = document.querySelector('[data-galaxy-canvas]'), dock = document.querySelector('[data-galaxy-selection-dock]'), a = dock.getBoundingClientRect();
          const measurements = [...document.querySelectorAll('[data-galaxy-measurement],[data-galaxy-measurement-mobile]')].filter(node => { const rect = node.getBoundingClientRect(); return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0; }).map(node => node.getBoundingClientRect());
          const selected = canvas._galaxyGetSelectionVisualState().marker, camera = window.__camera, rect = canvas.getBoundingClientRect(); camera.updateMatrixWorld(true);
          const p = new THREE.Vector3(selected.x, selected.y, selected.z).project(camera), reticleX = rect.x + (p.x + 1) * rect.width / 2, reticleY = rect.y + (1 - p.y) * rect.height / 2;
          return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, overlaps: measurements.some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top), measurementCoversReticle: measurements.some(b => Math.hypot(reticleX - Math.max(b.left, Math.min(b.right, reticleX)), reticleY - Math.max(b.top, Math.min(b.bottom, reticleY))) < 31), measurements: measurements.length, reticleClearance: a.top - reticleY, controls: [...dock.querySelectorAll('[data-galaxy-nearby-previous],[data-galaxy-nearby-next]')].map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })) };
        });
        result.layouts.push(layout);
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'nearby-' + width + '.png'), animations: 'disabled' });
      }
      for (const layout of result.layouts) { assert.equal(layout.overflow, false); assert.equal(layout.overlaps, false); assert.equal(layout.measurementCoversReticle, false, 'Selected reticle remains clear of measurements at width ' + layout.width); assert.equal(layout.controls.length, 2); assert(layout.reticleClearance >= 31, 'Selected reticle stays entirely above the dock at width ' + layout.width); layout.controls.forEach(size => assert(size.width >= 44 && size.height >= 44)); }
    }
    await canvas.evaluate(canvas => canvas._setObserveMode('infrared')); await settle(); assert.equal((await view()).nearbyCount, 0); assert.equal((await view()).canInspect, true);
    await canvas.evaluate(canvas => canvas._galaxyInspectSelection()); await step(1000); const closeup = (await view()).orbit;
    await canvas.evaluate(canvas => canvas._galaxyCycleStar(1)); await step(1000); assert.equal((await view()).active, true); assert.deepEqual((await view()).orbit, closeup);
    await canvas.evaluate(canvas => canvas._galaxyCycleNebula(1)); await step(1000); assert.equal((await view()).kind, 'nebula'); assert.equal((await view()).active, true); assert.deepEqual((await view()).orbit, closeup);
    await canvas.evaluate(canvas => canvas._galaxyResetView()); await step(1000); assert.equal((await view()).canInspect, false); assert.equal((await view()).nearbyCount, 0);
    result.filtersClearListPreserveObject = true; result.catalogBrowsingKeepsCloseup = true;
    assert.deepEqual(result.errors, []);
    fs.writeFileSync(path.join(OUT, reportName), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
  } catch (error) {
    result.failure = String(error.stack || error); fs.writeFileSync(path.join(OUT, reportName), JSON.stringify(result, null, 2) + '\n'); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
