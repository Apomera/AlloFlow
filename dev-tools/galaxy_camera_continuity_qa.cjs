// Real Chromium/SwiftShader checks for interrupted inspection and resized returns.
// Run: node dev-tools/galaxy_camera_continuity_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-camera-continuity-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start)).replace('var pair = React.useState({ galaxy: state });', 'var pair = React.useState({ galaxy: state }); window.__galaxyState = pair[0].galaxy;');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const distance = (a, b) => Math.hypot(...['x', 'y', 'z'].map(axis => a[axis] - b[axis]));
const near = (a, b, message) => assert(Math.abs(a - b) < 1e-6, message + ': ' + a + ' vs ' + b);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { browser: executablePath || 'Playwright Chromium', starCount: 5000, errors: [], returns: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'no-preference' });
    page.on('pageerror', error => results.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') results.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(() => { window.__cameraAuditTime = Date.now(); Date.now = () => window.__cameraAuditTime; });
    const canvas = page.locator('[data-galaxy-canvas]');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const step = async ms => { await page.evaluate(ms => window.__cameraAuditTime += ms, ms); await settle(); };
    const view = () => canvas.evaluate(canvas => ({ ...canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, home: canvas._galaxyOverviewRadius }));
    const mount = async reduced => {
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await page.setViewportSize({ width: 1440, height: 1050 });
      await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false }));
      await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyInspectSelection, null, { timeout: 60000 });
      await canvas.scrollIntoViewIfNeeded(); await settle();
    };
    await mount(false);
    await canvas.evaluate(canvas => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); });
    await step(120);
    const box = await canvas.boundingBox(), pointer = { x: box.x + box.width * 0.72, y: box.y + box.height * 0.48 };
    await page.mouse.move(pointer.x, pointer.y);
    const beforeDrag = await view();
    await page.mouse.down(); await settle();
    const afterDown = await view();
    near(distance(beforeDrag.camera, afterDown.camera), 0, 'Pointer takeover keeps the instantaneous camera position');
    near(distance(afterDown.camera, afterDown.orbitCenter), afterDown.orbit.r, 'Takeover uses the actual object as its orbit center');
    await page.mouse.move(pointer.x + 12, pointer.y + 1, { steps: 4 }); await page.mouse.up(); await settle();
    const afterDrag = await view();
    assert(afterDrag.active, 'Dragging does not discard inspection');
    assert(distance(afterDown.camera, afterDrag.camera) < afterDown.orbit.r * 0.08, 'A short drag produces only a small camera movement');
    await step(1000);
    near((await view()).orbit.r, afterDrag.orbit.r, 'The interrupted fly-in cannot resume after a manual drag');
    results.pointerTakeoverCameraJump = distance(beforeDrag.camera, afterDown.camera);
    results.smallDragRemainsContinuous = true;

    await canvas.evaluate(canvas => { canvas._galaxyExitInspection(); canvas._galaxyInspectSelection(); }); await step(120);
    const beforeAngle = await view();
    await canvas.evaluate(canvas => canvas._galaxySetViewAngle('edge'));
    near(distance(beforeAngle.camera, (await view()).camera), 0, 'A view-angle transition starts from the current camera position');
    await step(800);
    near((await view()).orbit.phi, Math.PI * 0.5, 'View-angle transition completes about the selected object');
    results.viewAngleTakeoverContinuous = true;

    for (const reduced of [false, true]) {
      await mount(reduced);
      if (reduced) await canvas.evaluate(canvas => canvas._galaxySetZoomPosition(40));
      const before = await view();
      await canvas.evaluate(canvas => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); }); await step(1000);
      await page.setViewportSize({ width: 390, height: 1050 }); await settle();
      await page.waitForFunction(home => document.querySelector('[data-galaxy-canvas]')._galaxyOverviewRadius > home, before.home, { timeout: 5000 });
      await canvas.focus(); await page.keyboard.press('Escape'); await settle();
      const returned = await view();
      assert.equal(returned.active, false); assert.equal(returned.canInspect, true);
      near(returned.orbit.r / returned.home, before.orbit.r / before.home, 'Return preserves relative framing after viewport resize');
      near(returned.orbit.theta, before.orbit.theta, 'Return preserves azimuth'); near(returned.orbit.phi, before.orbit.phi, 'Return preserves inclination');
      await canvas.evaluate(canvas => canvas._galaxyInspectSelection()); await step(1000);
      const closeup = (await view()).orbit;
      await canvas.evaluate(canvas => canvas._galaxyCycleStar(1)); await settle();
      assert.equal((await view()).active, true, 'Browsing another object keeps close inspection');
      assert.deepEqual((await view()).orbit, closeup, 'Browsing keeps inspection angle and zoom');
      await canvas.evaluate(canvas => canvas._galaxyExitInspection()); await settle();
      near((await view()).orbit.r / (await view()).home, before.orbit.r / before.home, 'Changing selection uses the adapted return framing');
      await canvas.evaluate(canvas => canvas._galaxyResetView()); await step(1000);
      assert.equal((await view()).canInspect, false); near((await view()).orbit.r, (await view()).home, 'Reset remains a true overview');
      results.returns.push({ reducedMotion: reduced, startingRelativeZoom: before.orbit.r / before.home, returnedRelativeZoom: returned.orbit.r / returned.home, escapePreservesSelection: true, resetClearsSelection: true });
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
  } catch (error) {
    results.failure = String(error.stack || error);
    fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n'); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
