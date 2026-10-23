// Local Chrome + real Three r128: filament depth, view-following cutaway and component controls.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'reports/galaxy-crab-cutaway-2026-10-22');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const source = process.env.GALAXY_CUTAWAY_SOURCE || 'stem_lab/stem_tool_galaxy.js', tag = process.env.GALAXY_CUTAWAY_TAG || 'after', fallback = process.env.GALAXY_CUTAWAY_PP === 'off';
const suffix = fallback ? '-fallback' : '';
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const near = (a, b, label) => assert(Math.abs(a - b) < 1e-5, label + ': ' + a + ' / ' + b);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tool = read(source), report = { source, sourceSha256: crypto.createHash('sha256').update(tool).digest('hex'), postProcessing: !fallback, errors: [], captures: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', e => report.errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f4f6fb;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    if (!fallback) for (const file of ['CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js']) await page.addScriptTag({ content: read('tmp/galaxy-spatial-pp/' + file) });
    await page.evaluate(() => {
      let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; window._galaxyPPLoaded = true;
      const Renderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function (...args) {
        const renderer = new Renderer(...args), render = renderer.render.bind(renderer);
        renderer.render = function (scene, camera) {
          const result = render(scene, camera), nebulae = scene.children.find(n => n.name === 'nebulae'); if (!nebulae || !window.__captureCrab) return result;
          const canvas = document.querySelector('[data-galaxy-canvas]'), selected = canvas._galaxyGetInspectionState();
          const meshes = nebulae.children.filter(n => n.name === 'inspectedCrabStructure' && n.userData.nebulaName === selected.label);
          if (!meshes.length) return result;
          camera.updateMatrixWorld(true); const p = new THREE.Vector3(), center = meshes[0].position.clone().applyMatrix4(camera.matrixWorldInverse), centerDepth = -center.z;
          const softness = canvas._galaxyGetInspectionVisualState().crabStructure?.cutaway?.softness || 0.003;
          let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, foreground = 0, background = 0, radialMin = Infinity, radialMax = 0;
          for (const mesh of meshes) { const a = mesh.geometry.attributes.position;
            for (let i = 0; i < a.count; i++) {
              p.fromBufferAttribute(a, i);
              if (mesh.userData.component === 'filaments') { const radius = Math.hypot(p.x / .76, p.y / .96, p.z / .62); radialMin = Math.min(radialMin, radius); radialMax = Math.max(radialMax, radius); const view = p.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse); if (-view.z < centerDepth - softness) foreground++; if (-view.z > centerDepth + softness) background++; }
              p.applyMatrix4(mesh.matrixWorld).project(camera); const x = (p.x + 1) * canvas.clientWidth / 2, y = (1 - p.y) * canvas.clientHeight / 2;
              left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
            }
          }
          const filament = meshes.find(m => m.userData.component === 'filaments'), uniforms = filament.material.uniforms;
          window.__crabCapture = { centerDepth, foreground, background, radialMin, radialMax, bounds: { left, top, right, bottom }, visibleComponents: meshes.filter(n => n.visible).map(n => n.userData.component), meshes: meshes.map(n => ({ component: n.userData.component, vertices: n.geometry.attributes.position.count })), cutUniforms: uniforms.uCutawayStrength ? { strength: uniforms.uCutawayStrength.value, centerDepth: uniforms.uCutawayCenterDepth.value, softness: uniforms.uCutawaySoftness.value } : null, linked: renderer.info.programs.every(p => renderer.getContext().getProgramParameter(p.program, renderer.getContext().LINK_STATUS)) };
          window.__captureCrab = false; return result;
        }; return renderer;
      };
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' }); await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: tool });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyQuality: 'high', galaxyAutoRotate: false }));
    const canvas = page.locator('[data-galaxy-canvas]'); await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyFrameObject, null, { timeout: 60000 });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await canvas.evaluate(canvas => { canvas._galaxyFocusNebula('Crab Nebula'); canvas._galaxyInspectSelection(); canvas._galaxySetInspectionBackdrop(false); canvas._galaxyFrameObject(); canvas._galaxyOrbit.r = .22; canvas._galaxyUpdateCam(); }); await settle();
    async function capture(label) {
      await canvas.scrollIntoViewIfNeeded(); await settle(); await page.evaluate(() => { window.__captureCrab = true; }); await page.waitForFunction(() => !window.__captureCrab, null, { timeout: 30000 });
      const state = await canvas.evaluate(canvas => ({ inspection: canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, framing: canvas._galaxyGetObjectFramingState(), components: canvas._galaxyGetCrabComponentState(), cutaway: canvas._galaxyGetCrabCutawayState?.(), visual: canvas._galaxyGetInspectionVisualState().crabStructure, rendered: window.__crabCapture }));
      assert(state.rendered.linked); const b = state.rendered.bounds, roi = state.framing.roi;
      assert(b.left >= roi.x - 2 && b.top >= roi.y - 2 && b.right <= roi.x + roi.width + 2 && b.bottom <= roi.y + roi.height + 2, 'Complete model remains within clear ROI');
      const image = tag + '-' + label + suffix + '.png'; await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, image), animations: 'disabled' });
      report.captures.push({ label, image, ...state }); console.log(tag + '/' + label); return state;
    }
    const pose = async back => { await canvas.evaluate((canvas, back) => { canvas._galaxyOrbit.theta = .3 + (back ? Math.PI : 0); canvas._galaxyOrbit.phi = back ? Math.PI - 1.1 : 1.1; canvas._galaxyUpdateCam(); }, back); await settle(); };
    for (const back of [false, true]) {
      await pose(back); const whole = await capture(back ? 'back-whole' : 'front-whole');
      if (tag !== 'before') {
        await canvas.evaluate(canvas => canvas._galaxySetCrabCutaway(true)); await settle(); const cut = await capture(back ? 'back-cutaway' : 'front-cutaway');
        assert.deepEqual(cut.inspection.camera, whole.inspection.camera); assert.deepEqual(cut.orbit, whole.orbit); assert.deepEqual(cut.framing, whole.framing); assert.deepEqual(cut.rendered.bounds, whole.rendered.bounds);
        assert(cut.visual.cutaway.enabled && cut.visual.cutaway.applied); near(cut.rendered.cutUniforms.centerDepth, cut.rendered.centerDepth, 'Cut plane uses real view-space center'); assert.equal(cut.rendered.cutUniforms.strength, 1);
        assert(cut.rendered.foreground > 500 && cut.rendered.background > 500); await canvas.evaluate(canvas => canvas._galaxySetCrabCutaway(false));
      }
    }
    if (tag !== 'before') {
      const front = report.captures.find(c => c.label === 'front-cutaway'), back = report.captures.find(c => c.label === 'back-cutaway');
      assert.equal(front.rendered.foreground, back.rendered.background); assert.equal(front.rendered.background, back.rendered.foreground);
      await pose(false); await canvas.evaluate(canvas => canvas._galaxySetCrabCutaway(true));
      const details = page.locator('[data-galaxy-object-context]'); if (!(await details.evaluate(n => n.open))) await page.locator('[data-galaxy-object-context-summary]').click();
      if (!fallback) {
        const toggle = page.locator('[data-galaxy-crab-cutaway]'); await toggle.focus(); await page.keyboard.press('Space'); await settle();
        assert.equal(await toggle.getAttribute('aria-pressed'), 'false'); await toggle.focus(); await page.keyboard.press('Space'); await settle(); assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
        const original = await capture('keyboard-cutaway');
        const component = name => page.locator('[data-galaxy-crab-component="' + name + '"]');
        await component('wind').focus(); await page.keyboard.press('Space'); await settle(); const filaments = await capture('filaments-cutaway'); assert.deepEqual(filaments.rendered.visibleComponents, ['filaments']);
        await component('filaments').focus(); await page.keyboard.press('Space'); await settle();
        assert.equal(await toggle.isDisabled(), true); assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('[data-galaxy-crab-empty]').innerText(), /Both components are hidden/); const empty = await capture('both-hidden'); assert.deepEqual(empty.rendered.visibleComponents, []); assert.equal(empty.rendered.cutUniforms.strength, 0);
        const recover = page.locator('[data-galaxy-crab-show-both]'); await recover.focus(); await page.keyboard.press('Enter'); await settle(); const restored = await capture('show-both'); assert.deepEqual(restored.components, { available: true, filaments: true, wind: true }); assert(restored.cutaway.enabled);
        assert.deepEqual(restored.inspection.camera, original.inspection.camera); assert.deepEqual(restored.framing, original.framing);
        await page.locator('[data-galaxy-object-band]').selectOption('radio'); await settle(); const radio = await capture('radio'); assert.equal(radio.cutaway.available, false); assert.equal(radio.rendered.cutUniforms.strength, 0); assert.equal(await toggle.count(), 0);
        await page.locator('[data-galaxy-object-band]').selectOption('infrared'); await settle(); const ir = await capture('infrared-cutaway'); assert(ir.cutaway.enabled && ir.visual.cutaway.applied); assert.deepEqual(ir.inspection.camera, original.inspection.camera);
        await page.locator('[data-galaxy-object-band]').selectOption('visible'); await settle();
        await component('wind').click(); await settle(); await page.locator('button[aria-label="Set balanced galaxy rendering detail"]').click();
        await page.waitForFunction(() => document.querySelector('[data-galaxy-canvas]')?.getAttribute('data-resolved-quality') === 'balanced' && !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetCrabCutawayState, null, { timeout: 60000 });
        await canvas.evaluate(canvas => { canvas._galaxyFocusNebula('Crab Nebula'); canvas._galaxyInspectSelection(); canvas._galaxyFrameObject(); }); await settle();
        const rebuilt = await capture('quality-retention'); assert.deepEqual(rebuilt.components, { available: true, filaments: true, wind: false }); assert(rebuilt.cutaway.enabled && rebuilt.visual.cutaway.applied);
        if (!(await details.evaluate(n => n.open))) await page.locator('[data-galaxy-object-context-summary]').click();
        await component('wind').click(); await settle(); await pose(false); await capture('framed-cutaway');
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 1050 }); await settle();
          const field = page.locator('[data-galaxy-crab-components]'); await field.scrollIntoViewIfNeeded();
          const layout = await field.evaluate(node => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, buttons: [...node.querySelectorAll('button')].map(button => { const r = button.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }) }));
          assert(!layout.overflow && layout.buttons.every(b => b.width >= 44 && b.height >= 44 && b.left >= 0 && b.right <= width), 'Phone controls fit at ' + width);
          await field.screenshot({ path: path.join(OUT, 'controls-' + width + '.png'), animations: 'disabled' }); await capture('phone-' + width);
          report.captures.push({ label: 'layout', width, ...layout });
        }
      }
    }
    assert.deepEqual(report.errors, []);
  } catch (error) { report.failure = String(error.stack || error); throw error; }
  finally { fs.writeFileSync(path.join(OUT, tag + '-browser' + suffix + '.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
