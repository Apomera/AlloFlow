// Real Chrome wheel precision, inspection takeover and native touch/capture checks.
// Run: node dev-tools/galaxy_direct_manipulation_qa.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-direct-manipulation-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-6, why + ': ' + a + ' vs ' + b);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const result = { browser: executablePath || 'Playwright Chromium', starCount: 5000, errors: [], wheel: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'no-preference', hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => result.errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' }); await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(() => { window.__auditTime = Date.now(); Date.now = () => window.__auditTime; window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false }); });
    await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxySetZoomPosition, null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]'), cdp = await page.context().newCDPSession(page);
    await canvas.evaluate(canvas => { window.__gestureEvents = []; window.__blurCount = 0; window.addEventListener('blur', () => window.__blurCount++); ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, event => window.__gestureEvents.push({ type, id: event.pointerId, x: event.clientX, y: event.clientY, buttons: event.buttons }))); });
    const settle = () => page.evaluate(() => Promise.race([new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))), new Promise((resolve, reject) => setTimeout(() => reject(new Error('Animation frames paused during native gesture QA')), 10000))]));
    const step = async ms => { await page.evaluate(ms => window.__auditTime += ms, ms); await settle(); };
    const view = () => canvas.evaluate(canvas => ({ ...canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit } }));
    const resetZoom = async () => { await canvas.evaluate(canvas => canvas._galaxySetZoomPosition(45)); await settle(); };
    await canvas.scrollIntoViewIfNeeded(); await step(1000);
    const box = await canvas.boundingBox(), x = box.x + box.width * 0.55, y = box.y + box.height * 0.5;
    await page.mouse.move(x, y);
    for (const [label, deltaX, deltaY] of [['fine', 0, 1], ['coarse', 0, 120], ['horizontal', 120, 0]]) {
      await resetZoom(); const before = (await view()).orbit.r; await page.mouse.wheel(deltaX, deltaY); await settle(); const after = (await view()).orbit.r;
      result.wheel.push({ label, deltaX, deltaY, ratio: after / before });
    }
    assert(result.wheel[0].ratio > 1 && result.wheel[0].ratio < 1.01); assert(result.wheel[1].ratio > 1.05 && result.wheel[1].ratio < 1.4); near(result.wheel[2].ratio, 1, 'Horizontal gestures never zoom');
    await resetZoom(); const reversible = (await view()).orbit.r; await page.mouse.wheel(0, 120); await settle(); await page.mouse.wheel(0, -120); await settle(); near((await view()).orbit.r, reversible, 'Equal opposite wheel input is reversible');
    await canvas.evaluate(canvas => canvas._galaxySetViewAngle('face')); await step(120);
    await page.mouse.wheel(120, 0); await settle(); await step(600); near((await view()).orbit.phi, 0.1, 'Ignored horizontal input does not cancel a camera transition');
    await canvas.evaluate(canvas => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); }); await step(120);
    const flying = await view(); await page.mouse.wheel(0, 1); await settle(); const takeover = await view();
    const jump = Math.hypot(...['x', 'y', 'z'].map(axis => takeover.camera[axis] - flying.camera[axis])); assert(jump < takeover.orbit.r * 0.01, 'Fine wheel takeover produces only a fine camera move');
    await step(1000); near((await view()).orbit.r, takeover.orbit.r, 'Old inspection fly-in cannot resume after wheel takeover'); result.inspectionTakeover = { cameraMovement: jump, remainsActive: (await view()).active };
    await canvas.evaluate(canvas => canvas._galaxySetZoomPosition(50)); await settle();
    const initial = (await view()).orbit.r;
    const activeTouchIds = () => page.evaluate(() => { const ids = new Set(); window.__gestureEvents.forEach(event => { if (event.type === 'pointerdown') ids.add(event.id); if (event.type === 'pointerup' || event.type === 'pointercancel') ids.delete(event.id); }); return [...ids]; });
    const first = { id: 1, x: x - 40, y }, second = { id: 2, x: x + 40, y };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
    first.x = x - 55; second.x = x + 55;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, second] }); await settle(); near((await view()).orbit.r, initial * 80 / 110, 'Native pinch follows finger separation');
    // CDP's pointful touchEnd ends the supplied changed contact, rather than
    // interpreting its array as the contacts remaining on the screen.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [second] }); await settle();
    const oneFinger = await activeTouchIds(); assert.equal(oneFinger.length, 1);
    const third = { id: 3, x: x + 80, y };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, third] }); await settle(); assert.equal((await activeTouchIds()).length, 2); const resumed = (await view()).orbit.r;
    third.x = x + 95; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, third] }); await settle(); result.nativeEventTrace = await page.evaluate(() => window.__gestureEvents.slice(-24)); near((await view()).orbit.r, resumed * 135 / 150, 'A rejoined finger uses a fresh pinch baseline');
    const fourth = { id: 4, x: x + 140, y };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, third, fourth] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [third] }); await settle(); assert.equal((await activeTouchIds()).length, 2); const changed = (await view()).orbit.r;
    fourth.x++; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, fourth] }); await settle(); near((await view()).orbit.r, changed * 195 / 196, 'Changing a three-finger pair keeps zoom continuous');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await settle();
    result.nativeTouch = { pinch: true, leaveAndRejoin: true, changedPairContinuous: true, cancelKeepsInspection: (await view()).active };
    await canvas.evaluate(canvas => canvas.addEventListener('pointerdown', event => window.__lastPointerId = event.pointerId));
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y); await settle();
    assert(await page.evaluate(() => window.__gestureEvents.some(event => event.type === 'gotpointercapture' && event.id === window.__lastPointerId)), 'Native mouse capture became active before testing capture loss');
    const beforeLoss = await view();
    await canvas.evaluate(canvas => canvas.releasePointerCapture(window.__lastPointerId));
    await page.mouse.move(x + 12, y); await page.mouse.up(); await settle();
    assert.deepEqual((await view()).orbit, beforeLoss.orbit, 'Losing capture ends orbit immediately'); assert.equal((await view()).label, beforeLoss.label); assert((await view()).active, 'Lost capture never generates a false new object selection');
    // Playwright normally forces every page to remain focused, including its
    // background tabs. Disable that emulation to exercise an actual blur.
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }); await page.bringToFront();
    const beforeBlur = await view(), blurCount = await page.evaluate(() => window.__blurCount); await page.mouse.move(x, y); await page.mouse.down();
    const other = await page.context().newPage(); await other.bringToFront(); await page.bringToFront(); await page.mouse.move(x + 18, y + 2); await page.mouse.up(); await settle(); await other.close();
    assert((await page.evaluate(() => window.__blurCount)) > blurCount, 'The browser actually delivered window blur');
    assert.deepEqual((await view()).orbit, beforeBlur.orbit, 'Returning from window blur cannot continue a stale drag'); assert.equal((await view()).label, beforeBlur.label); result.nativeCaptureLossAndBlur = true;
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'direct-manipulation.png'), animations: 'disabled' });
    assert.deepEqual(result.errors, []); fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
  } catch (error) { result.failure = String(error.stack || error); fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n'); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
