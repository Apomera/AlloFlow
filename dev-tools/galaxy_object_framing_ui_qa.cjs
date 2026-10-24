// Real Chrome keyboard/layout checks. Run only after renderer QA releases the GPU.
// Run: node dev-tools/galaxy_object_framing_ui_qa.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-object-framing-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start)).replace('var pair = React.useState({ galaxy: state });', 'var pair = React.useState({ galaxy: state }); window.__galaxyState = pair[0].galaxy;');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (a, b) => assert(Math.abs(a - b) < 1e-5, a + ' vs ' + b);
const point = (a, b) => ['x', 'y', 'z'].forEach(axis => near(a[axis], b[axis]));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tool = read('stem_lab/stem_tool_galaxy.js');
  const report = { browser: executablePath || 'Playwright Chromium', sourceSha256: crypto.createHash('sha256').update(tool).digest('hex'), errors: [], consoleErrors: [], targets: [], layouts: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { const Camera = window.THREE.PerspectiveCamera; window.THREE.PerspectiveCamera = function (...args) { const camera = new Camera(...args); window.__galaxyCamera = camera; return camera; }; });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: tool });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 2500, galaxyAutoRotate: false, layers: { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, grid: false, labels: false, dust: true, gas: true } }));
    await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyFrameObject, null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]'), context = page.locator('[data-galaxy-object-context]');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const view = () => canvas.evaluate(canvas => ({ ...canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, framing: canvas._galaxyGetObjectFramingState(), backdrop: canvas._galaxyGetInspectionBackdrop(), crab: canvas._galaxyGetCrabComponentState(), band: window.__galaxyState.observeMode || 'visible', layers: window.__galaxyState.layers }));
    const band = async value => { await page.locator('[data-galaxy-object-band]').selectOption(value); await settle(); };
    for (const name of ['Helix Nebula', 'Crab Nebula']) {
      await canvas.evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }, name); await settle();
      if (!(await context.evaluate(node => node.open))) { await page.locator('[data-galaxy-object-context-summary]').focus(); await page.keyboard.press('Enter'); }
      const initial = await view(); assert.equal(initial.framing.available, true);
      const slider = page.locator('[data-galaxy-zoom-slider]'); await slider.focus(); await page.keyboard.press('End'); await settle();
      const detailed = await view(); assert(detailed.orbit.r < initial.framing.fitRadius, 'Detail zoom moves closer than whole-object fit');
      const frame = page.locator('[data-galaxy-frame-object="context"]'); await frame.focus(); await page.keyboard.press('Enter'); await settle();
      const fitted = await view(); near(fitted.framing.zoomPercent, 100); near(fitted.orbit.theta, detailed.orbit.theta); near(fitted.orbit.phi, detailed.orbit.phi); point(fitted.orbitCenter, detailed.orbitCenter);
      assert.equal(fitted.label, name); assert.equal(fitted.band, detailed.band); assert.deepEqual(fitted.crab, detailed.crab);
      const focus = await canvas.evaluate(canvas => { const r = canvas.getBoundingClientRect(); return { active: document.activeElement === canvas, inView: r.bottom > 0 && r.top < innerHeight }; });
      assert(focus.active && focus.inView, 'Primary Frame returns keyboard focus and scrolls the scene into view');
      assert.equal(await page.locator('[data-galaxy-current-zoom]').innerText(), 'Object zoom 100%');
      const fit = page.locator('[data-galaxy-frame-object="view"]'); await fit.focus(); await page.keyboard.press('Enter'); await settle();
      assert.equal(await fit.evaluate(node => document.activeElement === node), true, 'View Fit retains focus for range editing');
      const toggle = page.locator('[data-galaxy-inspection-backdrop]'); await toggle.focus(); await page.keyboard.press('Space'); await settle();
      const isolated = await view(); assert.equal(isolated.backdrop.showContext, false); assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
      point(isolated.camera, fitted.camera); assert.deepEqual(isolated.layers, fitted.layers); assert.deepEqual(isolated.crab, fitted.crab); assert.equal(isolated.band, fitted.band);
      await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, name.startsWith('Helix') ? 'helix-isolated-framed-1440.png' : 'crab-isolated-framed-1440.png'), animations: 'disabled' });
      await band('radio'); const radio = await view(); near(radio.orbit.r, isolated.orbit.r); near(radio.orbit.theta, isolated.orbit.theta); near(radio.orbit.phi, isolated.orbit.phi);
      assert.equal(radio.framing.contextual, true); assert.equal(radio.framing.available, false);
      assert.equal(await page.locator('[data-galaxy-frame-object="context"]').count(), 0); assert.equal(await page.locator('[data-galaxy-zoom-overview]').isDisabled(), true);
      assert.equal(await page.locator('[data-galaxy-inspection-backdrop]').count(), 0); assert.equal(await context.evaluate(node => node.open), true);
      await band('infrared'); assert.equal(await toggle.getAttribute('aria-pressed'), 'false'); await toggle.focus(); await page.keyboard.press('Space'); await settle();
      const infrared = await view(); near(infrared.orbit.r, isolated.orbit.r); assert.equal(infrared.backdrop.showContext, true);
      await page.locator('[data-galaxy-focus-enter]').click(); await settle();
      const focused = await view(); assert.equal(focused.label, name); assert.equal(focused.active, true); assert.equal(focused.backdrop.showContext, true); assert.deepEqual(focused.crab, infrared.crab); near(focused.orbit.theta, infrared.orbit.theta); near(focused.orbit.phi, infrared.orbit.phi);
      await page.locator('[data-galaxy-focus-exit]').click(); await settle();
      assert.equal((await view()).label, name);
      report.targets.push({ name, primaryFocus: focus, fittedZoom: fitted.framing.zoomPercent, sameCameraAcrossBand: true, nativeBackdropBound: true, focusPreservesTarget: true });
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 1050 }); await settle(); await context.scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => {
        const targets = [...document.querySelectorAll('[data-galaxy-frame-object],[data-galaxy-inspection-backdrop],[data-galaxy-zoom-slider]')].map(node => { const r = node.getBoundingClientRect(); return { selector: node.getAttribute('data-galaxy-frame-object') || node.getAttribute('data-galaxy-inspection-backdrop') || 'slider', left: r.left, right: r.right, width: r.width, height: r.height }; });
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, targets };
      });
      assert(!layout.overflow, 'No page overflow at ' + width);
      assert(layout.targets.every(r => r.width >= 44 && r.height >= 44 && r.left >= -1 && r.right <= width + 1), 'All framing/backdrop/zoom targets fit and reach 44px at ' + width);
      await context.screenshot({ path: path.join(OUT, 'object-controls-' + width + '.png'), animations: 'disabled' });
      await page.locator('[data-galaxy-view-angles]').screenshot({ path: path.join(OUT, 'object-zoom-' + width + '.png'), animations: 'disabled' });
      report.layouts.push({ width, ...layout });
    }
    await page.setViewportSize({ width: 1440, height: 1050 }); await settle();
    await canvas.evaluate(canvas => { canvas._galaxyFocusNebula('Helix Nebula'); canvas._galaxyFrameObject(); canvas._galaxySetZoomPosition(100); }); await settle();
    const manuallyFramed = await page.evaluate(() => ({ ...window.__galaxyCamera.view }));
    assert(manuallyFramed.enabled && Math.abs(manuallyFramed.offsetX) + Math.abs(manuallyFramed.offsetY) > 1, 'Manual zoom retains the fitted off-center projection');
    await canvas.evaluate(canvas => canvas._galaxyFocusNebula('Orion Nebula')); await settle();
    const browsed = await view(); assert.equal(browsed.label, 'Orion Nebula'); assert.equal(browsed.framing.contextual, false); assert(browsed.orbit.r >= 0.2);
    assert.equal(await page.evaluate(() => window.__galaxyCamera.view.enabled), false, 'Reduced-motion browsing clears the retained projection');
    report.reducedMotionManualBrowseCentersTarget = true;
    assert.deepEqual(report.errors, []); assert.deepEqual(report.consoleErrors, []);
  } catch (error) { report.failure = String(error.stack || error); if (page) await page.screenshot({ path: path.join(OUT, 'ui-failure.png'), timeout: 15000 }).catch(() => {}); throw error; }
  finally { fs.writeFileSync(path.join(OUT, 'ui-browser.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
