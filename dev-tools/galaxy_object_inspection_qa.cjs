// Real WebGL checks for object-centered orbiting, accessible selection and return.
// Run: node dev-tools/galaxy_object_inspection_qa.cjs
// Native gestures and moving-target transition: add --gestures.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-object-inspection-2026-10-18');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shellStart = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shellEnd = core.indexOf('`;\n\n(async', shellStart);
assert(shellStart > 0 && shellEnd > shellStart);
const shell = core.slice(shellStart, shellEnd).replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (a, b, message) => assert(Math.abs(a - b) < 1e-5, message + ': ' + a + ' vs ' + b);
const pointNear = (a, b, message) => ['x', 'y', 'z'].forEach(axis => near(a[axis], b[axis], message + ' ' + axis));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { browser: executablePath || 'Playwright Chromium', starCount: 5000, errors: [], layouts: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: process.argv.includes('--gestures') ? 'no-preference' : 'reduce', deviceScaleFactor: 1 });
    page.on('pageerror', error => results.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') results.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.evaluate(() => { let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    if (process.argv.includes('--gestures')) await page.evaluate(() => {
      // Retain the actual Three camera solely to project a live rendered star.
      const Camera = THREE.PerspectiveCamera;
      THREE.PerspectiveCamera = function (...args) { const camera = new Camera(...args); window.__auditGalaxyCamera = camera; return camera; };
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = () => page.evaluate(() => window.__galaxyState);
    const inspection = () => page.locator('[data-galaxy-canvas]').evaluate(canvas => canvas._galaxyGetInspectionState());
    const orbit = () => page.locator('[data-galaxy-canvas]').evaluate(canvas => ({ ...canvas._galaxyOrbit }));
    const canvas = page.locator('[data-galaxy-canvas]');
    const act = async selector => { await page.locator(selector).click(); await settle(); };
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false }));
    await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyInspectSelection, null, { timeout: 60000 });
    if (process.argv.includes('--gestures')) {
      await canvas.scrollIntoViewIfNeeded(); await settle();
      const point = await canvas.evaluate(canvas => {
        const camera = window.__auditGalaxyCamera, box = canvas.getBoundingClientRect();
        camera.updateMatrixWorld(true);
        for (let index = 100; index < 2000; index++) {
          const star = canvas._galaxyGetStarVisualState(index), position = new THREE.Vector3(star.animated.x, star.animated.y, star.animated.z).project(camera);
          if (position.z >= -1 && position.z <= 1 && position.x > 0.12 && position.x < 0.6 && Math.abs(position.y) < 0.35) return { x: box.x + (position.x + 1) * box.width / 2, y: box.y + (1 - position.y) * box.height / 2 };
        }
        return null;
      });
      assert(point, 'A rendered star is available for native picking');
      await page.mouse.dblclick(point.x, point.y); await settle();
      assert.equal((await inspection()).active, true, 'Native double-click selects and inspects the first pick');
      assert.equal((await inspection()).kind, 'star');
      await page.waitForFunction(() => Math.abs(document.querySelector('[data-galaxy-canvas]')._galaxyOrbit.r - 0.3) < 0.0001, null, { timeout: 5000 });
      const selected = await canvas.evaluate(canvas => canvas._galaxyGetSelectionVisualState().selectedIndex);
      const assertTracking = async () => {
        const values = await canvas.evaluate(canvas => ({ inspected: canvas._galaxyGetInspectionState(), rendered: canvas._galaxyGetStarVisualState(canvas._galaxyGetSelectionVisualState().selectedIndex).animated, radius: canvas._galaxyOrbit.r }));
        pointNear(values.inspected.orbitCenter, values.rendered, 'Inspection follows rendered moving star');
        near(Math.hypot(...['x', 'y', 'z'].map(axis => values.inspected.camera[axis] - values.inspected.orbitCenter[axis])), values.radius, 'Moving target remains the true orbit center');
        return values.inspected.orbitCenter;
      };
      const earlier = await assertTracking();
      await page.waitForTimeout(900); await settle();
      const later = await assertTracking();
      assert(Math.hypot(...['x', 'y', 'z'].map(axis => later[axis] - earlier[axis])) > 0.000001, 'The inspected star really moves with reduced motion off');
      results.nativeDoubleClick = true;
      results.movingStarTracking = true;

      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
      const box = await canvas.boundingBox(), x = box.x + box.width * 0.5, y = box.y + box.height * 0.5;
      const pinchBefore = (await orbit()).r;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: x - 40, y }, { id: 2, x: x + 40, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x - 75, y }, { id: 2, x: x + 75, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await settle();
      assert((await orbit()).r < pinchBefore, 'Native two-finger pinch zooms into the inspected object');
      assert.equal(await canvas.evaluate(canvas => canvas._galaxyGetSelectionVisualState().selectedIndex), selected, 'Pinching does not change the selected object');
      await assertTracking();
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await cdp.detach();
      results.nativePinchPreservesSelection = true;

      // Sample the transition synchronously so a slow screenshot cannot make a
      // snap and a 720 ms tween look equivalent.
      const transition = await canvas.evaluate(canvas => {
        canvas._galaxyExitInspection();
        const before = canvas._galaxyGetInspectionState().camera;
        canvas._galaxyInspectSelection();
        return { before, immediate: canvas._galaxyGetInspectionState().camera, radius: canvas._galaxyOrbit.r };
      });
      pointNear(transition.before, transition.immediate, 'Close-up starts without teleporting the camera');
      assert(transition.radius > 0.5, 'Non-reduced motion begins at the previous framing');
      await page.waitForFunction(() => Math.abs(document.querySelector('[data-galaxy-canvas]')._galaxyOrbit.r - 0.3) < 0.0001, null, { timeout: 5000 });
      await assertTracking();
      results.gentleCloseTransition = true;
      await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'moving-star-inspection-1440.png'), animations: 'disabled' });
      assert.deepEqual(results.errors, []);
      fs.writeFileSync(path.join(OUT, 'gestures-results.json'), JSON.stringify(results, null, 2) + '\n');
      console.log(JSON.stringify(results));
      return;
    }
    assert.equal((await inspection()).canInspect, false);
    await canvas.focus(); await page.keyboard.press(']'); await settle();
    assert.equal((await inspection()).canInspect, true);
    assert.equal(await page.locator('[data-galaxy-selection-dock]').count(), 1);
    const previous = await orbit();
    await act('[data-galaxy-inspect-object]');
    let view = await inspection();
    assert.equal(view.active, true);
    assert.equal(view.kind, 'star');
    near(Math.hypot(view.camera.x - view.orbitCenter.x, view.camera.y - view.orbitCenter.y, view.camera.z - view.orbitCenter.z), (await orbit()).r, 'Camera orbits the actual selection');
    assert((await orbit()).r < 0.5, 'Inspection opens close detail');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 + 25, { steps: 6 }); await page.mouse.up(); await settle();
    assert(Math.abs((await orbit()).theta - previous.theta) > 0.1, 'Pointer drag orbits selected object');
    const beforeZoom = (await orbit()).r;
    await canvas.focus(); await page.keyboard.press('+'); await settle();
    assert((await orbit()).r < beforeZoom, 'Keyboard zoom works around object');
    view = await inspection();
    near(Math.hypot(view.camera.x - view.orbitCenter.x, view.camera.y - view.orbitCenter.y, view.camera.z - view.orbitCenter.z), (await orbit()).r, 'Zoom preserves selected orbit center');
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'star-inspection-1440.png'), animations: 'disabled' });
    await act('[data-galaxy-inspect-object]');
    assert.equal((await inspection()).active, false);
    const restored = await orbit();
    ['theta', 'phi', 'r'].forEach(key => near(restored[key], previous[key], 'Return restores framing ' + key));
    results.starCenteredOrbitAndReturn = true;

    await act('[data-galaxy-control-tab="discover"]');
    const nebulae = page.locator('[data-galaxy-nebula-target]');
    assert.equal(await nebulae.count(), 8);
    const names = await nebulae.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-galaxy-nebula-target')));
    for (const name of names) {
      await page.locator('[data-galaxy-nebula-target]').filter({ hasText: name }).click(); await settle();
      assert.equal((await state()).selectedNebula, name);
      assert((await page.locator('[data-galaxy-selected-label]').textContent()).includes(name));
    }
    await act('[data-galaxy-inspect-object]');
    assert.equal((await inspection()).kind, 'nebula');
    assert.equal((await inspection()).active, true);
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'nebula-inspection-1440.png'), animations: 'disabled' });
    await canvas.focus(); await page.keyboard.press('Escape'); await settle();
    assert.equal((await inspection()).active, false, 'Escape exits close inspection first');
    assert.equal((await inspection()).canInspect, true, 'First Escape preserves the selection');
    await page.keyboard.press('Escape'); await settle();
    assert.equal((await inspection()).canInspect, false, 'Second Escape clears selection');
    results.eightNamedObjectsAndEscape = true;

    await page.locator('[data-galaxy-nebula-target]').first().click(); await settle();
    await act('[data-galaxy-inspect-object]');
    await canvas.evaluate(canvas => canvas._galaxyResetView()); await settle();
    assert.equal((await inspection()).active, false);
    assert.equal((await inspection()).canInspect, false, 'Reset clears runtime tracking');
    assert.equal((await state()).selectedNebula, null);
    near((await orbit()).r, await canvas.evaluate(canvas => canvas._galaxyOverviewRadius), 'Reset restores overview radius');
    await canvas.focus(); await page.keyboard.press(']'); await page.keyboard.press('i'); await settle();
    assert.equal((await inspection()).active, true, 'I opens inspection');
    await canvas.evaluate(canvas => canvas._setLayerVisibility('arms', false)); await settle();
    assert.equal((await inspection()).canInspect, false, 'Hiding selected population clears inspection');
    await canvas.evaluate(canvas => canvas._setLayerVisibility('arms', true)); await settle();
    results.resetAndLayerClearInspection = true;

    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1050 }); await settle();
      await canvas.focus(); await page.keyboard.press(']'); await settle();
      await page.locator('[data-galaxy-selection-dock]').scrollIntoViewIfNeeded();
      const outside = await page.locator('[data-galaxy-selection-dock] button').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1 || r.height < 44); }).map(node => node.textContent));
      assert.deepEqual(outside, [], 'Selection controls fit and meet touch size at ' + width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'selection-' + width + '.png'), animations: 'disabled' });
      results.layouts.push({ width, overflow: false, touchTargets: true });
    }
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    assert(await page.locator('[data-galaxy-inspect-object]').isVisible());
    await page.locator('[data-galaxy-inspect-object]').focus(); await page.keyboard.press('Enter'); await settle();
    assert.equal((await inspection()).active, true);
    results.forcedColorsAndReducedMotion = true;
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results));
  } catch (error) {
    results.failure = String(error.stack || error);
    fs.writeFileSync(path.join(OUT, process.argv.includes('--gestures') ? 'gestures-results.json' : 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
