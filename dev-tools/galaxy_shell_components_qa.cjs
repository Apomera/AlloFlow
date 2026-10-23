// Local Three r128: named shell components, their actual axes, stable framing and close-up geometry.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'reports/galaxy-shell-components-2026-10-22');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const source = process.env.GALAXY_SHELL_SOURCE || 'stem_lab/stem_tool_galaxy.js', tag = process.env.GALAXY_SHELL_TAG || 'after', fallback = process.env.GALAXY_SHELL_PP === 'off', suffix = fallback ? '-fallback' : '';
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-5, why + ': ' + a + ' vs ' + b);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tool = read(source), report = { source, sourceSha256: crypto.createHash('sha256').update(tool).digest('hex'), postProcessing: !fallback, errors: [], captures: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', e => report.errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    if (!fallback) for (const file of ['CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js']) await page.addScriptTag({ content: read('tmp/galaxy-spatial-pp/' + file) });
    await page.evaluate(() => {
      let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; window._galaxyPPLoaded = true;
      const Renderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function (...args) {
        const renderer = new Renderer(...args), render = renderer.render.bind(renderer);
        renderer.render = function (scene, camera) {
          const result = render(scene, camera), nebulae = scene.children.find(n => n.name === 'nebulae'); if (!nebulae || !window.__captureShell) return result;
          const canvas = document.querySelector('[data-galaxy-canvas]'), inspection = canvas._galaxyGetInspectionState();
          const models = nebulae.children.filter(n => n.name === 'inspectedPlanetaryGasShell' && n.userData.nebulaName === inspection.label); if (!models.length) return result;
          const rect = canvas.getBoundingClientRect(), p = new THREE.Vector3(); let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
          const meshes = models.map(n => { n.updateMatrixWorld(true); const a = n.geometry.attributes.position; for (let i = 0; i < a.count; i++) { p.fromBufferAttribute(a, i).applyMatrix4(n.matrixWorld).project(camera); const x = (p.x + 1) * rect.width / 2, y = (1 - p.y) * rect.height / 2; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); } return { kind: n.userData.component, visible: n.visible, vertices: a.count, axis: new THREE.Vector3(0, 0, 1).transformDirection(n.matrixWorld), opacity: n.material.uniforms.uOpacity.value, position: n.position.toArray(), rotation: [n.rotation.x, n.rotation.y, n.rotation.z], scale: n.scale.toArray() }; });
          const axisGuide = scene.children.find(n => n.name === 'planetaryShellAxisGuide');
          const end = name => axisGuide.children.find(n => n.name === name).localToWorld(new THREE.Vector3(0, 0, 1));
          const guide = axisGuide?.visible ? { center: axisGuide.getWorldPosition(new THREE.Vector3()), nearEnd: end('planetaryAxisNear'), farEnd: end('planetaryAxisFar') } : null;
          window.__shellCapture = { meshes, guide, bounds: { left, top, right, bottom }, linked: renderer.info.programs.every(p => renderer.getContext().getProgramParameter(p.program, renderer.getContext().LINK_STATUS)) };
          window.__captureShell = false; return result;
        }; return renderer;
      };
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' }); await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: tool });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyQuality: 'high', galaxyAutoRotate: false }));
    const canvas = page.locator('[data-galaxy-canvas]'); await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyFrameObject, null, { timeout: 60000 });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = () => canvas.evaluate(canvas => ({ inspection: canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, framing: canvas._galaxyGetObjectFramingState(), view: canvas._galaxyGetPlanetaryViewState(), study: canvas._galaxyGetPlanetaryComponentState?.() }));
    async function select(name, radius) { await canvas.evaluate((canvas, { name, radius }) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); canvas._galaxySetInspectionBackdrop(false); canvas._galaxyFrameObject(); canvas._galaxyOrbit.r = radius; canvas._galaxyUpdateCam(); }, { name, radius }); await settle(); }
    async function capture(id, label) {
      await canvas.scrollIntoViewIfNeeded(); await settle(); await page.evaluate(() => { window.__captureShell = true; }); await page.waitForFunction(() => !window.__captureShell, null, { timeout: 30000 });
      const data = { ...await state(), rendered: await page.evaluate(() => window.__shellCapture) }; assert(data.rendered.linked);
      const b = data.rendered.bounds, roi = data.framing.roi; assert(b.left >= roi.x - 2 && b.top >= roi.y - 2 && b.right <= roi.x + roi.width + 2 && b.bottom <= roi.y + roi.height + 2, 'Full owner geometry fits clear ROI');
      const image = tag + '-' + id + '-' + label + suffix + '.png'; await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, image), animations: 'disabled' });
      report.captures.push({ id, label, image, ...data }); console.log(tag + '/' + id + '/' + label); return data;
    }
    for (const [id, name, radius] of [['helix', 'Helix Nebula', .18], ['ring', 'Ring Nebula', .15]]) {
      await select(name, radius);
      for (const pose of fallback ? ['oblique'] : ['along', 'oblique', 'across']) { await canvas.evaluate((canvas, pose) => canvas._galaxySetPlanetaryView(pose), pose); await settle(); await capture(id, pose); }
      if (tag !== 'before') {
        const details = page.locator('[data-galaxy-object-context]'); if (!(await details.evaluate(n => n.open))) await page.locator('[data-galaxy-object-context-summary]').click();
        await canvas.evaluate(canvas => canvas._galaxySetPlanetaryAxisVisible(true));
        for (const mode of ['both', 'primary', 'secondary']) {
          const before = await state(), button = page.locator('[data-galaxy-shell-component-mode="' + mode + '"]'); await button.focus(); await page.keyboard.press('Enter'); await settle();
          const after = await capture(id, mode); assert.deepEqual(after.orbit, before.orbit); assert.deepEqual(after.inspection.camera, before.inspection.camera); assert.deepEqual(after.framing, before.framing);
          assert.equal(after.study.mode, mode); assert.equal(await button.getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('[data-galaxy-shell-component-mode][aria-pressed="true"]').count(), 1);
          const visible = after.rendered.meshes.filter(m => m.visible); assert.equal(visible.length, mode === 'both' ? 2 : 1);
          const reference = mode === 'secondary' ? after.study.secondaryComponent : after.study.primaryComponent;
          assert.equal(after.view.primaryComponent, after.study.primaryComponent); assert.equal(after.view.referenceComponent, reference);
          const mesh = after.rendered.meshes.find(m => m.kind === reference), c = after.inspection.camera, center = after.inspection.orbitCenter, length = Math.hypot(c.x - center.x, c.y - center.y, c.z - center.z);
          const direction = { x: (c.x - center.x) / length, y: (c.y - center.y) / length, z: (c.z - center.z) / length };
          near(after.view.angleDegrees, Math.acos(Math.min(1, Math.abs(dot(direction, mesh.axis)))) * 180 / Math.PI, 'Readout follows actual studied mesh');
          assert(after.rendered.guide); for (const end of ['center', 'nearEnd', 'farEnd']) for (const axis of ['x', 'y', 'z']) near(after.rendered.guide[end][axis], after.view.guide[end][axis], 'Guide follows studied mesh');
          const along = page.locator('[data-galaxy-shell-view="along"]'); await along.focus(); await page.keyboard.press('Enter'); await settle();
          const aligned = await state(); near(aligned.view.angleDegrees, 0, 'Along preset follows studied part'); near(aligned.orbit.r, after.orbit.r, 'Preset retains radius');
          assert.equal(await along.getAttribute('aria-pressed'), 'true'); if (mode === 'secondary') await capture(id, 'secondary-along');
        }
        if (!fallback) {
          for (const band of ['radio', 'infrared', 'visible']) { await page.locator('[data-galaxy-object-band]').selectOption(band); await settle(); const data = await state(); if (band === 'radio') { assert.equal(data.study.available, false); assert.equal(await page.locator('[data-galaxy-shell-components]').count(), 0); } else { assert(data.study.available); assert.equal(data.study.mode, 'secondary'); } }
          for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 1050 }); await settle(); const field = page.locator('[data-galaxy-shell-views]'); await field.scrollIntoViewIfNeeded();
            const layout = await field.evaluate(node => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, buttons: [...node.querySelectorAll('button')].map(n => { const r = n.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right }; }) }));
            assert(!layout.overflow && layout.buttons.every(b => b.width >= 44 && b.height >= 44 && b.left >= 0 && b.right <= width), 'Shell study controls fit at ' + width);
            await field.screenshot({ path: path.join(OUT, id + '-controls-' + width + '.png'), animations: 'disabled' }); await capture(id, 'phone-' + width); report.captures.push({ id, label: 'layout', width, ...layout });
          }
          await page.setViewportSize({ width: 1440, height: 1050 }); await settle();
        }
      }
      await canvas.evaluate(canvas => canvas._galaxyExitInspection());
    }
    if (tag !== 'before' && !fallback) {
      await select('Ring Nebula', .15); await canvas.evaluate(canvas => canvas._galaxySetPlanetaryComponentMode('primary')); await settle();
      await page.locator('button[aria-label="Set balanced galaxy rendering detail"]').click(); await page.waitForFunction(() => document.querySelector('[data-galaxy-canvas]')?.getAttribute('data-resolved-quality') === 'balanced' && !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetPlanetaryComponentState, null, { timeout: 60000 });
      for (const [id, name, radius, mode] of [['ring', 'Ring Nebula', .15, 'primary'], ['helix', 'Helix Nebula', .18, 'secondary']]) { await select(name, radius); assert.equal((await state()).study.mode, mode); await capture(id, 'quality-retention'); await canvas.evaluate(canvas => canvas._galaxyExitInspection()); }
    }
    assert.deepEqual(report.errors, []);
  } catch (error) { report.failure = String(error.stack || error); throw error; }
  finally { fs.writeFileSync(path.join(OUT, tag + '-browser' + suffix + '.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
