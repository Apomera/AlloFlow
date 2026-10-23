// Real Chrome/SwiftShader checks for host-plane projection and camera navigation.
// Run: node dev-tools/galaxy_orientation_qa.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-spatial-exploration-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const end = core.indexOf('`;\n\n(async', start);
assert(start > 0 && end > start, 'Existing Galaxy browser shell is available');
const shell = core.slice(start, end).replace('var pair = React.useState({ galaxy: state });', 'var pair = React.useState({ galaxy: state }); window.__galaxyState = pair[0].galaxy;');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (actual, expected, why) => assert(Math.abs(actual - expected) < 1e-5, why + ': ' + actual + ' vs ' + expected);
const samePoint = (actual, expected, why) => ['x', 'y', 'z'].forEach(axis => near(actual[axis], expected[axis], why + ' ' + axis));
const overlaps = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tool = read('stem_lab/stem_tool_galaxy.js');
  const result = { browser: executablePath || 'Playwright Chromium', sourceSha256: crypto.createHash('sha256').update(tool).digest('hex'), starCount: 5000, errors: [], consoleErrors: [], layouts: [], checks: {} };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: tool });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false, galaxyControlPanel: 'view' }));
    await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyGetOrientationState === 'function', null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]'), badge = page.locator('button[data-galaxy-orientation]'), panel = page.locator('[data-galaxy-orientation-panel]');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const orientation = () => canvas.evaluate(canvas => canvas._galaxyGetOrientationState());
    const view = () => canvas.evaluate(canvas => ({ ...canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, index: canvas._galaxyGetSelectionVisualState().selectedIndex }));
    await settle();
    await canvas.scrollIntoViewIfNeeded();
    assert(await badge.isVisible(), 'Desktop orientation button is visible');
    const desktop = await badge.evaluate(node => {
      const box = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { button: box(node), fieldScale: box(document.querySelector('[data-galaxy-live-scale]')), instrument: box(document.querySelector('[data-galaxy-instrument-readout]')), stage: box(document.querySelector('[data-galaxy-stage]')), unobscured: !!hit && hit.closest('button[data-galaxy-orientation]') === node };
    });
    assert(desktop.button.width >= 44 && desktop.button.height >= 44, 'Desktop button has a 44px target');
    assert(desktop.button.bottom - desktop.stage.top <= 52, 'Button ends above the field-scale row');
    assert(!overlaps(desktop.button, desktop.fieldScale), 'Button does not cover the field scale');
    assert(!overlaps(desktop.button, desktop.instrument), 'Button does not cover the instrument readout');
    assert(desktop.unobscured, 'Orientation button receives pointer input');
    result.layouts.push({ width: 1440, ...desktop });
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'orientation-overview-1440.png'), animations: 'disabled' });

    await canvas.evaluate(canvas => canvas._galaxyCycleStar(1)); await settle();
    await page.locator('[data-galaxy-inspect-object]').click(); await settle();
    const before = await view();
    assert(before.active && before.kind === 'star' && before.index >= 0, 'A live star is inspected');
    const paths = [];
    for (const expected of ['edge', 'face', 'angled']) {
      assert.equal((await orientation()).next, expected);
      assert.match(await badge.getAttribute('aria-label'), /Switch to/i, 'Button announces the next action');
      await badge.click(); await settle();
      const state = await orientation(), after = await view();
      assert.equal(state.preset, expected);
      assert.equal(after.active, true); assert.equal(after.index, before.index); assert.equal(after.label, before.label);
      near(after.orbit.r, before.orbit.r, 'Preset keeps inspect zoom');
      near(after.orbit.theta, before.orbit.theta, 'Preset keeps azimuth');
      samePoint(after.orbitCenter, before.orbitCenter, 'Preset keeps selected center');
      const rendered = await badge.locator('[data-galaxy-orientation-front]').getAttribute('d');
      assert.equal(rendered, state.front); paths.push(rendered);
      assert.equal(await panel.locator('[data-galaxy-orientation-elevation]').innerText(), await badge.locator('[data-galaxy-orientation-elevation]').innerText());
    }
    assert.equal(new Set(paths).size, 3, 'SVG geometry changes at all three real camera inclinations');
    result.checks.presetCycleAndInspectionPreservation = true;
    await canvas.evaluate(canvas => { canvas._galaxyOrbit.phi = Math.PI * 0.65; canvas._galaxyUpdateCam(); }); await settle();
    assert.equal((await orientation()).roundedElevation, -27);
    assert.equal(await badge.locator('[data-galaxy-orientation-elevation]').innerText(), '-27°');
    assert.equal(await panel.locator('[data-galaxy-orientation-elevation]').innerText(), '-27°');
    assert.equal(await badge.locator('[data-galaxy-orientation-front]').getAttribute('d'), (await orientation()).front);
    result.checks.belowPlaneProjection = true;
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'orientation-star-inspection-1440.png'), animations: 'disabled' });

    const labels = page.locator('[data-galaxy-camera-controls] button[data-control-caption="Labels"]');
    await labels.click(); await settle(); assert.equal(await badge.count(), 0);
    assert(await panel.isVisible(), 'Readonly View-card diagram remains available with scene labels hidden');
    await labels.click(); await settle();
    assert.equal(await badge.locator('[data-galaxy-orientation-elevation]').innerText(), '-27°');
    assert.equal(await badge.locator('[data-galaxy-orientation-front]').getAttribute('d'), (await orientation()).front);
    result.checks.labelsRestoreCurrentProjection = true;
    await canvas.evaluate(canvas => canvas._galaxySetFocusView(true)); await settle();
    assert.equal(await badge.isVisible(), false, 'Focus view hides the stage orientation control');
    await page.locator('[data-galaxy-focus-exit]').click(); await settle();
    assert(await badge.isVisible(), 'Exiting Focus view restores the orientation control');
    result.checks.focusViewHidesControl = true;

    await page.locator('[data-galaxy-shape="elliptical"]').click(); await settle();
    await page.waitForFunction(() => document.querySelector('button[data-galaxy-orientation] [data-galaxy-orientation-reference]')?.textContent === 'Model plane');
    assert.equal(await panel.locator('[data-galaxy-orientation-reference]').innerText(), 'Model plane');
    result.checks.nonspiralReferenceLabel = true;
    await page.locator('[data-galaxy-view-angles]').screenshot({ path: path.join(OUT, 'orientation-model-plane-1440.png'), animations: 'disabled' });
    await page.locator('[data-galaxy-shape="barredSpiral"]').click(); await settle();
    await page.waitForFunction(() => document.querySelector('[data-galaxy-orientation-panel] [data-galaxy-orientation-reference]')?.textContent === 'Galaxy disk');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 1050 }); await settle();
      await page.locator('[data-galaxy-view-angles]').scrollIntoViewIfNeeded(); await settle();
      assert.equal(await badge.isVisible(), false, 'Mobile stage has no added orientation overlay');
      assert(await panel.isVisible(), 'Mobile readonly projection diagram is visible');
      const geometry = await panel.evaluate(node => {
        const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
        return { panel: box(node), svg: box(node.querySelector('svg')), pathsReady: [...node.querySelectorAll('path')].every(path => !!path.getAttribute('d')), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      assert(geometry.panel.left >= -1 && geometry.panel.right <= width + 1, 'Projection card fits at ' + width);
      assert(geometry.svg.width >= 64 && geometry.svg.right <= width + 1, 'Projection diagram remains legible at ' + width);
      assert(geometry.pathsReady && !geometry.overflow, 'Current native SVG and no horizontal overflow at ' + width);
      result.layouts.push({ width, ...geometry });
      await page.locator('[data-galaxy-view-angles]').screenshot({ path: path.join(OUT, 'orientation-view-card-' + width + '.png'), animations: 'disabled' });
    }
    assert.deepEqual(result.errors, [], 'No uncaught browser errors');
    assert.deepEqual(result.consoleErrors, [], 'No browser console errors');
    result.passed = true;
  } catch (error) {
    result.failure = String(error.stack || error);
    if (page) await page.screenshot({ path: path.join(OUT, 'orientation-failure.png'), timeout: 15000 }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(OUT, 'orientation-browser.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
