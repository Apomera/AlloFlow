// Real Chrome checks for object-relative shell views and Crab component controls.
// Run: node dev-tools/galaxy_object_projection_qa.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-object-projection-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start)).replace('var pair = React.useState({ galaxy: state });', 'var pair = React.useState({ galaxy: state }); window.__galaxyState = pair[0].galaxy;');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-5, why + ': ' + a + ' vs ' + b);
const point = (a, b, why) => ['x', 'y', 'z'].forEach(axis => near(a[axis], b[axis], why + ' ' + axis));
const direction = state => { const length = Math.hypot(...['x', 'y', 'z'].map(axis => state.camera[axis] - state.orbitCenter[axis])); return Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, (state.camera[axis] - state.orbitCenter[axis]) / length])); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tool = read('stem_lab/stem_tool_galaxy.js');
  const report = { browser: executablePath || 'Playwright Chromium', sourceSha256: crypto.createHash('sha256').update(tool).digest('hex'), errors: [], consoleErrors: [], shells: [], components: [], layouts: [], crabMobileStages: [], starMobileStages: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      const Renderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function (...args) {
        const renderer = new Renderer(...args), render = renderer.render.bind(renderer);
        renderer.render = function (scene, camera) {
          const nebulae = scene.children.find(node => node.name === 'nebulae');
          if (nebulae) {
            const primary = nebulae.children.find(node => node.visible && node.name === 'inspectedPlanetaryGasShell' && ['thick-disk', 'equatorial-shell'].includes(node.userData.component));
            if (primary) { primary.updateMatrixWorld(true); const axis = new THREE.Vector3(0, 0, 1).transformDirection(primary.matrixWorld); window.__shellWorldAxis = { x: axis.x, y: axis.y, z: axis.z }; }
            const reticle = scene.children.find(node => node.name === 'selectionDepthReticle');
            if (reticle?.visible) {
              camera.updateMatrixWorld(true);
              const projected = reticle.position.clone().project(camera), canvas = document.querySelector('[data-galaxy-canvas]');
              window.__reticleNormalized = { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2, halfSize: reticle.scale.y * canvas.clientHeight / (4 * Math.tan(camera.fov * Math.PI / 360)) };
            }
          }
          return render(scene, camera);
        };
        return renderer;
      };
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: tool });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false }));
    await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxySetPlanetaryView, null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]'), context = page.locator('[data-galaxy-object-context]');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const view = () => canvas.evaluate(canvas => ({ ...canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, planetary: canvas._galaxyGetPlanetaryViewState(), crab: canvas._galaxyGetCrabComponentState(), visual: canvas._galaxyGetInspectionVisualState() }));
    const select = async name => { await canvas.evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }, name); await settle(); if (!(await context.evaluate(node => node.open))) { await page.locator('[data-galaxy-object-context-summary]').focus(); await page.keyboard.press('Enter'); } };
    const band = async value => { await page.locator('[data-galaxy-object-band]').selectOption(value); await settle(); };
    const captureLayout = async (target, width) => {
      await page.setViewportSize({ width, height: 1050 }); await settle();
      if (target === 'crab') {
        await canvas.scrollIntoViewIfNeeded(); await settle();
        const stageLayout = await canvas.evaluate(canvas => {
          const rect = canvas.getBoundingClientRect(), dock = document.querySelector('[data-galaxy-selection-dock]').getBoundingClientRect(), reticle = window.__reticleNormalized;
          const x = rect.left + reticle.x * rect.width, y = rect.top + reticle.y * rect.height;
          const targetBox = { left: x - reticle.halfSize, right: x + reticle.halfSize, top: y - reticle.halfSize, bottom: y + reticle.halfSize };
          const overlap = Math.min(targetBox.right, dock.right) > Math.max(targetBox.left, dock.left) && Math.min(targetBox.bottom, dock.bottom) > Math.max(targetBox.top, dock.top);
          return { canvas: { width: rect.width, height: rect.height }, reticle: targetBox, dock: { left: dock.left, right: dock.right, top: dock.top, bottom: dock.bottom, height: dock.height }, overlap, hintDisplay: getComputedStyle(document.querySelector('[data-galaxy-inspection-hint]')).display };
        });
        report.crabMobileStages.push({ viewport: width, ...stageLayout });
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'crab-stage-' + width + '.png'), animations: 'disabled' });
      }
      await context.scrollIntoViewIfNeeded();
      const layout = await context.evaluate(node => {
        const r = node.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width, overflow: document.documentElement.scrollWidth > innerWidth + 1,
          targets: [...node.querySelectorAll('summary,button,a')].map(button => { const b = button.getBoundingClientRect(); return { width: b.width, height: b.height, left: b.left, right: b.right }; }) };
      });
      assert(layout.left >= -1 && layout.right <= width + 1 && !layout.overflow, target + ' disclosure fits ' + width);
      assert(layout.targets.every(button => button.width >= 44 && button.height >= 44 && button.left >= -1 && button.right <= width + 1), target + ' controls have 44px targets at ' + width);
      await context.screenshot({ path: path.join(OUT, target + '-controls-' + width + '.png'), animations: 'disabled' });
      report.layouts.push({ target, viewport: width, ...layout });
    };
    for (const [id, name] of [['helix', 'Helix Nebula'], ['ring', 'Ring Nebula']]) {
      await select(name); const before = await view();
      assert.equal(await page.locator('[data-galaxy-live-scale-value]').innerText(), 'Schematic close-up', 'Named shell close-up does not present a physical kpc scale');
      assert.equal(await page.locator('[data-galaxy-panel-field-height]').innerText(), 'Schematic close-up');
      assert.match(await page.locator('[data-galaxy-live-scale]').getAttribute('aria-label'), /schematic/i);
      assert((await page.locator('[data-galaxy-object-context-summary]').innerText()).includes('Explore shell shape'));
      for (const mode of ['along', 'across']) {
        const button = page.locator('[data-galaxy-shell-view="' + mode + '"]');
        await button.focus(); await page.keyboard.press('Enter'); await settle();
        const after = await view(), actualAxis = await page.evaluate(() => window.__shellWorldAxis);
        near(Math.abs(dot(direction(after), actualAxis)), mode === 'along' ? 1 : 0, 'View aligns to the actual rendered shell axis');
        near(after.orbit.r, before.orbit.r, 'Shell action preserves radius'); point(after.orbitCenter, before.orbitCenter, 'Shell action preserves center');
        assert.equal(after.label, name); assert.equal(after.active, true); assert.equal(after.planetary.band, 'visible');
        assert.equal(await context.evaluate(node => node.open), true, 'Disclosure remains open during exploration');
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, id + '-' + mode + '-1440.png'), animations: 'disabled' });
        report.shells.push({ target: id, mode, alignment: Math.abs(dot(direction(after), actualAxis)), radius: after.orbit.r });
      }
      await band('infrared'); assert.equal(await page.locator('[data-galaxy-shell-views]').count(), 1);
      await band('radio'); assert.equal(await page.locator('[data-galaxy-shell-views]').count(), 0);
      assert.equal(await canvas.evaluate(canvas => canvas._galaxySetPlanetaryView('along')), false);
      await band('visible');
      if (id === 'helix') { for (const width of [390, 320]) await captureLayout(id, width); await page.setViewportSize({ width: 1440, height: 1050 }); await settle(); }
    }
    await select('Crab Nebula'); const before = await view();
    assert.equal(await page.locator('[data-galaxy-live-scale-value]').innerText(), 'Schematic close-up', 'Crab close-up does not present a physical kpc scale');
    assert.equal(await page.locator('[data-galaxy-shell-views]').count(), 0);
    assert.equal(await page.locator('[data-galaxy-crab-components]').count(), 1);
    for (const [kind, other] of [['filaments', 'wind'], ['wind', 'filaments']]) {
      const button = page.locator('[data-galaxy-crab-component="' + kind + '"]');
      await button.focus(); await page.keyboard.press('Space'); await settle();
      const after = await view(); assert.equal(after.crab[kind], false); assert.equal(after.crab[other], true);
      assert.equal(await button.getAttribute('aria-pressed'), 'false');
      assert.equal(after.visual.crabStructure.components.find(component => component.kind === kind).visible, false);
      point(after.camera, before.camera, 'Component toggle preserves camera');
      await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'crab-without-' + kind + '-1440.png'), animations: 'disabled' });
      report.components.push({ hidden: kind, otherVisible: true, cameraPreserved: true });
      await button.click(); await settle();
    }
    assert.deepEqual((await view()).crab, { available: true, filaments: true, wind: true });
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'crab-both-components-1440.png'), animations: 'disabled' });
    await band('radio'); assert.equal(await page.locator('[data-galaxy-crab-components]').count(), 0);
    await band('infrared'); assert.equal(await page.locator('[data-galaxy-crab-components]').count(), 1);
    for (const width of [390, 320]) await captureLayout('crab', width);
    assert(report.crabMobileStages.every(layout => !layout.overlap), 'Mobile Crab dock leaves the actual projected reticle clear');
    await page.setViewportSize({ width: 1440, height: 1050 }); await settle(); await band('visible');
    await canvas.evaluate(canvas => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); }); await settle();
    assert.equal((await view()).kind, 'star');
    assert.match(await page.locator('[data-galaxy-live-scale-value]').innerText(), /\bkpc\b/, 'Inspected stars retain the host-model physical scale');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 1050 }); await settle();
      const measurement = page.locator('[data-galaxy-measurement-mobile]');
      if (await measurement.evaluate(node => node.open)) { await measurement.locator('summary').click(); await settle(); }
      for (const expanded of [false, true]) {
        if (expanded) { await measurement.locator('summary').click(); await settle(); }
        await canvas.scrollIntoViewIfNeeded(); await settle();
        const geometry = await canvas.evaluate(canvas => {
          const rect = canvas.getBoundingClientRect(), reticle = window.__reticleNormalized;
          const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
          const x = rect.left + reticle.x * rect.width, y = rect.top + reticle.y * rect.height;
          const target = { left: x - reticle.halfSize, right: x + reticle.halfSize, top: y - reticle.halfSize, bottom: y + reticle.halfSize };
          const dock = box(document.querySelector('[data-galaxy-selection-dock]')), measurement = box(document.querySelector('[data-galaxy-measurement-mobile]'));
          const overlap = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
          return { target, dock, measurement, reticleDockOverlap: overlap(target, dock), reticleMeasurementOverlap: overlap(target, measurement), measurementDockOverlap: overlap(measurement, dock), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        report.starMobileStages.push({ viewport: width, expanded, ...geometry });
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'star-stage-' + (expanded ? 'expanded-' : '') + width + '.png'), animations: 'disabled' });
      }
    }
    assert(report.starMobileStages.every(layout => !layout.reticleDockOverlap && !layout.reticleMeasurementOverlap && !layout.measurementDockOverlap && !layout.overflow), 'Mobile inspected-star target, measurement and dock remain separate');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.consoleErrors, []);
    report.passed = true;
  } catch (error) { report.failure = String(error.stack || error); if (page) await page.screenshot({ path: path.join(OUT, 'controls-failure.png'), timeout: 15000 }).catch(() => {}); throw error; }
  finally { fs.writeFileSync(path.join(OUT, 'controls-browser.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
