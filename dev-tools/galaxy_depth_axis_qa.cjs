// Compare fixed local Three r128 models at matching camera poses, then exercise shell-axis controls.
// Run GALAXY_DEPTH_TAG=before / GALAXY_DEPTH_SOURCE=...before.js for the baseline.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'reports/galaxy-depth-axis-2026-10-22');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const source = process.env.GALAXY_DEPTH_SOURCE || 'stem_lab/stem_tool_galaxy.js', tag = process.env.GALAXY_DEPTH_TAG || 'after';
const fallback = process.env.GALAXY_DEPTH_PP === 'off';
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const suffix = fallback ? '-fallback' : '';
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-5, why + ': ' + a + ' vs ' + b);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tool = read(source), report = { source, sourceSha256: crypto.createHash('sha256').update(tool).digest('hex'), postProcessing: !fallback, errors: [], captures: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    if (!fallback) for (const file of ['CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js']) await page.addScriptTag({ content: read('tmp/galaxy-spatial-pp/' + file) });
    await page.evaluate(() => {
      let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      window._galaxyPPLoaded = true;
      const Renderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function (...args) {
        const renderer = new Renderer(...args), render = renderer.render.bind(renderer);
        renderer.render = function (scene, camera) {
          const result = render(scene, camera), nebulae = scene.children.find(node => node.name === 'nebulae');
          if (!nebulae) return result;
          window.__depthScene = scene; window.__depthCamera = camera; window.__depthRenderer = renderer;
          if (!window.__captureDepth) return result;
          const canvas = document.querySelector('[data-galaxy-canvas]'), inspection = canvas._galaxyGetInspectionState();
          const meshes = nebulae.children.filter(node => node.visible && ['inspectedPlanetaryGasShell', 'inspectedCrabStructure'].includes(node.name) && node.userData.nebulaName === inspection.label);
          let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity; const p = new THREE.Vector3(), rect = canvas.getBoundingClientRect();
          meshes.forEach(node => { const a = node.geometry.attributes.position; for (let i = 0; i < a.count; i++) { p.fromBufferAttribute(a, i).applyMatrix4(node.matrixWorld).project(camera); const x = (p.x + 1) * rect.width / 2, y = (1 - p.y) * rect.height / 2; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); } });
          const axisGuide = scene.children.find(node => node.name === 'planetaryShellAxisGuide');
          const endpoint = name => { const child = axisGuide.children.find(node => node.name === name); return child.localToWorld(new THREE.Vector3(0, 0, 1)); };
          const guide = axisGuide?.visible ? { center: axisGuide.getWorldPosition(new THREE.Vector3()), nearEnd: endpoint('planetaryAxisNear'), farEnd: endpoint('planetaryAxisFar') } : null;
          window.__depthCapture = { canvas: { width: rect.width, height: rect.height }, bounds: { left, top, right, bottom }, guide, meshes: meshes.map(node => ({ name: node.name, component: node.userData.component, vertices: node.geometry.attributes.position.count })), linked: renderer.info.programs.every(p => renderer.getContext().getProgramParameter(p.program, renderer.getContext().LINK_STATUS)), programs: renderer.info.programs.length };
          window.__captureDepth = false; return result;
        }; return renderer;
      };
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: tool });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyQuality: 'high', galaxyAutoRotate: false }));
    await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyFrameObject === 'function', null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const [id, name] of [['helix', 'Helix Nebula'], ['ring', 'Ring Nebula'], ['crab', 'Crab Nebula']]) {
      await canvas.evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); canvas._galaxySetInspectionBackdrop(false); canvas._galaxyFrameObject(); }, name); await settle();
      for (const pose of ['along', 'oblique', 'across']) {
        await canvas.evaluate((canvas, pose) => {
          const nebulae = window.__depthScene.children.find(n => n.name === 'nebulae');
          const primary = nebulae.children.find(n => n.userData.nebulaName === canvas._galaxyGetInspectionState().label && (n.name === 'inspectedPlanetaryGasShell' || n.name === 'inspectedCrabStructure'));
          primary.updateMatrixWorld(true);
          const axis = new THREE.Vector3(0, 0, 1).transformDirection(primary.matrixWorld), side = new THREE.Vector3(0, 1, 0).cross(axis).normalize();
          const angle = (pose === 'along' ? 0 : pose === 'oblique' ? 45 : 90) * Math.PI / 180;
          const dir = axis.multiplyScalar(Math.cos(angle)).add(side.multiplyScalar(Math.sin(angle))).normalize();
          canvas._galaxyOrbit.theta = Math.atan2(dir.x, dir.z); canvas._galaxyOrbit.phi = Math.acos(Math.max(-1, Math.min(1, dir.y))); canvas._galaxyUpdateCam();
        }, pose); await settle();
        await page.locator('[data-galaxy-stage]').scrollIntoViewIfNeeded();
        await page.evaluate(() => { window.__captureDepth = true; });
        await page.waitForFunction(() => window.__captureDepth === false, null, { timeout: 30000 });
        const capture = await canvas.evaluate(canvas => ({ inspection: canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, framing: canvas._galaxyGetObjectFramingState(), planetary: canvas._galaxyGetPlanetaryViewState(), rendered: window.__depthCapture }));
        assert(capture.rendered.linked, 'Real shaders linked');
        const b = capture.rendered.bounds, roi = capture.framing.roi;
        assert(b.left >= roi.x - 2 && b.top >= roi.y - 2 && b.right <= roi.x + roi.width + 2 && b.bottom <= roi.y + roi.height + 2, 'Fixed meshes fit at every viewing angle');
        const file = tag + '-' + id + '-' + pose + '-1440' + suffix + '.png';
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, file), animations: 'disabled' });
        report.captures.push({ id, pose, file, ...capture }); console.log(tag + '/' + id + '/' + pose);
      }
      if (tag === 'after' && !fallback && id !== 'crab') {
        const details = page.locator('[data-galaxy-object-context]');
        if (!(await details.evaluate(node => node.open))) { await page.locator('[data-galaxy-object-context-summary]').focus(); await page.keyboard.press('Enter'); }
        await canvas.evaluate(canvas => canvas._galaxyRefreshPlanetaryView()); await settle();
        const toggle = page.locator('[data-galaxy-shell-axis-toggle]'); await toggle.focus(); await page.keyboard.press('Space'); await settle();
        assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
        const originalRadius = await canvas.evaluate(canvas => canvas._galaxyOrbit.r);
        for (const [mode, angle] of [['along', 0], ['oblique', 45], ['across', 90]]) {
          const button = page.locator('[data-galaxy-shell-view="' + mode + '"]'); await button.focus(); await page.keyboard.press('Enter'); await settle();
          await canvas.scrollIntoViewIfNeeded(); await settle();
          await page.evaluate(() => { window.__captureDepth = true; }); await page.waitForFunction(() => !window.__captureDepth);
          const state = await canvas.evaluate(canvas => ({ planetary: canvas._galaxyGetPlanetaryViewState(), orbit: { ...canvas._galaxyOrbit }, rendered: window.__depthCapture, backdrop: canvas._galaxyGetInspectionBackdrop() }));
          near(state.planetary.angleDegrees, angle, 'Live shell angle'); near(state.orbit.r, originalRadius, 'Preset retains zoom');
          assert.equal(state.backdrop.showContext, false); assert.equal(state.planetary.projection, mode); assert(state.planetary.axisRendered && state.rendered.guide);
          assert.equal(await button.getAttribute('aria-pressed'), 'true'); assert.match(await page.locator('[data-galaxy-shell-angle]').innerText(), new RegExp(angle + '°'));
          for (const end of ['center', 'nearEnd', 'farEnd']) for (const axis of ['x', 'y', 'z']) near(state.rendered.guide[end][axis], state.planetary.guide[end][axis], 'Actual guide transform matches shell ' + end + '/' + axis);
          await page.locator('[data-galaxy-stage]').scrollIntoViewIfNeeded();
          await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, id + '-axis-' + mode + '-1440' + suffix + '.png'), animations: 'disabled' });
          report.captures.push({ id, pose: 'axis-' + mode, ...state });
        }
        if (id === 'helix') for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 1050 }); await settle();
          const layout = await page.locator('[data-galaxy-shell-views]').evaluate(node => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, buttons: [...node.querySelectorAll('button')].map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right }; }) }));
          assert(!layout.overflow && layout.buttons.every(b => b.width >= 44 && b.height >= 44 && b.left >= 0 && b.right <= width), 'Shell controls fit phone viewport');
          await page.locator('[data-galaxy-shell-views]').screenshot({ path: path.join(OUT, 'shell-controls-' + width + suffix + '.png'), animations: 'disabled' });
          await canvas.scrollIntoViewIfNeeded(); await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'helix-axis-' + width + suffix + '.png'), animations: 'disabled' });
          report.captures.push({ id, pose: 'controls', width, ...layout });
        }
        await page.setViewportSize({ width: 1440, height: 1050 }); await settle();
        for (const signal of ['radio', 'infrared', 'visible']) {
          await page.locator('[data-galaxy-object-band]').selectOption(signal); await settle();
          const state = await canvas.evaluate(canvas => canvas._galaxyGetPlanetaryViewState());
          if (signal === 'radio') assert.equal(state, null); else assert(state.axisVisible && state.axisRendered, 'Guide preference survives band round trip');
        }
        await toggle.focus(); await page.keyboard.press('Space'); await settle(); assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
      }
      await canvas.evaluate(canvas => canvas._galaxyExitInspection());
    }
    if (tag === 'after' && !fallback) {
      const cameraView = () => page.evaluate(() => { const c = window.__depthCamera; return { position: c.position.toArray(), quaternion: c.quaternion.toArray(), fov: c.fov, projection: c.view ? { ...c.view } : null }; });
      for (const transition of ['fly-in', 'framing']) {
        await page.emulateMedia({ reducedMotion: 'no-preference' }); await settle();
        await canvas.evaluate(canvas => { canvas._galaxyFocusNebula('Helix Nebula'); canvas._galaxyInspectSelection(); });
        if (transition === 'framing') { await page.waitForTimeout(850); await canvas.evaluate(canvas => canvas._galaxyFrameObject()); }
        await page.waitForTimeout(180);
        await page.emulateMedia({ reducedMotion: 'reduce' }); await settle(); const frozen = await cameraView();
        await page.waitForTimeout(900); await settle(); assert.deepEqual(await cameraView(), frozen, 'Reduced motion freezes position, viewing direction and projection during ' + transition);
        report.captures.push({ pose: 'motion-freeze-' + transition, frozen });
        await canvas.evaluate(canvas => canvas._galaxyExitInspection());
      }
    }
    assert.deepEqual(report.errors, []);
  } catch (error) { report.failure = String(error.stack || error); throw error; }
  finally { fs.writeFileSync(path.join(OUT, tag + '-visual' + suffix + '.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
