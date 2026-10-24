// Actual WebGL interaction checks for hover previews and same-object band comparison.
// Run: node dev-tools/galaxy_exploration_qa.cjs
// Default rotation and direct nebula-center picking: add --motion.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-exploration-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const end = core.indexOf('`;\n\n(async', start);
assert(start > 0 && end > start);
const shell = core.slice(start, end).replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`)
  .replace('awardXP: function(){},', 'awardXP: function(){window.__awards++;},');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-5, why + ': ' + a + ' vs ' + b);
const samePoint = (a, b, why) => ['x', 'y', 'z'].forEach(axis => near(a[axis], b[axis], why + ' ' + axis));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { browser: executablePath || 'Playwright Chromium', starCount: 5000, errors: [], layouts: [] };
  try {
    const motion = process.argv.includes('--motion');
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: motion ? 'no-preference' : 'reduce' });
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      window.__awards = 0;
      let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      const Camera = THREE.PerspectiveCamera;
      THREE.PerspectiveCamera = function (...args) { const camera = new Camera(...args); window.__camera = camera; return camera; };
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(motion => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: motion }), motion);
    await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetHoverState, null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]');
    const hover = () => canvas.evaluate(canvas => canvas._galaxyGetHoverState());
    const inspect = () => canvas.evaluate(canvas => canvas._galaxyGetInspectionState());
    const state = () => page.evaluate(() => window.__galaxyState);
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const selectBand = async band => {
      await page.locator('[data-galaxy-object-band]').selectOption(band); await settle();
      await page.waitForFunction(band => document.querySelector('[data-galaxy-canvas]')._galaxyGetInstrumentVisualState().mode === band, band);
      assert.equal((await state()).observeMode, band);
    };
    const projectedStar = async () => canvas.evaluate(canvas => {
      const camera = window.__camera, rect = canvas.getBoundingClientRect(); camera.updateMatrixWorld(true);
      for (let index = 100; index < 2400; index++) {
        const star = canvas._galaxyGetStarVisualState(index), p = new THREE.Vector3(star.animated.x, star.animated.y, star.animated.z).project(camera);
        if (p.z >= -1 && p.z <= 1 && p.x > 0.05 && p.x < 0.5 && p.y > -0.2 && p.y < 0.2) return { x: rect.x + (p.x + 1) * rect.width / 2, y: rect.y + (1 - p.y) * rect.height / 2 };
      }
      return null;
    });
    await canvas.scrollIntoViewIfNeeded(); await settle();
    if (motion) {
      const target = await projectedStar(); assert(target);
      await page.mouse.move(target.x, target.y);
      await page.waitForFunction(() => document.querySelector('[data-galaxy-canvas]')._galaxyGetHoverState().visible, null, { timeout: 5000 });
      const samples = [];
      for (let index = 0; index < 12; index++) { await page.waitForTimeout(100); samples.push(await hover()); }
      assert(samples.filter(sample => sample.visible).length >= 10, 'Preview stays usable while the default scene rotates');
      assert.equal((await state()).galaxyAutoRotate, true);
      assert.equal((await inspect()).canInspect, false);
      result.defaultRotationHover = { samples: samples.length, visible: samples.filter(sample => sample.visible).length };
      await canvas.evaluate(canvas => { canvas._galaxySetAutoRotate(false); canvas._galaxyResetView(); }); await page.waitForTimeout(800); await settle();
      await page.locator('[data-galaxy-control-tab="discover"]').click(); await settle();
      const names = await page.locator('[data-galaxy-nebula-target]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-galaxy-nebula-target')));
      result.nebulaCenterHits = [];
      for (const name of [names[0], names[names.length - 1]]) {
        await canvas.evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }, name);
        await page.waitForTimeout(800); await settle();
        const world = (await inspect()).orbitCenter;
        await canvas.evaluate(canvas => { canvas._galaxyExitInspection(); canvas._galaxyClearSelection(); canvas._galaxyResetView(); });
        await page.waitForTimeout(800); await canvas.scrollIntoViewIfNeeded(); await settle();
        for (const band of ['visible', 'infrared', 'radio', 'xray', 'gravity']) {
          await canvas.evaluate((canvas, band) => canvas._setObserveMode(band), band); await settle();
          const point = await canvas.evaluate((canvas, world) => { const rect = canvas.getBoundingClientRect(), camera = window.__camera; camera.updateMatrixWorld(true); const projected = new THREE.Vector3(world.x, world.y, world.z).project(camera); return { x: rect.x + (projected.x + 1) * rect.width / 2, y: rect.y + (1 - projected.y) * rect.height / 2 }; }, world);
          await page.mouse.move(point.x, point.y);
          await page.waitForFunction(name => { const value = document.querySelector('[data-galaxy-canvas]')._galaxyGetHoverState(); return value.visible && value.kind === 'nebula' && value.label === name; }, name, { timeout: 5000 });
          await page.mouse.click(point.x, point.y); await settle();
          assert.equal((await inspect()).kind, 'nebula'); assert.equal((await inspect()).label, name);
          result.nebulaCenterHits.push({ name, band });
          await canvas.evaluate(canvas => { canvas._galaxyClearSelection(); canvas._galaxyResetView(); }); await page.waitForTimeout(800); await settle();
        }
      }
      assert.deepEqual(result.errors, []);
      fs.writeFileSync(path.join(OUT, 'motion-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result)); return;
    }
    let target = await projectedStar(); assert(target);
    await page.mouse.move(target.x, target.y);
    await page.waitForFunction(() => document.querySelector('[data-galaxy-canvas]')._galaxyGetHoverState().visible, null, { timeout: 5000 });
    const candidate = await hover();
    assert(candidate.label.length > 0);
    assert.equal((await state()).selectedStar || (await state()).selectedNebula, undefined);
    assert.equal(await page.evaluate(() => window.__awards), 0, 'Previewing never earns selection XP');
    assert(await page.locator('[data-galaxy-hover-preview]').isVisible());
    const hoverRect = await page.locator('[data-galaxy-hover-preview]').boundingBox();
    const canvasRect = await canvas.boundingBox();
    assert(hoverRect.x >= canvasRect.x && hoverRect.x + hoverRect.width <= canvasRect.x + canvasRect.width + 1, 'Preview stays within the scene');
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'hover-preview-1440.png'), animations: 'disabled' });
    await page.mouse.click(target.x, target.y); await settle();
    const selected = await inspect();
    assert.equal(selected.kind, candidate.kind);
    assert.equal(selected.label, candidate.label, 'Click selects the previewed object');
    if (candidate.kind === 'star') assert.equal(await canvas.evaluate(canvas => canvas._galaxyGetSelectionVisualState().selectedIndex), candidate.index);
    result.hoverMatchesActualSelection = true;
    result.hoverDoesNotModifyWork = true;

    await canvas.focus(); await page.keyboard.press('i'); await settle();
    assert.equal((await inspect()).active, true);
    const initial = await inspect(), orbit = await canvas.evaluate(canvas => ({ ...canvas._galaxyOrbit }));
    const selectedIndex = await canvas.evaluate(canvas => canvas._galaxyGetSelectionVisualState().selectedIndex);
    for (const band of ['infrared', 'radio', 'xray', 'gravity', 'visible']) {
      await selectBand(band);
      const current = await inspect();
      assert.equal(current.active, true);
      assert.equal(current.kind, initial.kind);
      assert.equal(current.label, initial.label);
      samePoint(current.orbitCenter, initial.orbitCenter, 'Changing signals preserves orbit center');
      samePoint(current.camera, initial.camera, 'Changing signals preserves camera');
      assert.deepEqual(await canvas.evaluate(canvas => ({ ...canvas._galaxyOrbit })), orbit);
      assert.equal(await canvas.evaluate(canvas => canvas._galaxyGetSelectionVisualState().selectedIndex), selectedIndex);
    }
    result.sameStarAcrossFiveSignals = true;

    await page.locator('[data-galaxy-inspect-object]').click(); await settle();
    await page.locator('[data-galaxy-control-tab="discover"]').click(); await settle();
    await page.locator('[data-galaxy-nebula-target]').first().click(); await settle();
    await page.locator('[data-galaxy-inspect-object]').click(); await settle();
    const nebula = await inspect();
    for (const band of ['infrared', 'xray', 'visible']) {
      await selectBand(band);
      assert.equal((await state()).selectedNebula, nebula.label);
      assert.equal((await inspect()).active, true);
      samePoint((await inspect()).camera, nebula.camera, 'Same nebula camera');
    }
    result.sameNebulaAcrossSignals = true;
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'nebula-band-comparison-1440.png'), animations: 'disabled' });
    await page.locator('[data-galaxy-control-tab="view"]').click(); await settle();
    await page.getByRole('button', { name: /Radio/ }).first().click(); await settle();
    assert.equal((await inspect()).canInspect, false, 'Ordinary filters still start a fresh overview observation');
    await canvas.focus(); await page.keyboard.press(']'); await settle();
    await page.locator('[data-galaxy-evidence-observe="0"]').click(); await settle();
    assert.equal((await inspect()).canInspect, false, 'Guided reference observations clear the previous object');
    assert.equal((await state()).observeMode, 'visible');
    result.referenceWorkflowStillResets = true;

    for (const width of [1440, 820, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1050 }); await settle();
      await canvas.focus(); await page.keyboard.press(']'); await settle();
      await page.locator('[data-galaxy-selection-dock]').scrollIntoViewIfNeeded();
      const controls = await page.locator('[data-galaxy-selection-dock] button,[data-galaxy-selection-dock] select').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height };
      }));
      assert(controls.every(r => r.left >= -1 && r.right <= width + 1 && r.height >= 44), 'Accessible object controls fit ' + width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const measurementOverlap = await page.locator('[data-galaxy-stage]').evaluate(stage => {
        const dock = stage.querySelector('[data-galaxy-selection-dock]').getBoundingClientRect();
        return Array.from(stage.querySelectorAll('[data-galaxy-measurement],[data-galaxy-measurement-mobile]')).filter(node => {
          const rect = node.getBoundingClientRect(); return rect.width && rect.height && getComputedStyle(node).display !== 'none' && rect.left < dock.right && rect.right > dock.left && rect.top < dock.bottom && rect.bottom > dock.top;
        }).map(node => node.getAttribute('data-galaxy-measurement') !== null ? 'expanded' : 'compact');
      });
      assert.deepEqual(measurementOverlap, [], 'Visible measurements do not cover object controls at ' + width);
      const cameraTargets = await page.locator('[data-galaxy-camera-controls] button').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect(), stage = node.closest('[data-galaxy-stage]').getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { label: node.getAttribute('aria-label'), size: r.width >= 44 && r.height >= 44,
          withinScene: r.left >= stage.left && r.right <= stage.right && r.top >= stage.top && r.bottom <= stage.bottom,
          unobscured: hit === node || node.contains(hit) };
      }));
      assert(cameraTargets.every(target => target.size && target.withinScene && target.unobscured), 'Every camera button remains visible and reachable at ' + width + ': ' + JSON.stringify(cameraTargets));
      await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'object-controls-' + width + '.png'), animations: 'disabled' });
      result.layouts.push({ width, overflow: false, touchTargets: true, measurementOverlap: false, cameraControlsReachable: true });
    }
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.locator('[data-galaxy-object-band]').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await settle();
    assert.equal((await inspect()).canInspect, true);
    result.keyboardAndForcedColors = true;
    assert.deepEqual(result.errors, []);
    fs.writeFileSync(path.join(OUT, process.argv.includes('--motion') ? 'motion-results.json' : 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } catch (error) {
    result.failure = String(error.stack || error);
    fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
